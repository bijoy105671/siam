import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { Pool, PoolClient } from 'pg';
import { fileURLToPath } from 'node:url';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const app = express();
const port = Number(process.env.PORT || 4000);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be set and at least 32 characters');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: '-c timezone=Asia/Dhaka', ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

const PASSWORD_RESET_EMAIL = 'bijoy105671@gmail.com';
const hashOtp = (otp: string) => createHash('sha256').update(otp).digest('hex');

const initializeDatabase = async () => {
  const schemaUrl = new URL('./schema.sql', import.meta.url);
  const schema = await readFile(schemaUrl, 'utf8');
  await pool.query(schema);
  console.log('SIAM AIR database schema initialized');
};

const sendSecurityOtp = async (otp: string, action: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = 'onboarding@resend.dev';
  if (!apiKey) throw new Error('Security OTP email is not configured. Add RESEND_API_KEY in Render.');
  const safeAction = action || 'a protected administrator action';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [PASSWORD_RESET_EMAIL],
      subject: 'SIAM AIR & DIGITAL SERVICE — Security OTP: ' + safeAction,
      html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px"><h2 style="margin:0 0 8px">Security Verification Required</h2><p>You are trying to perform the following protected action:</p><div style="font-weight:800;font-size:17px;padding:12px 14px;background:#f8fafc;border-radius:10px;border-left:4px solid #0f766e">' + safeAction + '</div><p>Your one-time security verification code is:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#f1f5f9;border-radius:10px">' + otp + '</div><p style="color:#64748b">This security OTP expires in 10 minutes. If you did not request this action, do not share the code.</p><p style="margin-bottom:0"><b>SIAM AIR & DIGITAL SERVICE</b></p></div>'
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('Email provider rejected the security OTP request: ' + body.slice(0, 300));
  }
};

const sendPasswordResetOtp = async (otp: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = 'onboarding@resend.dev';
  if (!apiKey) throw new Error('Password reset email is not configured. Add RESEND_API_KEY in Render.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [PASSWORD_RESET_EMAIL],
      subject: 'SIAM AIR & DIGITAL SERVICE — Admin Password Reset OTP',
      html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px"><h2 style="margin:0 0 8px">Admin Password Reset</h2><p>Your one-time password reset verification code is:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#f1f5f9;border-radius:10px">' + otp + '</div><p style="color:#64748b">This OTP expires in 10 minutes. If you did not request a password reset, ignore this email.</p><p style="margin-bottom:0"><b>SIAM AIR & DIGITAL SERVICE</b></p></div>'
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('Email provider rejected the password reset request: ' + body.slice(0, 300));
  }
};

const PgSession = connectPgSimple(session);

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 }
}));

const audit = async (client: PoolClient, userId: string | null, action: string, recordType: string, recordId: string, previousValue?: unknown, newValue?: unknown) => {
  await client.query(
    'INSERT INTO audit_logs (user_id, action, record_type, record_id, previous_value, new_value) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, action, recordType, recordId, previousValue === undefined ? null : JSON.stringify(previousValue), newValue === undefined ? null : JSON.stringify(newValue)]
  );
};

const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  next();
};

const getSecurityAction = (req: express.Request) => {
  const headerAction = String(req.header('x-security-action') || '').trim();
  if (headerAction) return headerAction;
  const path = req.path;
  if (path === '/api/settings') return 'Update Company & Agency Identity Settings';
  if (path === '/api/opening-balances' || path.startsWith('/api/opening-balances/')) return 'Change Account Opening Balance';
  if (path === '/api/admin/clear-all-data') return 'Clear All Business Data';
  if (path.startsWith('/api/users')) return 'User & Permission Management';
  if (path.startsWith('/api/transactions/')) return 'Edit or Delete Transaction';
  if (path.startsWith('/api/payments/')) return 'Reverse Payment';
  if (path.startsWith('/api/expenses/')) return 'Reverse Expense';
  if (path.startsWith('/api/fund-transfers/')) return 'Reverse Fund Transfer';
  if (path.startsWith('/api/loan-advances')) return 'Loan / Advance Management';
  if (path.startsWith('/api/admin/recycle-bin')) return 'Transaction Recycle Bin Management';
  if (path.startsWith('/api/customers/')) return 'Customer Record Management';
  if (path.startsWith('/api/vendors/')) return 'Vendor Record Management';
  return 'Protected Administrator Action';
};

const criticalAdminOnly = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  try {
    const { rows } = await pool.query('SELECT role, is_active FROM users WHERE id=$1', [req.session.userId]);
    if (!rows[0]?.is_active) return res.status(401).json({ error: 'Account inactive' });
    if (rows[0].role !== 'admin') return res.status(403).json({ error: 'Administrator permission required' });
    const verifiedUntil = Number((req.session as any).securityVerifiedUntil || 0);
    if (verifiedUntil <= Date.now()) {
      const otp = String(randomInt(100000, 1000000));
      const action = getSecurityAction(req);