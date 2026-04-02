const axios  = require('axios');
const config = require('../config');
const cache  = require('../services/cache');

function buildJiraClient() {
  const headers = { 'Content-Type': 'application/json' };
  if (config.jira.email && config.jira.token) {
    const b64 = Buffer.from(`${config.jira.email}:${config.jira.token}`).toString('base64');
    headers['Authorization'] = `Basic ${b64}`;
  }
  return axios.create({ baseURL: `${config.jira.baseUrl}/rest/api/2`, timeout: 20000, headers });
}

const jira = buildJiraClient();

async function searchIssues(jql, fields = [
  'summary','status','issuetype','priority','assignee','reporter',
  'created','updated','components','labels','comment','customfield_10014','customfield_10010',
]) {
  const { data } = await jira.get('/search', {
    params: { jql, maxResults: config.jira.maxResults, fields: fields.join(','), expand: 'renderedFields' },
  });
  return data;
}

async function fetchProjectIssues({ key, label }) {
  const cacheKey = `jira:issues:${key}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;
  try {
    const data = await searchIssues(`project = ${key} AND updated >= -30d ORDER BY updated DESC`);
    const result = { projectKey: key, projectLabel: label, total: data.total, issues: data.issues, fetchedAt: new Date().toISOString() };
    cache.set(cacheKey, result, 110);
    return result;
  } catch (err) {
    console.error(`[Jira] Error fetching issues for ${key}:`, err.message);
    return cache.get(cacheKey) || { projectKey: key, projectLabel: label, total: 0, issues: [] };
  }
}

function countBy(arr, keyFn) {
  return arr.reduce((acc, item) => { const k = keyFn(item); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
}

async function fetchAllJiraData() {
  const results  = await Promise.allSettled(config.jira.projects.map(p => fetchProjectIssues(p)));
  const projects = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  const allIssues = projects.flatMap(p => (p.issues || []).map(i => ({ ...i, _projectLabel: p.projectLabel })));

  const byStatus   = countBy(allIssues, i => i.fields?.status?.name      || 'Unknown');
  const byType     = countBy(allIssues, i => i.fields?.issuetype?.name   || 'Unknown');
  const byPriority = countBy(allIssues, i => i.fields?.priority?.name    || 'Unknown');
  const byProject  = countBy(allIssues, i => i._projectLabel             || 'Unknown');

  const bugs         = allIssues.filter(i => i.fields?.issuetype?.name === 'Bug');
  const openBugs     = bugs.filter(i => !['Done','Resolved','Closed'].includes(i.fields?.status?.name));
  const criticalBugs = openBugs.filter(i => ['Critical','Blocker'].includes(i.fields?.priority?.name));

  const bugsByComponent = {};
  openBugs.forEach(issue => {
    const comps = issue.fields?.components || [];
    if (!comps.length) bugsByComponent['Unclassified'] = (bugsByComponent['Unclassified'] || 0) + 1;
    comps.forEach(c => { bugsByComponent[c.name] = (bugsByComponent[c.name] || 0) + 1; });
  });

  const recentlyUpdated = [...allIssues]
    .sort((a, b) => new Date(b.fields?.updated) - new Date(a.fields?.updated))
    .slice(0, 20);

  return {
    projects, allIssues, recentlyUpdated,
    metrics: { total: allIssues.length, openBugs: openBugs.length, criticalBugs: criticalBugs.length, byStatus, byType, byPriority, byProject, bugsByComponent },
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { fetchAllJiraData };
