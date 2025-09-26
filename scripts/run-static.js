const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const ROOT = path.resolve('.next/out');

const server = http.createServer((req, res) => {
  try {
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
  } catch (err) {
    res.statusCode = 500;
    res.end('Server error');
  }
});

server.listen(PORT, () => console.log(`Static server started on http://localhost:${PORT} serving ${ROOT}`));

module.exports = server;
