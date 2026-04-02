/**
 * GitHub API integration — fetches real CI/CD workflow runs from public repos.
 * No authentication required (60 requests/hour rate limit).
 */

const REPOS = [
  { owner: 'facebook', repo: 'react' },
  { owner: 'microsoft', repo: 'vscode' },
  { owner: 'vercel', repo: 'next.js' },
];

const BASE = 'https://api.github.com';

/**
 * Fetch recent workflow runs for a repo.
 * Returns an array of simplified run objects.
 */
async function fetchWorkflowRuns(owner, repo) {
  try {
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/actions/runs?per_page=5`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    return (data.workflow_runs || []).map(run => ({
      id: run.id,
      name: run.name || run.display_title,
      repo: `${owner}/${repo}`,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      branch: run.head_branch,
      event: run.event,
    }));
  } catch (err) {
    console.warn(`Failed to fetch runs for ${owner}/${repo}:`, err.message);
    return [];
  }
}

/**
 * Fetch recent events for a repo (pushes, PRs, etc.)
 * Returns simplified event objects.
 */
async function fetchRepoEvents(owner, repo) {
  try {
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/events?per_page=8`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    return data.map(ev => ({
      id: ev.id,
      type: ev.type,
      repo: `${owner}/${repo}`,
      actor: ev.actor?.login || 'unknown',
      createdAt: ev.created_at,
      payload: summarizeEvent(ev),
    }));
  } catch (err) {
    console.warn(`Failed to fetch events for ${owner}/${repo}:`, err.message);
    return [];
  }
}

/** Human-readable event summary */
function summarizeEvent(ev) {
  switch (ev.type) {
    case 'PushEvent':
      return `Pushed ${ev.payload?.commits?.length || 0} commit(s)`;
    case 'PullRequestEvent':
      return `PR ${ev.payload?.action}: ${ev.payload?.pull_request?.title || ''}`;
    case 'IssuesEvent':
      return `Issue ${ev.payload?.action}: ${ev.payload?.issue?.title || ''}`;
    case 'CreateEvent':
      return `Created ${ev.payload?.ref_type} ${ev.payload?.ref || ''}`;
    case 'DeleteEvent':
      return `Deleted ${ev.payload?.ref_type} ${ev.payload?.ref || ''}`;
    case 'WatchEvent':
      return 'Starred the repo';
    case 'ForkEvent':
      return 'Forked the repo';
    case 'IssueCommentEvent':
      return `Commented on issue #${ev.payload?.issue?.number || ''}`;
    default:
      return ev.type.replace('Event', '');
  }
}

/**
 * Fetch all CI/CD data from all configured repos.
 */
export async function fetchAllCICDData() {
  const allRuns = [];
  const allEvents = [];

  const promises = REPOS.flatMap(({ owner, repo }) => [
    fetchWorkflowRuns(owner, repo).then(runs => allRuns.push(...runs)),
    fetchRepoEvents(owner, repo).then(events => allEvents.push(...events)),
  ]);

  await Promise.allSettled(promises);

  // Sort by date descending
  allRuns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  allEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    runs: allRuns.slice(0, 15),
    events: allEvents.slice(0, 20),
  };
}
