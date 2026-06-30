import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required to secure authentication tokens.',
  }).min(16, 'JWT_SECRET must be at least 16 characters long'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/slacknotion'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('SlackNotion <no-reply@slacknotion.com>'),
  REDIS_URI: z.string().default('redis://127.0.0.1:6379'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  parseResult.error.errors.forEach((err) => {
    console.error(`   - ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

export const env = parseResult.data;
