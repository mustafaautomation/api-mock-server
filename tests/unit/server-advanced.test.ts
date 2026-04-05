import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockServer } from '../../src/server/mock-server';

let server: MockServer;
let baseUrl: string;

beforeAll(async () => {
  server = new MockServer({
    port: 0,
    logging: false,
    routes: [
      {
        method: 'GET',
        path: '/users',
        status: 200,
        body: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      },
      {
        method: 'GET',
        path: '/users/:id',
        status: 200,
        body: { id: '{{params.id}}', name: 'User' },
      },
      { method: 'POST', path: '/users', status: 201, body: { created: true } },
      {
        method: 'PUT',
        path: '/users/:id',
        status: 200,
        body: { updated: true, id: '{{params.id}}' },
      },
      { method: 'DELETE', path: '/users/:id', status: 204 },
      { method: 'GET', path: '/slow', status: 200, body: { ok: true }, delay: 100 },
      {
        method: 'GET',
        path: '/custom-headers',
        status: 200,
        body: {},
        headers: { 'X-Custom': 'test-value' },
      },
      {
        method: 'GET',
        path: '/search',
        status: 200,
        body: { query: '{{query.q}}', page: '{{query.page}}' },
      },
      { method: 'GET', path: '/error', status: 500, body: { error: 'Internal Server Error' } },
    ],
  });

  // Use port 0 to get random available port
  const net = await import('net');
  const tempServer = net.createServer();
  await new Promise<void>((r) => tempServer.listen(0, () => r()));
  const port = (tempServer.address() as { port: number }).port;
  tempServer.close();

  server = new MockServer({
    port,
    logging: false,
    routes: [
      {
        method: 'GET',
        path: '/users',
        status: 200,
        body: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      },
      {
        method: 'GET',
        path: '/users/:id',
        status: 200,
        body: { id: '{{params.id}}', name: 'User' },
      },
      { method: 'POST', path: '/users', status: 201, body: { created: true } },
      {
        method: 'PUT',
        path: '/users/:id',
        status: 200,
        body: { updated: true, id: '{{params.id}}' },
      },
      { method: 'DELETE', path: '/users/:id', status: 204 },
      { method: 'GET', path: '/slow', status: 200, body: { ok: true }, delay: 50 },
      {
        method: 'GET',
        path: '/custom-headers',
        status: 200,
        body: {},
        headers: { 'X-Custom': 'test-value' },
      },
      {
        method: 'GET',
        path: '/search',
        status: 200,
        body: { query: '{{query.q}}', page: '{{query.page}}' },
      },
      { method: 'GET', path: '/error', status: 500, body: { error: 'Internal Server Error' } },
    ],
  });

  await server.start();
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  await server.stop();
});

describe('MockServer — CRUD routes', () => {
  it('should return user list on GET /users', async () => {
    const res = await fetch(`${baseUrl}/users`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Alice');
  });

  it('should return user by ID with param interpolation', async () => {
    const res = await fetch(`${baseUrl}/users/42`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe('42');
  });

  it('should return 201 on POST /users', async () => {
    const res = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Charlie' }),
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.created).toBe(true);
  });

  it('should handle PUT with param interpolation', async () => {
    const res = await fetch(`${baseUrl}/users/7`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe('7');
    expect(data.updated).toBe(true);
  });

  it('should return 204 on DELETE', async () => {
    const res = await fetch(`${baseUrl}/users/1`, { method: 'DELETE' });
    expect(res.status).toBe(204);
  });
});

describe('MockServer — dynamic features', () => {
  it('should interpolate query parameters', async () => {
    const res = await fetch(`${baseUrl}/search?q=test&page=3`);
    const data = await res.json();
    expect(data.query).toBe('test');
    expect(data.page).toBe('3');
  });

  it('should apply response delay', async () => {
    const start = Date.now();
    await fetch(`${baseUrl}/slow`);
    const duration = Date.now() - start;
    expect(duration).toBeGreaterThanOrEqual(40); // ~50ms delay with tolerance
  });

  it('should set custom response headers', async () => {
    const res = await fetch(`${baseUrl}/custom-headers`);
    expect(res.headers.get('x-custom')).toBe('test-value');
  });

  it('should return error status codes', async () => {
    const res = await fetch(`${baseUrl}/error`);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal Server Error');
  });
});

describe('MockServer — unmatched routes', () => {
  it('should return 404 for unmatched path', async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('No matching');
    expect(data.availableRoutes).toBeInstanceOf(Array);
  });

  it('should return 404 for wrong method', async () => {
    const res = await fetch(`${baseUrl}/users`, { method: 'PATCH' });
    expect(res.status).toBe(404);
  });
});

describe('MockServer — admin API', () => {
  it('should list request logs', async () => {
    server.clearLogs();
    await fetch(`${baseUrl}/users`);
    await fetch(`${baseUrl}/users/1`);

    const res = await fetch(`${baseUrl}/__mock/logs`);
    const logs = await res.json();
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0].matched).toBe(true);
  });

  it('should clear logs', async () => {
    await fetch(`${baseUrl}/users`);
    const clearRes = await fetch(`${baseUrl}/__mock/logs`, { method: 'DELETE' });
    const data = await clearRes.json();
    expect(data.cleared).toBe(true);

    const logsRes = await fetch(`${baseUrl}/__mock/logs`);
    const logs = await logsRes.json();
    expect(logs).toHaveLength(0);
  });

  it('should list configured routes', async () => {
    const res = await fetch(`${baseUrl}/__mock/routes`);
    const routes = await res.json();
    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0].method).toBeDefined();
    expect(routes[0].path).toBeDefined();
  });
});

describe('MockServer — CORS', () => {
  it('should include CORS headers', async () => {
    const res = await fetch(`${baseUrl}/users`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
