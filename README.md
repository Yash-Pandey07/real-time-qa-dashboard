# QA Intelligence Dashboard
<img width="1280" height="673" alt="Screenshot 2026-04-26 050625" src="https://github.com/user-attachments/assets/5fc7ccda-6814-48f2-9dbf-c502c6f2a16d" />
<img width="1280" height="672" alt="Screenshot 2026-04-26 051012" src="https://github.com/user-attachments/assets/1d4ac935-67e0-46d3-812a-77c3b1d09a40" />
<img width="1280" height="675" alt="Screenshot 2026-04-26 051113" src="https://github.com/user-attachments/assets/250354a3-69a8-4511-8871-f10c4ae3d5d1" />
<img width="1280" height="672" alt="Screenshot 2026-04-26 051126" src="https://github.com/user-attachments/assets/406fdd51-1fbd-4599-9825-6bceb5747c09" />
<img width="1280" height="575" alt="Screenshot 2026-04-26 051147" src="https://github.com/user-attachments/assets/5385100c-aac1-4d3e-87cb-3673e9c64182" />
<img width="1280" height="673" alt="Screenshot 2026-04-26 051205" src="https://github.com/user-attachments/assets/0fc562b8-930e-4df7-a6e1-43c43de7095f" />
<img width="1277" height="468" alt="Screenshot 2026-04-26 051213" src="https://github.com/user-attachments/assets/f2d4ba04-ce10-4752-b4c4-1bdfa8271acf" />
<img width="1280" height="677" alt="Screenshot 2026-04-26 051223" src="https://github.com/user-attachments/assets/bce462b7-90bb-41c5-9fe2-8241cf03703e" />
<img width="1280" height="631" alt="Screenshot 2026-04-26 051236" src="https://github.com/user-attachments/assets/2652c025-cc72-4c23-97db-c826f1480181" />
<img width="1280" height="675" alt="Screenshot 2026-04-26 051252" src="https://github.com/user-attachments/assets/b09fc38b-6e50-487d-8702-ef0da660e822" />
<img width="1280" height="592" alt="Screenshot 2026-04-26 051056" src="https://github.com/user-attachments/assets/152deaf4-315e-4896-94f7-c286fdf1e1fe" />

A live QA intelligence platform that aggregates CI/CD pipeline status, Jira bug tracking, test results, and self-healing automation metrics into a single real-time dashboard — with auto-detected bottleneck analysis.

![CI](https://github.com/Yash-Pandey07/real-time-qa-dashboard/actions/workflows/ci.yml/badge.svg)
![Stack](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green) ![Stack](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-blue) ![Stack](https://img.shields.io/badge/Realtime-WebSockets-orange) ![Stack](https://img.shields.io/badge/Deployed-Railway%20%2B%20Vercel-purple)

**Live:** [project-p0adc.vercel.app](https://project-p0adc.vercel.app)

---

## What It Does

| Question | Where it's answered |
|----------|-------------------|
| What is the overall project health at a glance? | **Overview** (CEO/CTO landing page) |
| Are CI pipelines passing or failing right now? | Heat Map + CI Pipeline section |
| Which repos have been failing repeatedly? | Heat Map + Bottleneck detection |
| How many bugs are open across Jira projects? | Jira Board section |
| What percentage of tests are passing? | Test Results section |
| What is the single most important thing to fix? | Bottlenecks section (auto-detected, severity-ranked) |
| How is our self-healing automation performing? | Self-Healing Pipeline section |

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
| Analytics | Vercel Analytics |
| Styling | Inline styles (dark theme) |
| Backend hosting | Railway |
| Frontend hosting | Vercel |

---

## Project Structure

```
real-time-qa-dashboard/
├── backend/
│   ├── server.js           # Express + WebSocket server
│   ├── config.js           # Repos, Jira projects, polling intervals
│   ├── adapters/
│   │   ├── github.js       # GitHub Actions + check-runs fetcher
│   │   ├── jira.js         # Jira REST API v2 fetcher
│   │   └── selfhealing.js  # Self-healing CI + dashboard-data branch fetcher
│   ├── services/
│   │   ├── cache.js        # In-memory TTL cache (with del support)
│   │   ├── poller.js       # Scheduler — polls APIs, broadcasts via WebSocket
│   │   └── bottleneck.js   # Rule-based bottleneck detection (8 rules)
│   └── routes/
│       └── api.js          # REST endpoints
├── frontend/
│   └── src/
│       ├── App.jsx         # Root — state, WebSocket wiring, nav
│       ├── hooks/
│       │   └── useWebSocket.js      # Auto-reconnecting WebSocket (wss:// aware)
│       └── components/
│           ├── Header.jsx           # Live clock, LIVE/RECONNECTING badge, refresh
│           ├── SummaryCards.jsx     # 4 KPI cards
│           ├── OverviewPage.jsx     # CEO/CTO landing — CI + JIRA + Tests + Self-Healing
│           ├── HeatMap.jsx          # Pipeline grid — last 30 runs per repo
│           ├── CIPipeline.jsx       # Filterable pipeline run table
│           ├── JiraBoard.jsx        # Charts + issue table — KAFKA, HADOOP, SPARK (JIRA)
│           ├── TestResults.jsx      # Zephyr-format cycles + executions
│           ├── Bottlenecks.jsx      # Auto-detected issues with source navigation
│           └── SelfHealingPipeline.jsx  # Self-healing metrics, test breakdown, run history
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions — syntax check + build on every push/PR
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
git clone https://github.com/Yash-Pandey07/real-time-qa-dashboard.git
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

### 4. Run locally
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

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Backend (Node.js + WebSocket) | Railway | https://real-time-qa-dashboard-production.up.railway.app |    
| Frontend (React + Vite) | Vercel |  https://project-p0adc.vercel.app |

Auto-deploys on every push to `main`. Environment variables are set in each platform's dashboard — never stored in the repo.

### Frontend environment variables (set in Vercel)
```
VITE_API_URL=https://your-app.railway.app
VITE_WS_URL=wss://real-time-qa-dashboard-production.up.railway.app/ws
```

---

## Data Sources

| Source | What it provides |
|--------|----------------|
| GitHub Actions (`microsoft/vscode`, `facebook/react`, `vercel/next.js`, `nodejs/node`) | Live CI pipeline runs — last 15 per repo, polled every 10 min |
| Apache Jira — KAFKA, HADOOP, SPARK (public) | Real bug/issue data, polled every 15 min |
| GitHub Check Runs (normalised to Zephyr format) | Test execution results |
| `riyabhatia45/QAi` — `dashboard-data` branch | Self-healing automation metrics, per-test breakdown, full run history — polled every 60s |

All sources are **public APIs** — the dashboard works out of the box with just a GitHub token.

---

## Dashboard Sections

### 🏠 Overview (Landing Page)
Executive-level summary for CEO/CTO. Shows all three data sources — Open Source CI Pipelines, Apache Kafka/Hadoop/Spark JIRA projects, and Zephyr test cycles — on a single screen as clickable panels. Each panel navigates to the full detail tab. Critical bottlenecks are surfaced at the bottom.

### 🔥 Heat Map
- Last **30 runs** per repository, colour-coded by status
- **Trend indicator** per repo: ↑ Improving / → Stable / ↓ Degrading (compares last 10 vs previous 10 runs)
- **Average duration** displayed per repo
- **Hover any cell** — portal tooltip shows branch, commit SHA, actor, duration, time ago (never clipped by container)
- **Expand failures** — inline panel shows last 3 failures with commit, branch, and GitHub link
- **Summary bar** — total runs, passed, failed, overall rate across all repos

### ⚙️ CI Pipeline
Filterable table of all runs. Filter by status and repo. Columns: status, repo, branch, commit, workflow, duration, actor, GitHub link.

### 🐛 Jira Board — KAFKA · HADOOP · SPARK (JIRA)
Tracks Apache Kafka, Apache Hadoop, and Apache Spark open source projects via Apache's public JIRA. Bar charts (status + priority distribution) above a filterable issue table. Project keys (KAFKA, HADOOP, SPARK) are displayed as labels on every view.

### ✅ Test Results
Zephyr-format test cycles with donut charts, stat chips, and individual execution list.

### ⚡ Self-Healing Pipeline
Live view of the team's Playwright self-healing automation (`riyabhatia45/QAi`):
- **Latest Run Metrics** — Tests run, Passed, Failed, Selector Heals, Flow Recoveries, Time Saved, Heal Rate
- **All-Time Totals** — aggregated across all stored runs
- **Test Case Breakdown** — per-test table with search, pass/fail filter, steps, heals, duration
- **Run History** — all historical runs with filters (Healthy / Had Failures) and sort (Date / Heal Rate / Failures)
- **30-day Activity Chart** — full-width bar chart, one bar per day
- Updates within **~7 seconds** of a CI run completing (via GitHub webhook) or within **60 seconds** via polling
- Also shown as a summary panel on the Overview page

### 🤖 Bottlenecks
Auto-detected issues with:
- Severity ranking (Critical → High → Medium → Low)
- **Source badge** showing which system the issue came from (GitHub Actions / Jira / Zephyr) — **clickable, navigates directly to that section**
- Detection timestamp
- Expandable description + actionable recommendation

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

## Bottleneck Detection

The bottleneck engine analyses live data across all sources after every poll cycle (rule-based, not ML):

| Rule | Triggers when | Severity |
|------|--------------|----------|
| High CI failure rate | ≥50% of runs failed in a module | High (≥80% → Critical) |
| Consecutive failures | Last 3+ runs all failed | Critical |
| Duration spike | Latest run took >2× the average | Medium |
| Stuck pipeline | A run in-progress for over 1 hour | High |
| Bug cluster | ≥5 open bugs in the same component | High (≥10 → Critical) |
| Critical bugs | ≥3 unresolved Critical/Blocker bugs | High |
| WIP pile-up | >50% of issues are "In Progress" | Medium |
| Low test pass rate | Overall pass rate <70% | High (<50% → Critical) |

Each bottleneck includes severity, source system, description, metric, and actionable recommendation.

---

## REST API

Backend base URL: `https://your-app.railway.app`
Local: `http://localhost:3001`

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Health check |
| `GET /api/ci/runs` | Pipeline runs |
| `GET /api/ci/heatmap` | Heatmap grid (30 runs per repo) |
| `GET /api/jira/issues` | Jira issues |
| `GET /api/tests/cycles` | Test cycles |
| `GET /api/tests/executions` | Test executions |
| `GET /api/bottlenecks` | Detected bottlenecks |
| `POST /api/refresh` | Force re-fetch (flush cache) |
| `POST /webhooks/github` | GitHub webhook — triggers instant self-healing refresh on CI completion |

---

## CI / Quality Gate

GitHub Actions runs on every push and pull request to `main`:
- **Backend job** — `node --check` on all key files + module load verification
- **Frontend job** — full Vite production build

Both jobs must pass before a PR can be merged. Badge at the top of this README shows current status.

## Roadmap

- [ ] Supabase integration — persist CI runs, bottlenecks, and incidents across restarts
- [ ] Self-healing trend charts — heal rate over time, per-test history
- [ ] Auto-rerun — detect consecutive failures and trigger GitHub Actions re-run automatically
- [ ] Connect your own GitHub repos and Jira projects

---

## License

MIT
