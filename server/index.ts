import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { Pool, PoolClient } from 'pg';
import { fileURLToPath } from 'node:url';
import { createHash, randomInt, randomUUID } from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 4000);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be set and at least 32 characters');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: '-c timezone=Asia/Dhaka', ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

const PASSWORD_RESET_EMAIL = 'bijoy105671@gmail.com';
const hashOtp = (otp: string) => createHash('sha256').update(otp).digest('hex');

const sendPasswordResetOtp = async (otp: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Password reset email is not configured');
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
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'siam-air-api', database: 'connected', timezone: process.env.TZ || 'Asia/Dhaka' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/settings', auth, async (_req, res) => {
  const { rows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['business_settings']);
  const value = rows[0]?.value;
  res.json({ settings: value && typeof value === 'object' ? value : {} });
});

app.patch('/api/settings', criticalAdminOnly, async (req, res) => {
  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const allowed = [
    'name','tagline','logoUrl','address','mobile','whatsapp','email','website',
    'invoicePrefix','invoiceStartNumber','currencySymbol','currencyName',
    'defaultReminderDays','invoiceTerms','signatureLabel','templates'
  ];
  const { rows: existingRows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['business_settings']);
  const existing = existingRows[0]?.value && typeof existingRows[0].value === 'object' ? existingRows[0].value : {};
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(incoming, key)) patch[key] = incoming[key];
  const merged = { ...existing, ...patch };
  if (typeof merged.logoUrl === 'string' && merged.logoUrl.length > 1800000) {
    return res.status(413).json({ error: 'Logo is too large. Please use an image under about 1.3 MB.' });
  }
  await pool.query(
    'INSERT INTO app_settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()',
    ['business_settings', JSON.stringify(merged)]
  );
  const client = await pool.connect();
  try {
    await audit(client, req.session.userId!, 'BUSINESS_SETTINGS_UPDATED', 'Settings', 'business', existing, merged);
  } finally {
    client.release();
  }
  res.json({ settings: merged });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  const { rows } = await pool.query('SELECT id, username, password_hash, full_name, role, permissions, is_active FROM users WHERE lower(username)=lower($1)', [username]);
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  res.json({ user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role, permissions: user.permissions } });
});

app.post('/api/auth/request-password-reset', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, role, is_active FROM users WHERE lower(username)=lower($1)',
      [username]
    );
    if (!rows[0]?.is_active || rows[0].role !== 'admin') {
      return res.json({ ok: true, message: 'If the administrator account exists, an OTP has been sent to the registered recovery email.' });
    }

    const otp = String(randomInt(100000, 1000000));
    const otpHash = hashOtp(otp);
    await pool.query(
      `CREATE TABLE IF NOT EXISTS password_reset_otps (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
    );
    await pool.query('UPDATE password_reset_otps SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [rows[0].id]);
    await pool.query(
      'INSERT INTO password_reset_otps (id,user_id,otp_hash,expires_at) VALUES ($1,$2,$3,now()+interval \'10 minutes\')',
      [randomUUID(), rows[0].id, otpHash]
    );
    await sendPasswordResetOtp(otp);
    res.json({ ok: true, message: 'OTP sent to the registered recovery email.' });
  } catch (e) {
    res.status(503).json({ error: e instanceof Error ? e.message : 'Unable to send reset OTP' });
  }
});

app.post('/api/auth/verify-password-reset', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const otp = String(req.body?.otp || '').trim();
  const newPassword = String(req.body?.newPassword || '');
  if (!username || !/^\d{6}$/.test(otp) || newPassword.length < 8) {
    return res.status(400).json({ error: 'Username, 6-digit OTP and new password (8+ characters) are required' });
  }

  const { rows: users } = await pool.query(
    'SELECT id, role, is_active FROM users WHERE lower(username)=lower($1)',
    [username]
  );
  const user = users[0];
  if (!user?.is_active || user.role !== 'admin') return res.status(400).json({ error: 'Invalid or expired OTP' });

  const { rows } = await pool.query(
    'SELECT id, otp_hash, expires_at, attempts FROM password_reset_otps WHERE user_id=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',
    [user.id]
  );
  const reset = rows[0];
  if (!reset || new Date(reset.expires_at).getTime() <= Date.now() || Number(reset.attempts) >= 5) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  if (hashOtp(otp) !== reset.otp_hash) {
    await pool.query('UPDATE password_reset_otps SET attempts=attempts+1 WHERE id=$1', [reset.id]);
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, user.id]);
  await pool.query('UPDATE password_reset_otps SET used_at=now() WHERE id=$1', [reset.id]);
  await pool.query('DELETE FROM user_sessions WHERE sess::jsonb->>' + "'userId'" + ' = $1', [user.id]).catch(() => {});
  res.json({ ok: true, message: 'Administrator password reset successfully' });
});

app.post('/api/auth/verify-security-otp', auth, async (req, res) => {
  const otp=String(req.body?.otp||'').trim();
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({error:'Enter the 6-digit security OTP'});
  try {
    const {rows}=await pool.query('SELECT id,otp_hash,expires_at,attempts FROM security_otps WHERE user_id=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',[req.session.userId]);
    const item=rows[0];
    if(!item || new Date(item.expires_at).getTime()<=Date.now() || Number(item.attempts)>=5) return res.status(400).json({error:'Invalid or expired security OTP'});
    if(hashOtp(otp)!==item.otp_hash){ await pool.query('UPDATE security_otps SET attempts=attempts+1 WHERE id=$1',[item.id]); return res.status(400).json({error:'Invalid or expired security OTP'}); }
    await pool.query('UPDATE security_otps SET used_at=now() WHERE id=$1',[item.id]);
    (req.session as any).securityVerifiedUntil=Date.now()+10*60*1000;
    res.json({ok:true});
  } catch(e){ res.status(503).json({error:e instanceof Error?e.message:'Security verification failed'}); }
});

app.post('/api/auth/change-password', auth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1 AND is_active=true', [req.session.userId]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.session.userId]);
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const { rows } = await pool.query('SELECT id, username, full_name, role, permissions, is_active FROM users WHERE id=$1', [req.session.userId]);
  if (!rows[0]?.is_active) return res.status(401).json({ error: 'Account inactive' });
  res.json({ user: { id: rows[0].id, username: rows[0].username, fullName: rows[0].full_name, role: rows[0].role, permissions: rows[0].permissions } });
});

app.get('/api/users', adminOnly, async (_req,res) => {
  const {rows}=await pool.query('SELECT id,username,full_name,role,phone,permissions,is_active,created_at FROM users ORDER BY created_at DESC');
  res.json(rows);
});
app.post('/api/users', criticalAdminOnly, async (req,res) => {
  const username=String(req.body?.username||'').trim(), password=String(req.body?.password||''), fullName=String(req.body?.fullName||'').trim();
  const role=String(req.body?.role||'staff').toLowerCase(), phone=String(req.body?.phone||'').trim()||null;
  const permissions=req.body?.permissions&&typeof req.body.permissions==='object'?req.body.permissions:{};
  if(!username||password.length<8||!fullName||!['admin','staff'].includes(role)) return res.status(400).json({error:'Invalid user data'});
  try{const hash=await bcrypt.hash(password,12);const {rows}=await pool.query('INSERT INTO users (username,password_hash,full_name,role,phone,permissions) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,username,full_name,role,phone,permissions,is_active,created_at',[username,hash,fullName,role,phone,JSON.stringify(permissions)]);res.status(201).json({user:rows[0]});}
  catch(e){res.status(400).json({error:e instanceof Error?e.message:'User creation failed'});}
});
app.patch('/api/users/:id', criticalAdminOnly, async (req,res) => {
  try{
    const id=req.params.id, fullName=req.body?.fullName!==undefined?String(req.body.fullName).trim():null, username=req.body?.username!==undefined?String(req.body.username).trim():null;
    const role=req.body?.role!==undefined?String(req.body.role).toLowerCase():null, phone=req.body?.phone!==undefined?(String(req.body.phone).trim()||null):null;
    const permissions=req.body?.permissions!==undefined?JSON.stringify(req.body.permissions):null;
    const password=req.body?.password?await bcrypt.hash(String(req.body.password),12):null;
    if(role!==null&&!['admin','staff'].includes(role)) return res.status(400).json({error:'Invalid role'});
    const {rows}=await pool.query('UPDATE users SET full_name=COALESCE($1,full_name), username=COALESCE($2,username), role=COALESCE($3,role), phone=CASE WHEN $4::boolean THEN $5 ELSE phone END, permissions=COALESCE($6::jsonb,permissions), password_hash=COALESCE($7,password_hash) WHERE id=$8 RETURNING id,username,full_name,role,phone,permissions,is_active,created_at',[fullName,username,role,req.body?.phone!==undefined,phone,permissions,password,id]);
    if(!rows[0]) return res.status(404).json({error:'User not found'});
    res.json({user:rows[0]});
  }catch(e){res.status(400).json({error:e instanceof Error?e.message:'User update failed'});}
});
app.delete('/api/users/:id', criticalAdminOnly, async (req,res) => {
  if(req.params.id===req.session.userId)return res.status(400).json({error:'You cannot deactivate your own account'});
  const {rows}=await pool.query('UPDATE users SET is_active=false WHERE id=$1 RETURNING id',[req.params.id]);
  if(!rows[0])return res.status(404).json({error:'User not found'});
  res.json({ok:true});
});
app.get('/api/expense-categories', auth, async (_req, res) => {
  const { rows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['expense_categories']);
  const value = rows[0]?.value;
  res.json(Array.isArray(value) ? value : []);
});

app.put('/api/expense-categories', criticalAdminOnly, async (req, res) => {
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : null;
  if (!categories) return res.status(400).json({ error: 'categories must be an array' });
  const normalized = categories
    .filter((c: any) => c && typeof c === 'object' && String(c.name || '').trim())
    .map((c: any) => ({
      id: String(c.id || crypto.randomUUID()),
      name: String(c.name).trim(),
      enabled: c.enabled !== false,
    }));
  await pool.query(
    'INSERT INTO app_settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()',
    ['expense_categories', JSON.stringify(normalized)]
  );
  res.json({ categories: normalized });
});

app.get('/api/services', auth, async (_req,res) => {
  const {rows}=await pool.query('SELECT id,name,category,enabled,sort_order FROM services ORDER BY sort_order,name');
  res.json(rows);
});
app.post('/api/services', criticalAdminOnly, async (req,res) => {
  const name=String(req.body?.name||'').trim(), category=String(req.body?.category||'Other').trim()||'Other';
  if(!name)return res.status(400).json({error:'Service name is required'});
  try{const {rows}=await pool.query('INSERT INTO services (name,category,enabled,sort_order) VALUES ($1,$2,$3,$4) RETURNING id,name,category,enabled,sort_order',[name,category,req.body?.enabled!==false,Number(req.body?.sortOrder||0)]);res.status(201).json({service:rows[0]});}
  catch(e){res.status(400).json({error:e instanceof Error?e.message:'Service creation failed'});}
});
app.patch('/api/services/:id', criticalAdminOnly, async (req,res) => {
  const {rows}=await pool.query('UPDATE services SET name=COALESCE($1,name), category=COALESCE($2,category), enabled=COALESCE($3,enabled), sort_order=COALESCE($4,sort_order) WHERE id=$5 RETURNING id,name,category,enabled,sort_order',
    [req.body?.name!==undefined?String(req.body.name).trim():null,req.body?.category!==undefined?String(req.body.category).trim():null,req.body?.enabled!==undefined?Boolean(req.body.enabled):null,req.body?.sortOrder!==undefined?Number(req.body.sortOrder):null,req.params.id]);
  if(!rows[0])return res.status(404).json({error:'Service not found'});res.json({service:rows[0]});
});
app.delete('/api/services/:id', criticalAdminOnly, async (req,res) => {
  const {rows}=await pool.query('UPDATE services SET enabled=false WHERE id=$1 RETURNING id',[req.params.id]);
  if(!rows[0])return res.status(404).json({error:'Service not found'});res.json({ok:true});
});
app.get('/api/dashboard', auth, async (_req, res) => {
  const [sales, expenses, customerDue, vendorDue, todaySales, todayPayments, todayVendorPayments, todayExpenses] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(selling_price),0) total_sales,
                       COALESCE(SUM(customer_paid),0) total_received,
                       COALESCE(SUM(CASE WHEN gross_profit > 0 THEN gross_profit ELSE 0 END),0) gross_profit,
                       COALESCE(SUM(CASE WHEN gross_profit < 0 THEN ABS(gross_profit) ELSE 0 END),0) loss
                FROM transactions WHERE deleted_at IS NULL AND status <> $1`, ['CANCELLED']),
    pool.query('SELECT COALESCE(SUM(amount),0) total_expense FROM expenses WHERE reversed_at IS NULL'),
    pool.query('SELECT COALESCE(SUM(customer_due),0) + COALESCE((SELECT SUM(opening_due) FROM customers),0) customer_receivable FROM transactions WHERE deleted_at IS NULL AND status <> $1', ['CANCELLED']),
    pool.query('SELECT COALESCE(SUM(vendor_due),0) + COALESCE((SELECT SUM(opening_payable) FROM vendors),0) vendor_payable FROM transactions WHERE deleted_at IS NULL AND status <> $1', ['CANCELLED']),
    pool.query(`SELECT COALESCE(SUM(selling_price),0) total_sales,
                       COALESCE(SUM(CASE WHEN gross_profit > 0 THEN gross_profit ELSE 0 END),0) gross_profit,
                       COALESCE(SUM(CASE WHEN gross_profit < 0 THEN ABS(gross_profit) ELSE 0 END),0) loss
                FROM transactions WHERE deleted_at IS NULL AND status <> $1 AND date = CURRENT_DATE`, ['CANCELLED']),
    pool.query("SELECT COALESCE(SUM(amount),0) total_received FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE t.deleted_at IS NULL AND payment_type='customer' AND p.reversed_at IS NULL AND paid_at::date = CURRENT_DATE"),
    pool.query("SELECT COALESCE(SUM(amount),0) total_vendor_payment FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE t.deleted_at IS NULL AND payment_type='vendor' AND p.reversed_at IS NULL AND paid_at::date = CURRENT_DATE"),
    pool.query('SELECT COALESCE(SUM(amount),0) total_expense FROM expenses WHERE reversed_at IS NULL AND occurred_at::date = CURRENT_DATE')
  ]);
  const todayGrossProfit = Number(todaySales.rows[0].gross_profit || 0);
  const todayLoss = Number(todaySales.rows[0].loss || 0);
  const todayExpense = Number(todayExpenses.rows[0].total_expense || 0);
  res.json({
    sales: sales.rows[0],
    expenses: expenses.rows[0],
    customerReceivable: Number(customerDue.rows[0].customer_receivable || 0),
    vendorPayable: Number(vendorDue.rows[0].vendor_payable || 0),
    today: {
      total_sales: Number(todaySales.rows[0].total_sales || 0),
      total_received: Number(todayPayments.rows[0].total_received || 0),
      total_vendor_payment: Number(todayVendorPayments.rows[0].total_vendor_payment || 0),
      total_expense: todayExpense,
      gross_profit: todayGrossProfit,
      loss: todayLoss,
      net_profit: todayGrossProfit - todayLoss - todayExpense
    }
  });
});

app.get('/api/customers', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(
    q ? 'SELECT * FROM customers WHERE name ILIKE $1 OR mobile ILIKE $1 ORDER BY name LIMIT 30' : 'SELECT * FROM customers ORDER BY name LIMIT 100',
    q ? [q + '%'] : []
  );
  res.json(rows);
});

app.get('/api/customers/:id/ledger', auth, async (req, res) => {
  const customerId = req.params.id;
  const customer = (await pool.query('SELECT * FROM customers WHERE id=$1', [customerId])).rows[0];
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const transactions = (await pool.query('SELECT * FROM transactions WHERE customer_id=$1 AND deleted_at IS NULL ORDER BY date DESC, time DESC, created_at DESC', [customerId])).rows;
  const payments = (await pool.query("SELECT p.* FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE p.entity_id=$1 AND p.payment_type='customer' AND p.reversed_at IS NULL AND t.deleted_at IS NULL ORDER BY p.paid_at DESC", [customerId])).rows;
  const totalSales = transactions.filter((t:any) => t.status !== 'CANCELLED').reduce((s:number,t:any)=>s+Number(t.selling_price),0);
  const totalPaid = payments.reduce((s:number,p:any)=>s+Number(p.amount),0);
  res.json({ customer, totalSales, totalPaid, currentDue: Number(customer.opening_due || 0) + totalSales - totalPaid, transactions, payments });
});

app.get('/api/vendors', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(q ? 'SELECT * FROM vendors WHERE name ILIKE $1 ORDER BY name LIMIT 30' : 'SELECT * FROM vendors ORDER BY name LIMIT 100', q ? [q + '%'] : []);
  res.json(rows);
});

app.patch('/api/customers/:id', auth, async (req,res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE customers SET name=COALESCE($1,name), mobile=COALESCE($2,mobile), email=COALESCE($3,email), address=COALESCE($4,address), whatsapp=COALESCE($5,whatsapp), nid=COALESCE($6,nid), passport_number=COALESCE($7,passport_number), passport_expiry=COALESCE($8,passport_expiry), notes=COALESCE($9,notes), opening_due=COALESCE($10,opening_due), updated_at=now() WHERE id=$11 RETURNING *',
      [req.body?.name,req.body?.mobile,req.body?.email,req.body?.address,req.body?.whatsapp,req.body?.nid,req.body?.passportNumber,req.body?.passportExpiry,req.body?.notes,req.body?.openingDue,req.params.id]
    );
    if(!rows[0]) return res.status(404).json({error:'Customer not found'});
    res.json({customer:rows[0]});
  } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Customer update failed'}); }
});

app.get('/api/vendors/:id/ledger', auth, async (req, res) => {
  const vendorId = req.params.id;
  const vendor = (await pool.query('SELECT * FROM vendors WHERE id=$1', [vendorId])).rows[0];
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const transactions = (await pool.query('SELECT * FROM transactions WHERE vendor_id=$1 AND deleted_at IS NULL ORDER BY date DESC, time DESC, created_at DESC', [vendorId])).rows;
  const payments = (await pool.query("SELECT p.* FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE p.entity_id=$1 AND p.payment_type='vendor' AND p.reversed_at IS NULL AND t.deleted_at IS NULL ORDER BY p.paid_at DESC", [vendorId])).rows;
  const totalCost = transactions.filter((t:any) => t.status !== 'CANCELLED').reduce((s:number,t:any)=>s+Number(t.vendor_cost),0);
  const totalPaid = payments.reduce((s:number,p:any)=>s+Number(p.amount),0);
  res.json({ vendor, totalCost, totalPaid, currentPayable: Number(vendor.opening_payable || 0) + totalCost - totalPaid, transactions, payments });
});

app.patch('/api/vendors/:id', auth, async (req,res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE vendors SET name=COALESCE($1,name), company=COALESCE($2,company), mobile=COALESCE($3,mobile), whatsapp=COALESCE($4,whatsapp), email=COALESCE($5,email), address=COALESCE($6,address), account_info=COALESCE($7,account_info), opening_payable=COALESCE($8,opening_payable), updated_at=now() WHERE id=$9 RETURNING *',
      [req.body?.name,req.body?.company,req.body?.mobile,req.body?.whatsapp,req.body?.email,req.body?.address,req.body?.accountInfo,req.body?.openingPayable,req.params.id]
    );
    if(!rows[0]) return res.status(404).json({error:'Vendor not found'});
    res.json({vendor:rows[0]});
  } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Vendor update failed'}); }
});

app.delete('/api/transactions/:id', criticalAdminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = (await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!tx) throw new Error('Transaction not found');
    if (tx.deleted_at) throw new Error('Transaction is already deleted');
    await client.query(`UPDATE account_entries SET reversed_at=now() WHERE source_id=$1 AND reversed_at IS NULL`, [tx.id]);
    await client.query('UPDATE payments SET reversed_at=now(), reversed_by=$1 WHERE transaction_id=$2 AND reversed_at IS NULL', [req.session.userId, tx.id]);
    await client.query('UPDATE transactions SET deleted_at=now(), deleted_by=$1, updated_at=now() WHERE id=$2', [req.session.userId, tx.id]);
    await audit(client, req.session.userId!, 'TRANSACTION_SOFT_DELETED', 'Transaction', tx.id, tx, { deletedAt: new Date().toISOString(), invoiceNumber: tx.invoice_number });
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Transaction deletion failed' });
  } finally { client.release(); }
});

app.patch('/api/transactions/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = (await client.query('SELECT * FROM transactions WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [req.params.id])).rows[0];
    if (!tx) throw new Error('Transaction not found');
    const body = req.body ?? {};
    const allowed = ['reminderDate','reminderTime','reminderStatus','reminderNote'];
    const hasReminder = allowed.some((k) => Object.prototype.hasOwnProperty.call(body, k));
    const hasFlightStatus = body.flightStatus !== undefined;
    if (!hasReminder && !hasFlightStatus) throw new Error('No supported transaction update supplied');
    const previous = { ...tx };
    let flightDetails = tx.flight_details;
    if (hasFlightStatus) {
      if (!flightDetails) throw new Error('Transaction has no flight details');
      const details = typeof flightDetails === 'string' ? JSON.parse(flightDetails) : flightDetails;
      const oldStatus = details.ticketStatus;
      details.ticketStatus = String(body.flightStatus);
      details.statusHistory = Array.isArray(details.statusHistory) ? details.statusHistory : [];
      details.statusHistory.push({
        status: details.ticketStatus,
        changedAt: new Date().toISOString(),
        changedBy: req.session.userId,
        note: body.note ? String(body.note) : `Status changed from ${oldStatus} to ${details.ticketStatus}`,
      });
      flightDetails = details;
    }
    const result = await client.query(
      `UPDATE transactions
       SET reminder_date=CASE WHEN $1::boolean THEN $2::date ELSE reminder_date END,
           reminder_time=CASE WHEN $3::boolean THEN $4::time ELSE reminder_time END,
           reminder_status=CASE WHEN $5::boolean THEN $6 ELSE reminder_status END,
           reminder_note=CASE WHEN $7::boolean THEN $8 ELSE reminder_note END,
           flight_details=CASE WHEN $9::boolean THEN $10::jsonb ELSE flight_details END,
           updated_at=now()
       WHERE id=$11
       RETURNING *`,
      [
        body.reminderDate !== undefined, body.reminderDate || null,
        body.reminderTime !== undefined, body.reminderTime || null,
        body.reminderStatus !== undefined, body.reminderStatus || null,
        body.reminderNote !== undefined, body.reminderNote || null,
        hasFlightStatus, hasFlightStatus ? JSON.stringify(flightDetails) : null,
        tx.id
      ]
    );
    await audit(client, req.session.userId!, hasFlightStatus ? 'FLIGHT_STATUS_UPDATED' : 'REMINDER_UPDATED', 'Transaction', tx.id, previous, result.rows[0]);
    await client.query('COMMIT');
    res.json({ transaction: result.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Transaction update failed' });
  } finally { client.release(); }
});

app.get('/api/transactions', auth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const { rows } = await pool.query('SELECT t.*, c.name customer_name, c.mobile customer_mobile, s.name service_name, v.name vendor_name FROM transactions t JOIN customers c ON c.id=t.customer_id LEFT JOIN services s ON s.id=t.service_id LEFT JOIN vendors v ON v.id=t.vendor_id WHERE t.deleted_at IS NULL ORDER BY t.date DESC, t.time DESC LIMIT $1', [limit]);
  res.json(rows);
});

const ACCOUNT_METHODS = new Set(['cash','bkash','nagad','rocket','bank','card','other']);

const accountBalance = async (client: Pool | PoolClient, account: string) => {
  const opening = await client.query('SELECT amount FROM account_opening_balances WHERE lower(account_name)=lower($1)', [account]);
  const entries = await client.query('SELECT COALESCE(SUM(amount),0) balance FROM account_entries WHERE lower(account_name)=lower($1) AND reversed_at IS NULL', [account]);
  return Number(opening.rows[0]?.amount || 0) + Number(entries.rows[0]?.balance || 0);
};

const addAccountEntry = async (client: PoolClient, account: string, amount: number, sourceType: string, sourceId: string, userId: string, note?: string, paymentId?: string, expenseId?: string, fundTransferId?: string) => {
  if (!ACCOUNT_METHODS.has(account.toLowerCase())) throw new Error('Invalid payment account');
  await client.query('INSERT INTO account_entries (account_name,amount,source_type,source_id,created_by,note,payment_id,expense_id,fund_transfer_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [account.toLowerCase(), amount, sourceType, sourceId, userId, note || null, paymentId || null, expenseId || null, fundTransferId || null]);
};

app.post('/api/transactions/:id/payments', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, paymentType, paymentMethod, note, reference } = req.body ?? {};
    const method = String(paymentMethod || '').toLowerCase();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Payment amount must be positive' });
    if (!['customer','vendor'].includes(paymentType)) return res.status(400).json({ error: 'Invalid payment type' });
    if (!ACCOUNT_METHODS.has(method)) return res.status(400).json({ error: 'Invalid payment method' });
    await client.query('BEGIN');
    const tx = (await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!tx) throw new Error('Transaction not found');
    const outstanding = paymentType === 'customer' ? Number(tx.customer_due) : Number(tx.vendor_due);
    if (value > outstanding) throw new Error(`Payment exceeds outstanding due (outstanding: ${outstanding})`);
    const entityId = paymentType === 'customer' ? tx.customer_id : tx.vendor_id;
    if (!entityId) throw new Error('No entity linked to this payment');
    if (paymentType === 'vendor') {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [method]);
      const balance = await accountBalance(client, method);
      if (value > balance) throw new Error(`Insufficient balance for vendor payment (balance: ${balance})`);
    }
    const payment = (await client.query('INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [tx.id, paymentType, entityId, value, method, req.session.userId, note || null, reference || null])).rows[0];
    if (paymentType === 'customer') {
      const due = outstanding - value;
      await client.query('UPDATE transactions SET customer_paid=customer_paid+$1, customer_due=$2, status=$3, updated_at=now() WHERE id=$4', [value, due, due === 0 ? 'PAID' : 'PARTIAL', tx.id]);
      await addAccountEntry(client, method, value, 'customer_payment', tx.id, req.session.userId!, note, payment.id);
    } else {
      const due = outstanding - value;
      await client.query('UPDATE transactions SET vendor_paid=vendor_paid+$1, vendor_due=$2, updated_at=now() WHERE id=$3', [value, due, tx.id]);
      await addAccountEntry(client, method, -value, 'vendor_payment', tx.id, req.session.userId!, note, payment.id);
    }
    await audit(client, req.session.userId!, 'PAYMENT_RECORDED', 'Transaction', tx.id, tx, { paymentType, amount: value, paymentMethod: method });
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Payment failed' });
  } finally { client.release(); }
});

app.post('/api/payments/:id/reverse', criticalAdminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payment = (await client.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!payment) throw new Error('Payment not found');
    if (payment.reversed_at) throw new Error('Payment is already reversed');
    const tx = (await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [payment.transaction_id])).rows[0];
    if (!tx || tx.deleted_at) throw new Error('Linked transaction is missing or deleted');
    const entries = (await client.query('SELECT * FROM account_entries WHERE payment_id=$1 AND reversed_at IS NULL FOR UPDATE', [payment.id])).rows;
    if (entries.length !== 1) throw new Error('Payment accounting entry is missing or ambiguous');
    await client.query('UPDATE account_entries SET reversed_at=now() WHERE payment_id=$1 AND reversed_at IS NULL', [payment.id]);
    if (payment.payment_type === 'customer') {
      const newPaid = Math.max(0, Number(tx.customer_paid) - Number(payment.amount));
      const newDue = Number(tx.selling_price) - newPaid;
      const status = newDue === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'DUE';
      await client.query('UPDATE transactions SET customer_paid=$1, customer_due=$2, status=$3, updated_at=now() WHERE id=$4', [newPaid,newDue,status,tx.id]);
    } else {
      const newPaid = Math.max(0, Number(tx.vendor_paid) - Number(payment.amount));
      const newDue = Number(tx.vendor_cost) - newPaid;
      await client.query('UPDATE transactions SET vendor_paid=$1, vendor_due=$2, updated_at=now() WHERE id=$3', [newPaid,newDue,tx.id]);
    }
    await client.query('UPDATE payments SET reversed_at=now(), reversed_by=$1 WHERE id=$2', [req.session.userId, payment.id]);
    await audit(client, req.session.userId!, 'PAYMENT_REVERSED', 'Payment', payment.id, payment, { reversedAt: new Date().toISOString(), transactionId: tx.id });
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Payment reversal failed' });
  } finally { client.release(); }
});

app.get('/api/opening-balances', adminOnly, async (_req, res) => {
  const { rows } = await pool.query('SELECT account_name, amount, updated_at FROM account_opening_balances ORDER BY account_name');
  res.json(rows);
});

app.put('/api/opening-balances/:account', criticalAdminOnly, async (req, res) => {
  const account = String(req.params.account || '').toLowerCase();
  const amount = Number(req.body?.amount);
  if (!ACCOUNT_METHODS.has(account) || !Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Invalid account or opening balance' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const old = (await client.query('SELECT amount FROM account_opening_balances WHERE account_name=$1 FOR UPDATE', [account])).rows[0];
    await client.query(`INSERT INTO account_opening_balances (account_name,amount,updated_at) VALUES ($1,$2,now()) ON CONFLICT (account_name) DO UPDATE SET amount=EXCLUDED.amount, updated_at=now()`, [account, amount]);
    await audit(client, req.session.userId!, 'OPENING_BALANCE_UPDATED', 'AccountOpeningBalance', account, { amount: Number(old?.amount || 0) }, { amount });
    await client.query('COMMIT'); res.json({ account, amount });
  } catch (e) { await client.query('ROLLBACK'); res.status(400).json({ error: e instanceof Error ? e.message : 'Opening balance update failed' }); }
  finally { client.release(); }
});

app.get('/api/accounts/balances', auth, async (_req, res) => {
  const accounts = ['cash','bkash','nagad','rocket','bank','card','other'];
  const balances: Record<string, number> = {};
  for (const account of accounts) balances[account] = await accountBalance(pool as unknown as PoolClient, account);
  res.json({ balances, total: Object.values(balances).reduce((a,b) => a+b, 0) });
});

app.post('/api/entries', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body ?? {};
    const customerName = String(body.customer?.name || body.customerName || '').trim();
    const mobile = String(body.customer?.mobile || body.mobile || '').trim();
    const sellingPrice = Number(body.sellingPrice || 0);
    const customerPaid = Number(body.customerPaid || 0);
    const vendorCost = Number(body.vendorCost || 0);
    const vendorPaid = Number(body.vendorPaid || 0);
    const customerPaymentMethod = String(body.customerPaymentMethod || body.paymentMethod || 'cash').toLowerCase();
    const vendorPaymentMethod = String(body.vendorPaymentMethod || 'cash').toLowerCase();
    if (!customerName || !mobile) return res.status(400).json({ error: 'Customer name and mobile are required' });
    if (![sellingPrice, customerPaid, vendorCost, vendorPaid].every(Number.isFinite) || [sellingPrice, customerPaid, vendorCost, vendorPaid].some(v => v < 0)) return res.status(400).json({ error: 'Financial amounts must be valid non-negative numbers' });
    if (customerPaid > sellingPrice) return res.status(400).json({ error: 'Customer payment cannot exceed selling price' });
    if (vendorPaid > vendorCost) return res.status(400).json({ error: 'Vendor payment cannot exceed vendor cost' });
    if (customerPaid > 0 && !ACCOUNT_METHODS.has(customerPaymentMethod)) return res.status(400).json({ error: 'Invalid customer payment method' });
    if (vendorPaid > 0 && !ACCOUNT_METHODS.has(vendorPaymentMethod)) return res.status(400).json({ error: 'Invalid vendor payment method' });
    await client.query('BEGIN');

    const customerResult = await client.query(`INSERT INTO customers (name,mobile,whatsapp,email,address,nid,passport_number,passport_expiry,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (mobile) DO UPDATE SET name=EXCLUDED.name, whatsapp=COALESCE(EXCLUDED.whatsapp,customers.whatsapp), email=COALESCE(EXCLUDED.email,customers.email), address=COALESCE(EXCLUDED.address,customers.address), updated_at=now() RETURNING id`, [customerName, mobile, body.customer?.whatsapp || null, body.customer?.email || null, body.customer?.address || null, body.customer?.nid || null, body.customer?.passportNumber || null, body.customer?.passportExpiry || null, body.customer?.notes || null]);
    const customerId = customerResult.rows[0].id;

    let vendorId: string | null = null;
    if (String(body.vendor?.name || body.vendorName || '').trim()) {
      const vendorName = String(body.vendor?.name || body.vendorName).trim();
      const existing = await client.query('SELECT id FROM vendors WHERE lower(name)=lower($1) LIMIT 1', [vendorName]);
      vendorId = existing.rows[0]?.id || (await client.query('INSERT INTO vendors (name,company,mobile,whatsapp,email,address,account_info) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [vendorName, body.vendor?.company || null, body.vendor?.mobile || null, body.vendor?.whatsapp || null, body.vendor?.email || null, body.vendor?.address || null, body.vendor?.accountInfo || null])).rows[0].id;
    }

    let serviceId: string | null = null;
    const serviceName = String(body.serviceName || body.service?.name || '').trim();
    if (serviceName) {
      const existing = await client.query('SELECT id FROM services WHERE lower(name)=lower($1) LIMIT 1', [serviceName]);
      serviceId = existing.rows[0]?.id || (await client.query('INSERT INTO services (name,category) VALUES ($1,$2) RETURNING id', [serviceName, body.service?.category || 'Other Service'])).rows[0].id;
    }

    const invoice = 'SIAM-' + String((await client.query("SELECT nextval('invoice_number_seq') seq")).rows[0].seq).padStart(6, '0');
    const due = sellingPrice - customerPaid;
    const vendorDue = vendorCost - vendorPaid;
    const status = due === 0 ? 'PAID' : customerPaid > 0 ? 'PARTIAL' : 'DUE';
    const grossProfit = sellingPrice - vendorCost;
    const tx = (await client.query(`INSERT INTO transactions (invoice_number,date,time,created_by,customer_id,service_id,description,flight_details,selling_price,customer_paid,customer_due,vendor_id,vendor_cost,vendor_paid,vendor_due,gross_profit,reminder_date,reminder_time,reminder_status,reminder_note,status,notes) VALUES ($1,COALESCE($2::date,CURRENT_DATE),COALESCE($3::time,CURRENT_TIME),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`, [invoice, body.date || null, body.time || null, req.session.userId, customerId, serviceId, body.description || null, body.flightDetails ? JSON.stringify(body.flightDetails) : null, sellingPrice, customerPaid, due, vendorId, vendorCost, vendorPaid, vendorDue, grossProfit, body.reminderDate || null, body.reminderTime || null, body.reminderStatus || null, body.reminderNote || null, status, body.notes || null])).rows[0];

    if (customerPaid > 0) {
      const payment = (await client.query('INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,\'customer\',$2,$3,$4,$5,$6,$7) RETURNING *', [tx.id, customerId, customerPaid, customerPaymentMethod, req.session.userId, body.paymentNote || null, body.paymentReference || null])).rows[0];
      await addAccountEntry(client, customerPaymentMethod, customerPaid, 'customer_payment', tx.id, req.session.userId!, body.paymentNote, payment.id);
    }

    if (vendorPaid > 0) {
      if (!vendorId) throw new Error('Vendor is required when vendor payment is entered');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [vendorPaymentMethod]);
      const balance = await accountBalance(client, vendorPaymentMethod);
      if (vendorPaid > balance) throw new Error('Insufficient balance for vendor payment');
      const payment = (await client.query('INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,\'vendor\',$2,$3,$4,$5,$6,$7) RETURNING *', [tx.id, vendorId, vendorPaid, vendorPaymentMethod, req.session.userId, body.vendorPaymentNote || null, body.vendorPaymentReference || null])).rows[0];
      await addAccountEntry(client, vendorPaymentMethod, -vendorPaid, 'vendor_payment', tx.id, req.session.userId!, body.vendorPaymentNote, payment.id);
    }

    await audit(client, req.session.userId!, 'ONE_ENTRY_CREATED', 'Transaction', tx.id, null, tx);
    await client.query('COMMIT');
    res.status(201).json({ transaction: tx, invoiceNumber: invoice });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Entry failed' });
  } finally { client.release(); }
});

app.post('/api/expenses', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const category = String(req.body?.category || '').trim();
    const description = String(req.body?.description || '').trim();
    const amount = Number(req.body?.amount);
    const method = String(req.body?.paymentMethod || '').toLowerCase();
    if (!category || !description || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Valid category, description and positive amount are required' });
    if (!ACCOUNT_METHODS.has(method)) return res.status(400).json({ error: 'Invalid payment method' });
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [method]);
    const balance = await accountBalance(client, method);
    if (amount > balance) throw new Error('Insufficient balance for expense');
    const expense = (await client.query('INSERT INTO expenses (category,description,amount,payment_method,created_by,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',[category,description,amount,method,req.session.userId,req.body?.note || null])).rows[0];
    await addAccountEntry(client, method, -amount, 'expense', expense.id, req.session.userId!, description, undefined, expense.id);
    await audit(client, req.session.userId!, 'EXPENSE_CREATED', 'Expense', expense.id, null, expense);
    await client.query('COMMIT'); res.status(201).json({ expense });
  } catch (e) { await client.query('ROLLBACK'); res.status(400).json({ error: e instanceof Error ? e.message : 'Expense failed' }); }
  finally { client.release(); }
});

app.post('/api/expenses/:id/reverse', criticalAdminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const expense = (await client.query('SELECT * FROM expenses WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!expense) throw new Error('Expense not found');
    if (expense.reversed_at) throw new Error('Expense is already reversed');
    await client.query('UPDATE account_entries SET reversed_at=now() WHERE expense_id=$1 AND reversed_at IS NULL', [expense.id]);
    await client.query('UPDATE expenses SET reversed_at=now(), reversed_by=$1 WHERE id=$2', [req.session.userId, expense.id]);
    await audit(client, req.session.userId!, 'EXPENSE_REVERSED', 'Expense', expense.id, expense, { reversedAt: new Date().toISOString() });
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Expense reversal failed' });
  } finally { client.release(); }
});

app.post('/api/fund-transfers', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const from = String(req.body?.fromAccount || '').toLowerCase();
    const to = String(req.body?.toAccount || '').toLowerCase();
    const amount = Number(req.body?.amount);
    const reason = String(req.body?.reason || '').trim();
    if (!ACCOUNT_METHODS.has(from) || !ACCOUNT_METHODS.has(to)) return res.status(400).json({ error: 'Invalid account' });
    if (from === to || !Number.isFinite(amount) || amount <= 0 || !reason) return res.status(400).json({ error: 'Different accounts, positive amount and reason are required' });
    await client.query('BEGIN');
    const [firstLock, secondLock] = [from, to].sort();
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [firstLock]);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [secondLock]);
    const balance = await accountBalance(client, from);
    if (amount > balance) throw new Error('Insufficient balance for fund transfer');
    const transfer = (await client.query('INSERT INTO fund_transfers (from_account,to_account,amount,reason,created_by,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',[from,to,amount,reason,req.session.userId,req.body?.note || null])).rows[0];
    await addAccountEntry(client, from, -amount, 'fund_transfer_out', transfer.id, req.session.userId!, reason, undefined, undefined, transfer.id);
    await addAccountEntry(client, to, amount, 'fund_transfer_in', transfer.id, req.session.userId!, reason, undefined, undefined, transfer.id);
    await audit(client, req.session.userId!, 'FUND_TRANSFER_CREATED', 'FundTransfer', transfer.id, null, transfer);
    await client.query('COMMIT'); res.status(201).json({ transfer });
  } catch (e) { await client.query('ROLLBACK'); res.status(400).json({ error: e instanceof Error ? e.message : 'Fund transfer failed' }); }
  finally { client.release(); }
});

app.post('/api/fund-transfers/:id/reverse', criticalAdminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const transfer = (await client.query('SELECT * FROM fund_transfers WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!transfer) throw new Error('Fund transfer not found');
    if (transfer.reversed_at) throw new Error('Fund transfer is already reversed');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [transfer.from_account]);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [transfer.to_account]);
    const entries = (await client.query('SELECT id FROM account_entries WHERE fund_transfer_id=$1 AND reversed_at IS NULL FOR UPDATE', [transfer.id])).rows;
    if (entries.length !== 2) throw new Error('Fund transfer accounting entries are missing or ambiguous');
    await client.query('UPDATE account_entries SET reversed_at=now() WHERE fund_transfer_id=$1 AND reversed_at IS NULL', [transfer.id]);
    await client.query('UPDATE fund_transfers SET reversed_at=now(), reversed_by=$1 WHERE id=$2', [req.session.userId, transfer.id]);
    await audit(client, req.session.userId!, 'FUND_TRANSFER_REVERSED', 'FundTransfer', transfer.id, transfer, { reversedAt: new Date().toISOString() });
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Fund transfer reversal failed' });
  } finally { client.release(); }
});

app.get('/api/accounts/:account/ledger', auth, async (req, res) => {
  const account = String(req.params.account || '').toLowerCase();
  if (!ACCOUNT_METHODS.has(account)) return res.status(400).json({ error: 'Invalid account' });
  const { rows } = await pool.query('SELECT id,amount,source_type,source_id,occurred_at,note FROM account_entries WHERE lower(account_name)=lower($1) AND reversed_at IS NULL ORDER BY occurred_at DESC LIMIT 500',[account]);
  res.json({ account, rows });
});

const distPath = fileURLToPath(new URL('../dist', import.meta.url));
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile('index.html', { root: distPath }));

const start = async () => {
  await pool.query('SELECT 1');
  app.listen(port, () => console.log('SIAM AIR API listening on port ' + port));
};
start();