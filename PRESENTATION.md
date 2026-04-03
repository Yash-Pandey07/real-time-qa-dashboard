# Real-Time QA Intelligence Dashboard — Presentation Script
### Slide-by-slide content + speaker notes + Q&A guide

---

## SLIDE 1 — Title Slide

**Title:** Real-Time QA Intelligence Dashboard
**Subtitle:** Live CI/CD monitoring, AI bottleneck detection, and automated insights — in one place
**Your name / date / team**

> **🎤 Speaker Notes:**
> "Thank you for joining. Today I'm going to walk you through a platform I built that solves a problem every QA and engineering team faces — fragmented visibility across tools. Instead of switching between GitHub, Jira, and test reports to understand pipeline health, this dashboard brings everything together in real time. Let me show you what I mean."

---

## SLIDE 2 — The Problem

**Title:** The QA Visibility Problem

**Bullets:**
- Engineers check GitHub for CI status, Jira for bugs, and a separate tool for test results — every time
- No single view of overall pipeline health
- Failures are discovered late — often after they've already impacted downstream work
- Manual status updates in standups waste time
- Data is stale by the time it's reviewed

**Visual suggestion:** Three separate browser tabs side by side — GitHub, Jira, a test report — with a big ❌ through them

> **🎤 Speaker Notes:**
> "The problem is fragmentation. A QA engineer or engineering manager today has to context-switch between three or four tools just to answer one question: is our pipeline healthy right now? GitHub tells you CI status. Jira tells you bug count. Zephyr tells you test pass rates. None of them talk to each other. And by the time you've collected all that information, it's already outdated. This dashboard eliminates that entirely."

---

## SLIDE 3 — The Solution

**Title:** One Dashboard. All Data. Always Live.

**Bullets:**
- Single platform pulling from GitHub Actions, Jira, and Zephyr simultaneously
- Data refreshes automatically every 90 seconds — no manual refresh needed
- AI engine analyses patterns and surfaces the single most important issue to fix
- Works with any GitHub org, any Jira instance, any Zephyr setup — zero code changes
- Deployed publicly — shareable link, no local setup required

**Visual suggestion:** Single clean dashboard screenshot

> **🎤 Speaker Notes:**
> "The solution is a live QA intelligence platform. It connects to three data sources — GitHub Actions for CI pipeline status, Jira for issue tracking, and Zephyr Scale for test results. All data refreshes every 90 seconds in the background. Nobody needs to click refresh or run a script. And an AI engine constantly analyses the incoming data to detect problems before they escalate — and it tells you exactly what to fix and how."

---

## SLIDE 4 — Architecture Overview

**Title:** How It Works — System Architecture

**Diagram content (draw as flow):**
```
GitHub Actions API  ──┐
                       ├──▶  Node.js Backend  ──▶  WebSocket  ──▶  React Dashboard
Apache Jira API    ──┤       (Railway)               push              (Vercel)
                       │
Zephyr / Check Runs ──┘
                            ↓
                       AI Bottleneck
                         Engine
```

**Bullets:**
- Backend polls APIs on a schedule (GitHub: 90s, Jira: 120s, Tests: 90s)
- WebSocket pushes updates to ALL browser tabs simultaneously — no browser polling
- In-memory TTL cache prevents hitting API rate limits
- Frontend (React + Vite) renders only what changes — efficient re-renders

> **🎤 Speaker Notes:**
> "The architecture is clean and deliberately simple. The backend is a Node.js server on Railway that polls three data sources on a schedule. The moment new data arrives, it's broadcast to every connected browser simultaneously via WebSocket — not polling from the browser side. This means 10 users watching the dashboard cost the same as 1 user in terms of API requests. The frontend is a React app on Vercel — static hosting, global CDN, instant loads. The AI bottleneck engine runs on the backend after every poll cycle."

---

## SLIDE 5 — Data Sources

**Title:** Real Data. No Mocks. No Dummy Numbers.

**Three columns:**

| GitHub Actions | Apache Jira | Zephyr / Check Runs |
|---|---|---|
| microsoft/vscode | Apache Kafka | GitHub check-run API |
| facebook/react | Apache Hadoop | Normalised to exact Zephyr format |
| vercel/next.js | Apache Spark | Swap in real Zephyr with 1 env var |
| nodejs/node | Public instance | Identical API response shape |

**Key point:** All sources are public APIs — works out of the box. Swap in your company's URLs and credentials with zero code changes.

> **🎤 Speaker Notes:**
> "Everything you see on this dashboard is real live data from real APIs. For CI pipelines, I'm monitoring four of the most active open-source repositories in the world — VSCode, React, Next.js, and Node.js — because their CI runs 24 hours a day, 7 days a week, giving us constant fresh data. For issue tracking, I'm using Apache's public Jira instance, which returns identical JSON to any enterprise Jira Cloud. The moment you put in your company's Jira URL and API token — which is a one-line change — the dashboard switches to your data without touching any code."

---

## SLIDE 6 — Dashboard Walkthrough

**Title:** Five Sections. Everything You Need.

**Bullets with icons:**
- 🔥 **Heat Map** — visual grid of last 30 CI runs per repo, trend arrows, instant failure spotting
- ⚙️ **CI Pipeline** — filterable table of all runs with status, branch, commit, duration, actor
- 🐛 **Jira Board** — charts and issue table with priority, status, component breakdown
- ✅ **Test Results** — Zephyr-format test cycles with pass/fail donut charts and individual executions
- 🤖 **Bottlenecks** — AI-detected issues ranked by severity, with source and direct navigation

**Visual suggestion:** Collage of all 5 sections as thumbnails

> **🎤 Speaker Notes:**
> "The dashboard has five sections, each answering a specific question. The Heat Map gives you an instant visual read on pipeline health — you can see at a glance which repo is degrading before you even read a number. CI Pipeline gives you the full run list with filtering. Jira Board surfaces bug trends. Test Results shows pass rates in Zephyr format. And Bottlenecks — this is the most powerful section — uses an AI engine to tell you the single most important thing to fix right now, with a recommendation on how to fix it. Every section is live — updating in the background while you watch."

---

## SLIDE 7 — Heat Map Deep Dive

**Title:** Heat Map — Pipeline Health at a Glance

**Left side — what it shows:**
- Last **30 runs** per repository (colour-coded cells)
- **Trend arrow** — comparing most recent 10 runs vs previous 10
  - ↑ Improving &nbsp;&nbsp; → Stable &nbsp;&nbsp; ↓ Degrading
- **Average duration** per repo
- **Pass / fail count** with percentage bar
- **Hover any cell** — tooltip shows branch, commit SHA, actor, duration, time ago
- **Expand failures** — see the last 3 failures inline with commit and link

**Right side — summary bar:**
- Total runs, passed, failed, overall rate, improving repos, degrading repos

> **🎤 Speaker Notes:**
> "The Heat Map is intentionally designed so you can understand pipeline health in under 3 seconds without reading a single number. Each coloured square is one CI run — green is success, red is failure. The trend arrow on the right tells you whether that repo is getting better or worse compared to its recent history. You can hover any cell and get the full context — what branch, who triggered it, how long it took. If there are failures, clicking 'X failures' expands a panel below showing the exact commits and links to the GitHub run. This is the first thing I look at every morning."

---

## SLIDE 8 — AI Bottleneck Detection

**Title:** AI Bottleneck Engine — 8 Detection Rules

**Three categories:**

**CI Analysis (last 24 hours):**
- High failure rate ≥ 50% → High severity (≥ 80% → Critical)
- 3+ consecutive failures with no success → Critical
- Latest run took > 2× average duration → Medium
- Pipeline stuck in-progress for > 1 hour → High

**Jira Analysis:**
- ≥ 5 open bugs in same component → High (≥ 10 → Critical)
- ≥ 3 Critical/Blocker bugs unresolved → High
- > 50% of issues stuck "In Progress" → Medium

**Test Analysis:**
- Overall pass rate < 70% → High (< 50% → Critical)
- Single cycle with ≥ 40% failure rate → High

**Each card shows:** Source system (clickable — navigates directly to that section) + detected timestamp + recommendation

> **🎤 Speaker Notes:**
> "The bottleneck engine runs after every poll cycle and analyses data across all three sources simultaneously. It applies 8 rules — four for CI pipelines, three for Jira, two for test results. When something fires, it creates a bottleneck card with a severity rating, a plain-English description of what's happening, and a specific actionable recommendation — not just 'something is broken' but 'revert the last merged PR' or 'schedule a bug-bash for this component'. Each card now shows exactly which system the issue came from — GitHub Actions, Jira, or Zephyr — and clicking that source badge takes you directly to that section of the dashboard to investigate further."

---

## SLIDE 9 — Real-Time Engine

**Title:** WebSockets — Why It Matters

**Side by side comparison:**

| Old way: Browser Polling | This dashboard: WebSocket Push |
|---|---|
| Every tab polls the server every 30s | Server pushes to all tabs simultaneously |
| 10 users = 10× the API calls | 10 users = same cost as 1 user |
| Data can be 30 seconds stale | Data arrives within milliseconds |
| Misses rapid state changes | Catches every update as it happens |

**How it works here:**
1. Backend receives new data from API poll
2. Immediately broadcasts to all connected clients
3. Frontend updates only the changed component
4. Auto-reconnects with exponential backoff if connection drops

> **🎤 Speaker Notes:**
> "One technical decision worth highlighting is the use of WebSockets instead of browser polling. Most dashboards work by having the browser ask the server 'any updates?' every 30 seconds. That means every user adds load to the system. With WebSockets, the server holds a persistent connection to every browser and pushes data the moment it arrives. Ten engineers watching the dashboard simultaneously cost the same as one. Data is never more than a few milliseconds old. The connection auto-heals if it drops — with exponential backoff so it doesn't hammer a restarting server."

---

## SLIDE 10 — Deployment

**Title:** Deployed & Shareable — No Local Setup Required

**Setup:**
- **Backend:** Railway (Node.js, always-on, WebSocket support)
  - URL: `https://real-time-qa-dashboard-production.up.railway.app`
- **Frontend:** Vercel (React/Vite, global CDN, instant loads)
  - URL: `https://project-p0adc.vercel.app`

**How to share:**
- Anyone with the Vercel link can view the live dashboard
- No installation, no Node.js, no local server
- Auto-deploys on every git push to main

**Environment variables keep secrets safe:**
- GitHub token, Jira credentials stored as platform secrets
- Never committed to the repository

> **🎤 Speaker Notes:**
> "The dashboard is live and publicly accessible right now. I'll share the link in the chat. The backend is hosted on Railway which supports WebSockets and keeps the server always running. The frontend is on Vercel with a global CDN — it loads instantly from anywhere in the world. The entire deployment is automated — when I push code to GitHub, both platforms redeploy automatically within 2 minutes. No secrets are ever stored in the repository — everything sensitive is an environment variable set directly in the hosting platform."

---

## SLIDE 11 — Roadmap

**Title:** What's Next — Roadmap

**Phase 1 — Persistence (next):**
- Supabase database integration
- Store CI runs, bottlenecks, and incidents permanently
- Historical trend analysis — not just live snapshots
- Data survives server restarts

**Phase 2 — Self-Healing Integration:**
- New **Incidents** tab on dashboard
- Self-healing scripts report outcomes via API (`POST /api/incidents`)
- Each incident: what broke → what action was taken → resolved or failed → time to heal
- Works with any language/framework — one API call from any script

**Phase 3 — Auto-Remediation:**
- Dashboard auto-retries failed CI workflows via GitHub API
- Detects consecutive failures → triggers re-run automatically
- All healing actions logged to Supabase with full audit trail

> **🎤 Speaker Notes:**
> "The platform is built to grow. The next immediate step is connecting a Supabase database so data persists across server restarts and we can show historical trends — not just the current snapshot. After that, Phase 2 adds an Incidents tab designed specifically for self-healing integration. Any script — bash, Python, whatever — can report a healing event to the dashboard with one API call. The dashboard shows it in real time: what broke, what the script did, and whether it resolved the issue. Phase 3 takes this further by building auto-remediation directly into the backend — detecting consecutive CI failures and automatically triggering re-runs via the GitHub API."

---

## SLIDE 12 — Summary

**Title:** What We Built

**Six key achievements:**
1. **Live data** from 3 industry tools — no mocks, no static data
2. **WebSocket real-time** — all users see updates simultaneously, milliseconds after they happen
3. **AI bottleneck detection** — 8 rules across CI, Jira, and test data, with ranked severity
4. **Production deployed** — shareable public URL, auto-deploy on push
5. **Zero vendor lock-in** — swap any data source with a config change, no code rewrites
6. **Roadmap ready** — architecture designed for self-healing scripts, persistence, and auto-remediation

> **🎤 Speaker Notes:**
> "To summarise — we have a live, production-deployed QA intelligence platform that pulls real data from GitHub Actions, Jira, and Zephyr simultaneously, detects bottlenecks automatically using an AI engine, and presents everything in a clean, navigable dashboard that anyone can access via a shareable link. The architecture is intentionally built to scale — adding your company's real Jira and GitHub is a config change, not a rewrite. And the roadmap takes this from a visibility tool to an active participant in CI/CD reliability through self-healing integration. I'm happy to take questions."

---

## SLIDE 13 — Q&A

**Title:** Questions?

**Live demo link:** `https://project-p0adc.vercel.app`

---

---

# Q&A PREPARATION — Likely Questions & Answers

---

**Q: Is this using real data or is it mocked?**
> A: "100% real. GitHub Actions is pulling live CI runs from Microsoft VSCode, Facebook React, Vercel Next.js, and Node.js — repos that run CI 24/7. Jira is hitting Apache's public Jira instance which returns identical JSON to enterprise Jira Cloud. Test results come from GitHub's check-run API, normalised into the exact Zephyr Scale response format. Nothing is hardcoded or simulated."

---

**Q: How do we connect this to our own Jira / GitHub?**
> A: "Three steps. Edit the `.env` file to add your Jira URL and API token. Edit `config.js` to list your Jira project keys and your GitHub repos. Restart the backend. No code changes — just configuration. The adapters already handle authentication and the data shape is identical whether you're hitting Apache Jira or your company's Atlassian instance."

---

**Q: What does 'AI bottleneck detection' actually mean? Is it machine learning?**
> A: "It's rule-based intelligence — the same approach used in production monitoring tools like PagerDuty and Datadog. It analyses real data patterns: consecutive failures, failure rate thresholds, duration spikes, bug cluster density. It then generates natural-language explanations and ranked recommendations. The value is that it reasons over data continuously without anyone having to look — and it prioritises findings so you know what to fix first. There's no ML model, no training data needed — it works on day one."

---

**Q: What happens if GitHub or Jira is down?**
> A: "The backend uses `Promise.allSettled` — if one source fails, the others continue normally. Failed fetches fall back to the TTL cache so the last known good data is shown rather than blanking the dashboard. Each adapter logs the error individually, so the working sources continue updating while the failed one shows cached data."

---

**Q: How is the GitHub token kept secure?**
> A: "The token is an environment variable set directly in Railway's dashboard — it never touches the codebase or version control. The `.gitignore` excludes the `.env` file. The token itself needs no special scopes for read-only access to public repos."

---

**Q: Can multiple people use this at the same time?**
> A: "Yes — that's one of the core design decisions. WebSockets mean the server broadcasts to every connected client simultaneously. Ten engineers watching the dashboard cost the same as one in terms of API load. The data each person sees is identical and always current."

---

**Q: What's the self-healing plan exactly?**
> A: "The architecture is already prepared for it. Any self-healing script — regardless of language — calls `POST /api/incidents` with a JSON payload describing what broke, what action was taken, and the outcome. The dashboard shows this in a new Incidents tab in real time. For CI specifically, the next step is the dashboard itself detecting consecutive failures and automatically triggering a GitHub Actions re-run via the API — turning it from a monitoring tool into an active reliability participant."

---

**Q: Why Railway and Vercel? Why not AWS or Azure?**
> A: "For a proof of concept and demo, Railway and Vercel are the fastest path to a production-grade deployment with zero DevOps overhead. Both support automatic HTTPS, WebSockets, environment variables, and auto-deploy from GitHub. When this moves to enterprise production, the backend is a standard Node.js process that runs on any container platform — ECS, GKE, Azure Container Apps — with no changes to the application code."

---

*End of presentation script.*
