package com.purrandpour;

import com.purrandpour.SecurityConfig.Identity;
import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Component
public class OrderEvents {
    private static final Logger log = LoggerFactory.getLogger(OrderEvents.class);
    private static final String EXCHANGE = "purr.order-status";
    private record Subscriber(Identity identity, SseEmitter emitter) {}
    private final Map<String, CopyOnWriteArrayList<Subscriber>> subscribers = new ConcurrentHashMap<>();
    private final JdbcTemplate db;
    private final CoffeeStore store;
    private CachingConnectionFactory connection;
    private RabbitTemplate rabbit;
    private SimpleMessageListenerContainer listener;

    public OrderEvents(JdbcTemplate db, CoffeeStore store) {
        this.db = db; this.store = store;
        String url = System.getenv("RABBITMQ_URL");
        if (url != null && !url.isBlank()) {
            connection = new CachingConnectionFactory();
            connection.setUri(url);
            connection.setPublisherConfirmType(CachingConnectionFactory.ConfirmType.CORRELATED);
            rabbit = new RabbitTemplate(connection);
            // Durable exchange; each app replica gets every notification. Reconnection
            // fetches the DB snapshot, so offline browser delivery need not be durable.
            var admin = new RabbitAdmin(connection);
            var exchange = new FanoutExchange(EXCHANGE, true, false);
            admin.declareExchange(exchange);
            var queue = new AnonymousQueue();
            admin.declareQueue(queue);
            admin.declareBinding(BindingBuilder.bind(queue).to(exchange));
            listener = new SimpleMessageListenerContainer(connection);
            listener.setQueueNames(queue.getName());
            listener.setMessageListener((MessageListener) message -> {
                var event = store.decode(new String(message.getBody(), java.nio.charset.StandardCharsets.UTF_8));
                broadcast((String) event.get("owner"), (String) event.get("id"), event.get("order"));
            });
            listener.start();
            log.info("RabbitMQ fanout transport enabled");
        } else {
            log.info("RabbitMQ not configured; using explicit single-process practice event transport");
        }
    }

    public boolean rabbitEnabled() { return rabbit != null; }

    public SseEmitter subscribe(Identity identity) {
        var group = subscribers.computeIfAbsent(identity.id(), k -> new CopyOnWriteArrayList<>());
        if (group.size() >= 5) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many open order streams");
        var emitter = new SseEmitter(30 * 60 * 1000L);
        var subscriber = new Subscriber(identity, emitter);
        group.add(subscriber);
        Runnable cleanup = () -> {
            group.remove(subscriber);
            if (group.isEmpty()) subscribers.remove(identity.id(), group);
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());
        try { emitter.send(SseEmitter.event().name("connected").data(Map.of("transport", rabbitEnabled() ? "rabbitmq" : "local-practice"))); }
        catch (Exception e) { cleanup.run(); emitter.complete(); }
        return emitter;
    }

    private void broadcast(String owner, String id, Object order) {
        for (var group : subscribers.values()) {
            for (var sub : group) {
                if (!sub.identity().id().equals(owner) && !List.of("staff", "admin").contains(sub.identity().role())) continue;
                try { sub.emitter().send(SseEmitter.event().id(id).name("order").data(order)); }
                catch (Exception e) { group.remove(sub); sub.emitter().complete(); }
            }
        }
    }

    @Scheduled(fixedDelay=1000)
    public void deliverOutbox() {
        // At-least-once publishing. Clients rehydrate rather than incrementing
        // loyalty counters from events, so a retried event cannot double-award.
        var pending = db.queryForList("SELECT id,owner_id,payload FROM coffee_outbox ORDER BY created_at LIMIT 30");
        for (var row : pending) {
            String id = (String) row.get("id");
            var event = Map.of("id", id, "owner", row.get("owner_id"), "order", store.decode(row.get("payload").toString()));
            try {
                if (rabbit != null) {
                    var correlation = new CorrelationData(id);
                    byte[] bytes = store.encode(event).getBytes(java.nio.charset.StandardCharsets.UTF_8);
                    var props = new MessageProperties();
                    props.setContentType("application/json");
                    props.setMessageId(id);
                    props.setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    rabbit.send(EXCHANGE, "", new Message(bytes, props), correlation);
                    var confirm = correlation.getFuture().get(4, TimeUnit.SECONDS);
                    if (!confirm.isAck()) throw new IllegalStateException("Broker did not acknowledge event");
                } else {
                    broadcast((String) row.get("owner_id"), id, event.get("order"));
                }
                db.update("DELETE FROM coffee_outbox WHERE id=?", id);
            } catch (Exception e) {
                log.warn("Order event delivery postponed; outbox retained ({})", e.getClass().getSimpleName());
                break;
            }
        }
    }

    @Scheduled(fixedDelay=20000)
    public void heartbeat() {
        for (var group : subscribers.values()) for (var sub : group) {
            try { sub.emitter().send(SseEmitter.event().comment("keepalive")); }
            catch (Exception e) { group.remove(sub); sub.emitter().complete(); }
        }
    }

    @PreDestroy
    public void close() {
        subscribers.values().forEach(g -> g.forEach(s -> s.emitter().complete()));
        if (listener != null) listener.stop();
        if (connection != null) connection.destroy();
    }
}
