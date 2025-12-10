// server.js
const http = require('http');
const https = require('https');
const url = require('url');

// Use PORT from environment or default to 8080
const PORT = process.env.PORT || 8080;
const TELEGRAM_API = 'api.telegram.org';

// Create the reverse proxy server
const server = http.createServer((req, res) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Telegram Reverse Proxy is running',
      usage: 'Send requests to /bot<TOKEN>/METHOD',
      example: '/bot123456:ABC-DEF/getMe'
    }));
    return;
  }

  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  const parsedUrl = url.parse(req.url);
  
  // Prepare options for forwarding to Telegram
  const options = {
    hostname: TELEGRAM_API,
    port: 443,
    path: parsedUrl.path,
    method: req.method,
    headers: {
      ...req.headers,
      host: TELEGRAM_API
    }
  };

  // Forward the request to Telegram API
  const proxyReq = https.request(options, (proxyRes) => {
    // Add CORS headers
    const headers = {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    console.error(`Proxy error: ${e.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy request failed', details: e.message }));
  });

  req.pipe(proxyReq);
});

server.on('error', (e) => {
  console.error(`Server error: ${e.message}`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Telegram Proxy running on port ${PORT}`);
  console.log(`📡 Forwarding requests to ${TELEGRAM_API}`);
  console.log(`✅ Health check available at /health`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n⏳ Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);