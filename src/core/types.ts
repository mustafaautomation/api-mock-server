export interface MockRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  delay?: number;
  description?: string;
}

export interface MockConfig {
  port: number;
  routes: MockRoute[];
  defaultDelay?: number;
  cors?: boolean;
  logging?: boolean;
}

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  matched: boolean;
}

export const DEFAULT_CONFIG: MockConfig = {
  port: 4000,
  routes: [],
  defaultDelay: 0,
  cors: true,
  logging: true,
};
