const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all network interfaces
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Comprehensive CORS configuration for maximum accessibility
      const allowedOrigins = [
        // Localhost variations
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        
        // Local network IPs - Update with your actual IPs
        'http://YOUR_LOCAL_IP:3000',
        'http://YOUR_LOCAL_IP:3001',
        'http://YOUR_PUBLIC_IP:3000',
        'http://YOUR_PUBLIC_IP:3001',
        
        // Domain (production) - Update with your actual domain
        'https://your-domain.com',
        'http://your-domain.com', // Allow http for development
        
        // Additional common local network ranges
        'http://192.168.1.83:3000',
        'http://192.168.1.83:3001',
        'http://10.0.0.83:3000',
        'http://10.0.0.83:3001'
      ];
      
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      
      // Allow requests with no origin (direct access, curl, etc.)
      if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        // For development: allow any localhost/127.0.0.1 origin
        if (dev && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('10.0.'))) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
          res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all in development
        }
      }
      
      // Comprehensive CORS headers
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
      
      // Handle preflight OPTIONS requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Security headers for production
      if (!dev) {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Server is accessible via:');
    console.log(`  - http://localhost:${port}`);
    console.log(`  - http://127.0.0.1:${port}`);
    console.log(`  - http://192.168.110.83:${port}`);
    console.log(`  - http://110.81.15.51:${port}`);
    console.log('  - https://stocks.andrisetiawan.com (via proxy)');
    console.log('');
    console.log('> CORS enabled for all allowed origins');
    console.log('> Server bound to 0.0.0.0 - accessible from any IP');
    if (dev) {
      console.log('> Development mode: Permissive CORS for local testing');
    }
  });
});