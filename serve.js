const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=UTF-8'
};

/**
 * Directly updates config.json, script.js, and index.html on disk
 */
function updateFilesOnDisk(config) {
  // 1. Update config.json
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

  // 2. Update script.js default config
  const scriptPath = path.join(__dirname, 'script.js');
  if (fs.existsSync(scriptPath)) {
    let scriptContent = fs.readFileSync(scriptPath, 'utf8');
    const newConfigStr = `let SITE_CONFIG = ${JSON.stringify(config, null, 2)};`;
    scriptContent = scriptContent.replace(/let SITE_CONFIG = \{[\s\S]*?\};/, newConfigStr);
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  }

  // 3. Update index.html CTA href links
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Construct WhatsApp link
    const cleanPhone = (config.whatsappPhone || '').replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(config.whatsappMessage || '');
    let waUrl = 'https://wa.me/';
    if (cleanPhone) {
      waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    } else if (encodedMsg) {
      waUrl = `https://wa.me/?text=${encodedMsg}`;
    }

    // Construct Telegram link
    let tgUrl = (config.telegramUrl || 'https://t.me/').trim();
    if (tgUrl && !tgUrl.startsWith('http://') && !tgUrl.startsWith('https://')) {
      if (tgUrl.startsWith('@')) tgUrl = tgUrl.substring(1);
      tgUrl = 'https://t.me/' + tgUrl;
    }

    // Replace hrefs in index.html
    htmlContent = htmlContent.replace(/<a\s+href="[^"]*"\s+target="_blank"\s+rel="noopener noreferrer"\s+class="action-btn btn-whatsapp"\s+id="whatsapp-btn"/,
      `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="action-btn btn-whatsapp" id="whatsapp-btn"`
    );
    htmlContent = htmlContent.replace(/<a\s+href="[^"]*"\s+target="_blank"\s+rel="noopener noreferrer"\s+class="action-btn btn-telegram"\s+id="telegram-btn"/,
      `<a href="${tgUrl}" target="_blank" rel="noopener noreferrer" class="action-btn btn-telegram" id="telegram-btn"`
    );

    fs.writeFileSync(indexPath, htmlContent, 'utf8');
  }
}

const server = http.createServer((req, res) => {
  // CORS headers so requests from file:/// or any port work
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Normalize URL path
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let reqPath = decodeURI(parsedUrl.pathname);

  // API endpoint: GET /api/config
  if (req.method === 'GET' && reqPath === '/api/config') {
    fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      if (err) {
        res.end(JSON.stringify({ metaPixelId: '', whatsappPhone: '', whatsappMessage: '', telegramUrl: 'https://t.me/' }));
      } else {
        res.end(data);
      }
    });
    return;
  }

  // API endpoint: POST /api/config
  if (req.method === 'POST' && reqPath === '/api/config') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const cleanConfig = {
          metaPixelId: (payload.metaPixelId || '').trim(),
          whatsappPhone: (payload.whatsappPhone || '').replace(/[^0-9]/g, '').trim(),
          whatsappMessage: (payload.whatsappMessage || '').trim(),
          telegramUrl: (payload.telegramUrl || '').trim()
        };

        // Directly update config.json, script.js, and index.html
        updateFilesOnDisk(cleanConfig);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config: cleanConfig, message: 'All files directly updated on disk' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload or write error: ' + e.message }));
      }
    });
    return;
  }

  // Route aliases for /pixcel and /pixel
  if (reqPath === '/pixcel' || reqPath === '/pixcel/' || reqPath === '/pixel' || reqPath === '/pixel/') {
    reqPath = '/pixcel.html';
  } else if (reqPath === '/') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support Range requests for MP4 video streaming and seeking
    const range = req.headers.range;
    if (range && ext === '.mp4') {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Landing Page: http://localhost:${PORT}/`);
  console.log(`Pixel & Link Control Panel: http://localhost:${PORT}/pixcel`);
});
