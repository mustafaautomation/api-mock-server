# API Mock Server

[![CI](https://github.com/mustafaautomation/api-mock-server/actions/workflows/ci.yml/badge.svg)](https://github.com/mustafaautomation/api-mock-server/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

Configurable API mock server for testing. Define routes in JSON, get a running server with dynamic responses, request logging, and admin endpoints. Zero code required.

---

## Why

- **Test without real APIs** — mock any backend with a JSON config
- **Dynamic responses** — path params interpolated into response bodies
- **Simulated latency** — per-route or global delay for performance testing
- **Request logging** — inspect what your app sent via `/__mock/logs`
- **Docker ready** — ship as a container in your test pipeline

---

## Quick Start

```bash
# CLI
npx mock-api examples/mock-config.json

# Library
import { MockServer } from 'api-mock-server';

const server = new MockServer({
  port: 4000,
  routes: [
    { method: 'GET', path: '/api/users', status: 200, body: [{ id: 1 }] },
    { method: 'GET', path: '/api/users/:id', status: 200, body: { id: '{{params.id}}' } },
    { method: 'POST', path: '/api/users', status: 201, body: { created: true } },
  ],
});

await server.start();
```

---

## Config Format

```json
{
  "port": 4000,
  "cors": true,
  "defaultDelay": 100,
  "routes": [
    {
      "method": "GET",
      "path": "/api/users/:id",
      "status": 200,
      "body": { "id": "{{params.id}}", "name": "User {{params.id}}" },
      "delay": 200,
      "description": "Get user by ID"
    }
  ]
}
```

### Route Options

| Field | Type | Description |
|-------|------|-------------|
| `method` | string | HTTP method |
| `path` | string | URL pattern (supports `:params`) |
| `status` | number | Response status code |
| `body` | any | Response body (supports `{{params.x}}`) |
| `headers` | object | Custom response headers |
| `delay` | number | Response delay in ms |

---

## Admin Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /__mock/logs` | View all request logs |
| `DELETE /__mock/logs` | Clear request logs |
| `GET /__mock/routes` | View configured routes |

---

## Docker

```bash
docker build -t mock-api .
docker run --rm -p 4000:4000 -v $(pwd)/mock-config.json:/app/mock-config.json mock-api
```

---

## Project Structure

```
api-mock-server/
├── src/
│   ├── core/
│   │   ├── types.ts       # MockRoute, MockConfig, RequestLog
│   │   └── matcher.ts     # Route matching with :param support
│   ├── server/
│   │   └── mock-server.ts # Express server with logging + admin
│   ├── cli.ts
│   └── index.ts
├── tests/unit/
│   ├── matcher.test.ts     # 11 tests — route matching + params
│   └── mock-server.test.ts # 7 tests — full server integration
├── examples/
│   └── mock-config.json    # 6 example routes
├── Dockerfile
└── .github/workflows/ci.yml
```

---

## License

MIT

---

Built by [Quvantic](https://quvantic.com)
