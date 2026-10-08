const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '4173', 10);
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const relativePath = decodedPath === '/' ? '/index.html' : decodedPath;
  const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  return path.join(ROOT, normalizedPath);
}

const server = http.createServer((req, res) => {
  const filePath = resolveRequestPath(req.url || '/');

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
      return;
    }

    const finalPath = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(finalPath, (readError, data) => {
      if (readError) {
        send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
        return;
      }

      const ext = path.extname(finalPath).toLowerCase();
      send(res, 200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' }, data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Emoji Royale 2 running at http://127.0.0.1:${PORT}`);
});
