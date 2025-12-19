const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2'
};

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const type = mime[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  try {
    const reqPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(ROOT, reqPath);
    // Prevent path traversal
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) {
        // If not found, try serving index.html for /
        if (reqPath === '/' || reqPath === '') {
          const index = path.join(ROOT, 'index.html');
          return fs.access(index, fs.constants.R_OK, accessErr => {
            if (accessErr) {
              res.writeHead(404);
              res.end('Not Found');
            } else {
              sendFile(res, index);
            }
          });
        }
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      if (stats.isDirectory()) {
        const index = path.join(filePath, 'index.html');
        return fs.access(index, fs.constants.R_OK, accessErr => {
          if (accessErr) {
            res.writeHead(403);
            res.end('Forbidden');
          } else {
            sendFile(res, index);
          }
        });
      }

      sendFile(res, filePath);
    });
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, () => {
  console.log(`Static server running at http://localhost:${PORT}`);
});
