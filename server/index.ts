import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { Pool, PoolClient } from 'pg';

const app = express();
const port = Number(process.env.PORT || 4000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
const PgSession = connectPgSimple(session);

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'CHANGE_ME',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 }
}));

const audit = async (client: PoolClient, userId: string | null, action: string, recordType: string, recordId: string, previousValue?: unknown, newValue?: unknown) => {
  await client.query(
    'INSERT INTO audit_logs (user_id, action, record_type, record_id, previous_value, new_value) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, action, recordType, recordId, previousValue ? JSON.stringify(previousValue) : null, newValue ? JSON.stringify(newValue) : null]
  );
};

const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  next();
};

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'siam-air-api', database: 'connected', timezone: process.env.TZ || 'Asia/Dhaka' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
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

app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const { rows } = await pool.query('SELECT id, username, full_name, role, permissions, is_active FROM users WHERE id=$1', [req.session.userId]);
  if (!rows[0]?.is_active) return res.status(401).json({ error: 'Account inactive' });
  res.json({ user: { id: rows[0].id, username: rows[0].username, fullName: rows[0].full_name, role: rows[0].role, permissions: rows[0].permissions } });
});

app.get('/api/dashboard', auth, async (_req, res) => {
  const [sales, expenses, customerDue, vendorDue] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(selling_price),0) total_sales, COALESCE(SUM(customer_paid),0) total_received, COALESCE(SUM(gross_profit),0) gross_profit FROM transactions WHERE status <> $1', ['CANCELLED']),
    pool.query('SELECT COALESCE(SUM(amount),0) total_expense FROM expenses WHERE reversed_at IS NULL'),
    pool.query('SELECT COALESCE(SUM(opening_due),0) opening_due FROM customers'),
    pool.query('SELECT COALESCE(SUM(opening_payable),0) opening_payable FROM vendors')
  ]);
  res.json({
    sales: sales.rows[0],
    expenses: expenses.rows[0],
    customerReceivableOpening: customerDue.rows[0].opening_due,
    vendorPayableOpening: vendorDue.rows[0].opening_payable
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

app.get('/api/vendors', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(
    q ? 'SELECT * FROM vendors WHERE name ILIKE $1 ORDER BY name LIMIT 30' : 'SELECT * FROM vendors ORDER BY name LIMIT 100',
    q ? [q + '%'] : []
  );
  res.json(rows);
});

app.get('/api/transactions', auth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const { rows } = await pool.query(
    'SELECT t.*, c.name customer_name, c.mobile customer_mobile, s.name service_name, v.name vendor_name FROM transactions t JOIN customers c ON c.id=t.customer_id LEFT JOIN services s ON s.id=t.service_id LEFT JOIN vendors v ON v.id=t.vendor_id ORDER BY t.date DESC, t.time DESC LIMIT $1',
    [limit]
  );
  res.json(rows);
});

app.post('/api/transactions/:id/payments', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, paymentType, paymentMethod, note, reference } = req.body ?? {};
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Payment amount must be positive' });
    if (!['customer','vendor'].includes(paymentType)) return res.status(400).json({ error: 'Invalid payment type' });
    await client.query('BEGIN');
    const tx = (await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
    if (!tx) throw new Error('Transaction not found');
    const outstanding = paymentType === 'customer' ? Number(tx.customer_due) : Number(tx.vendor_due);
    if (value > outstanding) return res.status(400).json({ error: 'Payment exceeds outstanding due', outstanding });
    const entityId = paymentType === 'customer' ? tx.customer_id : tx.vendor_id;
    if (!entityId) return res.status(400).json({ error: 'No entity linked to this payment' });
    await client.query(
      'INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [tx.id, paymentType, entityId, value, paymentMethod, req.session.userId, note || null, reference || null]
    );
    if (paymentType === 'customer') {
      const due = outstanding - value;
      await client.query('UPDATE transactions SET customer_paid=customer_paid+$1, customer_due=$2, status=$3, updated_at=now() WHERE id=$4', [value, due, due === 0 ? 'PAID' : 'PARTIAL', tx.id]);
    } else {
      const due = outstanding - value;
      await client.query('UPDATE transactions SET vendor_paid=vendor_paid+$1, vendor_due=$2, updated_at=now() WHERE id=$3', [value, due, tx.id]);
    }
    await audit(client, req.session.userId!, 'PAYMENT_RECEIVED', 'Transaction', tx.id, tx, { paymentType, amount: value, paymentMethod });
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Payment failed' });
  } finally { client.release(); }
});

const start = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.');
  }
  app.listen(port, () => console.log('SIAM AIR API listening on port ' + port));
};
start();
