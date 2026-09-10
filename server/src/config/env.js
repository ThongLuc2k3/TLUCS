import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
dotenv.config({ path:fileURLToPath(new URL('../../.env.local',import.meta.url)) })
dotenv.config({ path:fileURLToPath(new URL('../../.env',import.meta.url)) })
export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseUrlDirect: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || '',
  databaseSchema: process.env.DATABASE_SCHEMA || 'tlucs',
  paymentMode: process.env.PAYMENT_MODE || 'simulation',
  webOrigin: process.env.WEB_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'tlucs-local-development-secret-change-me'),
  uploadDir: process.env.UPLOAD_DIR || fileURLToPath(new URL('../../uploads',import.meta.url)),
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'TLUCS <no-reply@tlucs.local>',
  webPushPublicKey: process.env.WEB_PUSH_PUBLIC_KEY || '',
  webPushPrivateKey: process.env.WEB_PUSH_PRIVATE_KEY || '',
  webPushSubject: process.env.WEB_PUSH_SUBJECT || 'mailto:admin@tlucs.local',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  embeddingProvider: process.env.EMBEDDING_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : ''),
  embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
  embeddingDim: Number(process.env.EMBEDDING_DIM || 768),
  embeddingMinSimilarity: Number(process.env.EMBEDDING_MIN_SIMILARITY || 0.68),
  aiProvider: process.env.AI_PROVIDER || 'groq',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'qwen/qwen3.6-27b',
  groqFallbackModel: process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b',
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || '',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
}
if(env.nodeEnv==='production'&&(!env.jwtSecret||env.jwtSecret.length<32))throw new Error('JWT_SECRET production phải có ít nhất 32 ký tự.')
