require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3001,
  },
  github: {
    baseUrl: 'https://api.github.com',
    token: process.env.GITHUB_TOKEN || '',
    repos: [
      { owner: 'microsoft', repo: 'vscode',  label: 'VSCode' },
      { owner: 'facebook',  repo: 'react',   label: 'React' },
      { owner: 'vercel',    repo: 'next.js', label: 'Next.js' },
      { owner: 'nodejs',    repo: 'node',    label: 'Node.js' },
    ],
    runsPerRepo: 15,
  },
  jira: {
    baseUrl: process.env.JIRA_BASE_URL || 'https://issues.apache.org/jira',
    email:   process.env.JIRA_EMAIL   || '',
    token:   process.env.JIRA_TOKEN   || '',
    projects: [
      { key: 'KAFKA',  label: 'Apache Kafka'  },
      { key: 'HADOOP', label: 'Apache Hadoop' },
      { key: 'SPARK',  label: 'Apache Spark'  },
    ],
    maxResults: 50,
  },
  zephyr: {
    useZephyrEndpoint: process.env.ZEPHYR_USE_REAL === 'true',
    baseUrl:    process.env.ZEPHYR_BASE_URL  || '',
    apiToken:   process.env.ZEPHYR_API_TOKEN || '',
    projectKey: process.env.ZEPHYR_PROJECT   || '',
  },
  selfHealing: {
    repos: [
      { owner: 'riyabhatia45',   repo: 'QAi',                              label: 'Playwright Self-Healing', hasCiSummary: true,  hasDashboardData: true  },
      // { owner: 'Yash-Pandey07',  repo: 'QAi',                              label: 'Playwright Self-Healing (Test Fork)', hasCiSummary: true,  hasDashboardData: true  },
      { owner: 'gautamakky10',   repo: 'agentic-self-healing-framework-gv', label: 'Selenium Self-Healing - 1',        hasCiSummary: false, hasDashboardData: true  },
      { owner: 'priya-thapliyal', repo: 'agentic-self-healing-framework',    label: 'Selenium Self-Healing - 2', hasCiSummary: false, hasDashboardData: true  },
      { owner: 'Yadavkumari',    repo: 'Self-HealingWithCypress',           label: 'Cypress Self-Healing',      hasCiSummary: true,  hasDashboardData: true  },
    ],
  },
  poll: {
    githubIntervalSeconds:      600,   // 10 min (was 90s for testing)
    jiraIntervalSeconds:        900,   // 15 min (was 2 min for testing)
    testIntervalSeconds:        600,   // 10 min (was 90s for testing)
    selfHealingIntervalSeconds: 60,    // 1 min — cheap raw.githubusercontent.com fetch, shows live CI status
  },
};
