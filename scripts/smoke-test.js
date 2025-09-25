const https = require('https');
const fs = require('fs');

const url = process.env.SMOKE_URL || 'https://blinking-ai.web.app';
const keyword = process.env.SMOKE_KEYWORD || 'Blinking';

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

https.get(url, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data.includes(keyword)) {
      annotateNotice('Smoke test passed');
      setOutput('passed');
      console.log('✅ Smoke test passed');
      process.exit(0);
    } else {
      annotateError('Keyword not found in response');
      setOutput('failed');
      console.error('❌ Keyword not found');
      process.exit(1);
    }
  });
}).on('error', err => {
  annotateError(`Request failed: ${err.message}`);
  setOutput('failed');
  console.error('❌ Request failed:', err.message);
  process.exit(1);
});
