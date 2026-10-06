import { Request, Response } from 'express';
import { storageProvider } from '../integrations/storageProvider.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export class MediaController {
  /**
   * Universal public media streaming endpoint.
   * Directly stream binary bytes for <img>, <video>, downloads, etc.
   * Handles:
   * GET /api/v1/media/:idOrKey
   * GET /api/v1/media/*
   */
  async streamMedia(req: Request, res: Response): Promise<void> {
    try {
      const rawParam = (req.params as any)[0] || (req.params as any).idOrKey || req.params.id;
      const keyOrId = rawParam ? decodeURIComponent(rawParam) : (req.query.key as string);

      if (!keyOrId) {
        res.status(400).send('Missing media key or id');
        return;
      }

      const asset = await storageProvider.getMediaAsset(keyOrId);
      if (!asset) {
        res.status(404).send('Media asset not found');
        return;
      }

      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Length', asset.buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.end(asset.buffer);
    } catch (error: any) {
      logger.error('Error streaming media asset:', error);
      res.status(500).send('Error streaming media: ' + error.message);
    }
  }

  /**
   * Universal authenticated media upload endpoint.
   * Supports base64 data payloads with folder grouping.
   * POST /api/v1/media/upload
   */
  async uploadMedia(req: Request, res: Response): Promise<void> {
    try {
      const { imageBase64, fileName, mimeType, folder, entityType, entityId } = req.body;

      if (!imageBase64) {
        sendError(res, 'imageBase64 payload is required', 400);
        return;
      }

      // Strip data URL prefix if present (e.g. data:image/png;base64,)
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (!buffer || buffer.length === 0) {
        sendError(res, 'Decoded image buffer is empty', 400);
        return;
      }

      const detectedMime = mimeType || 'image/png';
      if (!detectedMime.startsWith('image/')) {
        sendError(res, 'Only image formats (.png, .jpg, .webp, .svg) are allowed', 400);
        return;
      }

      const safeName = fileName || `asset_${Date.now()}.png`;
      const targetFolder = folder || 'general';

      const result = await storageProvider.uploadFile({
        fileName: safeName,
        buffer,
        mimeType: detectedMime,
        folder: targetFolder,
        entityType,
        entityId,
      });

      sendSuccess(res, result, 'Media uploaded successfully and permanently saved', 201);
    } catch (error: any) {
      logger.error('Error uploading media asset:', error);
      sendError(res, error.message || 'Media upload failed', 400);
    }
  }
}

export const mediaController = new MediaController();
