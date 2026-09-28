import { DAC_FLIGHT_DIRECTORY } from './dacFlightDirectory';
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { Pool, PoolClient } from 'pg';
import { fileURLToPath } from 'node:url';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

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

  // Render can briefly run the old and new instances together during a deploy.
  // Schema DDL can deadlock with live requests in that overlap, so retry
  // transient PostgreSQL lock/deadlock errors instead of taking the service down.
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query(schema);
      console.log('SIAM AIR database schema initialized');
      return;
    } catch (error) {
      const code = (error as { code?: string }).code;
      const transientLockError = code === '40P01' || code === '55P03';
      if (!transientLockError || attempt === maxAttempts) throw error;
      const delayMs = attempt * 1500;
      console.warn('Database schema initialization hit a transient PostgreSQL lock; retrying in ' + delayMs + 'ms (attempt ' + (attempt + 1) + '/' + maxAttempts + ')');
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
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
      html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px"><h2 style="margin:0 0 8px">Admin Password Reset</h2><p>Your one-time verification code is:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#f1f5f9;border-radius:10px">' + otp + '</div><p style="color:#64748b">This OTP expires in 10 minutes. If you did not request this, ignore this email.</p><p style="margin-bottom:0"><b>SIAM AIR & DIGITAL SERVICE</b></p></div>'
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('Email provider rejected the request: ' + body.slice(0, 300));
  }
};

const sendSecurityOtp = async (otp: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = 'onboarding@resend.dev';
  if (!apiKey) throw new Error('Historical change security email is not configured. Add RESEND_API_KEY in Render.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [PASSWORD_RESET_EMAIL],
      subject: 'SIAM AIR & DIGITAL SERVICE — Historical Transaction Edit/Correction OTP',
      html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px"><h2 style="margin:0 0 8px">Historical Transaction Edit / Correction</h2><p>This OTP is being requested because an administrator is attempting to edit or correct historical transaction/accounting information in SIAM AIR & DIGITAL SERVICE.</p><p>Your one-time verification code is:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#fff7ed;border-radius:10px">' + otp + '</div><p><b>This is NOT a password reset.</b> No password has been changed or reset by this email.</p><p style="color:#64748b">This OTP expires in 10 minutes. Enter it in the Historical Transaction Edit/Correction verification window to continue.</p><p style="color:#64748b">If you did not attempt a historical transaction change, ignore this email and review your account security.</p><p style="margin-bottom:0"><b>SIAM AIR & DIGITAL SERVICE</b></p></div>'
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('Email provider rejected the historical change OTP request: ' + body.slice(0, 300));
  }
};

const sendLoginOtp = async (otp: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = 'onboarding@resend.dev';
  if (!apiKey) throw new Error('Login email OTP is not configured. Add RESEND_API_KEY in Render.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [PASSWORD_RESET_EMAIL],
      subject: 'SIAM AIR & DIGITAL SERVICE — Login Verification OTP',
      html: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px"><h2 style="margin:0 0 8px">Login Verification</h2><p>Your one-time login verification code is:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#ecfdf5;border-radius:10px">' + otp + '</div><p style="color:#64748b">This OTP expires in 10 minutes. A new OTP is required for every sign-in.</p><p style="margin-bottom:0"><b>SIAM AIR & DIGITAL SERVICE</b></p></div>'
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error('Email provider rejected the login OTP request: ' + body.slice(0, 300));
  }
};

const PgSession = connectPgSimple(session);

app.set('trust proxy', 1);
app.use(express.json({ limit: '12mb' }));
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
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

const historicalChangeAdminOnly = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
      await sendSecurityOtp(otp);
      return res.status(428).json({ error: 'SECURITY_OTP_REQUIRED', message: 'A historical transaction edit/correction security OTP was sent to the recovery email. Enter it to continue.' });
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

app.post('/api/ticket-import/pdf', auth, async (req, res) => {
  try {
    const dataBase64 = String(req.body?.dataBase64 || '').trim();
    if (!dataBase64) return res.status(400).json({ error: 'PDF data is required' });
    if (dataBase64.length > 11_000_000) return res.status(413).json({ error: 'PDF is too large. Please use a PDF under about 8 MB.' });
    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') {
      return res.status(400).json({ error: 'The uploaded file is not a valid PDF.' });
    }
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const text = String(result.text || '').trim();
      if (!text) return res.status(422).json({ error: 'This PDF contains no selectable text. It may be a scanned/image-only PDF and needs OCR.' });
      res.json({ text, pages: result.total || undefined });
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    console.error('Ticket PDF extraction failed:', error);
    res.status(422).json({ error: error instanceof Error ? error.message : 'Unable to extract text from this PDF.' });
  }
});

app.post('/api/ticket-import/ai', auth, async (req, res) => {
  try {
    const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) return res.status(503).json({ error: 'AI importer is not configured' });
    const rawText = String(req.body?.text || '').trim();
    if (!rawText) return res.status(400).json({ error: 'Ticket text is required' });
    const input = rawText.slice(0, 28000);
    const prompt = `You are a strict airline e-ticket data extraction engine for SIAM AIR & DIGITAL SERVICE.
Extract ONLY facts explicitly present in the ticket text. Never guess, infer, autocomplete, or invent missing values.
Return JSON only in this exact shape:
{"airlinePnr":"","gdsPnr":"","ticketNumber":"","issueDate":"","passenger":"","passport":"","airline":"","passengers":[{"name":"","passport":"","ticketNumber":""}],"sectors":[{"airline":"","flightNo":"","from":"","to":"","departureDate":"","departureTime":"","arrivalDate":"","arrivalTime":"","bookingClass":"","seat":"","baggage":""}]}
Rules:
- Preserve passenger document order.
- Each passenger-specific ticketNumber must belong to that passenger. NEVER reuse one ticket number for another passenger.
- If a ticket number cannot be confidently matched to a passenger, leave it empty.
- Keep airline codes and airport IATA codes exactly when present.
- Normalize dates to YYYY-MM-DD only when unambiguous.
- Return [] for missing arrays and empty strings for unknown fields.
Ticket text:
${input}`;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 }
      })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return res.status(502).json({ error: 'AI importer request failed: ' + body.slice(0, 240) });
    }
    const payload = await response.json() as any;
    const output = payload?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('').trim() || '';
    if (!output) return res.status(422).json({ error: 'AI returned no structured ticket data' });
    let parsed: any;
    try { parsed = JSON.parse(output); } catch { return res.status(422).json({ error: 'AI returned invalid structured data' }); }
    const passengers = Array.isArray(parsed.passengers) ? parsed.passengers.map((p: any) => ({
      name: String(p?.name || '').trim(),
      passport: String(p?.passport || '').trim().toUpperCase(),
      ticketNumber: String(p?.ticketNumber || '').replace(/\D/g, '').slice(0, 13)
    })).filter((p: any) => p.name || p.passport || p.ticketNumber) : [];
    const tickets = passengers.map((p: any) => p.ticketNumber).filter(Boolean);
    if (new Set(tickets).size !== tickets.length) return res.status(422).json({ error: 'AI produced duplicate passenger ticket numbers; data rejected for safety' });
    parsed.passengers = passengers;
    parsed.ticketNumber = String(parsed.ticketNumber || '').replace(/\D/g, '').slice(0, 13);
    parsed.airlinePnr = String(parsed.airlinePnr || '').trim().toUpperCase();
    parsed.gdsPnr = String(parsed.gdsPnr || '').trim().toUpperCase();
    parsed.passport = String(parsed.passport || '').trim().toUpperCase();
    parsed.passenger = String(parsed.passenger || '').trim();
    parsed.airline = String(parsed.airline || '').trim();
    parsed.issueDate = String(parsed.issueDate || '').trim();
    parsed.sectors = Array.isArray(parsed.sectors) ? parsed.sectors.slice(0, 12) : [];
    res.json({ data: parsed });
  } catch (error) {
    console.error('AI ticket extraction failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI ticket extraction failed' });
  }
});


app.post('/api/flight-assist', auth, async (req, res) => {
  try {
    const flightNumberInput = String(req.body?.flightNumber || '').trim().toUpperCase().replace(/[\s/-]+/g, '');
    const flightDate = String(req.body?.flightDate || '').trim();
    const airlineHint = String(req.body?.airline || '').trim().toUpperCase();
    const fromHint = String(req.body?.from || '').trim().toUpperCase();
    const toHint = String(req.body?.to || '').trim().toUpperCase();

    if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(flightNumberInput)) {
      return res.status(400).json({ error: 'Enter a valid flight number such as BS307, BG147 or EK585.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) {
      return res.status(400).json({ error: 'Enter the flight date in YYYY-MM-DD format.' });
    }

    const normalize = (v: string) => String(v || '').toUpperCase().replace(/[\s/-]+/g, '');
    const candidates = DAC_FLIGHT_DIRECTORY
      .filter(x => normalize(x.flightNo) === flightNumberInput)
      .filter(x => !airlineHint || x.airlineCode === airlineHint || x.airline.toUpperCase().includes(airlineHint))
      .map(x => ({
        ...x,
        departureDate: flightDate,
        arrivalDate: flightDate,
        arrivalTime: x.arrivalTime || '',
        duration: '',
        aircraft: '',
        bookingClass: '',
        baggage: '',
        terminal: x.terminal || '',
        status: 'SCHEDULE DIRECTORY'
      }));

    // If the sector already indicates an arrival into DAC, reverse the stored DAC route.
    const arrivalMode = toHint === 'DAC' && fromHint !== 'DAC';
    const adjusted = candidates.map(x => arrivalMode ? ({
      ...x,
      from: x.to,
      fromName: x.toName,
      to: 'DAC',
      toName: 'Dhaka',
      departureTime: '',
      arrivalTime: x.departureTime
    }) : x);

    const filtered = adjusted.length > 1 && (fromHint || toHint)
      ? adjusted.filter(x => (!fromHint || x.from === fromHint) && (!toHint || x.to === toHint))
      : adjusted;

    const chosen = filtered[0] || adjusted[0];
    const matched = Boolean(chosen);
    return res.json({
      data: {
        matched,
        confidence: matched ? 'medium' : 'low',
        provider: 'SIAM AIR local DAC flight directory',
        flight: chosen || {},
        candidates: filtered.slice(0, 8),
        sources: [{
          title: 'Hazrat Shahjalal International Airport flight information',
          url: 'https://www.hsia.gov.bd/flight-info/int-departures'
        }]
      }
    });
  } catch (error) {
    console.error('Provider-free flight assist failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Flight search failed' });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'siam-air-api', database: 'connected', timezone: process.env.TZ || 'Asia/Dhaka' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/public-settings', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['business_settings']);
    const value = rows[0]?.value && typeof rows[0].value === 'object' ? rows[0].value as Record<string, unknown> : {};
    res.json({
      settings: {
        name: value.name || 'SIAM AIR & DIGITAL SERVICE',
        tagline: value.tagline || 'Travel Agency · Visa · Passport · Digital',
        logoUrl: value.logoUrl || '',
        address: value.address || '',
        mobile: value.mobile || '',
        whatsapp: value.whatsapp || '',
        email: value.email || '',
        website: value.website || ''
      }
    });
  } catch (e) {
    res.status(503).json({ error: e instanceof Error ? e.message : 'Unable to load public business settings' });
  }
});

app.get('/api/settings', auth, async (_req, res) => {
  const { rows } = await pool.query('SELECT value FROM app_settings WHERE key=$1', ['business_settings']);
  const value = rows[0]?.value;
  res.json({ settings: value && typeof value === 'object' ? value : {} });
});

app.patch('/api/settings', adminOnly, async (req, res) => {
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

  const otp = String(randomInt(100000, 1000000));
  await pool.query(`CREATE TABLE IF NOT EXISTS login_otps (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query('UPDATE login_otps SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
  const challengeId = randomUUID();
  await pool.query(
    "INSERT INTO login_otps (id,user_id,otp_hash,expires_at) VALUES ($1,$2,$3,now()+interval '10 minutes')",
    [challengeId, user.id, hashOtp(otp)]
  );
  await sendLoginOtp(otp);

  res.status(202).json({
    requiresOtp: true,
    challengeId,
    message: 'A 6-digit login OTP was sent to the registered email. Enter it to continue.'
  });
});

app.post('/api/auth/verify-login-otp', async (req, res) => {
  const challengeId = String(req.body?.challengeId || '').trim();
  const otp = String(req.body?.otp || '').trim();
  if (!challengeId || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Challenge ID and 6-digit OTP are required' });
  }

  const { rows } = await pool.query(
    'SELECT id, user_id, otp_hash, expires_at, attempts FROM login_otps WHERE id=$1 AND used_at IS NULL LIMIT 1',
    [challengeId]
  );
  const item = rows[0];
  if (!item || new Date(item.expires_at).getTime() <= Date.now() || Number(item.attempts) >= 5) {
    return res.status(400).json({ error: 'Invalid or expired login OTP' });
  }
  if (hashOtp(otp) !== item.otp_hash) {
    await pool.query('UPDATE login_otps SET attempts=attempts+1 WHERE id=$1', [challengeId]);
    return res.status(400).json({ error: 'Invalid or expired login OTP' });
  }

  const { rows: users } = await pool.query(
    'SELECT id, username, full_name, role, permissions, is_active FROM users WHERE id=$1',
    [item.user_id]
  );
  const user = users[0];
  if (!user?.is_active) return res.status(401).json({ error: 'Account inactive' });

  await pool.query('UPDATE login_otps SET used_at=now() WHERE id=$1', [challengeId]);
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
app.post('/api/users', adminOnly, async (req,res) => {
  const username=String(req.body?.username||'').trim(), password=String(req.body?.password||''), fullName=String(req.body?.fullName||'').trim();
  const role=String(req.body?.role||'staff').toLowerCase(), phone=String(req.body?.phone||'').trim()||null;
  const permissions=req.body?.permissions&&typeof req.body.permissions==='object'?req.body.permissions:{};
  if(!username||password.length<8||!fullName||!['admin','staff'].includes(role)) return res.status(400).json({error:'Invalid user data'});
  try{const hash=await bcrypt.hash(password,12);const {rows}=await pool.query('INSERT INTO users (username,password_hash,full_name,role,phone,permissions) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,username,full_name,role,phone,permissions,is_active,created_at',[username,hash,fullName,role,phone,JSON.stringify(permissions)]);res.status(201).json({user:rows[0]});}
  catch(e){res.status(400).json({error:e instanceof Error?e.message:'User creation failed'});}
});
app.patch('/api/users/:id', adminOnly, async (req,res) => {
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
app.delete('/api/users/:id', adminOnly, async (req,res) => {
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

app.put('/api/expense-categories', adminOnly, async (req, res) => {
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
app.post('/api/services', adminOnly, async (req,res) => {
  const name=String(req.body?.name||'').trim(), category=String(req.body?.category||'Other').trim()||'Other';
  if(!name)return res.status(400).json({error:'Service name is required'});
  try{const {rows}=await pool.query('INSERT INTO services (name,category,enabled,sort_order) VALUES ($1,$2,$3,$4) RETURNING id,name,category,enabled,sort_order',[name,category,req.body?.enabled!==false,Number(req.body?.sortOrder||0)]);res.status(201).json({service:rows[0]});}
  catch(e){res.status(400).json({error:e instanceof Error?e.message:'Service creation failed'});}
});
app.patch('/api/services/:id', adminOnly, async (req,res) => {
  const {rows}=await pool.query('UPDATE services SET name=COALESCE($1,name), category=COALESCE($2,category), enabled=COALESCE($3,enabled), sort_order=COALESCE($4,sort_order) WHERE id=$5 RETURNING id,name,category,enabled,sort_order',
    [req.body?.name!==undefined?String(req.body.name).trim():null,req.body?.category!==undefined?String(req.body.category).trim():null,req.body?.enabled!==undefined?Boolean(req.body.enabled):null,req.body?.sortOrder!==undefined?Number(req.body.sortOrder):null,req.params.id]);
  if(!rows[0])return res.status(404).json({error:'Service not found'});res.json({service:rows[0]});
});
app.delete('/api/services/:id', adminOnly, async (req,res) => {
  const {rows}=await pool.query('UPDATE services SET enabled=false WHERE id=$1 RETURNING id',[req.params.id]);
  if(!rows[0])return res.status(404).json({error:'Service not found'});res.json({ok:true});
});
app.get('/api/dashboard', auth, async (_req, res) => {
  const [sales, expenses, customerDue, vendorDue, todaySales, todayPayments, todayVendorPayments, todayExpenses] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(selling_price),0) total_sales,
                       COALESCE(SUM(customer_paid),0) total_received,
                       COALESCE(SUM(selling_price - vendor_cost - account_cost),0) signed_gross_profit
                FROM transactions
                WHERE deleted_at IS NULL AND status <> $1`, ['CANCELLED']),
    pool.query('SELECT COALESCE(SUM(amount),0) total_expense FROM expenses WHERE reversed_at IS NULL'),
    pool.query('SELECT COALESCE(SUM(customer_due),0) + COALESCE((SELECT SUM(opening_due) FROM customers),0) customer_receivable FROM transactions WHERE deleted_at IS NULL AND status <> $1', ['CANCELLED']),
    pool.query('SELECT COALESCE(SUM(vendor_due),0) + COALESCE((SELECT SUM(opening_payable) FROM vendors),0) vendor_payable FROM transactions WHERE deleted_at IS NULL AND status <> $1', ['CANCELLED']),
    pool.query(`SELECT COALESCE(SUM(selling_price),0) total_sales,
                       COALESCE(SUM(selling_price - vendor_cost - account_cost),0) signed_gross_profit
                FROM transactions
                WHERE deleted_at IS NULL AND status <> $1 AND date = CURRENT_DATE`, ['CANCELLED']),
    pool.query("SELECT COALESCE(SUM(p.amount),0) total_received FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE t.deleted_at IS NULL AND t.status <> 'CANCELLED' AND p.payment_type='customer' AND p.reversed_at IS NULL AND paid_at::date = CURRENT_DATE"),
    pool.query("SELECT COALESCE(SUM(p.amount),0) total_vendor_payment FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE t.deleted_at IS NULL AND t.status <> 'CANCELLED' AND p.payment_type='vendor' AND p.reversed_at IS NULL AND paid_at::date = CURRENT_DATE"),
    pool.query('SELECT COALESCE(SUM(amount),0) total_expense FROM expenses WHERE reversed_at IS NULL AND occurred_at::date = CURRENT_DATE')
  ]);
  const signedGrossProfit = Number(sales.rows[0].signed_gross_profit || 0);
  const grossProfit = Math.max(0, signedGrossProfit);
  const loss = Math.max(0, -signedGrossProfit);
  const todaySignedGrossProfit = Number(todaySales.rows[0].signed_gross_profit || 0);
  const todayGrossProfit = Math.max(0, todaySignedGrossProfit);
  const todayLoss = Math.max(0, -todaySignedGrossProfit);
  const todayExpense = Number(todayExpenses.rows[0].total_expense || 0);
  res.json({
    sales: { ...sales.rows[0], gross_profit: grossProfit, loss },
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

app.post('/api/customers', auth, async (req,res) => {
  try {
    const name=String(req.body?.name||'').trim(), mobile=String(req.body?.mobile||'').trim();
    if(!name||!mobile) return res.status(400).json({error:'Customer name and mobile are required'});
    const {rows}=await pool.query(`INSERT INTO customers (name,mobile,whatsapp,email,address,nid,passport_number,passport_expiry,notes,opening_due) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (mobile) DO UPDATE SET name=EXCLUDED.name, whatsapp=COALESCE(EXCLUDED.whatsapp,customers.whatsapp), email=COALESCE(EXCLUDED.email,customers.email), address=COALESCE(EXCLUDED.address,customers.address), nid=COALESCE(EXCLUDED.nid,customers.nid), passport_number=COALESCE(EXCLUDED.passport_number,customers.passport_number), passport_expiry=COALESCE(EXCLUDED.passport_expiry,customers.passport_expiry), notes=COALESCE(EXCLUDED.notes,customers.notes), opening_due=EXCLUDED.opening_due, updated_at=now() RETURNING *`,[name,mobile,req.body?.whatsapp||null,req.body?.email||null,req.body?.address||null,req.body?.nid||null,req.body?.passportNumber||null,req.body?.passportExpiry||null,req.body?.notes||null,Number(req.body?.openingDue||0)]);
    await audit(pool as any, req.session.userId!, 'CUSTOMER_CREATED', 'Customer', rows[0].id, null, rows[0]);
    res.status(201).json({customer:rows[0]});
  } catch(e){res.status(400).json({error:e instanceof Error?e.message:'Customer creation failed'});}
});
 
app.get('/api/customers', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(
    q ? 'SELECT * FROM customers WHERE name ILIKE $1 OR mobile ILIKE $1 ORDER BY name LIMIT 30' : 'SELECT * FROM customers ORDER BY name LIMIT 100',
    q ? [q + '%'] : []
  );
  res.json(rows);
});

app.delete('/api/customers/:id', adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const customer = (await client.query('SELECT * FROM customers WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!customer) throw new Error('Customer not found');
    const linked = (await client.query('SELECT COUNT(*)::int count FROM transactions WHERE customer_id=$1 AND deleted_at IS NULL', [req.params.id])).rows[0].count;
    if (Number(linked) > 0) throw new Error('Customer has active transactions. Delete or archive those transactions first.');
    await client.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
    await audit(client, req.session.userId!, 'CUSTOMER_DELETED', 'Customer', req.params.id, customer, null);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); res.status(400).json({ error: e instanceof Error ? e.message : 'Customer deletion failed' }); }
  finally { client.release(); }
});

app.delete('/api/vendors/:id', adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vendor = (await client.query('SELECT * FROM vendors WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!vendor) throw new Error('Vendor not found');
    const linked = (await client.query('SELECT COUNT(*)::int count FROM transactions WHERE vendor_id=$1 AND deleted_at IS NULL', [req.params.id])).rows[0].count;
    if (Number(linked) > 0) throw new Error('Vendor has active transactions. Delete or archive those transactions first.');
    await client.query('DELETE FROM vendors WHERE id=$1', [req.params.id]);
    await audit(client, req.session.userId!, 'VENDOR_DELETED', 'Vendor', req.params.id, vendor, null);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); res.status(400).json({ error: e instanceof Error ? e.message : 'Vendor deletion failed' }); }
  finally { client.release(); }
});

app.post('/api/admin/clear-all-data', adminOnly, async (req, res) => {
  const backupCode = String(req.body?.backupCode || '');
  if (backupCode !== '105671') return res.status(403).json({ error: 'Invalid backup code' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM account_entries');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM transactions');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM fund_transfers');
    await client.query('DELETE FROM customers');
    await client.query('DELETE FROM vendors');
    await client.query('DELETE FROM account_opening_balances');
    await audit(client, req.session.userId!, 'ALL_INPUT_DATA_CLEARED', 'System', 'all-input-data', null, { clearedAt: new Date().toISOString(), preserved: ['users','services','app_settings','audit_logs'] });
    await client.query('COMMIT');
    res.json({ ok: true, message: 'All business input data cleared. Users, services, settings and audit history were preserved.' });
  } catch (e) { await client.query('ROLLBACK'); res.status(400).json({ error: e instanceof Error ? e.message : 'Clear all data failed' }); }
  finally { client.release(); }
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

app.post('/api/vendors', auth, async (req,res) => {
  try {
    const name=String(req.body?.name||'').trim();
    if(!name) return res.status(400).json({error:'Vendor name is required'});
    const {rows}=await pool.query(`INSERT INTO vendors (name,company,mobile,whatsapp,email,address,account_info,opening_payable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[name,req.body?.company||null,req.body?.mobile||null,req.body?.whatsapp||null,req.body?.email||null,req.body?.address||null,req.body?.accountInfo||null,Number(req.body?.openingPayable||0)]);
    await audit(pool as any, req.session.userId!, 'VENDOR_CREATED', 'Vendor', rows[0].id, null, rows[0]);
    res.status(201).json({vendor:rows[0]});
  } catch(e){res.status(400).json({error:e instanceof Error?e.message:'Vendor creation failed'});}
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

app.delete('/api/transactions/:id', adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = (await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!tx) throw new Error('Transaction not found');
    if (tx.deleted_at) throw new Error('Transaction is already deleted');
    const activeAdjustments = (await client.query('SELECT COUNT(*)::int AS count FROM loan_advance_adjustments WHERE transaction_id=$1 AND reversed_at IS NULL', [tx.id])).rows[0]?.count || 0;
    if (Number(activeAdjustments) > 0) throw new Error('Reverse active loan/advance adjustment before deleting this transaction.');
    const deletedAt = new Date();
    await client.query('UPDATE transactions SET deleted_at=$1, deleted_by=$2, updated_at=now() WHERE id=$3', [deletedAt, req.session.userId, tx.id]);
    // Mark the deletion timestamp on entries/payments so restore does not resurrect
    // an accounting record that had already been manually reversed.
    await client.query(`UPDATE account_entries SET reversed_at=$1 WHERE source_id=$2 AND reversed_at IS NULL`, [deletedAt, tx.id]);
    await client.query('UPDATE payments SET reversed_at=$1, reversed_by=$2 WHERE transaction_id=$3 AND reversed_at IS NULL', [deletedAt, req.session.userId, tx.id]);
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

app.patch('/api/transactions/:id', historicalChangeAdminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = (await client.query('SELECT * FROM transactions WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [req.params.id])).rows[0];
    if (!tx) throw new Error('Transaction not found');
    const body = req.body ?? {};
    const hasReminder = ['reminderDate','reminderTime','reminderStatus','reminderNote'].some((k) => Object.prototype.hasOwnProperty.call(body, k));
    const hasFlightStatus = body.flightStatus !== undefined;
    const hasService = body.serviceId !== undefined;
    const hasVendor = body.vendorId !== undefined;
    const hasVendorCost = body.vendorCost !== undefined;
    const hasVendorPaid = body.vendorPaid !== undefined;
    const hasVendorDue = body.vendorDue !== undefined;
    const hasSellingPrice = body.sellingPrice !== undefined;
    const hasCustomerDue = body.customerDue !== undefined;
    const hasCustomerPaid = body.customerPaid !== undefined;
    if (!hasReminder && !hasFlightStatus && !hasService && !hasVendor && !hasVendorCost && !hasVendorPaid && !hasVendorDue && !hasSellingPrice && !hasCustomerDue && !hasCustomerPaid) {
      throw new Error('No supported transaction update supplied');
    }

    const previous = { ...tx };
    let flightDetails = tx.flight_details;
    let serviceId = tx.service_id;
    let vendorId = tx.vendor_id;
    let vendorCost = Number(tx.vendor_cost || 0);
    let vendorPaid = Number(tx.vendor_paid || 0);
    let vendorDue = Number(tx.vendor_due || 0);
    const oldVendorPaid = vendorPaid;
    let sellingPrice = Number(tx.selling_price || 0);
    let customerPaid = Number(tx.customer_paid || 0);
    let customerDue = Number(tx.customer_due || 0);
    const oldCustomerPaid = customerPaid;

    if (hasCustomerPaid) {
      customerPaid = Number(body.customerPaid);
      if (!Number.isFinite(customerPaid) || customerPaid < 0) throw new Error('Customer paid must be a valid non-negative number');
    }
    if (hasSellingPrice) {
      sellingPrice = Number(body.sellingPrice);
      if (!Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error('Selling price must be a valid non-negative number');
    }
    if (hasCustomerDue) {
      customerDue = Number(body.customerDue);
      if (!Number.isFinite(customerDue) || customerDue < 0) throw new Error('Customer due must be a valid non-negative number');
    }
    if (hasSellingPrice || hasCustomerPaid || hasCustomerDue) {
      if (!hasSellingPrice && !hasCustomerDue) {
        customerDue = Math.max(0, sellingPrice - customerPaid);
      } else if (hasSellingPrice && !hasCustomerDue) {
        customerDue = Math.max(0, sellingPrice - customerPaid);
      } else if (!hasSellingPrice && hasCustomerDue) {
        sellingPrice = customerPaid + customerDue;
      }
      if (sellingPrice < customerPaid) throw new Error('Selling price cannot be lower than customer paid amount');
      const expectedDue = Math.max(0, sellingPrice - customerPaid);
      if (Math.abs(expectedDue - customerDue) > 0.01) throw new Error('Selling price, customer paid and customer due do not match');
    }

    if (hasService) {
      const requestedServiceId = body.serviceId ? String(body.serviceId) : null;
      if (requestedServiceId) {
        const service = (await client.query('SELECT id FROM services WHERE id=$1', [requestedServiceId])).rows[0];
        if (!service) throw new Error('Selected service not found');
      }
      serviceId = requestedServiceId;
    }

    if (hasVendor) {
      const requestedVendorId = body.vendorId ? String(body.vendorId) : null;
      if (requestedVendorId) {
        const vendor = (await client.query('SELECT id FROM vendors WHERE id=$1', [requestedVendorId])).rows[0];
        if (!vendor) throw new Error('Selected vendor not found');
      }
      vendorId = requestedVendorId;
    }

    if (hasVendorCost) {
      vendorCost = Number(body.vendorCost);
      if (!Number.isFinite(vendorCost) || vendorCost < 0) throw new Error('Vendor cost must be a valid non-negative number');
    }
    if (hasVendorPaid) {
      vendorPaid = Number(body.vendorPaid);
      if (!Number.isFinite(vendorPaid) || vendorPaid < 0) throw new Error('Vendor paid must be a valid non-negative number');
    }
    if (hasVendorDue) {
      vendorDue = Number(body.vendorDue);
      if (!Number.isFinite(vendorDue) || vendorDue < 0) throw new Error('Vendor due must be a valid non-negative number');
    }
    if (hasVendorCost || hasVendorPaid || hasVendorDue) {
      if (!hasVendorCost && !hasVendorDue) {
        vendorDue = Math.max(0, vendorCost - vendorPaid);
      } else if (hasVendorCost && !hasVendorDue) {
        vendorDue = Math.max(0, vendorCost - vendorPaid);
      } else if (!hasVendorCost && hasVendorDue) {
        vendorCost = vendorPaid + vendorDue;
      }
      if (vendorCost < vendorPaid) throw new Error('Vendor cost cannot be lower than vendor paid amount');
      const expectedVendorDue = Math.max(0, vendorCost - vendorPaid);
      if (Math.abs(expectedVendorDue - vendorDue) > 0.01) throw new Error('Vendor cost, vendor paid and vendor due do not match');
    }

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

    if (hasVendorPaid && vendorPaid !== oldVendorPaid) {
      const difference = vendorPaid - oldVendorPaid;
      if (!vendorId && vendorPaid > 0) throw new Error('Vendor must be linked before recording vendor paid amount');
      if (difference > 0) {
        const fallbackMethod = await client.query(
          "SELECT payment_method FROM payments WHERE transaction_id=$1 AND payment_type='vendor' AND reversed_at IS NULL ORDER BY paid_at DESC, id DESC LIMIT 1",
          [tx.id]
        );
        const method = String(body.vendorPaymentMethod || fallbackMethod.rows[0]?.payment_method || 'cash').toLowerCase();
        if (!ACCOUNT_METHODS.has(method)) throw new Error('Invalid vendor payment method for payment correction');
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [method]);
        const balance = await accountBalance(client, method);
        if (difference > balance) throw new Error(`Insufficient balance for vendor payment correction (balance: ${balance})`);
        const payment = (await client.query(
          "INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,'vendor',$2,$3,$4,$5,$6,$7) RETURNING *",
          [tx.id, vendorId, difference, method, req.session.userId, body.paymentNote || 'Admin historical vendor payment correction', body.paymentReference || null]
        )).rows[0];
        await addAccountEntry(client, method, -difference, 'vendor_payment_correction', tx.id, req.session.userId!, body.paymentNote || 'Admin historical vendor payment correction', payment.id);
        await audit(client, req.session.userId!, 'VENDOR_PAYMENT_ADDED_BY_ADMIN_CORRECTION', 'Payment', payment.id, null, payment);
      } else {
        let remaining = Math.abs(difference);
        const payments = (await client.query(
          "SELECT * FROM payments WHERE transaction_id=$1 AND payment_type='vendor' AND reversed_at IS NULL ORDER BY paid_at DESC, id DESC FOR UPDATE",
          [tx.id]
        )).rows;
        const totalHistorical = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        if (remaining > totalHistorical + 0.01) throw new Error('Vendor paid correction exceeds historical vendor payments');
        for (const payment of payments) {
          if (remaining <= 0.01) break;
          const amount = Number(payment.amount || 0);
          const reduceBy = Math.min(amount, remaining);
          const entries = (await client.query(
            'SELECT * FROM account_entries WHERE payment_id=$1 AND reversed_at IS NULL FOR UPDATE',
            [payment.id]
          )).rows;
          if (entries.length !== 1) throw new Error('Historical vendor payment accounting entry is missing or ambiguous');
          if (reduceBy >= amount - 0.01) {
            await client.query('UPDATE account_entries SET reversed_at=now() WHERE payment_id=$1 AND reversed_at IS NULL', [payment.id]);
            await client.query('UPDATE payments SET reversed_at=now(), reversed_by=$1 WHERE id=$2', [req.session.userId, payment.id]);
            await audit(client, req.session.userId!, 'VENDOR_PAYMENT_REVERSED_BY_ADMIN_CORRECTION', 'Payment', payment.id, payment, { reversedAt: new Date().toISOString(), correction: true });
          } else {
            const newAmount = amount - reduceBy;
            await client.query('UPDATE payments SET amount=$1 WHERE id=$2', [newAmount, payment.id]);
            await client.query('UPDATE account_entries SET amount=amount+$1 WHERE payment_id=$2 AND reversed_at IS NULL', [reduceBy, payment.id]);
            await audit(client, req.session.userId!, 'VENDOR_PAYMENT_AMOUNT_CORRECTED_BY_ADMIN', 'Payment', payment.id, payment, { ...payment, amount: newAmount });
          }
          remaining -= reduceBy;
        }
      }
    }

    if (hasCustomerPaid && customerPaid !== oldCustomerPaid) {
      const difference = customerPaid - oldCustomerPaid;
      if (difference > 0) {
        const fallbackMethod = await client.query(
          "SELECT payment_method FROM payments WHERE transaction_id=$1 AND payment_type='customer' AND reversed_at IS NULL ORDER BY paid_at DESC, id DESC LIMIT 1",
          [tx.id]
        );
        const method = String(body.customerPaymentMethod || fallbackMethod.rows[0]?.payment_method || 'cash').toLowerCase();
        if (!ACCOUNT_METHODS.has(method)) throw new Error('Invalid customer payment method for payment correction');
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [method]);
        // Customer payment is money received by the business, so it increases the selected account.
        // Do not compare it against the account's existing balance.
        const payment = (await client.query(
          "INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,'customer',$2,$3,$4,$5,$6,$7) RETURNING *",
          [tx.id, tx.customer_id, difference, method, req.session.userId, body.paymentNote || 'Admin historical payment correction', body.paymentReference || null]
        )).rows[0];
        await addAccountEntry(client, method, difference, 'customer_payment_correction', tx.id, req.session.userId!, body.paymentNote || 'Admin historical payment correction', payment.id);
        await audit(client, req.session.userId!, 'CUSTOMER_PAYMENT_ADDED_BY_ADMIN_CORRECTION', 'Payment', payment.id, null, payment);
      } else {
        let remaining = Math.abs(difference);
        const payments = (await client.query(
          "SELECT * FROM payments WHERE transaction_id=$1 AND payment_type='customer' AND reversed_at IS NULL ORDER BY paid_at DESC, id DESC FOR UPDATE",
          [tx.id]
        )).rows;
        const totalHistorical = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        if (remaining > totalHistorical + 0.01) throw new Error('Customer paid correction exceeds historical customer payments');

        for (const payment of payments) {
          if (remaining <= 0.01) break;
          const amount = Number(payment.amount || 0);
          const reduceBy = Math.min(amount, remaining);
          const entries = (await client.query(
            'SELECT * FROM account_entries WHERE payment_id=$1 AND reversed_at IS NULL FOR UPDATE',
            [payment.id]
          )).rows;
          if (entries.length !== 1) throw new Error('Historical customer payment accounting entry is missing or ambiguous');
          if (reduceBy >= amount - 0.01) {
            await client.query('UPDATE account_entries SET reversed_at=now() WHERE payment_id=$1 AND reversed_at IS NULL', [payment.id]);
            await client.query('UPDATE payments SET reversed_at=now(), reversed_by=$1 WHERE id=$2', [req.session.userId, payment.id]);
            await audit(client, req.session.userId!, 'CUSTOMER_PAYMENT_REVERSED_BY_ADMIN_CORRECTION', 'Payment', payment.id, payment, { reversedAt: new Date().toISOString(), correction: true });
          } else {
            const newAmount = amount - reduceBy;
            await client.query('UPDATE payments SET amount=$1 WHERE id=$2', [newAmount, payment.id]);
            await client.query('UPDATE account_entries SET amount=amount-$1 WHERE payment_id=$2 AND reversed_at IS NULL', [reduceBy, payment.id]);
            await audit(client, req.session.userId!, 'CUSTOMER_PAYMENT_AMOUNT_CORRECTED_BY_ADMIN', 'Payment', payment.id, payment, { ...payment, amount: newAmount });
          }
          remaining -= reduceBy;
        }
      }
    }

    const result = await client.query(
      `UPDATE transactions
       SET reminder_date=CASE WHEN $1::boolean THEN $2::date ELSE reminder_date END,
           reminder_time=CASE WHEN $3::boolean THEN $4::time ELSE reminder_time END,
           reminder_status=CASE WHEN $5::boolean THEN $6 ELSE reminder_status END,
           reminder_note=CASE WHEN $7::boolean THEN $8 ELSE reminder_note END,
           flight_details=CASE WHEN $9::boolean THEN $10::jsonb ELSE flight_details END,
           service_id=CASE WHEN $12::boolean THEN $13::uuid ELSE service_id END,
           vendor_id=CASE WHEN $14::boolean THEN $15::uuid ELSE vendor_id END,
           vendor_cost=CASE WHEN $16::boolean THEN $17::numeric ELSE vendor_cost END,
           vendor_paid=CASE WHEN $18::boolean THEN $19::numeric ELSE vendor_paid END,
           vendor_due=CASE WHEN ($16::boolean OR $18::boolean OR $20::boolean) THEN $21::numeric ELSE vendor_due END,
           selling_price=CASE WHEN $22::boolean THEN $23::numeric ELSE selling_price END,
           customer_paid=CASE WHEN $25::boolean THEN $26::numeric ELSE customer_paid END,
           customer_due=CASE WHEN ($22::boolean OR $25::boolean) THEN $24::numeric ELSE customer_due END,
           status=CASE WHEN ($22::boolean OR $25::boolean) THEN CASE WHEN $24::numeric=0 THEN 'PAID' WHEN $26::numeric>0 THEN 'PARTIAL' ELSE 'DUE' END ELSE status END,
           gross_profit=CASE WHEN $16::boolean OR $22::boolean THEN (CASE WHEN $22::boolean THEN $23::numeric ELSE selling_price END) - (CASE WHEN $16::boolean THEN $17::numeric ELSE vendor_cost END) ELSE gross_profit END,
           updated_at=now()
       WHERE id=$11
       RETURNING *`,
      [
        body.reminderDate !== undefined, body.reminderDate || null,
        body.reminderTime !== undefined, body.reminderTime || null,
        body.reminderStatus !== undefined, body.reminderStatus || null,
        body.reminderNote !== undefined, body.reminderNote || null,
        hasFlightStatus, hasFlightStatus ? JSON.stringify(flightDetails) : null,
        tx.id,
        hasService, serviceId,
        hasVendor, vendorId,
        hasVendorCost, vendorCost,
        hasVendorPaid, vendorPaid,
        hasVendorDue, vendorDue,
        hasSellingPrice || hasCustomerDue || hasCustomerPaid, sellingPrice, customerDue,
        hasCustomerPaid, customerPaid
      ]
    );

    if (hasVendor && String(vendorId || '') !== String(tx.vendor_id || '')) {
      await client.query(
        "UPDATE payments SET entity_id=$1 WHERE transaction_id=$2 AND payment_type='vendor' AND reversed_at IS NULL",
        [vendorId, tx.id]
      );
    }

    const event = hasVendor || hasVendorCost || hasVendorPaid || hasVendorDue || hasService || hasSellingPrice || hasCustomerDue || hasCustomerPaid
      ? 'TRANSACTION_FINANCIAL_LINKS_UPDATED'
      : hasFlightStatus
        ? 'FLIGHT_STATUS_UPDATED'
        : 'REMINDER_UPDATED';
    await audit(client, req.session.userId!, event, 'Transaction', tx.id, previous, result.rows[0]);
    await client.query('COMMIT');
    res.json({ transaction: result.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Transaction update failed' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/recycle-bin', adminOnly, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT t.*, c.name customer_name, c.mobile customer_mobile, s.name service_name, v.name vendor_name
     FROM transactions t
     JOIN customers c ON c.id=t.customer_id
     LEFT JOIN services s ON s.id=t.service_id
     LEFT JOIN vendors v ON v.id=t.vendor_id
     WHERE t.deleted_at IS NOT NULL
       AND t.deleted_at >= now() - interval '30 days'
     ORDER BY t.deleted_at DESC`
  );
  res.json(rows);
});

app.post('/api/admin/recycle-bin/:id/restore', adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = (await client.query(
      'SELECT * FROM transactions WHERE id=$1 AND deleted_at IS NOT NULL FOR UPDATE',
      [req.params.id]
    )).rows[0];
    if (!tx) throw new Error('Deleted transaction not found');
    if (new Date(tx.deleted_at).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) {
      throw new Error('This transaction is older than 30 days and can no longer be restored.');
    }
    await client.query(
      'UPDATE transactions SET deleted_at=NULL, deleted_by=NULL, updated_at=now() WHERE id=$1',
      [tx.id]
    );
    // Restore only accounting records reversed as part of this deletion.
    await client.query('UPDATE payments SET reversed_at=NULL, reversed_by=NULL WHERE transaction_id=$1 AND reversed_at >= $2', [tx.id, tx.deleted_at]);
    await client.query('UPDATE account_entries SET reversed_at=NULL WHERE source_id=$1 AND reversed_at >= $2', [tx.id, tx.deleted_at]);
    await audit(
      client,
      req.session.userId!,
      'TRANSACTION_RESTORED',
      'Transaction',
      tx.id,
      { deletedAt: tx.deleted_at, invoiceNumber: tx.invoice_number },
      { restoredAt: new Date().toISOString(), invoiceNumber: tx.invoice_number }
    );
    await client.query('COMMIT');
    res.json({ ok: true, transaction: tx });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Transaction restore failed' });
  } finally {
    client.release();
  }
});

app.get('/api/transactions', auth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const { rows } = await pool.query(`
    SELECT t.*, c.name customer_name, c.mobile customer_mobile, s.name service_name, v.name vendor_name,
      (SELECT p.payment_method FROM payments p WHERE p.transaction_id=t.id AND p.payment_type='customer' AND p.reversed_at IS NULL ORDER BY p.paid_at DESC, p.id DESC LIMIT 1) AS customer_payment_method,
      (SELECT p.payment_method FROM payments p WHERE p.transaction_id=t.id AND p.payment_type='vendor' AND p.reversed_at IS NULL ORDER BY p.paid_at DESC, p.id DESC LIMIT 1) AS vendor_payment_method,
      COALESCE((SELECT -SUM(a.amount) FROM account_entries a WHERE a.source_id=t.id::text AND a.source_type='service_cost' AND a.reversed_at IS NULL),0) AS account_cost,
      (SELECT a.account_name FROM account_entries a WHERE a.source_id=t.id::text AND a.source_type='service_cost' AND a.reversed_at IS NULL ORDER BY a.occurred_at DESC LIMIT 1) AS account_cost_payment_method
    FROM transactions t
    JOIN customers c ON c.id=t.customer_id
    LEFT JOIN services s ON s.id=t.service_id
    LEFT JOIN vendors v ON v.id=t.vendor_id
    WHERE t.deleted_at IS NULL
    ORDER BY t.date DESC, t.time DESC LIMIT $1
  `, [limit]);
  res.json(rows);
});

app.get('/api/appointments', auth, async (_req, res) => {
  const { rows } = await pool.query('SELECT a.*, s.name AS service_name, COALESCE(u.full_name, u.username, \'Staff\') AS created_by_name FROM appointment_reminders a LEFT JOIN users u ON u.id=a.created_by LEFT JOIN services s ON s.id=a.service_id ORDER BY a.appointment_date ASC, a.appointment_time ASC, a.created_at DESC');
  res.json(rows);
});

app.post('/api/appointments', auth, async (req, res) => {
  const b = req.body || {};
  if (!String(b.customerName || '').trim()) return res.status(400).json({ error: 'Customer name is required' });
  if (!String(b.title || '').trim()) return res.status(400).json({ error: 'Appointment title is required' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.appointmentDate || ''))) return res.status(400).json({ error: 'Valid appointment date is required' });
  if (!/^\d{2}:\d{2}$/.test(String(b.appointmentTime || ''))) return res.status(400).json({ error: 'Valid appointment time is required' });
  const { rows } = await pool.query('INSERT INTO appointment_reminders (customer_id,transaction_id,service_id,customer_name,customer_mobile,customer_email,title,appointment_date,appointment_time,note,status,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,\'pending\',$11) RETURNING *', [b.customerId || null, b.transactionId || null, b.serviceId || null, String(b.customerName).trim(), b.customerMobile || null, b.customerEmail || null, String(b.title).trim(), b.appointmentDate, b.appointmentTime, b.note || null, req.session.userId]);
  res.status(201).json({ appointment: rows[0] });
});

app.patch('/api/appointments/:id', auth, async (req, res) => {
  const map: Record<string,string> = { customerId:'customer_id', transactionId:'transaction_id', serviceId:'service_id', customerName:'customer_name', customerMobile:'customer_mobile', customerEmail:'customer_email', title:'title', appointmentDate:'appointment_date', appointmentTime:'appointment_time', note:'note', status:'status' };
  const sets: string[] = []; const values: any[] = [];
  for (const key of Object.keys(map)) {
    if (req.body && req.body[key] !== undefined) {
      sets.push(map[key] + '= $' + (values.length + 1));
      values.push(req.body[key] === '' ? null : req.body[key]);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'No appointment changes supplied' });
  values.push(req.params.id);
  const { rows } = await pool.query('UPDATE appointment_reminders SET ' + sets.join(', ') + ', updated_at=now() WHERE id=$' + values.length + ' RETURNING *', values);
  if (!rows[0]) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ appointment: rows[0] });
});

app.delete('/api/appointments/:id', auth, async (req, res) => {
  const result = await pool.query('DELETE FROM appointment_reminders WHERE id=$1', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ ok: true });
});

app.get('/api/payment-records', auth, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      p.id,
      p.transaction_id,
      p.payment_type,
      p.entity_id,
      p.amount,
      p.payment_method,
      p.note,
      p.reference,
      p.paid_at,
      p.paid_at::date::text AS paid_date,
      to_char(p.paid_at AT TIME ZONE 'Asia/Dhaka', 'HH24:MI') AS paid_time,
      t.invoice_number,
      COALESCE(u.full_name, u.username, 'Staff') AS recorded_by_name,
      CASE
        WHEN p.payment_type='customer' THEN c.name
        WHEN p.payment_type='vendor' THEN v.name
        ELSE ''
      END AS entity_name
    FROM payments p
    JOIN transactions t ON t.id=p.transaction_id
    LEFT JOIN users u ON u.id=p.recorded_by
    LEFT JOIN customers c ON c.id=p.entity_id AND p.payment_type='customer'
    LEFT JOIN vendors v ON v.id=p.entity_id AND p.payment_type='vendor'
    WHERE p.reversed_at IS NULL AND t.deleted_at IS NULL
    ORDER BY p.paid_at DESC, p.id DESC
    LIMIT 1000
  `);
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
    const paidAt = req.body?.paidAt ? new Date(String(req.body.paidAt)) : new Date();
    if (Number.isNaN(paidAt.getTime())) throw new Error('Invalid payment date/time');
    const payment = (await client.query('INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference,paid_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [tx.id, paymentType, entityId, value, method, req.session.userId, note || null, reference || null, paidAt])).rows[0];
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
    res.json({ ok: true, payment: { id: payment.id, transactionId: payment.transaction_id, paymentType: payment.payment_type, entityId: payment.entity_id, amount: Number(payment.amount), paymentMethod: payment.payment_method, paidAt: payment.paid_at, note: payment.note, reference: payment.reference } });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Payment failed' });
  } finally { client.release(); }
});

app.post('/api/payments/:id/reverse', adminOnly, async (req, res) => {
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

app.put('/api/opening-balances/:account', adminOnly, async (req, res) => {
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


const mapLoanAdvance = (row: any) => ({
  id: String(row.id),
  partyType: row.party_type,
  partyId: String(row.party_id),
  partyName: row.party_name,
  kind: row.kind,
  direction: row.direction,
  amount: Number(row.amount || 0),
  paymentMethod: String(row.payment_method || 'cash'),
  date: new Date(row.occurred_at).toISOString().slice(0,10),
  time: new Date(row.occurred_at).toTimeString().slice(0,5),
  note: row.note || undefined,
  reference: row.reference || undefined,
  createdBy: row.created_by_name || row.created_by || 'Staff',
});

const mapLoanAdjustment = (row: any) => ({
  id: String(row.id),
  loanAdvanceId: String(row.loan_advance_id),
  transactionId: String(row.transaction_id),
  partyType: row.party_type,
  partyId: String(row.party_id),
  amount: Number(row.amount || 0),
  date: new Date(row.occurred_at).toISOString().slice(0,10),
  time: new Date(row.occurred_at).toTimeString().slice(0,5),
  note: row.note || undefined,
  createdBy: row.created_by_name || row.created_by || 'Staff',
});

app.get('/api/loan-advances', auth, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT la.*, u.full_name AS created_by_name
    FROM loan_advances la LEFT JOIN users u ON u.id=la.created_by
    WHERE la.reversed_at IS NULL ORDER BY la.occurred_at DESC
  `);
  res.json(rows.map(mapLoanAdvance));
});

app.get('/api/loan-advances/adjustments', auth, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT laa.*, u.full_name AS created_by_name
    FROM loan_advance_adjustments laa LEFT JOIN users u ON u.id=laa.created_by
    WHERE laa.reversed_at IS NULL ORDER BY laa.occurred_at DESC
  `);
  res.json(rows.map(mapLoanAdjustment));
});

app.post('/api/loan-advances', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const partyType = String(body.partyType || '').toLowerCase();
    const partyId = String(body.partyId || '');
    const kind = String(body.kind || '').toLowerCase();
    const direction = String(body.direction || '').toLowerCase();
    const amount = Number(body.amount);
    const method = String(body.paymentMethod || '').toLowerCase();
    if (!['customer','vendor'].includes(partyType) || !partyId) throw new Error('Valid customer/vendor is required');
    if (!['advance','loan'].includes(kind) || !['received','given'].includes(direction)) throw new Error('Invalid loan/advance type or direction');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be positive');
    if (!ACCOUNT_METHODS.has(method)) throw new Error('Invalid payment method');
    const partyTable = partyType === 'customer' ? 'customers' : 'vendors';
    const party = (await client.query(`SELECT id,name FROM ${partyTable} WHERE id=$1`, [partyId])).rows[0];
    if (!party) throw new Error('Party not found');
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [method]);
    if (direction === 'given') {
      const balance = await accountBalance(client, method);
      if (amount > balance) throw new Error('Insufficient balance for loan/advance given');
    }
    const row = (await client.query(`
      INSERT INTO loan_advances (party_type,party_id,party_name,kind,direction,amount,payment_method,occurred_at,note,reference,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz,now()),$9,$10,$11) RETURNING *
    `, [partyType, partyId, party.name, kind, direction, amount, method, body.occurredAt || null, body.note || null, body.reference || null, req.session.userId])).rows[0];
    await addAccountEntry(client, method, direction === 'received' ? amount : -amount, 'loan_advance', row.id, req.session.userId!, row.note);
    await audit(client, req.session.userId!, 'LOAN_ADVANCE_CREATED', 'LoanAdvance', row.id, null, row);
    await client.query('COMMIT');
    res.status(201).json({ loanAdvance: mapLoanAdvance(row) });
  } catch (e) { await client.query('ROLLBACK').catch(()=>{}); res.status(400).json({ error: e instanceof Error ? e.message : 'Loan/advance creation failed' }); }
  finally { client.release(); }
});

app.patch('/api/loan-advances/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const old = (await client.query('SELECT * FROM loan_advances WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!old || old.reversed_at) throw new Error('Loan/advance not found');
    const used = Number((await client.query('SELECT COALESCE(SUM(amount),0) total FROM loan_advance_adjustments WHERE loan_advance_id=$1 AND reversed_at IS NULL',[old.id])).rows[0].total || 0);
    if (used > 0) throw new Error('Reverse settlement adjustments before editing this entry');
    const amount = req.body.amount === undefined ? Number(old.amount) : Number(req.body.amount);
    const method = String(req.body.paymentMethod || old.payment_method).toLowerCase();
    const direction = String(req.body.direction || old.direction).toLowerCase();
    const kind = String(req.body.kind || old.kind).toLowerCase();
    if (!Number.isFinite(amount) || amount <= 0 || !ACCOUNT_METHODS.has(method) || !['received','given'].includes(direction) || !['advance','loan'].includes(kind)) throw new Error('Invalid loan/advance update');
    const oldMethod = String(old.payment_method).toLowerCase();
    const oldDelta = old.direction === 'received' ? Number(old.amount) : -Number(old.amount);
    const newDelta = direction === 'received' ? amount : -amount;
    if (oldMethod !== method || oldDelta !== newDelta) {
      const locks = [...new Set([oldMethod,method])].sort();
      for (const account of locks) await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[account]);
      const oldBalance = await accountBalance(client, oldMethod);
      if (oldDelta < 0 && oldBalance + oldDelta < 0) throw new Error('Invalid source balance for reversal');
      const newBalance = await accountBalance(client, method);
      const effectiveNewBalance = newBalance + (oldMethod === method ? Math.max(0, oldDelta) : 0);
      if (newDelta < 0 && effectiveNewBalance < amount) throw new Error('Insufficient balance for updated loan/advance');
      await client.query('UPDATE account_entries SET reversed_at=now() WHERE source_type=$1 AND source_id=$2 AND reversed_at IS NULL',['loan_advance',old.id]);
      if (oldMethod !== method) await addAccountEntry(client, oldMethod, -oldDelta, 'loan_advance_edit', old.id, req.session.userId!, 'Reversal of original loan/advance');
      else await addAccountEntry(client, oldMethod, -oldDelta, 'loan_advance_edit', old.id, req.session.userId!, 'Reversal of original loan/advance');
      await addAccountEntry(client, method, newDelta, 'loan_advance_edit', old.id, req.session.userId!, 'Updated loan/advance');
    }
    const updated=(await client.query(`UPDATE loan_advances SET party_name=COALESCE($1,party_name), kind=$2,direction=$3,amount=$4,payment_method=$5,note=$6,reference=$7 WHERE id=$8 RETURNING *`,[req.body.partyName || null,kind,direction,amount,method,req.body.note || null,req.body.reference || null,old.id])).rows[0];
    await audit(client, req.session.userId!, 'LOAN_ADVANCE_UPDATED','LoanAdvance',old.id,old,updated);
    await client.query('COMMIT'); res.json({ loanAdvance: mapLoanAdvance(updated) });
  } catch(e){ await client.query('ROLLBACK').catch(()=>{}); res.status(400).json({error:e instanceof Error?e.message:'Loan/advance update failed'}); }
  finally{client.release();}
});

app.delete('/api/loan-advances/:id', adminOnly, async (req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const row=(await client.query('SELECT * FROM loan_advances WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
    if(!row || row.reversed_at) throw new Error('Loan/advance not found');
    const used=Number((await client.query('SELECT COALESCE(SUM(amount),0) total FROM loan_advance_adjustments WHERE loan_advance_id=$1 AND reversed_at IS NULL',[row.id])).rows[0].total||0);
    if(used>0) throw new Error('Reverse settlement adjustments before deleting this entry');
    await client.query('UPDATE account_entries SET reversed_at=now() WHERE source_type=$1 AND source_id=$2 AND reversed_at IS NULL',['loan_advance',row.id]);
    await client.query('UPDATE loan_advances SET reversed_at=now(),reversed_by=$1 WHERE id=$2',[req.session.userId,row.id]);
    await audit(client,req.session.userId!,'LOAN_ADVANCE_REVERSED','LoanAdvance',row.id,row,{reversedAt:new Date().toISOString()});
    await client.query('COMMIT'); res.json({ok:true});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});res.status(400).json({error:e instanceof Error?e.message:'Loan/advance delete failed'});}
  finally{client.release();}
});

app.post('/api/loan-advances/:id/adjust', auth, async (req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const la=(await client.query('SELECT * FROM loan_advances WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
    if(!la || la.reversed_at) throw new Error('Loan/advance not found');
    const tx=(await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE',[req.body.transactionId])).rows[0];
    if(!tx || tx.deleted_at) throw new Error('Transaction not found');
    if(la.party_type==='customer' && String(tx.customer_id)!==String(la.party_id)) throw new Error('Party mismatch');
    if(la.party_type==='vendor' && String(tx.vendor_id)!==String(la.party_id)) throw new Error('Party mismatch');
    const used=Number((await client.query('SELECT COALESCE(SUM(amount),0) total FROM loan_advance_adjustments WHERE loan_advance_id=$1 AND reversed_at IS NULL',[la.id])).rows[0].total||0);
    const available=Math.max(0,Number(la.amount)-used);
    const due=la.party_type==='customer'?Math.max(0,Number(tx.customer_due)):Math.max(0,Number(tx.vendor_due));
    const value=Number(req.body.amount);
    if(!Number.isFinite(value)||value<=0||value>available||value>due) throw new Error('Adjustment exceeds available amount or invoice due');
    const adj=(await client.query(`INSERT INTO loan_advance_adjustments (loan_advance_id,transaction_id,party_type,party_id,amount,occurred_at,note,created_by) VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz,now()),$7,$8) RETURNING *`,[la.id,tx.id,la.party_type,la.party_id,value,req.body.occurredAt||null,req.body.note||null,req.session.userId])).rows[0];
    if(la.party_type==='customer'){
      await client.query('UPDATE transactions SET customer_paid=customer_paid+$1,customer_due=GREATEST(0,selling_price-(customer_paid+$1)),status=CASE WHEN selling_price-(customer_paid+$1)<=0 THEN \'PAID\' WHEN customer_paid+$1>0 THEN \'PARTIAL\' ELSE \'DUE\' END,updated_at=now() WHERE id=$2',[value,tx.id]);
    } else {
      await client.query('UPDATE transactions SET vendor_paid=vendor_paid+$1,vendor_due=GREATEST(0,vendor_cost-(vendor_paid+$1)),updated_at=now() WHERE id=$2',[value,tx.id]);
    }
    await audit(client,req.session.userId!,'LOAN_ADVANCE_ADJUSTED','LoanAdvance',adj.id,null,adj);
    await client.query('COMMIT');
    const updatedTx=(await pool.query('SELECT * FROM transactions WHERE id=$1',[tx.id])).rows[0];
    res.status(201).json({adjustment:mapLoanAdjustment(adj),transaction:updatedTx});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});res.status(400).json({error:e instanceof Error?e.message:'Adjustment failed'});}
  finally{client.release();}
});

app.post('/api/loan-advance-adjustments/:id/reverse', adminOnly, async (req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const adj=(await client.query('SELECT * FROM loan_advance_adjustments WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
    if(!adj || adj.reversed_at) throw new Error('Adjustment not found');
    const tx=(await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE',[adj.transaction_id])).rows[0];
    if(!tx) throw new Error('Transaction not found');
    if(adj.party_type==='customer'){
      await client.query('UPDATE transactions SET customer_paid=GREATEST(0,customer_paid-$1),customer_due=GREATEST(0,selling_price-(customer_paid-$1)),status=CASE WHEN selling_price-(customer_paid-$1)<=0 THEN \'PAID\' WHEN customer_paid-$1>0 THEN \'PARTIAL\' ELSE \'DUE\' END,updated_at=now() WHERE id=$2',[Number(adj.amount),tx.id]);
    } else {
      await client.query('UPDATE transactions SET vendor_paid=GREATEST(0,vendor_paid-$1),vendor_due=GREATEST(0,vendor_cost-(vendor_paid-$1)),updated_at=now() WHERE id=$2',[Number(adj.amount),tx.id]);
    }
    await client.query('UPDATE loan_advance_adjustments SET reversed_at=now(),reversed_by=$1 WHERE id=$2',[req.session.userId,adj.id]);
    await audit(client,req.session.userId!,'LOAN_ADVANCE_ADJUSTMENT_REVERSED','LoanAdvance',adj.id,adj,{reversedAt:new Date().toISOString()});
    await client.query('COMMIT'); res.json({ok:true});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});res.status(400).json({error:e instanceof Error?e.message:'Adjustment reversal failed'});}
  finally{client.release();}
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
    const accountCost = Number(body.accountCost || 0);
    const accountCostPaymentMethod = String(body.accountCostPaymentMethod || 'cash').toLowerCase();
    const customerPaymentMethod = String(body.customerPaymentMethod || body.paymentMethod || 'cash').toLowerCase();
    const vendorPaymentMethod = String(body.vendorPaymentMethod || 'cash').toLowerCase();
    if (!customerName || !mobile) return res.status(400).json({ error: 'Customer name and mobile are required' });
    if (![sellingPrice, customerPaid, vendorCost, vendorPaid, accountCost].every(Number.isFinite) || [sellingPrice, customerPaid, vendorCost, vendorPaid, accountCost].some(v => v < 0)) return res.status(400).json({ error: 'Financial amounts must be valid non-negative numbers' });
    if (customerPaid > sellingPrice) return res.status(400).json({ error: 'Customer payment cannot exceed selling price' });
    if (vendorPaid > vendorCost) return res.status(400).json({ error: 'Vendor payment cannot exceed vendor cost' });
    if (accountCost > 0 && vendorCost > 0) return res.status(400).json({ error: 'Use either vendor cost or account-funded cost, not both' });
    if (accountCost > 0 && !ACCOUNT_METHODS.has(accountCostPaymentMethod)) return res.status(400).json({ error: 'Invalid account-funded cost payment method' });
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
    const grossProfit = sellingPrice - vendorCost - accountCost;
    const tx = (await client.query(`INSERT INTO transactions (invoice_number,date,time,created_by,customer_id,service_id,description,flight_details,selling_price,customer_paid,customer_due,vendor_id,vendor_cost,vendor_paid,vendor_due,account_cost,account_cost_payment_method,gross_profit,reminder_date,reminder_time,reminder_status,reminder_note,status,notes) VALUES ($1,COALESCE($2::date,CURRENT_DATE),COALESCE($3::time,CURRENT_TIME),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING *`, [invoice, body.date || null, body.time || null, req.session.userId, customerId, serviceId, body.description || null, body.flightDetails ? JSON.stringify(body.flightDetails) : null, sellingPrice, customerPaid, due, vendorId, vendorCost, vendorPaid, vendorDue, accountCost, accountCost > 0 ? accountCostPaymentMethod : null, grossProfit, body.reminderDate || null, body.reminderTime || null, body.reminderStatus || null, body.reminderNote || null, status, body.notes || null])).rows[0];

    if (accountCost > 0) {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [accountCostPaymentMethod]);
      const balance = await accountBalance(client, accountCostPaymentMethod);
      if (accountCost > balance) throw new Error('Insufficient balance for account-funded service cost');
      await addAccountEntry(client, accountCostPaymentMethod, -accountCost, 'service_cost', tx.id, req.session.userId!, body.notes || 'In-house service cost');
    }

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

app.patch('/api/expenses/:id', adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const expense = (await client.query('SELECT * FROM expenses WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!expense) throw new Error('Expense not found');
    if (expense.reversed_at) throw new Error('Reversed expense cannot be edited');

    const category = String(req.body?.category ?? expense.category).trim();
    const description = String(req.body?.description ?? expense.description).trim();
    const amount = Number(req.body?.amount ?? expense.amount);
    const method = String(req.body?.paymentMethod ?? expense.payment_method).toLowerCase();
    const note = req.body?.note === undefined ? expense.note : String(req.body.note || '').trim() || null;
    const date = String(req.body?.date || '').trim();
    const time = String(req.body?.time || '').trim();
    if (!category || !description || !Number.isFinite(amount) || amount <= 0) throw new Error('Valid category, description and positive amount are required');
    if (!ACCOUNT_METHODS.has(method)) throw new Error('Invalid payment method');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid expense date');
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid expense time');

    const oldAmount = Number(expense.amount);
    const oldMethod = String(expense.payment_method).toLowerCase();
    const oldBalance = await accountBalance(client, oldMethod);
    const oldEntry = (await client.query('SELECT id FROM account_entries WHERE expense_id=$1 AND reversed_at IS NULL ORDER BY id DESC LIMIT 1', [expense.id])).rows[0];
    if (oldEntry) await client.query('UPDATE account_entries SET reversed_at=now() WHERE id=$1', [oldEntry.id]);

    if (method === oldMethod) {
      const delta = amount - oldAmount;
      if (delta > 0) {
        const balanceAfterReversal = oldBalance + oldAmount;
        if (delta > balanceAfterReversal) throw new Error('Insufficient balance for updated expense');
      }
    } else {
      const newBalance = await accountBalance(client, method);
      if (amount > newBalance) throw new Error('Insufficient balance in selected account for updated expense');
    }

    const expenseUpdated = (await client.query(
      "UPDATE expenses SET category=$1, description=$2, amount=$3, payment_method=$4, note=$5, occurred_at=CASE WHEN $6 <> '' THEN $6::timestamp ELSE occurred_at END WHERE id=$7 RETURNING *",
      [category, description, amount, method, note, date && time ? date + ' ' + time : '', expense.id]
    )).rows[0];
    await addAccountEntry(client, method, -amount, 'expense', expense.id, req.session.userId!, description, undefined, expense.id);
    await audit(client, req.session.userId!, 'EXPENSE_UPDATED', 'Expense', expense.id, expense, expenseUpdated);
    await client.query('COMMIT');
    res.json({ expense: expenseUpdated });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Expense update failed' });
  } finally { client.release(); }
});

app.post('/api/expenses/:id/reverse', adminOnly, async (req, res) => {
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

app.post('/api/fund-transfers/:id/reverse', adminOnly, async (req, res) => {
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
app.use('/assets', express.static(fileURLToPath(new URL('../dist/assets', import.meta.url)), { immutable: true, maxAge: '1y' }));
app.use(express.static(distPath, { index: false, setHeaders: (res, filePath) => {
  if (filePath.endsWith('index.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
} }));
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile('index.html', { root: distPath });
});

const start = async () => {
  await initializeDatabase();
  await pool.query('SELECT 1');
  app.listen(port, () => console.log('SIAM AIR API listening on port ' + port));
};
start();

