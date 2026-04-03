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
    runsPerRepo: 30,
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
  poll: {
    githubIntervalSeconds: 90,
    jiraIntervalSeconds:   120,
    testIntervalSeconds:   90,
  },
};
