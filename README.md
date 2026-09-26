# OrangeHRM Employee Lifecycle Automation

End-to-end UI + API test for the Employee Lifecycle scenario on the
[OrangeHRM demo site](https://opensource-demo.orangehrmlive.com/), written with
Playwright (JavaScript) using the Page Object Model.

## Scenario covered

One test runs the full flow, with assertions after every step:

1. **Login** as Admin and verify the dashboard is visible.
2. **Add employee** from PIM > Add Employee with first name, last name, employee ID and
   profile picture (data from `test-data/employee.json`). Verify the success toast and
   the Personal Details page.
3. **Edit employee**: search by Employee ID, update Job Title and Employment Status,
   reload the page and verify the new values persisted.
4. **Validate via API**: call OrangeHRM's REST API and cross-check name, employee ID,
   job title and employment status against the UI.
5. **Delete employee** from the list, then verify it is gone from both the UI search and
   the API.
6. **Logout** and verify the session is invalidated: the dashboard URL redirects to
   login and the API returns `401`.

## Project structure

```
├── pages/                         Page objects (selectors + actions per screen)
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── AddEmployeePage.js
│   ├── EmployeeListPage.js
│   └── EmployeeJobDetailsPage.js
├── tests/
│   └── employee-lifecycle.spec.js  The end-to-end test
├── test-data/
│   ├── employee.json               Test input
│   └── sample-profile.png          Image used for the profile picture upload
├── utils/
│   └── apiHelper.js                OrangeHRM API calls used in steps 4 and 5
├── playwright-report/              HTML report from the latest run
├── test-results/                   Video of the latest run
├── .github/workflows/playwright.yml  Runs the test on GitHub Actions
└── playwright.config.js            Browser, video, trace and reporter settings
```

## Implementation notes

- **API validation uses OrangeHRM's own API** (`/web/index.php/api/v2/pim/employees`).
  The calls go through `page.request`, which shares cookies with the browser, so they
  are authenticated by the same session the UI logged in with.
- **Unique Employee ID per run.** The demo site is shared by many users, so the test
  appends a timestamp to the `employeeIdPrefix` from the JSON file to avoid collisions.
- **Each step is a `test.step()`**, so the HTML report shows the six steps separately.
- **Every assertion has a message** describing what was expected.

## Setup

Requires [Node.js](https://nodejs.org/) 18 or later and Google Chrome.

```bash
git clone <repo-url>
cd orangehrm-playwright-automation
npm install
```

The test runs on the locally installed Google Chrome, so no browser download is needed.
If Chrome is not installed, run `npx playwright install chrome`.

## Running the test

```bash
npm test              # headless
npm run test:headed   # with a visible browser
npm run test:ui       # Playwright UI mode
npm run report        # open the HTML report of the last run
```

## Report and video

- HTML report: `playwright-report/index.html` (or `npm run report`). The video and
  step timeline are attached to the test inside the report.
- Raw video file: `test-results/<test-name>/video.webm`.
- On GitHub Actions, both folders are uploaded as artifacts on every run.

## Dependencies

| Package | Purpose |
|---|---|
| `@playwright/test` | Test runner, browser automation, assertions, API requests, HTML report, video and trace |
