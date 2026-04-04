import express, { Request, Response } from 'express';
import http from 'http';
import { MockConfig, MockRoute, RequestLog, DEFAULT_CONFIG } from '../core/types';
import { matchRoute, extractParams } from '../core/matcher';

export class MockServer {
  private config: MockConfig;
  private app: express.Application;
  private server: http.Server | null = null;
  private logs: RequestLog[] = [];

  constructor(config: Partial<MockConfig> & { routes: MockRoute[] }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.app = this.createApp();
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        if (this.config.logging) {
          console.log(`Mock API server running on http://localhost:${this.config.port}`);
          console.log(`Routes: ${this.config.routes.length} configured`);
        }
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  getLogs(): RequestLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  getPort(): number {
    return this.config.port;
  }

  addRoute(route: MockRoute): void {
    this.config.routes.push(route);
  }

  private createApp(): express.Application {
    const app = express();
    app.use(express.json());

    if (this.config.cors) {
      app.use((_req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
        next();
      });
    }

    // Admin endpoints
    app.get('/__mock/logs', (_req: Request, res: Response) => {
      res.json(this.logs);
    });

    app.delete('/__mock/logs', (_req: Request, res: Response) => {
      this.clearLogs();
      res.json({ cleared: true });
    });

    app.get('/__mock/routes', (_req: Request, res: Response) => {
      res.json(this.config.routes);
    });

    // Catch-all route matcher
    app.all('*', async (req: Request, res: Response) => {
      const start = Date.now();
      const route = matchRoute(this.config.routes, req.method, req.path);

      if (!route) {
        this.logRequest(req.method, req.path, 404, Date.now() - start, false);
        res.status(404).json({
          error: 'No matching mock route',
          method: req.method,
          path: req.path,
          availableRoutes: this.config.routes.map((r) => `${r.method} ${r.path}`),
        });
        return;
      }

      // Apply delay
      const delay = route.delay ?? this.config.defaultDelay ?? 0;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Set custom headers
      if (route.headers) {
        for (const [key, value] of Object.entries(route.headers)) {
          res.header(key, value);
        }
      }

      // Build dynamic response
      let body = route.body;
      if (typeof body === 'object' && body !== null) {
        const params = extractParams(route.path, req.path);
        body = interpolateBody(body, params, req.query as Record<string, string>);
      }

      this.logRequest(req.method, req.path, route.status, Date.now() - start, true);
      res.status(route.status).json(body);
    });

    return app;
  }

  private logRequest(
    method: string,
    path: string,
    status: number,
    duration: number,
    matched: boolean,
  ): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      method,
      path,
      status,
      duration,
      matched,
    });

    if (this.config.logging) {
      const icon = matched ? '✓' : '✗';
      console.log(`  ${icon} ${method} ${path} → ${status} (${duration}ms)`);
    }
  }
}

function interpolateBody(
  body: unknown,
  params: Record<string, string>,
  query: Record<string, string>,
): unknown {
  const json = JSON.stringify(body);
  let result = json;

  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`{{params\\.${key}}}`, 'g'), value);
  }
  for (const [key, value] of Object.entries(query)) {
    result = result.replace(new RegExp(`{{query\\.${key}}}`, 'g'), value);
  }

  return JSON.parse(result);
}
