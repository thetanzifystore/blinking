const fs = require('fs');
const { URL } = require('url');

// choose http or https lib depending on the URL protocol so local http servers work
function chooseLib(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' ? require('https') : require('http');
  } catch (e) {
    return require('https');
  }
}

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
  const lib = chooseLib(url);
  lib.get(url, res => {
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
          // include a short preview of the body for diagnostics
          const preview = (data || '').slice(0, 400).replace(/\s+/g, ' ').trim();
          annotateError(`Smoke test failed after ${attempt} attempts (status: ${res.statusCode})`);
          if (preview) annotateError(`Response preview: ${preview}`);
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
