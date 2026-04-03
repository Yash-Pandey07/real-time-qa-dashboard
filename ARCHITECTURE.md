# Real-time QA Dashboard — Complete Architecture & How It Works

> **Who this is for:** Everyone — developers, QA engineers, and the person who built it (you).
> This document explains every decision, every data flow, and every component in plain language.
> No prior knowledge of the codebase is assumed.

---

## Table of Contents

1. [What This Dashboard Does (Big Picture)](#1-what-this-dashboard-does)
2. [Tech Stack — What We Use and Why](#2-tech-stack)
3. [Folder Structure Explained](#3-folder-structure)
4. [Data Sources — Where Live Data Comes From](#4-data-sources)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
7. [Real-Time Engine — How WebSockets Work Here](#7-real-time-engine)
8. [AI Bottleneck Detection — How It Works](#8-ai-bottleneck-detection)
9. [Each Dashboard Section Explained](#9-each-dashboard-section)
10. [How to Connect Real Jira (Your Own Instance)](#10-connecting-real-jira)
11. [How to Connect Real Zephyr Scale](#11-connecting-real-zephyr)
12. [REST API Reference](#12-rest-api-reference)
13. [WebSocket Events Reference](#13-websocket-events)
14. [Configuration Reference (.env)](#14-configuration-reference)
15. [Common Issues and Fixes](#15-common-issues-and-fixes)

---

## 1. What This Dashboard Does

The dashboard is a **live QA intelligence platform** that answers these questions at a glance, without anyone having to manually check anything:

| Question | Where it's answered |
|----------|-------------------|
| Are our CI pipelines passing or failing right now? | CI Pipeline + Heat Map sections |
| Which repos have been failing repeatedly? | Heat Map + Bottleneck detection |
| How many bugs are open across our Jira projects? | Jira Board section |
| What percentage of our tests are passing? | Test Results section |
| What is the single most important thing to fix right now? | Bottlenecks section (AI-ranked) |

**Key principle:** Every number, every status, every chart shows **real live data** — not mocked, not randomised. It updates automatically in the background. Nobody has to click refresh or run a script.

---

## 2. Tech Stack

### Why these specific tools

| Layer | Technology | Why this choice |
|-------|-----------|-----------------|
| Backend runtime | Node.js | Non-blocking I/O — ideal for managing multiple simultaneous API polls and WebSocket connections |
| Backend framework | Express.js | Minimal, well-understood HTTP framework; easy to add REST endpoints |
| Real-time protocol | WebSockets (`ws` library) | Persistent two-way connection — server pushes data to browser the instant new data arrives, no polling from the browser side |
| HTTP client (backend) | Axios | Handles retries, timeouts, auth headers cleanly |
| Scheduling | setInterval (native) | Simple enough for this use case; node-cron would add complexity without benefit at this scale |
| Frontend framework | React 18 | Component-based UI — each dashboard section is an isolated component, easy to update or replace |
| Frontend build tool | Vite | Fastest dev server available; hot module replacement means instant UI changes during development |
| Charts | Recharts | Built specifically for React; composable, responsive, works well with live data |
| Icons | Lucide React | Consistent, lightweight SVG icon set |
| Styling | Inline styles only | Zero CSS file complexity; each component is fully self-contained and portable |

### No database — why?

All data is held in memory on the backend (the `state` object inside `poller.js`). This is intentional for a POC:
- No setup required
- Faster to read/write than any database
- Data is always fresh (re-fetched on a schedule)
- The trade-off: data resets when the server restarts — acceptable for a live dashboard

> **Roadmap:** Supabase integration is planned to add persistence for CI runs, bottleneck history, and self-healing incident records.

### Analytics

Vercel Analytics (`@vercel/analytics/react`) is integrated into the frontend. It tracks page views and visitor counts with no cookies and no GDPR banners required. Data is visible in the Vercel dashboard under the Analytics tab.

---

## 3. Folder Structure

```
real time QA dashboard/
│
├── backend/                        ← Node.js server (runs on port 3001)
│   ├── server.js                   ← Entry point: starts Express + WebSocket server
│   ├── config.js                   ← All configuration: repos, Jira projects, intervals
│   ├── adapters/
│   │   ├── github.js               ← Fetches CI runs + test data from GitHub API
│   │   └── jira.js                 ← Fetches issues + metrics from Jira REST API v2
│   ├── services/
│   │   ├── cache.js                ← In-memory TTL cache (avoids hammering APIs)
│   │   ├── poller.js               ← Scheduler: runs adapters on a timer, broadcasts results
│   │   └── bottleneck.js           ← AI logic: analyses data, detects problems
│   └── routes/
│       └── api.js                  ← REST endpoints (/api/ci/runs, /api/jira/issues, etc.)
│
├── frontend/                       ← React app (runs on port 5173)
│   ├── index.html                  ← Single HTML shell
│   ├── vite.config.js              ← Dev server config + proxy rules
│   └── src/
│       ├── main.jsx                ← React entry point
│       ├── App.jsx                 ← Root: state management, WebSocket wiring, nav
│       ├── hooks/
│       │   └── useWebSocket.js     ← Auto-reconnecting WebSocket hook
│       └── components/
│           ├── Header.jsx          ← Logo, live clock, connection indicator
│           ├── SummaryCards.jsx    ← 4 KPI cards at the top
│           ├── HeatMap.jsx         ← Pipeline grid (module × last 12 runs)
│           ├── CIPipeline.jsx      ← Filterable pipeline run table
│           ├── JiraBoard.jsx       ← Charts + issue table from Jira
│           ├── TestResults.jsx     ← Zephyr-format test cycles + executions
│           └── Bottlenecks.jsx     ← AI-detected issues with recommendations
│
├── .env.example                    ← Template for environment variables
├── start.bat                       ← Windows one-click launcher
└── ARCHITECTURE.md                 ← This file
```

**The key separation:** Backend handles all data fetching, caching, scheduling, and analysis. Frontend only displays data — it never calls GitHub or Jira directly.

---

## 4. Data Sources

### 4.1 GitHub Actions (CI/CD Pipeline Data)

**What it provides:** Real pipeline run history for 4 large open-source repos that run CI continuously.

| Repo | Why chosen |
|------|-----------|
| `microsoft/vscode` | Massive codebase, runs CI on every commit 24/7 — guaranteed live data |
| `facebook/react` | Different workflow patterns, frontend-focused CI |
| `vercel/next.js` | Full-stack framework CI — varied job types |
| `nodejs/node` | Core infrastructure repo, very active CI |

**Why these repos?** They're public and their CI pipelines run constantly, so the dashboard always has fresh, real data. When you connect your own GitHub org's repos, you just change the `repos` array in `config.js`.

**What we fetch:**
- `/repos/{owner}/{repo}/actions/runs` → Pipeline run list (status, branch, commit, duration, actor)
- `/repos/{owner}/{repo}/commits/{branch}/check-runs` → Individual test check results

**Authentication:** A GitHub Personal Access Token (no scopes required). Without it, GitHub's API rate-limits unauthenticated requests to 60/hour — too low for a dashboard polling every 90 seconds.

**Data shape after processing:** Each run becomes a normalised object with fields like `status`, `repoLabel`, `branch`, `commitSha`, `durationSec`, `actor` — consistent regardless of which repo it came from.

---

### 4.2 Apache Jira (Issue Tracking Data)

**What it provides:** Real Jira issues in the exact same JSON format as any Jira Cloud instance.

**Why Apache Jira?** Apache Software Foundation runs a fully public Jira instance at `issues.apache.org/jira`. It returns identical JSON to any enterprise Jira Cloud — same field names, same REST endpoints, same API version (v2). This means when you swap in your company's Jira URL + credentials, **zero code changes are needed**.

**Projects tracked:**
- `KAFKA` — Apache Kafka (high activity, good mix of bug types)
- `HADOOP` — Apache Hadoop
- `SPARK` — Apache Spark

**What we fetch:**
- `/rest/api/2/search?jql=project=KAFKA AND updated>=-30d ORDER BY updated DESC`
- Returns up to 50 issues per project with: summary, status, type, priority, assignee, components, timestamps

**No authentication needed** for Apache Jira — it's public. When you connect your own Jira, you add Basic Auth (email + API token) which the adapter already supports.

---

### 4.3 GitHub Check Runs → Zephyr Format (Test Results)

**The challenge:** Zephyr Squad/Scale (the industry-standard test management tool) requires a Jira plugin — there's no public demo instance to connect to.

**The solution:** GitHub's check-run API returns data in a very similar shape to Zephyr's test execution API. We fetch real check-run data and **normalise it into the exact Zephyr REST API response shape**. This means:

1. Right now: works with real GitHub data, zero configuration
2. When you have Zephyr access: set `ZEPHYR_USE_REAL=true` in `.env` and point it at your Zephyr instance — the frontend components don't change at all because the data shape is identical

**What a "Zephyr test cycle" looks like in our system:**
- One cycle per repo (e.g. "VSCode — main @ abc1234")
- Contains pass count, fail count, blocked count, not-executed count
- Each individual check-run becomes a "test execution" with status mapped: `success→Pass`, `failure→Fail`, `cancelled→Blocked`, `skipped→Not Executed`

---

## 5. Backend Deep Dive

### 5.1 server.js — The Entry Point

This file does three things:
1. Creates the Express HTTP server and registers all REST routes under `/api`
2. Attaches a WebSocket server to the same HTTP port (3001) at path `/ws`
3. Starts the poller and gives it a `broadcast` function to call when new data arrives

When a WebSocket client connects, the server immediately sends them the current state (whatever data has already been fetched) so they don't see a blank screen while waiting for the next poll cycle.

### 5.2 config.js — The Control Panel

All the "knobs" for the system are in one place:
- Which GitHub repos to track
- Which Jira projects to query
- How often to poll each source (GitHub every 90s, Jira every 120s, tests every 90s)
- All credentials (read from `.env`, never hardcoded)

If you want to add a new repo or change a polling interval, `config.js` is the only file you touch.

### 5.3 services/cache.js — The TTL Cache

Every API response is stored in memory with a time-to-live (TTL). When an adapter tries to fetch data, it first checks the cache. If the cache has a valid (non-expired) entry, it returns that instead of making an HTTP request.

Why this matters:
- GitHub API has rate limits — without caching, rapid WebSocket reconnections could trigger extra fetches and exhaust the quota
- Cache TTL is set slightly shorter than the poll interval so data is always reasonably fresh
- On server restart, cache is empty — first poll fetches fresh data immediately

### 5.4 services/poller.js — The Heartbeat

This is the scheduler. It:
1. On startup: immediately fires all three polls (CI, Jira, tests) staggered by a few seconds so they don't all hit APIs simultaneously
2. On schedule: re-runs each poll at its configured interval
3. After every poll: calls `detectBottlenecks()` with the latest data and broadcasts the updated bottleneck list
4. Broadcasts results to all connected WebSocket clients after each successful fetch

The `state` object inside poller.js holds the current snapshot of all data. The REST API reads directly from this object — so REST and WebSocket always serve the same data.

### 5.5 adapters/github.js — GitHub Data Normaliser

Two functions:

**`fetchAllRuns()`**
- Loops through all 4 repos in parallel (`Promise.allSettled`)
- For each repo: fetches last 20 workflow runs
- Maps raw GitHub API fields to a normalised run object
- If one repo fails (network error, rate limit), the others still succeed — `allSettled` vs `all`
- Sorts everything by `startedAt` descending so newest runs appear first

**`fetchAllTestData()`**
- For each repo: fetches the default branch name, then fetches check-runs for that branch's latest commit
- Builds a Zephyr-shaped test cycle object from the aggregated counts
- Maps each check-run to a Zephyr test execution object
- Returns summary stats (total, pass, fail, overall pass rate)

### 5.6 adapters/jira.js — Jira Data Normaliser

One main function: **`fetchAllJiraData()`**

- Queries all 3 Jira projects in parallel
- Merges all issues into one flat array
- Computes metrics: counts by status, by type, by priority, by project
- Identifies bugs specifically, separates open bugs from closed
- Finds bugs by component (used by bottleneck detector)
- Returns both the raw issues (for the table) and the computed metrics (for charts and KPI cards)

The JQL query used: `project = {KEY} AND updated >= -30d ORDER BY updated DESC`
This fetches issues updated in the last 30 days — keeps the data relevant without pulling the entire project history.

---

## 6. Frontend Deep Dive

### 6.1 How Data Flows Through the Frontend

```
Backend WebSocket broadcast
        ↓
useWebSocket hook (in App.jsx)
        ↓
onMessage handler → setState calls
        ↓
React re-renders affected components
        ↓
User sees updated data
```

On first load, there's also a parallel REST bootstrap:
```
Component mounts
        ↓
useEffect → fetch /api/ci/runs, /api/jira/issues, etc.
        ↓
setState with initial data
        ↓
Components render immediately (no waiting for WebSocket)
```

This means users see data the moment the page loads, and then the WebSocket keeps it updated continuously.

### 6.2 App.jsx — The Root Orchestrator

This is the brain of the frontend. It:
- Holds all state: `ciRuns`, `heatmapData`, `jiraData`, `testData`, `bottlenecks`
- Subscribes to WebSocket messages and routes them to the right state setter
- Fires REST fetch calls on mount to populate data before the first WebSocket message
- Renders the navigation bar and conditionally renders the active section component
- Passes state down to child components as props — components themselves are stateless about data

### 6.3 hooks/useWebSocket.js — Auto-Reconnecting WebSocket

This hook manages the WebSocket lifecycle:
- Connects to `ws://localhost:3001/ws` on mount
- Sends a `ping` message every 25 seconds to keep the connection alive (prevents idle timeouts)
- On disconnect: automatically reconnects with **exponential backoff** (waits 1s, then 2s, then 4s, up to 30s maximum)
- The exponential backoff prevents hammering a restarting server
- On reconnect: the server immediately re-sends the current state snapshot

### 6.4 Component Design Pattern

Every component follows the same pattern:
- Receives data as props (no direct API calls inside components)
- Uses `useMemo` for expensive filtering/computation so it doesn't recalculate on every render
- All styling is inline — no CSS files, no class names, no Tailwind
- Dark theme colours are consistent: background `#0f172a`, card `#1e293b`, border `#334155`

---

## 7. Real-Time Engine

### How it works end-to-end

```
[GitHub API] ←── poll every 90s ──→ [backend poller]
[Jira API]   ←── poll every 120s ──→ [backend poller]
[GitHub Checks] ←── poll every 90s → [backend poller]
                                            ↓
                                    detectBottlenecks()
                                            ↓
                                    broadcast to all WebSocket clients
                                            ↓
                              [Browser 1] [Browser 2] [Browser N]
                              all update simultaneously
```

### Why WebSockets instead of browser polling?

With browser polling (setTimeout in the browser calling `/api` every 30 seconds):
- Every browser tab makes its own API calls
- 10 users = 10× the API requests
- Data can be up to 30 seconds stale

With the WebSocket pattern used here:
- Backend polls once, pushes to all connected clients simultaneously
- 10 users = same API request count as 1 user
- Data reaches browsers within milliseconds of the backend receiving it
- Much more efficient at scale

---

## 8. AI Bottleneck Detection

### What "AI" means here

The bottleneck engine in `services/bottleneck.js` is **rule-based intelligence** — it analyses real data patterns to detect conditions that a senior engineer would recognise as problems. It is not a machine learning model. The "AI" label is justified because:
- It reasons over data (not just displays it)
- It generates natural-language explanations and recommendations
- It prioritises findings by severity
- It operates continuously without human intervention

This is the same approach used in many production monitoring tools (PagerDuty, Datadog anomaly detection at its core is threshold + statistical rules).

### The 8 Detection Rules

**CI Analysis (runs from last 24 hours only):**

| Rule | Triggers when | Severity |
|------|--------------|----------|
| High failure rate | ≥50% of runs failed in a module | High (≥80% → Critical) |
| Consecutive failures | Last 3+ runs all failed with no success in between | Critical |
| Duration spike | Latest run took >2× the average of previous runs AND >2 minutes | Medium |
| Stuck pipeline | A run has been "in progress" for over 1 hour | High |

**Jira Analysis:**

| Rule | Triggers when | Severity |
|------|--------------|----------|
| Bug cluster | ≥5 open bugs in the same component | High (≥10 → Critical) |
| Critical bugs | ≥3 unresolved Critical/Blocker priority bugs | High (≥8 → Critical) |
| WIP pile-up | >50% of all issues are "In Progress" AND >10 such issues | Medium |

**Test Analysis:**

| Rule | Triggers when | Severity |
|------|--------------|----------|
| Low pass rate | Overall pass rate across all cycles <70% | High (<50% → Critical) |
| Cycle failure | A single test cycle has ≥40% failure rate AND ≥5 tests | High (≥70% → Critical) |

### How bottlenecks are presented

Each detected bottleneck includes:
- **Title** — one-line plain English summary
- **Severity** — critical / high / medium / low (colour-coded)
- **Type label** — the rule that fired (e.g. `consecutive_failures`)
- **Module** — which repo or Jira component is affected
- **Metric** — the specific number that triggered it (e.g. "3/4 consecutive failures")
- **Description** — what is happening and why it matters
- **Recommendation** — a specific, actionable next step

Bottlenecks are deduplicated (same ID won't appear twice) and sorted: Critical first, then High, Medium, Low.

---

## 9. Each Dashboard Section Explained

### Header Bar
Always visible. Shows:
- "LIVE" badge (pulses green — animated CSS)
- Last time data was refreshed
- Live clock (updates every second in the browser)
- Refresh button (flushes the backend cache so next poll fetches fresh data)
- WebSocket connection indicator: green pulse = connected, red = reconnecting

### Summary Cards (4 KPIs)
Always visible below the header.
- **CI Pass Rate** — percentage of the last 40 pipeline runs that succeeded. Colour: green ≥80%, amber ≥60%, red <60%
- **Open Bugs** — total open bug count from Jira across all projects
- **Test Pass Rate** — `overallPassRate` from the test summary (pass / total × 100)
- **Bottlenecks** — count of detected issues; shows a red "N critical" badge if any are critical severity

### Heat Map
A grid where:
- Each **row** = one repository/module
- Each **cell** = one of the last **30** pipeline runs, coloured by status
- **Rightmost cell** = the most recent run
- **Hover** on any cell = portal tooltip (rendered at document body level — never clipped by any container) showing workflow name, branch, commit SHA, actor, duration, time ago
- **Trend arrow** per row: compares pass rate of most recent 10 runs vs previous 10 → ↑ Improving / → Stable / ↓ Degrading
- **Average duration** shown per repo
- **Pass / fail count** + percentage bar per row
- **Expand failures button** — when a repo has recent failures, clicking expands an inline panel showing the last 3 failed runs with commit SHA, branch, workflow name, duration, and a direct GitHub link
- **0 failures badge** — always rendered (green) to keep row layout stable when there are no failures
- **Summary bar** above the grid — total runs, total passed, total failed, overall pass rate, count of improving/degrading repos across all repos

This gives an immediate visual "is this repo healthy or not" without reading any numbers.

### CI Pipeline
A filterable table of all pipeline runs. You can filter by:
- Status chip (All / Success / Failure / Running / Queued / Cancelled)
- Repo dropdown

Columns: status badge, repo + run number, branch + commit SHA, workflow name + commit message, duration, time ago + actor, external link to GitHub.

### Jira Board
Two bar charts (status distribution, priority distribution) above a filterable issue table. Filter by issue type and status. Columns: key (linked to Jira), type icon, summary + assignee, status badge, priority dot, updated time.

### Test Results
Two tabs:

**Cycles tab:** One card per repo showing:
- Donut chart (pass/fail/blocked/not-executed proportions)
- Stat chips (total, pass, fail, blocked, not-executed counts)
- Pass rate percentage
- Expandable raw Zephyr JSON (so anyone can verify the data format)

**Executions tab:** Flat list of every individual check-run mapped to a Zephyr test execution. Shows status icon, test name, cycle reference, status badge, duration, time ago, link.

### Bottlenecks
Filterable by severity. Each card shows:
- Severity icon + colour-coded left border
- Title + severity badge + type label
- Module name + metric
- **Source badge** — shows which system the issue came from (GitHub Actions / Jira / Zephyr), colour-coded per source. Clicking the badge navigates directly to the relevant dashboard section (CI Pipeline / Jira Board / Test Results)
- **Detection timestamp** — "Detected X ago"
- Expandable "Show details" → full description + recommendation box

---

## 10. Connecting Real Jira

When you have your company's Jira credentials, this is a 3-step change:

### Step 1 — Edit `backend/.env`
```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_TOKEN=your_api_token_here
```
Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens

### Step 2 — Edit `backend/config.js` — update the projects array
```javascript
projects: [
  { key: 'PROJ',  label: 'Your Project Name'  },
  { key: 'PROJ2', label: 'Another Project'     },
],
```
Replace `PROJ` with your actual Jira project keys (the prefix on your ticket numbers, e.g. if your tickets are `ENG-123` then the key is `ENG`).

### Step 3 — Restart the backend
```bash
node server.js
```

**Nothing else changes.** The Jira adapter already sends Basic Auth when email + token are present. The data shape from Jira Cloud is identical to Apache Jira — same field names, same REST endpoints.

---

## 11. Connecting Real Zephyr Scale

### Step 1 — Edit `backend/.env`
```
ZEPHYR_USE_REAL=true
ZEPHYR_BASE_URL=https://yourcompany.atlassian.net
ZEPHYR_API_TOKEN=your_zephyr_bearer_token
ZEPHYR_PROJECT=YOUR_PROJECT_KEY
```

### Step 2 — Update the test adapter
In `backend/adapters/github.js`, the `fetchAllTestData()` function currently calls GitHub. When `ZEPHYR_USE_REAL=true`, swap it to call:
- `GET /rest/atm/1.0/testrun?projectKey={key}` → test cycles (maps directly to our `testCycle` shape)
- `GET /rest/atm/1.0/testresult?testRunKey={key}` → test executions (maps directly to our `testExecutions` shape)

The frontend components do not change at all — they already expect exactly the Zephyr API response shape.

---

## 12. REST API Reference

All endpoints are on `http://localhost:3001`.

| Method | Endpoint | Description | Query params |
|--------|----------|-------------|-------------|
| GET | `/api/status` | Health check + counts | — |
| GET | `/api/ci/runs` | All pipeline runs | `repoLabel=`, `status=`, `limit=` |
| GET | `/api/ci/heatmap` | Heatmap grid data | — |
| GET | `/api/jira/issues` | Jira issues | `projectKey=`, `type=`, `status=`, `priority=`, `limit=` |
| GET | `/api/jira/projects` | Project summaries | — |
| GET | `/api/tests/cycles` | Zephyr test cycles | — |
| GET | `/api/tests/executions` | Zephyr test executions | `cycleKey=`, `status=`, `limit=` |
| GET | `/api/bottlenecks` | AI-detected bottlenecks | — |
| POST | `/api/refresh` | Flush cache (force re-fetch) | — |

---

## 13. WebSocket Events

Connect to `ws://localhost:3001/ws`. All messages are JSON: `{ type, payload, ts }`.

| Event type | When sent | Payload contents |
|------------|-----------|-----------------|
| `connected` | On connection | `{ message, timestamp }` |
| `ci:update` | After every CI poll | `{ runs[], fetchedAt }` |
| `jira:update` | After every Jira poll | `{ allIssues[], metrics{}, projects[], fetchedAt }` |
| `tests:update` | After every test poll | `{ testCycles[], testExecutions[], summary{}, fetchedAt }` |
| `bottlenecks:update` | After any poll (since bottlenecks are re-computed after each) | `{ bottlenecks[], detectedAt }` |
| `pong` | In response to client sending `{ type: "ping" }` | `{ ts }` |

---

## 14. Configuration Reference

All environment variables in `backend/.env`:

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `3001` | No | Backend server port |
| `GITHUB_TOKEN` | — | **Yes** | GitHub PAT (no scopes needed). Without this, GitHub API returns 403 due to rate limits |
| `JIRA_BASE_URL` | `https://issues.apache.org/jira` | No | Jira instance URL. Change to your company URL when ready |
| `JIRA_EMAIL` | — | No | Your Atlassian account email (only needed for private Jira) |
| `JIRA_TOKEN` | — | No | Jira API token (only needed for private Jira) |
| `ZEPHYR_USE_REAL` | `false` | No | Set `true` to use real Zephyr API instead of GitHub check-runs |
| `ZEPHYR_BASE_URL` | — | No | Your Zephyr/Jira base URL |
| `ZEPHYR_API_TOKEN` | — | No | Zephyr Scale Bearer token |
| `ZEPHYR_PROJECT` | — | No | Zephyr project key |

**Polling intervals** (change in `config.js`):

| Source | Default interval | Config key |
|--------|-----------------|------------|
| GitHub CI runs | 90 seconds | `poll.githubIntervalSeconds` |
| Jira issues | 120 seconds | `poll.jiraIntervalSeconds` |
| Test/check-runs | 90 seconds | `poll.testIntervalSeconds` |

---

## 15. Common Issues and Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `[GitHub] Error: Request failed with status code 403` | No GitHub token, or rate limit hit | Add `GITHUB_TOKEN` to `backend/.env` |
| `[GitHub] Error: Request failed with status code 404` on check-runs | Wrong API endpoint (old bug — already fixed) | Pull latest code |
| `[Jira] Error: 401` | Wrong credentials | Check `JIRA_EMAIL` and `JIRA_TOKEN` in `.env` |
| Frontend shows blank data on load | Backend not running | Start backend first: `cd backend && node server.js` |
| WebSocket shows "Disconnected" | Backend not running or wrong port | Confirm backend is on port 3001 |
| Heat map shows "No runs" | GitHub token not set | Add `GITHUB_TOKEN` |
| Test Results shows 0 cycles | GitHub API returned 404 on check-runs | Ensure GitHub token is set; default branch name must be `main` or `master` |
| Data not updating | Cache TTL in effect | Click Refresh button or `POST /api/refresh` |

---

## 16. Production Deployment

### Backend — Railway
- Platform: [railway.app](https://railway.app)
- URL: `https://your-app.railway.app`
- Auto-deploys on push to `main`
- Environment variables set in Railway dashboard (never in code)
- WebSocket supported natively — no additional config needed
- PORT is set automatically by Railway; `config.js` reads `process.env.PORT`

### Frontend — Vercel
- Platform: [vercel.com](https://vercel.com)
- URL: `https://your-app.vercel.app`
- Root directory set to `frontend/` in Vercel project settings
- Auto-deploys on push to `main`
- Environment variables required:
  ```
  VITE_API_URL=https://your-app.railway.app
  VITE_WS_URL=wss://real-time-qa-dashboard-production.up.railway.app/ws
  ```
- In production, `useWebSocket.js` reads `VITE_WS_URL` (falls back to localhost for local dev)
- In production, `App.jsx` prefixes all fetch calls with `VITE_API_URL` (falls back to empty string → Vite proxy in local dev)

### CORS
Backend allows all origins (`origin: true`) to support the Vercel frontend domain without hardcoding it.

---

*Last updated: April 2026 — reflects current deployed state with all improvements.*
