import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockServer } from '../../src/server/mock-server';

let server: MockServer;
let baseUrl: string;

beforeAll(async () => {
  server = new MockServer({
    port: 0, // random port
    logging: false,
    routes: [
      { method: 'GET', path: '/api/health', status: 200, body: { status: 'ok' } },
      { method: 'GET', path: '/api/users', status: 200, body: [{ id: 1, name: 'Alice' }] },
      {
        method: 'GET',
        path: '/api/users/:id',
        status: 200,
        body: { id: '{{params.id}}', name: 'User' },
      },
      { method: 'POST', path: '/api/users', status: 201, body: { created: true } },
      { method: 'GET', path: '/api/slow', status: 200, body: { slow: true }, delay: 50 },
    ],
  });

  // Use dynamic port
  const app = (
    server as unknown as {
      app: { listen: (port: number, cb: () => void) => { address: () => { port: number } } };
    }
  ).app;
  await new Promise<void>((resolve) => {
    const srv = app.listen(0, () => {
      const addr = srv.address() as { port: number };
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
    (server as unknown as { server: typeof srv }).server = srv;
  });
});

afterAll(async () => {
  await server.stop();
});

describe('MockServer', () => {
  it('should respond to health check', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('should return mock user list', async () => {
    const res = await fetch(`${baseUrl}/api/users`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Alice');
  });

  it('should interpolate path params', async () => {
    const res = await fetch(`${baseUrl}/api/users/42`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('42');
  });

  it('should return 201 for POST', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    });
    expect(res.status).toBe(201);
  });

  it('should return 404 for unmatched route', async () => {
    const res = await fetch(`${baseUrl}/api/unknown`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('No matching');
  });

  it('should return logs via admin endpoint', async () => {
    const res = await fetch(`${baseUrl}/__mock/logs`);
    expect(res.status).toBe(200);
    const logs = await res.json();
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should return routes via admin endpoint', async () => {
    const res = await fetch(`${baseUrl}/__mock/routes`);
    expect(res.status).toBe(200);
    const routes = await res.json();
    expect(routes.length).toBe(5);
  });
});
