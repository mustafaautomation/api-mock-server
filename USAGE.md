## Real-World Use Cases

### 1. Frontend Development
```bash
# Start mock server with your API config
npx mock-api mock-config.json
# Frontend connects to http://localhost:4000 instead of real API
```

### 2. Integration Test Isolation
```typescript
const server = new MockServer({
  port: 4000,
  routes: [
    { method: "POST", path: "/api/payment", status: 200, body: { success: true } },
    { method: "POST", path: "/api/payment", status: 500, body: { error: "timeout" }, delay: 3000 },
  ],
});
await server.start();
// Run tests against mock
```

### 3. Webhook Testing
```json
{ "method": "POST", "path": "/webhook/stripe", "status": 200, "body": { "received": true } }
```
