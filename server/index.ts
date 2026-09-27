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
      html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px"><h2 style="margin:0 0 8px">Admin Password Reset</h2><p>Your one-time verification code is:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#f1f5f9;border-radius:10px">' + otp + '</div><p style="color:#64748b">This OTP expires in 10 minutes. If you did not request this, ignore this email.</p><p style="margin-bottom:0"><b>SIAM AIR & DIGITAL SERVICE</b></p></div>'
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('Email provider rejected the request: ' + body.slice(0, 300));
  }
};

const sendLoginOtp = async (otp: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = 'onboarding@resend.dev';
  if (!apiKey) throw new Error('Login email verification is not configured. Add RESEND_API_KEY in Render.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [PASSWORD_RESET_EMAIL],
      subject: 'SIAM AIR & DIGITAL SERVICE — Login Verification OTP',
      html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px"><h2 style="margin:0 0 8px">Login Verification</h2><p>A login was requested for your SIAM AIR account. Your one-time verification code is:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#ecfdf5;border-radius:10px">' + otp + '</div><p style="color:#64748b">This OTP expires in 10 minutes. Enter it in the SIAM AIR login window. If you did not request this login, ignore this email.</p><p style="margin-bottom:0"><b>SIAM AIR & DIGITAL SERVICE</b></p></div>'
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('Login OTP email provider rejected the request: ' + body.slice(0, 300));
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
  // Session cookie: closing the browser removes the cookie, so the next browser
  // session requires a fresh password + email OTP. New devices naturally get a new session.
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }
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

const criticalAdminOnly = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  try {
    const { rows } = await pool.query('SELECT role, is_active FROM users WHERE id=$1', [req.session.userId]);
    if (!rows[0]?.is_active) return res.status(401).json({ error: 'Account inactive' });
    if (rows[0].role !== 'admin') return res.status(403).json({ error: 'Administrator permission required' });
    const verifiedUntil = Number((req.session as any).securityVerifiedUntil || 0);
    if (verifiedUntil <= Date.now()) {
      const otp = String(randomInt(100000, 1000000));
      await pool.query('CREATE TABLE IF NOT EXISTS security_otps (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, otp_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
      await pool.query('UPDATE security_otps SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [req.session.userId]);
      await pool.query("INSERT INTO security_otps (id,user_id,otp_hash,expires_at) VALUES ($1,$2,$3,now()+interval '10 minutes')", [randomUUID(), req.session.userId, hashOtp(otp)]);
      await sendPasswordResetOtp(otp);
      return res.status(428).json({ error: 'SECURITY_OTP_REQUIRED', message: 'A security OTP was sent to the recovery email. Enter it to continue this important change.' });
    }
    next();
  } catch (e) {
    res.status(503).json({ error: e instanceof Error ? e.message : 'Security verification unavailable' });
  }
};

const adminOnly = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  try {
    const { rows } = await pool.query('SELECT role, is_active FROM users WHERE id=$1', [req.session.userId]);
    if (!rows[0]?.is_active) return res.status(401).json({ error: 'Account inactive' });
    if (rows[0].role !== 'admin') return res.status(403).json({ error: 'Administrator permission required' });
    next();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Authorization check failed' });
  }
};

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, service: 'siam-air-api', database: 'connected', timezone: process.env.TZ || 'Asia/Dhaka' }); }
  catch { res.status(503).json({ ok: false, database: 'unavailable' }); }
});

app.get('/api/public-settings', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['business_settings']);
    const value = rows[0]?.value && typeof rows[0].value === 'object' ? rows[0].value as Record<string, unknown> : {};
    res.json({ settings: { name: value.name || 'SIAM AIR & DIGITAL SERVICE', tagline: value.tagline || 'Travel Agency · Visa · Passport · Digital', logoUrl: value.logoUrl || '', address: value.address || '', mobile: value.mobile || '', whatsapp: value.whatsapp || '', email: value.email || '', website: value.website || '' } });
  } catch (e) { res.status(503).json({ error: e instanceof Error ? e.message : 'Unable to load public business settings' }); }
});

app.get('/api/settings', auth, async (_req, res) => { const { rows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['business_settings']); const value = rows[0]?.value; res.json({ settings: value && typeof value === 'object' ? value : {} }); });

app.patch('/api/settings', criticalAdminOnly, async (req, res) => {
  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const allowed = ['name','tagline','logoUrl','address','mobile','whatsapp','email','website','invoicePrefix','invoiceStartNumber','currencySymbol','currencyName','defaultReminderDays','invoiceTerms','signatureLabel','templates'];
  const { rows: existingRows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['business_settings']);
  const existing = existingRows[0]?.value && typeof existingRows[0].value === 'object' ? existingRows[0].value : {};
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(incoming, key)) patch[key] = incoming[key];
  const merged = { ...existing, ...patch };
  if (typeof merged.logoUrl === 'string' && merged.logoUrl.length > 1800000) return res.status(413).json({ error: 'Logo is too large. Please use an image under about 1.3 MB.' });
  await pool.query('INSERT INTO app_settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()', ['business_settings', JSON.stringify(merged)]);
  const client = await pool.connect(); try { await audit(client, req.session.userId!, 'BUSINESS_SETTINGS_UPDATED', 'Settings', 'business', existing, merged); } finally { client.release(); }
  res.json({ settings: merged });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  const { rows } = await pool.query('SELECT id, username, password_hash, full_name, role, permissions, is_active FROM users WHERE lower(username)=lower($1)', [username]);
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });

  const verifiedUntil = Number((req.session as any).loginOtpVerifiedUntil || 0);
  const verifiedUserId = String((req.session as any).loginOtpUserId || '');
  if (verifiedUntil <= Date.now() || verifiedUserId !== String(user.id)) {
    const otp = String(randomInt(100000, 1000000));
    await pool.query('CREATE TABLE IF NOT EXISTS security_otps (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, otp_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    await pool.query('UPDATE security_otps SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
    await pool.query("INSERT INTO security_otps (id,user_id,otp_hash,expires_at) VALUES ($1,$2,$3,now()+interval '10 minutes')", [randomUUID(), user.id, hashOtp(otp)]);
    (req.session as any).pendingLoginUserId = user.id;
    (req.session as any).pendingLoginUsername = user.username;
    await sendLoginOtp(otp);
    return res.status(428).json({ error: 'SECURITY_OTP_REQUIRED', message: 'Login verification OTP sent to your registered email. Enter it to continue.' });
  }

  req.session.userId = user.id;
  delete (req.session as any).pendingLoginUserId;
  delete (req.session as any).pendingLoginUsername;
  delete (req.session as any).loginOtpVerifiedUntil;
  delete (req.session as any).loginOtpUserId;
  res.json({ user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role, permissions: user.permissions } });
});

app.post('/api/auth/request-password-reset', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    const { rows } = await pool.query('SELECT id, role, is_active FROM users WHERE lower(username)=lower($1)', [username]);
    if (!rows[0]?.is_active || rows[0].role !== 'admin') return res.json({ ok: true, message: 'If the administrator account exists, an OTP has been sent to the registered recovery email.' });
    const otp = String(randomInt(100000, 1000000)); const otpHash = hashOtp(otp);
    await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_otps (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, otp_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query('UPDATE password_reset_otps SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [rows[0].id]);
    await pool.query('INSERT INTO password_reset_otps (id,user_id,otp_hash,expires_at) VALUES ($1,$2,$3,now()+interval \'10 minutes\')', [randomUUID(), rows[0].id, otpHash]);
    await sendPasswordResetOtp(otp); res.json({ ok: true, message: 'OTP sent to the registered recovery email.' });
  } catch (e) { res.status(503).json({ error: e instanceof Error ? e.message : 'Unable to send reset OTP' }); }
});

app.post('/api/auth/verify-password-reset', async (req, res) => {
  const username = String(req.body?.username || '').trim(); const otp = String(req.body?.otp || '').trim(); const newPassword = String(req.body?.newPassword || '');
  if (!username || !/^\d{6}$/.test(otp) || newPassword.length < 8) return res.status(400).json({ error: 'Username, 6-digit OTP and new password (8+ characters) are required' });
  const { rows: users } = await pool.query('SELECT id, role, is_active FROM users WHERE lower(username)=lower($1)', [username]); const user = users[0];
  if (!user?.is_active || user.role !== 'admin') return res.status(400).json({ error: 'Invalid or expired OTP' });
  const { rows } = await pool.query('SELECT id, otp_hash, expires_at, attempts FROM password_reset_otps WHERE user_id=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1', [user.id]); const reset = rows[0];
  if (!reset || new Date(reset.expires_at).getTime() <= Date.now() || Number(reset.attempts) >= 5) return res.status(400).json({ error: 'Invalid or expired OTP' });
  if (hashOtp(otp) !== reset.otp_hash) { await pool.query('UPDATE password_reset_otps SET attempts=attempts+1 WHERE id=$1', [reset.id]); return res.status(400).json({ error: 'Invalid or expired OTP' }); }
  const hash = await bcrypt.hash(newPassword, 12); await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, user.id]); await pool.query('UPDATE password_reset_otps SET used_at=now() WHERE id=$1', [reset.id]); await pool.query('DELETE FROM user_sessions WHERE sess::jsonb->>' + "'userId'" + ' = $1', [user.id]).catch(() => {}); res.json({ ok: true, message: 'Administrator password reset successfully' });
});

app.post('/api/auth/verify-security-otp', async (req, res) => {
  const otp = String(req.body?.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Enter the 6-digit security OTP' });
  try {
    const pendingLoginUserId = String((req.session as any).pendingLoginUserId || '');
    if (!req.session.userId && pendingLoginUserId) {
      const { rows } = await pool.query('SELECT id, otp_hash, expires_at, attempts FROM security_otps WHERE user_id=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1', [pendingLoginUserId]);
      const item = rows[0];
      if (!item || new Date(item.expires_at).getTime() <= Date.now() || Number(item.attempts) >= 5) return res.status(400).json({ error: 'Invalid or expired login OTP' });
      if (hashOtp(otp) !== item.otp_hash) { await pool.query('UPDATE security_otps SET attempts=attempts+1 WHERE id=$1', [item.id]); return res.status(400).json({ error: 'Invalid or expired login OTP' }); }
      await pool.query('UPDATE security_otps SET used_at=now() WHERE id=$1', [item.id]);
      (req.session as any).loginOtpVerifiedUntil = Date.now() + 10 * 60 * 1000;
      (req.session as any).loginOtpUserId = pendingLoginUserId;
      return res.json({ ok: true, loginVerification: true });
    }
    if (!req.session.userId) return res.status(401).json({ error: 'Login verification session expired. Please sign in again.' });
    const { rows } = await pool.query('SELECT id,otp_hash,expires_at,attempts FROM security_otps WHERE user_id=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',[req.session.userId]);
    const item=rows[0];
    if(!item || new Date(item.expires_at).getTime()<=Date.now() || Number(item.attempts)>=5) return res.status(400).json({error:'Invalid or expired security OTP'});
    if(hashOtp(otp)!==item.otp_hash){ await pool.query('UPDATE security_otps SET attempts=attempts+1 WHERE id=$1',[item.id]); return res.status(400).json({error:'Invalid or expired security OTP'}); }
    await pool.query('UPDATE security_otps SET used_at=now() WHERE id=$1',[item.id]); (req.session as any).securityVerifiedUntil=Date.now()+10*60*1000; res.json({ok:true});
  } catch(e){ res.status(503).json({error:e instanceof Error?e.message:'Security verification failed'}); }
});

app.post('/api/auth/change-password', auth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || ''); const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1 AND is_active=true', [req.session.userId]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = await bcrypt.hash(newPassword, 12); await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.session.userId]); res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/auth/me', async (req, res) => { if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' }); const { rows } = await pool.query('SELECT id, username, full_name, role, permissions, is_active FROM users WHERE id=$1', [req.session.userId]); if (!rows[0]?.is_active) return res.status(401).json({ error: 'Account inactive' }); res.json({ user: { id: rows[0].id, username: rows[0].username, fullName: rows[0].full_name, role: rows[0].role, permissions: rows[0].permissions } }); });

app.get('/api/users', adminOnly, async (_req,res) => { const {rows}=await pool.query('SELECT id,username,full_name,role,phone,permissions,is_active,created_at FROM users ORDER BY created_at DESC'); res.json(rows); });
app.post('/api/users', criticalAdminOnly, async (req,res) => { const username=String(req.body?.username||'').trim(), password=String(req.body?.password||''), fullName=String(req.body?.fullName||'').trim(); const role=String(req.body?.role||'staff').toLowerCase(), phone=String(req.body?.phone||'').trim()||null; const permissions=req.body?.permissions&&typeof req.body.permissions==='object'?req.body.permissions:{}; if(!username||password.length<8||!fullName||!['admin','staff'].includes(role)) return res.status(400).json({error:'Invalid user data'}); try{const hash=await bcrypt.hash(password,12);const {rows}=await pool.query('INSERT INTO users (username,password_hash,full_name,role,phone,permissions) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,username,full_name,role,phone,permissions,is_active,created_at',[username,hash,fullName,role,phone,JSON.stringify(permissions)]);res.status(201).json({user:rows[0]});}catch(e){res.status(400).json({error:e instanceof Error?e.message:'User creation failed'});}
});
app.patch('/api/users/:id', criticalAdminOnly, async (req,res) => { try{ const id=req.params.id, fullName=req.body?.fullName!==undefined?String(req.body.fullName).trim():null, username=req.body?.username!==undefined?String(req.body.username).trim():null; const role=req.body?.role!==undefined?String(req.body.role).toLowerCase():null, phone=req.body?.phone!==undefined?(String(req.body.phone).trim()||null):null; const permissions=req.body?.permissions!==undefined?JSON.stringify(req.body.permissions):null; const password=req.body?.password?await bcrypt.hash(String(req.body.password),12):null; if(role!==null&&!['admin','staff'].includes(role)) return res.status(400).json({error:'Invalid role'}); const {rows}=await pool.query('UPDATE users SET full_name=COALESCE($1,full_name), username=COALESCE($2,username), role=COALESCE($3,role), phone=CASE WHEN $4::boolean THEN $5 ELSE phone END, permissions=COALESCE($6::jsonb,permissions), password_hash=COALESCE($7,password_hash) WHERE id=$8 RETURNING id,username,full_name,role,phone,permissions,is_active,created_at',[fullName,username,role,req.body?.phone!==undefined,phone,permissions,password,id]); if(!rows[0]) return res.status(404).json({error:'User not found'}); res.json({user:rows[0]}); }catch(e){res.status(400).json({error:e instanceof Error?e.message:'User update failed'});} });
app.delete('/api/users/:id', criticalAdminOnly, async (req,res) => { if(req.params.id===req.session.userId)return res.status(400).json({error:'You cannot deactivate your own account'}); const {rows}=await pool.query('UPDATE users SET is_active=false WHERE id=$1 RETURNING id',[req.params.id]); if(!rows[0])return res.status(404).json({error:'User not found'}); res.json({ok:true}); });
app.get('/api/expense-categories', auth, async (_req, res) => { const { rows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['expense_categories']); const value = rows[0]?.value; res.json(Array.isArray(value) ? value : []); });
app.put('/api/expense-categories', criticalAdminOnly, async (req, res) => { const categories = Array.isArray(req.body?.categories) ? req.body.categories : null; if (!categories) return res.status(400).json({ error: 'categories must be an array' }); const normalized = categories.filter((c: any) => c && typeof c === 'object' && String(c.name || '').trim()).map((c: any) => ({ id: String(c.id || crypto.randomUUID()), name: String(c.name).trim(), enabled: c.enabled !== false })); await pool.query('INSERT INTO app_settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()', ['expense_categories', JSON.stringify(normalized)]); res.json({ categories: normalized }); });
app.get('/api/services', auth, async (_req,res) => { const {rows}=await pool.query('SELECT id,name,category,enabled,sort_order FROM services WHERE enabled=true ORDER BY sort_order,name'); res.json(rows); });

initializeDatabase().catch((error) => { console.error('Database initialization failed:', error); process.exit(1); });

app.listen(port, () => console.log(`SIAM AIR API listening on ${port}`));
