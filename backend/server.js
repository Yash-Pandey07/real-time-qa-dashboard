require('dotenv').config();
const http      = require('http');
const express   = require('express');
const cors      = require('cors');
const WebSocket = require('ws');
const config    = require('./config');
const apiRouter = require('./routes/api');
const poller    = require('./services/poller');

const app = express();
app.use(cors({ origin: true }));
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

const PORT = config.server.port;
server.listen(PORT, () => { console.log(`Backend running on http://localhost:${PORT}`); });
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
