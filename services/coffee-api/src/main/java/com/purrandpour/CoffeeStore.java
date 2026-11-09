package com.purrandpour;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.purrandpour.SecurityConfig.Identity;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CoffeeStore {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final TransactionTemplate tx;

    public CoffeeStore(JdbcTemplate db, ObjectMapper json, TransactionTemplate tx) {
        this.db = db;
        this.json = json;
        this.tx = tx;
    }

    public Map<String, Object> decode(String text) {
        try { return json.readValue(text, new TypeReference<Map<String, Object>>() {}); }
        catch (Exception e) { throw new IllegalStateException("Invalid stored document", e); }
    }

    public String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalStateException("Document serialization failed", e); }
    }

    public List<Map<String, Object>> menu() {
        return db.query("SELECT data FROM coffee_menu ORDER BY CASE data->>'category' WHEN 'coffee' THEN 0 WHEN 'tea' THEN 1 ELSE 2 END, id",
                (rs, n) -> decode(rs.getString(1)));
    }

    public List<Map<String, Object>> pets() {
        return db.query("SELECT data FROM coffee_pets ORDER BY (data->>'unlockAt')::int", (rs, n) -> decode(rs.getString(1)));
    }

    public Map<String, Object> me(Identity identity) {
        db.update("INSERT INTO coffee_customers(id) VALUES (?) ON CONFLICT DO NOTHING", identity.id());
        Map<String, Object> prefs = db.queryForObject("SELECT preferences FROM coffee_customers WHERE id=?", (rs, n) -> decode(rs.getString(1)), identity.id());
        Integer completed = db.queryForObject("SELECT count(*) FROM coffee_orders WHERE owner_id=? AND practice=false AND payment_status='paid' AND status='collected'", Integer.class, identity.id());
        List<String> unlocked = pets().stream().filter(p -> ((Number) p.get("unlockAt")).intValue() <= completed).map(p -> (String) p.get("id")).toList();
        String selected = (String) prefs.getOrDefault("selectedPet", "miso");
        if (!unlocked.contains(selected)) selected = "miso";
        return Map.of("signedIn", identity.signedIn(), "name", identity.name(), "role", identity.role(),
                "completedOrders", completed, "selectedPet", selected, "unlockedPets", unlocked,
                "reducedMotion", prefs.getOrDefault("reducedMotion", false), "soundEnabled", prefs.getOrDefault("soundEnabled", false));
    }

    public Map<String, Object> preferences(Identity identity, CoffeeController.PreferencesInput input) {
        return tx.execute(t -> {
            Map<String, Object> current = me(identity);
            db.queryForObject("SELECT id FROM coffee_customers WHERE id=? FOR UPDATE", String.class, identity.id());
            if (input.selectedPet() != null && !((List<?>) current.get("unlockedPets")).contains(input.selectedPet())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This barista has not been unlocked yet");
            }
            Map<String, Object> prefs = db.queryForObject("SELECT preferences FROM coffee_customers WHERE id=?", (rs, n) -> decode(rs.getString(1)), identity.id());
            if (input.selectedPet() != null) prefs.put("selectedPet", input.selectedPet());
            if (input.reducedMotion() != null) prefs.put("reducedMotion", input.reducedMotion());
            if (input.soundEnabled() != null) prefs.put("soundEnabled", input.soundEnabled());
            db.update("UPDATE coffee_customers SET preferences=?::jsonb WHERE id=?", encode(prefs), identity.id());
            return me(identity);
        });
    }

    private Map<String, Object> orderRow(ResultSet rs, int n) throws SQLException {
        var value = new LinkedHashMap<String, Object>();
        value.put("id", rs.getString("id"));
        value.put("number", String.format("%04d", rs.getLong("number")));
        value.put("customerName", rs.getString("customer_name"));
        value.put("status", rs.getString("status"));
        value.put("totalCents", rs.getInt("total_cents"));
        value.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
        value.put("practice", rs.getBoolean("practice"));
        value.put("paymentStatus", rs.getString("payment_status"));
        value.put("notes", rs.getString("notes"));
        try { value.put("lines", json.readValue(rs.getString("lines"), List.class)); }
        catch (Exception e) { throw new SQLException("Invalid stored order", e); }
        return value;
    }

    public List<Map<String, Object>> orders(Identity identity, boolean staff) {
        if (staff) return db.query("SELECT * FROM coffee_orders WHERE status NOT IN ('collected','cancelled') ORDER BY created_at DESC LIMIT 100", this::orderRow);
        return db.query("SELECT * FROM coffee_orders WHERE owner_id=? ORDER BY created_at DESC LIMIT 30", this::orderRow, identity.id());
    }

    public Map<String, Object> place(Identity identity, CoffeeController.OrderInput input) {
        if (!input.practice()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Stripe is not connected. No payment has been taken. You can try a practice order.");
        }
        return tx.execute(t -> {
            // Idempotency is per owner, not a globally guessable request ID.
            var existing = db.query("SELECT * FROM coffee_orders WHERE owner_id=? AND request_id=?", this::orderRow, identity.id(), input.requestId());
            if (!existing.isEmpty()) return existing.get(0);
            Integer recent = db.queryForObject("SELECT count(*) FROM coffee_orders WHERE owner_id=? AND created_at > now()-interval '1 hour'", Integer.class, identity.id());
            if (recent >= 20) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Practice order limit reached. Please try again later.");
            List<Map<String, Object>> lines = new ArrayList<>();
            int total = 0;
            for (var line : input.lines()) {
                var items = db.query("SELECT data FROM coffee_menu WHERE id=?", (rs, n) -> decode(rs.getString(1)), line.menuItemId());
                if (items.isEmpty() || !Boolean.TRUE.equals(items.get(0).get("available"))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A selected item is unavailable");
                }
                var item = items.get(0);
                int price = ((Number) item.get("priceCents")).intValue();
                total += price * line.quantity();
                lines.add(Map.of("name", item.get("name"), "quantity", line.quantity(), "unitPriceCents", price,
                        "milk", line.milk(), "temperature", line.temperature()));
            }
            String id = UUID.randomUUID().toString();
            int inserted = db.update("""
                INSERT INTO coffee_orders(id,owner_id,request_id,customer_name,email,status,total_cents,practice,payment_status,notes,lines)
                VALUES (?,?,?,?,?,'accepted',?,true,'practice',?,?::jsonb) ON CONFLICT (owner_id,request_id) DO NOTHING
                """, id, identity.id(), input.requestId(), input.customerName().strip(), input.email().strip(),
                    total, input.notes() == null ? "" : input.notes(), encode(lines));
            var order = db.queryForObject("SELECT * FROM coffee_orders WHERE owner_id=? AND request_id=?", this::orderRow, identity.id(), input.requestId());
            if (inserted > 0) enqueue(identity.id(), order);
            return order;
        });
    }

    public Map<String, Object> transition(String id, String next) {
        return tx.execute(t -> {
            var found = db.query("SELECT * FROM coffee_orders WHERE id=? FOR UPDATE", this::orderRow, id);
            if (found.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
            var order = found.get(0);
            String before = (String) order.get("status");
            if (before.equals(next)) return order;
            boolean allowed = switch (before) {
                case "accepted" -> List.of("preparing", "cancelled").contains(next);
                case "preparing" -> List.of("ready", "cancelled").contains(next);
                case "ready" -> List.of("collected", "cancelled").contains(next);
                default -> false;
            };
            if (!allowed) throw new ResponseStatusException(HttpStatus.CONFLICT, "Invalid order transition");
            db.update("UPDATE coffee_orders SET status=?,updated_at=now() WHERE id=?", next, id);
            order.put("status", next);
            String owner = db.queryForObject("SELECT owner_id FROM coffee_orders WHERE id=?", String.class, id);
            enqueue(owner, order);
            return order;
        });
    }

    private void enqueue(String owner, Map<String, Object> order) {
        db.update("INSERT INTO coffee_outbox(id,owner_id,payload) VALUES (?,?,?::jsonb)", UUID.randomUUID().toString(), owner, encode(order));
    }

    public Map<String, Object> updateMenu(String id, CoffeeController.MenuItemInput input) {
        return tx.execute(t -> {
            var found = db.query("SELECT data FROM coffee_menu WHERE id=? FOR UPDATE", (rs, n) -> decode(rs.getString(1)), id);
            if (found.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu item not found");
            var value = found.get(0);
            value.put("name", input.name().strip());
            value.put("description", input.description());
            value.put("priceCents", input.priceCents());
            value.put("available", input.available());
            db.update("UPDATE coffee_menu SET data=?::jsonb WHERE id=?", encode(value), id);
            return value;
        });
    }

    /** Practice simulation never modifies paid orders or awards loyalty. */
    @Scheduled(fixedDelay = 1500)
    public void advancePracticeOrders() {
        var ids = db.queryForList("""
            SELECT id,status FROM coffee_orders WHERE practice=true AND
            ((status='accepted' AND created_at < now()-interval '6 seconds') OR
             (status='preparing' AND created_at < now()-interval '16 seconds'))
            ORDER BY created_at LIMIT 30
            """);
        for (var row : ids) {
            try { transition((String) row.get("id"), row.get("status").equals("accepted") ? "preparing" : "ready"); }
            catch (ResponseStatusException e) { /* Another worker may already have advanced it. */ }
        }
    }
}
