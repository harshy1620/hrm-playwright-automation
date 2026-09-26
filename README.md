# OrangeHRM Employee Lifecycle Automation

End-to-end UI + API test for the Employee Lifecycle scenario on the
[OrangeHRM demo site](https://opensource-demo.orangehrmlive.com/), written with
Playwright (JavaScript) using the Page Object Model.

| | |
|---|---|
| **Run the test from the browser** | https://hrm-automation-trigger.harshy1620.workers.dev |
| **Latest report and video** | https://harshy1620.github.io/hrm-playwright-automation/ |

No setup is needed for either link.

## How it works

```
Trigger page (Cloudflare Worker)  ──starts──▶  GitHub Actions  ──runs──▶  Playwright test
          ▲                                                                     │
          └──── shows live progress                  report + video ◀───────────┘
                                                     (GitHub Pages)
```

1. **The test** (`tests/`, `pages/`) drives Chrome through the full employee lifecycle.
2. **GitHub Actions** (`.github/workflows/playwright.yml`) runs the test on a fresh
   machine on every push to `main`, or when started from the trigger page.
3. **GitHub Pages** hosts the HTML report of the latest run, with the video.
4. **The trigger page** (`trigger-page/`) is a small web page with a Run button, live
   progress, and run history, so anyone can start a run without a GitHub account.
5. **Google Chat** gets a pass/fail message with report and log links when a run ends.

## Scenario covered

One test, with assertions after every step:

1. **Login** as Admin and verify the dashboard is visible.
2. **Add employee** with first name, last name, employee ID and profile picture (data
   from `test-data/employee.json`). Verify the success toast and Personal Details page.
3. **Edit employee**: search by Employee ID, update Job Title and Employment Status,
   reload and verify the new values persisted.
4. **Validate via API**: cross-check name, employee ID, job title and employment status
   from OrangeHRM's REST API against the UI, and confirm the stored profile picture has
   the uploaded file's name and size.
5. **Delete employee**, then verify it is gone from both the UI search and the API.
6. **Logout** and verify the session is invalidated: the dashboard redirects to login
   and the API returns `401`.

## Project structure

```
├── tests/employee-lifecycle.spec.js  The end-to-end test
├── pages/                            Page objects: selectors + actions per screen
├── utils/apiHelper.js                OrangeHRM API calls (steps 4 and 5)
├── test-data/                        Test input and the profile picture
├── playwright.config.js              Browser, timeouts, video, trace and report settings
├── .github/workflows/playwright.yml  CI: runs the test and publishes the report
├── .github/scripts/notify-gchat.js   Sends the run result to Google Chat
├── trigger-page/                     The Run-button page (Cloudflare Worker)
│   ├── worker.js                     Server code: talks to the GitHub API
│   ├── page.html                     The page people see
│   └── wrangler.toml                 Cloudflare settings
├── playwright-report/                HTML report from a local run
└── test-results/                     Video from a local run
```

## Running locally

Requires [Node.js](https://nodejs.org/) 18+ and Google Chrome.

```bash
git clone https://github.com/harshy1620/hrm-playwright-automation.git
cd hrm-playwright-automation
npm install

npm test              # headless
npm run test:headed   # with a visible browser
npm run test:ui       # step through each action
npm run report        # open the HTML report of the last run
```

The test uses the installed Google Chrome, so no browser download is needed.

To view a report without running anything, open `playwright-report/index.html` in a
browser. The video is inside the report.

## Implementation notes

- **API validation uses OrangeHRM's own API** (`/web/index.php/api/v2/pim/employees`)
  through `page.request`, which reuses the browser's login cookies.
- **Unique Employee ID per run.** The demo site is shared, so a timestamp is appended to
  the `employeeIdPrefix` from the JSON file.
- **Exact dropdown matching.** Other users add look-alike values such as
  "QA Engineer-123", so options are matched by exact text.
- **Fail fast.** Page loads time out after 30 s, so an unreachable demo site fails
  quickly instead of using the full 2-minute test timeout. On CI a failed test is retried
  twice.
- **Readable reports.** Each scenario step is a `test.step()`, and every assertion has a
  message describing what was expected.

## Trigger page

Starting a GitHub Actions run needs a GitHub token, which cannot be put in a public web
page. The trigger page is therefore a **Cloudflare Worker**: a small piece of server code
that Cloudflare runs on demand, for free. It keeps the token as a secret, starts the
workflow, and reports progress to the page. The browser never sees the token.

**Wrangler** is Cloudflare's command-line tool that uploads the worker, and
**wrangler.toml** is its settings file (worker name, entry file).

To deploy your own copy:

1. Create a GitHub fine-grained token for this repository only, with
   **Actions: Read and write**.
2. From the `trigger-page` folder:

```bash
npx wrangler login                     # sign in to Cloudflare
npx wrangler secret put GITHUB_TOKEN   # paste the token when asked
npx wrangler deploy                    # publish; prints the page URL
```

Run `npx wrangler deploy` again after changing `worker.js` or `page.html`.

## Google Chat alerts

Save a Google Chat incoming webhook URL as the repository secret `GCHAT_WEBHOOK_URL`.
Without it, the alert is skipped and the run is unaffected.

## Dependencies

| Tool | Purpose |
|---|---|
| `@playwright/test` | Test runner, browser automation, assertions, API requests, HTML report, video and trace |
| GitHub Actions and Pages | Run the test in the cloud and host the report |
| Cloudflare Workers (`wrangler`) | Host the trigger page |
| Google Chat webhook | Run result alerts |
