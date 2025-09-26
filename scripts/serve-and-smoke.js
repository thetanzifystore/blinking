const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const ROOT = path.resolve('.next/out');
const KEYWORD = process.env.SMOKE_KEYWORD || 'Blinking';
const INITIAL_DELAY_MS = Number(process.env.INITIAL_DELAY_MS || 500);

function serveOnce() {
  const server = http.createServer((req, res) => {
    let requested = new URL(req.url, `http://localhost`).pathname;
    if (requested === '/' || requested === '/index.html') requested = '/index.html';
    const filePath = path.join(ROOT, decodeURIComponent(requested));
    if (!filePath.startsWith(ROOT)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(PORT, () => resolve(server));
    server.on('error', reject);
  });
}

function fetchRoot() {
  return new Promise((resolve, reject) => {
    const lib = require('http');
    const req = lib.get(`http://localhost:${PORT}/`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

(async function main(){
  try {
    const server = await serveOnce();
    console.log(`server started on http://localhost:${PORT}, checking for keyword '${KEYWORD}'`);
    await new Promise(r => setTimeout(r, INITIAL_DELAY_MS));
    const res = await fetchRoot();
    if (res.status >= 200 && res.status < 400 && res.body.includes(KEYWORD)) {
      console.log('✅ Local smoke test passed');
      server.close(() => process.exit(0));
    } else {
      console.error('❌ Local smoke test failed', res.status);
      const preview = (res.body || '').slice(0, 400).replace(/\s+/g,' ').trim();
      if (preview) console.error('Preview:', preview);
      server.close(() => process.exit(2));
    }
  } catch (err) {
    console.error('Server error:', err && err.message || err);
    process.exit(3);
  }
})();
