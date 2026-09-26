// Posts the run result to a Google Chat space. Skips quietly when no webhook is configured.
const {
  GCHAT_WEBHOOK_URL: webhook,
  TEST_RESULT: result,
  TRIGGER: trigger,
  RUN_URL: runUrl,
  REPORT_URL: reportUrl,
  REPORT_PUBLISHED: reportPublished,
} = process.env;

if (!webhook) {
  console.log('GCHAT_WEBHOOK_URL is not set, skipping the Google Chat message.');
  process.exit(0);
}

const passed = result === 'success';
const title = passed ? '✅ Employee lifecycle check passed' : result === 'cancelled'
  ? '⚪ Employee lifecycle check was cancelled'
  : '❌ Employee lifecycle check failed';
const howStarted = { workflow_dispatch: 'Run button on the trigger page', push: 'Code push to main' }[trigger] || trigger;

const buttons = [];
if (reportPublished === 'success') {
  buttons.push({ text: 'Open report and video', onClick: { openLink: { url: reportUrl } } });
}
buttons.push({ text: 'View logs', onClick: { openLink: { url: runUrl } } });

const message = {
  text: title,
  cardsV2: [{
    cardId: 'run-result',
    card: {
      header: { title, subtitle: 'OrangeHRM test runner' },
      sections: [{
        widgets: [
          { decoratedText: { topLabel: 'Started by', text: howStarted } },
          { decoratedText: { topLabel: 'What was checked', text: 'Login, add employee with photo, edit job, API cross-check, delete, logout' } },
          { buttonList: { buttons } },
        ],
      }],
    },
  }],
};

fetch(webhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  body: JSON.stringify(message),
}).then(async (res) => {
  if (!res.ok) throw new Error(`Google Chat returned ${res.status}: ${await res.text()}`);
  console.log('Sent the result to Google Chat.');
}).catch((err) => {
  // A chat outage should not mark the test run as failed
  console.log(`::warning::Could not send the Google Chat message. ${err.message}`);
});
