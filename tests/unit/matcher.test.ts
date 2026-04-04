import { describe, it, expect } from 'vitest';
import { matchRoute, extractParams } from '../../src/core/matcher';
import { MockRoute } from '../../src/core/types';

const routes: MockRoute[] = [
  { method: 'GET', path: '/api/users', status: 200, body: [] },
  { method: 'GET', path: '/api/users/:id', status: 200, body: {} },
  { method: 'POST', path: '/api/users', status: 201, body: {} },
  { method: 'DELETE', path: '/api/users/:id', status: 204 },
];

describe('matchRoute', () => {
  it('should match exact path', () => {
    const match = matchRoute(routes, 'GET', '/api/users');
    expect(match).not.toBeNull();
    expect(match?.status).toBe(200);
  });

  it('should match parameterized path', () => {
    const match = matchRoute(routes, 'GET', '/api/users/42');
    expect(match).not.toBeNull();
    expect(match?.path).toBe('/api/users/:id');
  });

  it('should match by method', () => {
    const match = matchRoute(routes, 'POST', '/api/users');
    expect(match?.status).toBe(201);
  });

  it('should return null for unmatched path', () => {
    expect(matchRoute(routes, 'GET', '/api/products')).toBeNull();
  });

  it('should return null for unmatched method', () => {
    expect(matchRoute(routes, 'PATCH', '/api/users')).toBeNull();
  });

  it('should strip query string before matching', () => {
    const match = matchRoute(routes, 'GET', '/api/users?page=1');
    expect(match).not.toBeNull();
  });

  it('should be case-insensitive on method', () => {
    const match = matchRoute(routes, 'get', '/api/users');
    expect(match).not.toBeNull();
  });
});

describe('extractParams', () => {
  it('should extract single param', () => {
    const params = extractParams('/api/users/:id', '/api/users/42');
    expect(params).toEqual({ id: '42' });
  });

  it('should extract multiple params', () => {
    const params = extractParams('/api/:org/:repo/pulls', '/api/quvantic/app/pulls');
    expect(params).toEqual({ org: 'quvantic', repo: 'app' });
  });

  it('should return empty for no params', () => {
    expect(extractParams('/api/users', '/api/users')).toEqual({});
  });

  it('should strip query string', () => {
    const params = extractParams('/api/users/:id', '/api/users/5?fields=name');
    expect(params).toEqual({ id: '5' });
  });
});
