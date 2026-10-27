import type { Context } from '@netlify/functions';
import { handleGameRequest } from '../../lib/game-handler.js';

/**
 * Standard Netlify Function for Chaos Room backend.
 * Uses Netlify Blobs with strong consistency and conditional writes.
 * Replaces any continuously running backend.
 * Accessible directly at /.netlify/functions/game
 */
export default async function handler(req: Request, context: Context): Promise<Response> {
  return handleGameRequest(req);
}
