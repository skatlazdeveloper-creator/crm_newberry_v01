import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import webhook from './api/webhook.js';
import importReport from './api/import.js';
import health from './api/health.js';

const app = express();
const root = dirname(fileURLToPath(import.meta.url));

// Keep original request bytes for verification of Chatwoot HMAC signatures.
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); },
}));
app.use(express.static(join(root, 'public')));
app.all('/api/webhook', webhook);
app.all('/api/import', importReport);
app.all('/api/health', health);

export default app;
