/**
 * cPanel Phusion Passenger Startup Entrypoint for Vayanai
 * 
 * Works seamlessly with cPanel "Setup Node.js App" (CloudLinux / Passenger).
 * Binds dynamically to the port or unix socket assigned by cPanel (process.env.PORT).
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

// Pre-flight Node.js version validation (Node >= 22.5.0 required for native node:sqlite)
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 5)) {
  console.error(`[FATAL] Vayanai requires Node.js >= 22.5.0 (for native node:sqlite support).`);
  console.error(`Current detected version: ${process.version}.`);
  console.error(`Please select Node.js 22.x in cPanel "Setup Node.js App".`);
  process.exit(1);
}

// Global process error handlers to prevent silent Passenger worker crashes
process.on('uncaughtException', (err) => {
  console.error('[Vayanai Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Vayanai Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.env.NODE_ENV = 'production';

const port = process.env.PORT || 3000;
const app = next({
  dev: false,
  dir: __dirname
});
const handle = app.getRequestHandler();

console.log('====================================================');
console.log('  VAYANAI PRODUCTION SERVER INITIALIZATION (cPanel) ');
console.log('====================================================');
console.log(`Node.js Version: ${process.version}`);
console.log(`Port / Socket:   ${port}`);
console.log(`Working Dir:     ${__dirname}`);
console.log('====================================================');

app.prepare().then(() => {
  createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`✓ Vayanai Next.js Production Engine is live and listening on ${port}`);
  });
}).catch((err) => {
  console.error('Fatal error starting Next.js production server on cPanel:', err);
  process.exit(1);
});
