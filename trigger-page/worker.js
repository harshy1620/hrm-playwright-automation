// Cloudflare Worker: serves the trigger page and talks to the GitHub API.
// The GitHub token stays on the server as a Worker secret, never in the browser.
import PAGE from './page.html';

const OWNER = 'harshy1620';
const REPO = 'hrm-playwright-automation';
const WORKFLOW = 'playwright.yml';
const REPORT_URL = 'https://harshy1620.github.io/hrm-playwright-automation/';

// Workflow step names (from playwright.yml) grouped into the stages shown on the page
const STAGES = [
  { key: 'setup', steps: ['Set up job', 'Checkout repository', 'Setup Node.js', 'Install dependencies'] },
  { key: 'browser', steps: ['Install Playwright Browsers'] },
  { key: 'test', steps: ['Run Playwright tests'] },
  { key: 'report', steps: ['Upload HTML Report', 'Upload Test Videos & Traces', 'Prepare report for GitHub Pages'] },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      if (request.method === 'POST' && url.pathname === '/api/run') {
        return json(await startRun(env));
      }
      if (request.method === 'GET' && url.pathname === '/api/history') {
        return json({ runs: (await recentRuns(env)).map(summarizeRun) });
      }
      const match = url.pathname.match(/^\/api\/run\/(\d+)$/);
      if (request.method === 'GET' && match) {
        return json(await runStatus(env, match[1]));
      }
      return new Response('Not found', { status: 404 });
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function github(env, path, init = {}) {
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'hrm-automation-trigger',
      ...(env.GITHUB_TOKEN && { Authorization: `Bearer ${env.GITHUB_TOKEN}` }),
      ...(init.body && { 'Content-Type': 'application/json' }),
    },
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('The trigger page is not allowed to start runs. Check that the GITHUB_TOKEN secret is set and has Actions: Read and write.');
  }
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

async function recentRuns(env, extraQuery = '') {
  const data = await github(env, `/actions/workflows/${WORKFLOW}/runs?branch=main&per_page=10${extraQuery}`);
  return data.workflow_runs;
}

function summarizeRun(run) {
  return {
    runId: run.id,
    status: run.status,
    conclusion: run.conclusion,
    event: run.event,
    startedAt: run.run_started_at || run.created_at,
    finishedAt: run.status === 'completed' ? run.updated_at : null,
    runUrl: run.html_url,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startRun(env) {
  // Follow the run already in progress instead of stacking a second one
  const active = (await recentRuns(env)).find((run) => run.status !== 'completed');
  if (active) return { runId: active.id, alreadyRunning: true };

  // Small margin for clock differences between Cloudflare and GitHub
  const requestedAt = Date.now() - 10000;
  await github(env, `/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main' }),
  });

  // The dispatch API does not return the run, so wait for it to appear in the list
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(2000);
    const run = (await recentRuns(env, '&event=workflow_dispatch'))
      .find((r) => Date.parse(r.created_at) >= requestedAt);
    if (run) return { runId: run.id };
  }
  throw new Error('The run was requested but has not appeared on GitHub yet. Check the history in a minute.');
}

function stageState(steps) {
  if (!steps.length) return 'pending';
  if (steps.some((s) => s.conclusion === 'failure')) return 'failed';
  if (steps.every((s) => s.status === 'completed')) return 'done';
  if (steps.some((s) => s.status !== 'queued')) return 'active';
  return 'pending';
}

async function runStatus(env, runId) {
  const [run, { jobs }] = await Promise.all([
    github(env, `/actions/runs/${runId}`),
    github(env, `/actions/runs/${runId}/jobs`),
  ]);
  const test = jobs.find((job) => job.name === 'test');
  const deploy = jobs.find((job) => job.name === 'deploy-report');
  const steps = test?.steps ?? [];
  const finished = run.status === 'completed';

  const stages = { queue: !test || test.status === 'queued' ? (finished ? 'failed' : 'active') : 'done' };
  for (const stage of STAGES) {
    const matched = steps.filter((s) => stage.steps.includes(s.name));
    if (stage.key === 'report') {
      // The deploy job only exists once the test job has finished
      matched.push(deploy ?? { status: finished ? 'completed' : 'queued', conclusion: finished ? 'failure' : null });
    }
    stages[stage.key] = stageState(matched);
  }

  const testStep = steps.find((s) => s.name === 'Run Playwright tests');
  return {
    ...summarizeRun(run),
    stages,
    testResult: testStep?.conclusion ?? null,
    reportReady: deploy?.conclusion === 'success',
    reportUrl: `${REPORT_URL}?run=${run.id}`,
  };
}
