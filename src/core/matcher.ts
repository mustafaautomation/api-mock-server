import { MockRoute } from './types';

export function matchRoute(routes: MockRoute[], method: string, path: string): MockRoute | null {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = path.split('?')[0]; // Strip query string

  for (const route of routes) {
    if (route.method !== normalizedMethod) continue;

    if (matchPath(route.path, normalizedPath)) {
      return route;
    }
  }

  return null;
}

function matchPath(pattern: string, actual: string): boolean {
  // Exact match
  if (pattern === actual) return true;

  // Pattern with :params (e.g., /users/:id)
  const patternParts = pattern.split('/');
  const actualParts = actual.split('/');

  if (patternParts.length !== actualParts.length) return false;

  return patternParts.every((part, i) => part.startsWith(':') || part === actualParts[i]);
}

export function extractParams(pattern: string, actual: string): Record<string, string> {
  const params: Record<string, string> = {};
  const patternParts = pattern.split('/');
  const actualParts = actual.split('?')[0].split('/');

  patternParts.forEach((part, i) => {
    if (part.startsWith(':')) {
      params[part.slice(1)] = actualParts[i];
    }
  });

  return params;
}
