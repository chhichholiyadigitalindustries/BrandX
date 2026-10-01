import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { config } from './config/index.js';
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
        // Explicitly check configured production origins
        if (config.corsOrigin.includes(cleanOrigin) || config.corsOrigin.includes(origin)) {
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
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global API Rate Limiter
  app.use('/api/', apiRateLimiter);

  // Serve static media uploads
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

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
