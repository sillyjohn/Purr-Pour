package com.purrandpour;

import com.purrandpour.SecurityConfig.Identity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
public class CoffeeController {
    public record OrderLineInput(
        @NotBlank @Size(max=80) String menuItemId,
        @Min(1) @Max(10) int quantity,
        @NotNull @Pattern(regexp="whole|oat|almond|none") String milk,
        @NotNull @Pattern(regexp="hot|iced") String temperature) {}
    public record OrderInput(
        @NotBlank @Size(max=80) String customerName,
        @NotBlank @Email @Size(max=254) String email,
        @Size(max=300) String notes,
        boolean practice,
        @NotBlank @Size(min=10,max=100) String requestId,
        @NotEmpty @Size(max=20) List<@Valid OrderLineInput> lines) {}
    public record PreferencesInput(@Size(max=80) String selectedPet, Boolean reducedMotion, Boolean soundEnabled) {}
    public record OrderStatusInput(@NotNull @Pattern(regexp="preparing|ready|collected|cancelled") String status) {}
    public record MenuItemInput(
        @NotBlank @Size(max=80) String name,
        @NotNull @Size(max=250) String description,
        @NotNull @Min(50) @Max(10000) Integer priceCents,
        @NotNull Boolean available) {}

    private final CoffeeStore store;
    private final OrderEvents events;
    public CoffeeController(CoffeeStore store, OrderEvents events) { this.store = store; this.events = events; }

    @GetMapping("/shop")
    public Map<String, Object> shop() {
        return Map.of("name", "Purr & Pour", "currency", "USD",
            "announcement", "Good coffee. Better company.", "paymentEnabled", false,
            "rabbitEnabled", events.rabbitEnabled(), "practiceMode", true, "pickupMinutes", 10);
    }
    @GetMapping("/menu") public List<Map<String, Object>> menu() { return store.menu(); }
    @GetMapping("/pets") public List<Map<String, Object>> pets() { return store.pets(); }
    @GetMapping("/me") public Map<String, Object> me(@AuthenticationPrincipal Identity who) { return store.me(who); }
    @PatchMapping("/me") public Map<String, Object> preferences(@AuthenticationPrincipal Identity who, @Valid @RequestBody PreferencesInput input) { return store.preferences(who, input); }
    @GetMapping("/orders") public List<Map<String, Object>> orders(@AuthenticationPrincipal Identity who) { return store.orders(who, false); }
    @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> place(@AuthenticationPrincipal Identity who, @Valid @RequestBody OrderInput input) { return store.place(who, input); }
    @GetMapping("/staff/orders") public List<Map<String, Object>> staffOrders(@AuthenticationPrincipal Identity who) { return store.orders(who, true); }
    @PatchMapping("/staff/orders/{id}")
    public Map<String, Object> updateOrder(@PathVariable String id, @Valid @RequestBody OrderStatusInput input) { return store.transition(id, input.status()); }
    @PatchMapping("/admin/menu/{id}")
    public Map<String, Object> updateMenu(@PathVariable String id, @Valid @RequestBody MenuItemInput input) { return store.updateMenu(id, input); }
    @GetMapping(value="/events", produces="text/event-stream")
    public SseEmitter subscribe(@AuthenticationPrincipal Identity who) { return events.subscribe(who); }

    @RestControllerAdvice
    public static class Errors {
        @ExceptionHandler(ResponseStatusException.class)
        ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "Request failed" : e.getReason()));
        }
        @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
        ResponseEntity<Map<String, String>> invalid(Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please check the required fields and selected options."));
        }
    }
}
