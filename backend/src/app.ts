import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config/index.js';
import { storageProvider } from './integrations/storageProvider.js';
import { apiRateLimiter } from './middleware/rateLimitMiddleware.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import routes, { healthCheckHandler } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: config.isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      xContentTypeOptions: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
    })
  );

  // Restrict sensitive browser features via Permissions-Policy
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, native webviews)
        if (!origin) return callback(null, true);

        const cleanOrigin = origin.replace(/\/+$/, '');
        // Explicitly check configured production origins or standard BrandX frontend domains
        if (
          config.corsOrigin.includes(cleanOrigin) ||
          config.corsOrigin.includes(origin) ||
          cleanOrigin.includes('brandx-frontend.onrender.com') ||
          cleanOrigin.includes('localhost') ||
          cleanOrigin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }

        // Permissive ONLY in non-production local development
        if (!config.isProduction) {
          return callback(null, true);
        }

        // Reject unknown origin in production
        return callback(new Error(`CORS blocked: Origin "${origin}" is not authorized.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-business-id', 'x-requested-with'],
    })
  );

  // HTTP Request Logger
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));

  // Request Body Parsers with rawBody preservation for Webhook HMAC verification
  app.use(
    express.json({
      limit: '15mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Global API Rate Limiter
  app.use('/api/', apiRateLimiter);

  // Serve static public assets (brand logo, favicon, etc.)
  const publicPath = path.resolve(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // Serve static media uploads and /media with resilient PostgreSQL MediaAsset fallback
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  const streamFromMediaAsset = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const rawKey = req.path.replace(/^\/+/, '');
      if (!rawKey) return next();
      const asset = await storageProvider.getMediaAsset(rawKey);
      if (asset) {
        res.setHeader('Content-Type', asset.mimeType);
        res.setHeader('Content-Length', asset.buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.end(asset.buffer);
      }
    } catch {
      // Pass through to next
    }
    next();
  };

  app.use('/uploads', streamFromMediaAsset);
  app.use('/media', streamFromMediaAsset);

  // Root welcome ping
  app.get('/', (req, res) => {
    res.json({
      app: 'BrandX Super App API',
      status: 'active',
      docs: `${config.apiPrefix}/health`,
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint at root for platform probes (Render, AWS ALB, GCP)
  app.get('/health', healthCheckHandler);

  // Master API v1 Router
  app.use(config.apiPrefix, routes);

  // 404 & Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
