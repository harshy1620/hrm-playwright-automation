// Cloudflare Worker: serves the trigger page and talks to the GitHub API.
// The GitHub token stays on the server as a Worker secret, never in the browser.
import PAGE from './page.html';

const OWNER = 'harshy1620';
const REPO = 'hrm-playwright-automation';
const WORKFLOW = 'playwright.yml';
const REPORT_URL = 'https://harshy1620.github.io/hrm-playwright-automation/';

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
      if (request.method === 'GET' && url.pathname === '/api/latest') {
        return json(await latestRun(env));
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
  throw new Error('The run was requested but has not appeared on GitHub yet. Check the latest report in a minute.');
}

async function runStatus(env, runId) {
  const [run, { jobs }] = await Promise.all([
    github(env, `/actions/runs/${runId}`),
    github(env, `/actions/runs/${runId}/jobs`),
  ]);
  const test = jobs.find((job) => job.name === 'test');
  const deploy = jobs.find((job) => job.name === 'deploy-report');

  return {
    runId: run.id,
    status: run.status,
    conclusion: run.conclusion,
    event: run.event,
    startedAt: run.run_started_at,
    updatedAt: run.updated_at,
    runUrl: run.html_url,
    reportUrl: `${REPORT_URL}?run=${run.id}`,
    test: { status: test?.status ?? 'queued', conclusion: test?.conclusion ?? null },
    deploy: deploy ? { status: deploy.status, conclusion: deploy.conclusion } : null,
  };
}

async function latestRun(env) {
  const [latest] = await recentRuns(env);
  return latest ? runStatus(env, latest.id) : { none: true };
}
