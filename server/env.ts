import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

export const env = {
  apiPort: Number(process.env.API_PORT ?? 3001),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
};
