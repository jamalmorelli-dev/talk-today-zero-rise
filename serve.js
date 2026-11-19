// Zero-dependency static server with HTTP 206 Range support for smooth MP4/audio streaming
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const port = +process.argv[2] || 8792;

http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/Index.html';
  const filePath = path.join(__dirname, path.normalize(reqPath));

  if (!filePath.startsWith(__dirname) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not Found');
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  const range = req.headers.range;
  if (range && (ext === '.mp4' || ext === '.mp3' || ext === '.webm')) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
    let start = 0;
    let end = stat.size - 1;
    let ok = !!m && stat.size > 0;
    if (ok && m[1] === '' && m[2] !== '') {
      const n = parseInt(m[2], 10);
      ok = Number.isFinite(n) && n > 0;
      start = Math.max(0, stat.size - n);
    } else if (ok) {
      start = m[1] === '' ? NaN : parseInt(m[1], 10);
      end = m[2] === '' ? stat.size - 1 : parseInt(m[2], 10);
      ok = Number.isFinite(start) && Number.isFinite(end);
    }
    if (!ok || start < 0 || start >= stat.size || end < start) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size, 'Content-Type': 'text/plain' });
      return res.end();
    }
    end = Math.min(end, stat.size - 1);
    const chunksize = (end - start) + 1;
    const stream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
