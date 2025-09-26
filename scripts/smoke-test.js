const https = require('https');
const fs = require('fs');

const url = process.env.SMOKE_URL || 'https://blinking-ai.web.app';
const keyword = process.env.SMOKE_KEYWORD || 'Blinking';

const INITIAL_DELAY_MS = Number(process.env.INITIAL_DELAY_MS || 5000);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 5);
const DELAY_MS = Number(process.env.DELAY_MS || 2000);

function setOutput(value) {
  try {
    const ghOut = process.env.GITHUB_OUTPUT;
    if (ghOut) {
      fs.appendFileSync(ghOut, `result=${value}\n`);
    } else {
      // Fallback for local runs: print a machine-friendly line
      console.log(`result=${value}`);
    }
  } catch (e) {
    console.log(`Failed to write GITHUB_OUTPUT: ${e.message}`);
  }
}

function annotateNotice(msg) {
  console.log(`::notice::${msg}`);
}
function annotateError(msg) {
  console.error(`::error::${msg}`);
}

function attemptFetch(attempt = 1) {
  https.get(url, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const okStatus = res.statusCode >= 200 && res.statusCode < 400;
      if (okStatus && data.includes(keyword)) {
        annotateNotice('Smoke test passed');
        setOutput('passed');
        console.log('✅ Smoke test passed');
        process.exit(0);
      } else {
        if (attempt >= MAX_RETRIES) {
          annotateError(`Smoke test failed after ${attempt} attempts (status: ${res.statusCode})`);
          setOutput('failed');
          console.error('❌ Smoke test failed: keyword not found or bad status', res.statusCode);
          process.exit(1);
        } else {
          const backoff = DELAY_MS * attempt;
          console.log(`Attempt ${attempt} failed (status: ${res.statusCode}), retrying in ${backoff}ms...`);
          setTimeout(() => attemptFetch(attempt + 1), backoff);
        }
      }
    });
  }).on('error', err => {
    if (attempt >= MAX_RETRIES) {
      annotateError(`Request failed after ${attempt} attempts: ${err.message}`);
      setOutput('failed');
      console.error('❌ Request failed:', err.message);
      process.exit(1);
    } else {
      const backoff = DELAY_MS * attempt;
      console.log(`Request error on attempt ${attempt}: ${err.message}. Retrying in ${backoff}ms...`);
      setTimeout(() => attemptFetch(attempt + 1), backoff);
    }
  });
}

console.log(`Waiting ${INITIAL_DELAY_MS}ms before first smoke-test attempt...`);
setTimeout(() => attemptFetch(1), INITIAL_DELAY_MS);
