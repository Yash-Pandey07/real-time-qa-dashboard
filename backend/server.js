require('dotenv').config();
const http        = require('http');
const express     = require('express');
const cors        = require('cors');
const compression = require('compression');
const crypto      = require('crypto');
const WebSocket   = require('ws');
const config    = require('./config');
const apiRouter = require('./routes/api');
const poller    = require('./services/poller');

if (!config.github.token) {
  console.warn('[Config] WARNING: GITHUB_TOKEN not set — GitHub API limited to 60 req/hr (unauthenticated)');
}

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || true; // true = open during dev; set env var in prod

const app = express();
app.use(compression());
app.use(cors({ origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] }));
app.use(express.json());
app.use('/api', apiRouter);
app.get('/', (req, res) => res.json({ service: 'QA Dashboard API', status: 'running' }));

const server = http.createServer(app);
const wss    = new WebSocket.Server({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total: ${clients.size}`);
  sendToClient(ws, 'connected', { message: 'Connected to QA Dashboard', timestamp: new Date().toISOString() });

  const state = poller.getState();
  if (state.ciRuns.length)               sendToClient(ws, 'ci:update',          { runs: state.ciRuns, fetchedAt: state.lastPollAt.ci });
  if (state.jiraData.allIssues?.length)  sendToClient(ws, 'jira:update',        { ...state.jiraData });
  if (state.testData.testCycles?.length) sendToClient(ws, 'tests:update',       { ...state.testData });
  if (state.bottlenecks.length)          sendToClient(ws, 'bottlenecks:update', { bottlenecks: state.bottlenecks });
  if (state.selfHealing)                 sendToClient(ws, 'selfhealing:update', { ...state.selfHealing });

  ws.on('message', (raw) => { try { const msg = JSON.parse(raw.toString()); if (msg.type === 'ping') sendToClient(ws, 'pong', { ts: Date.now() }); } catch {} });
  ws.on('close',   () => { clients.delete(ws); console.log(`[WS] Client disconnected. Total: ${clients.size}`); });
  ws.on('error',   (err) => { console.error('[WS] Error:', err.message); clients.delete(ws); });
});

function sendToClient(ws, type, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try { ws.send(JSON.stringify({ type, payload, ts: Date.now() })); } catch {}
}

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) { try { ws.send(msg); } catch { clients.delete(ws); } }
  }
}

poller.start(broadcast);

// ─── GitHub Webhook (instant update when Riya's CI completes) ─────────────────
// Setup: riyabhatia45/QAi → Settings → Webhooks
//   Payload URL: https://<railway-url>/webhooks/github
//   Content type: application/json
//   Secret: value of GITHUB_WEBHOOK_SECRET env var
//   Events: Workflow runs
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

function verifyGithubSignature(req) {
  if (!WEBHOOK_SECRET) return true; // skip verification if secret not configured (dev mode)
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return false; }
}

app.post('/webhooks/github', (req, res) => {
  if (!verifyGithubSignature(req)) {
    console.warn('[Webhook] Rejected request with invalid signature');
    return res.sendStatus(401);
  }
  res.sendStatus(200);
  const event  = req.headers['x-github-event'];
  const action = req.body?.action;
  const repo   = req.body?.workflow_run?.head_repository?.full_name || req.body?.repository?.full_name;

  if (event === 'workflow_run' && action === 'completed' && repo === 'riyabhatia45/QAi') {
    console.log('[Webhook] workflow_run completed on riyabhatia45/QAi — triggering immediate self-healing poll');
    setTimeout(() => poller.pollSelfHealingNow(), 5000);
  }
});

const PORT = config.server.port;
server.listen(PORT, () => { console.log(`Backend running on http://localhost:${PORT}`); });
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
