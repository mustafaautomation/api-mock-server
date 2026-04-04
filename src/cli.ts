#!/usr/bin/env node

import fs from 'fs';
import { MockServer } from './server/mock-server';
import { MockConfig } from './core/types';

const args = process.argv.slice(2);
const configPath = args[0] || 'mock-config.json';

if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`);
  console.error('Usage: mock-api [config.json]');
  process.exit(1);
}

const config: MockConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const server = new MockServer(config);
server.start();
