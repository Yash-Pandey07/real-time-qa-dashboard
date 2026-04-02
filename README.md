# Real-Time QA Intelligence Dashboard

A live QA intelligence platform that aggregates CI/CD pipeline status, Jira bug tracking, and test results into a single real-time dashboard — with AI-powered bottleneck detection.

![Stack](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green) ![Stack](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-blue) ![Stack](https://img.shields.io/badge/Realtime-WebSockets-orange)

---

## What It Does

| Question | Where it's answered |
|----------|-------------------|
| Are CI pipelines passing or failing right now? | Heat Map + CI Pipeline section |
| Which repos have been failing repeatedly? | Heat Map + Bottleneck detection |
| How many bugs are open across Jira projects? | Jira Board section |
| What percentage of tests are passing? | Test Results section |
| What is the single most important thing to fix? | Bottlenecks section (AI-ranked) |

Every number updates automatically via WebSockets — no refresh needed.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Real-time | WebSockets (`ws`) |
| HTTP client | Axios |
| Frontend | React 18 + Vite |
| Charts | Recharts + Chart.js |
| Styling | Inline styles (dark theme) |

---

## Project Structure

```
real-time-qa-dashboard/
├── backend/
│   ├── server.js           # Express + WebSocket server (port 3001)
│   ├── config.js           # Repos, Jira projects, polling intervals
│   ├── adapters/
│   │   ├── github.js       # GitHub Actions + check-runs fetcher
│   │   └── jira.js         # Jira REST API v2 fetcher
│   ├── services/
│   │   ├── cache.js        # In-memory TTL cache
│   │   ├── poller.js       # Scheduler — polls APIs and broadcasts
│   │   └── bottleneck.js   # AI bottleneck detection (8 rules)
│   └── routes/
│       └── api.js          # REST endpoints
├── frontend/
│   └── src/
│       ├── App.jsx         # Root — state, WebSocket wiring, nav
│       ├── hooks/
│       │   └── useWebSocket.js  # Auto-reconnecting WebSocket hook
│       └── components/
│           ├── Header.jsx
│           ├── SummaryCards.jsx
│           ├── HeatMap.jsx
│           ├── CIPipeline.jsx
│           ├── JiraBoard.jsx
│           ├── TestResults.jsx
│           └── Bottlenecks.jsx
├── .env.example
└── start.bat               # Windows one-click launcher
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A GitHub Personal Access Token (free, no scopes required)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/real-time-qa-dashboard.git
cd real-time-qa-dashboard
```

### 2. Configure environment
```bash
cp .env.example backend/.env
```

Edit `backend/.env`:
```
GITHUB_TOKEN=your_github_pat_here
```
Get a token at: https://github.com/settings/tokens → Generate new token (classic) → no scopes needed.

### 3. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Run
**Option A — Windows (one click):**
```
start.bat
```

**Option B — Two terminals:**
```bash
# Terminal 1
cd backend && node server.js

# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Data Sources

| Source | What it provides |
|--------|----------------|
| GitHub Actions (microsoft/vscode, facebook/react, vercel/next.js, nodejs/node) | Live CI pipeline runs |
| Apache Jira — KAFKA, HADOOP, SPARK projects (public) | Real bug/issue data |
| GitHub Check Runs (normalised to Zephyr format) | Test execution results |

All sources are **public APIs** — the dashboard works out of the box with just a GitHub token.

---

## Connecting Your Own Data

### Your company's Jira
Edit `backend/.env`:
```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_TOKEN=your_api_token
```
Update project keys in `backend/config.js`. No other code changes needed.

### Your GitHub repos
Edit the `repos` array in `backend/config.js`.

---

## AI Bottleneck Detection

The bottleneck engine analyses live data and surfaces issues automatically:

| Rule | Triggers when |
|------|--------------|
| High CI failure rate | ≥50% of runs failed in a module |
| Consecutive failures | Last 3+ runs all failed |
| Duration spike | Latest run took >2× the average |
| Stuck pipeline | A run in-progress for over 1 hour |
| Bug cluster | ≥5 open bugs in the same component |
| Critical bugs | ≥3 unresolved Critical/Blocker bugs |
| WIP pile-up | >50% of issues are "In Progress" |
| Low test pass rate | Overall pass rate <70% |

Each bottleneck includes a severity (Critical / High / Medium), description, and actionable recommendation.

---

## REST API

Base URL: `http://localhost:3001`

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Health check |
| `GET /api/ci/runs` | Pipeline runs |
| `GET /api/ci/heatmap` | Heatmap grid |
| `GET /api/jira/issues` | Jira issues |
| `GET /api/tests/cycles` | Test cycles |
| `GET /api/tests/executions` | Test executions |
| `GET /api/bottlenecks` | Detected bottlenecks |
| `POST /api/refresh` | Force re-fetch (flush cache) |

---

## License

MIT
