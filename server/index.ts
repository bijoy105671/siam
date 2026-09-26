import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { Pool, PoolClient } from 'pg';

const app = express();
const port = Number(process.env.PORT || 4000);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be set and at least 32 characters');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: '-c timezone=Asia/Dhaka', ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
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
  const [sales, expenses, customerDue, vendorDue, todaySales, todayPayments, todayVendorPayments, todayExpenses] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(selling_price),0) total_sales,
                       COALESCE(SUM(customer_paid),0) total_received,
                       COALESCE(SUM(CASE WHEN gross_profit > 0 THEN gross_profit ELSE 0 END),0) gross_profit,
                       COALESCE(SUM(CASE WHEN gross_profit < 0 THEN ABS(gross_profit) ELSE 0 END),0) loss
                FROM transactions WHERE status <> $1`, ['CANCELLED']),
    pool.query('SELECT COALESCE(SUM(amount),0) total_expense FROM expenses WHERE reversed_at IS NULL'),
    pool.query('SELECT COALESCE(SUM(customer_due),0) + COALESCE((SELECT SUM(opening_due) FROM customers),0) customer_receivable FROM transactions WHERE status <> $1', ['CANCELLED']),
    pool.query('SELECT COALESCE(SUM(vendor_due),0) + COALESCE((SELECT SUM(opening_payable) FROM vendors),0) vendor_payable FROM transactions WHERE status <> $1', ['CANCELLED']),
    pool.query(`SELECT COALESCE(SUM(selling_price),0) total_sales,
                       COALESCE(SUM(CASE WHEN gross_profit > 0 THEN gross_profit ELSE 0 END),0) gross_profit,
                       COALESCE(SUM(CASE WHEN gross_profit < 0 THEN ABS(gross_profit) ELSE 0 END),0) loss
                FROM transactions WHERE status <> $1 AND date = CURRENT_DATE`, ['CANCELLED']),
    pool.query("SELECT COALESCE(SUM(amount),0) total_received FROM payments WHERE payment_type='customer' AND paid_at::date = CURRENT_DATE"),
    pool.query("SELECT COALESCE(SUM(amount),0) total_vendor_payment FROM payments WHERE payment_type='vendor' AND paid_at::date = CURRENT_DATE"),
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
  const transactions = (await pool.query('SELECT * FROM transactions WHERE customer_id=$1 ORDER BY date DESC, time DESC, created_at DESC', [customerId])).rows;
  const payments = (await pool.query("SELECT * FROM payments WHERE entity_id=$1 AND payment_type='customer' ORDER BY paid_at DESC", [customerId])).rows;
  const totalSales = transactions.filter((t:any) => t.status !== 'CANCELLED').reduce((s:number,t:any)=>s+Number(t.selling_price),0);
  const totalPaid = payments.reduce((s:number,p:any)=>s+Number(p.amount),0);
  res.json({ customer, totalSales, totalPaid, currentDue: Number(customer.opening_due || 0) + totalSales - totalPaid, transactions, payments });
});

app.get('/api/vendors', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(q ? 'SELECT * FROM vendors WHERE name ILIKE $1 ORDER BY name LIMIT 30' : 'SELECT * FROM vendors ORDER BY name LIMIT 100', q ? [q + '%'] : []);
  res.json(rows);
});

app.get('/api/vendors/:id/ledger', auth, async (req, res) => {
  const vendorId = req.params.id;
  const vendor = (await pool.query('SELECT * FROM vendors WHERE id=$1', [vendorId])).rows[0];
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const transactions = (await pool.query('SELECT * FROM transactions WHERE vendor_id=$1 ORDER BY date DESC, time DESC, created_at DESC', [vendorId])).rows;
  const payments = (await pool.query("SELECT * FROM payments WHERE entity_id=$1 AND payment_type='vendor' ORDER BY paid_at DESC", [vendorId])).rows;
  const totalCost = transactions.filter((t:any) => t.status !== 'CANCELLED').reduce((s:number,t:any)=>s+Number(t.vendor_cost),0);
  const totalPaid = payments.reduce((s:number,p:any)=>s+Number(p.amount),0);
  res.json({ vendor, totalCost, totalPaid, currentPayable: Number(vendor.opening_payable || 0) + totalCost - totalPaid, transactions, payments });
});

app.get('/api/transactions', auth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const { rows } = await pool.query('SELECT t.*, c.name customer_name, c.mobile customer_mobile, s.name service_name, v.name vendor_name FROM transactions t JOIN customers c ON c.id=t.customer_id LEFT JOIN services s ON s.id=t.service_id LEFT JOIN vendors v ON v.id=t.vendor_id ORDER BY t.date DESC, t.time DESC LIMIT $1', [limit]);
  res.json(rows);
});

const ACCOUNT_METHODS = new Set(['cash','bkash','nagad','rocket','bank','card','other']);

const accountBalance = async (client: Pool | PoolClient, account: string) => {
  const opening = await client.query('SELECT amount FROM account_opening_balances WHERE lower(account_name)=lower($1)', [account]);
  const entries = await client.query('SELECT COALESCE(SUM(amount),0) balance FROM account_entries WHERE lower(account_name)=lower($1) AND reversed_at IS NULL', [account]);
  return Number(opening.rows[0]?.amount || 0) + Number(entries.rows[0]?.balance || 0);
};

const addAccountEntry = async (client: PoolClient, account: string, amount: number, sourceType: string, sourceId: string, userId: string, note?: string) => {
  if (!ACCOUNT_METHODS.has(account.toLowerCase())) throw new Error('Invalid payment account');
  await client.query('INSERT INTO account_entries (account_name,amount,source_type,source_id,created_by,note) VALUES ($1,$2,$3,$4,$5,$6)', [account.toLowerCase(), amount, sourceType, sourceId, userId, note || null]);
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
    await client.query('INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [tx.id, paymentType, entityId, value, method, req.session.userId, note || null, reference || null]);
    if (paymentType === 'customer') {
      const due = outstanding - value;
      await client.query('UPDATE transactions SET customer_paid=customer_paid+$1, customer_due=$2, status=$3, updated_at=now() WHERE id=$4', [value, due, due === 0 ? 'PAID' : 'PARTIAL', tx.id]);
      await addAccountEntry(client, method, value, 'customer_payment', tx.id, req.session.userId!, note);
    } else {
      const due = outstanding - value;
      await client.query('UPDATE transactions SET vendor_paid=vendor_paid+$1, vendor_due=$2, updated_at=now() WHERE id=$3', [value, due, tx.id]);
      await addAccountEntry(client, method, -value, 'vendor_payment', tx.id, req.session.userId!, note);
    }
    await audit(client, req.session.userId!, 'PAYMENT_RECORDED', 'Transaction', tx.id, tx, { paymentType, amount: value, paymentMethod: method });
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e instanceof Error ? e.message : 'Payment failed' });
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
      await client.query('INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,\'customer\',$2,$3,$4,$5,$6,$7)', [tx.id, customerId, customerPaid, customerPaymentMethod, req.session.userId, body.paymentNote || null, body.paymentReference || null]);
      await addAccountEntry(client, customerPaymentMethod, customerPaid, 'customer_payment', tx.id, req.session.userId!, body.paymentNote);
    }

    if (vendorPaid > 0) {
      if (!vendorId) throw new Error('Vendor is required when vendor payment is entered');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [vendorPaymentMethod]);
      const balance = await accountBalance(client, vendorPaymentMethod);
      if (vendorPaid > balance) throw new Error('Insufficient balance for vendor payment');
      await client.query('INSERT INTO payments (transaction_id,payment_type,entity_id,amount,payment_method,recorded_by,note,reference) VALUES ($1,\'vendor\',$2,$3,$4,$5,$6,$7)', [tx.id, vendorId, vendorPaid, vendorPaymentMethod, req.session.userId, body.vendorPaymentNote || null, body.vendorPaymentReference || null]);
      await addAccountEntry(client, vendorPaymentMethod, -vendorPaid, 'vendor_payment', tx.id, req.session.userId!, body.vendorPaymentNote);
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
    await addAccountEntry(client, method, -amount, 'expense', expense.id, req.session.userId!, description);
    await audit(client, req.session.userId!, 'EXPENSE_CREATED', 'Expense', expense.id, null, expense);
    await client.query('COMMIT'); res.status(201).json({ expense });
  } catch (e) { await client.query('ROLLBACK'); res.status(400).json({ error: e instanceof Error ? e.message : 'Expense failed' }); }
  finally { client.release(); }
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
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [from]);
    const balance = await accountBalance(client, from);
    if (amount > balance) throw new Error('Insufficient balance for fund transfer');
    const transfer = (await client.query('INSERT INTO fund_transfers (from_account,to_account,amount,reason,created_by,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',[from,to,amount,reason,req.session.userId,req.body?.note || null])).rows[0];
    await addAccountEntry(client, from, -amount, 'fund_transfer_out', transfer.id, req.session.userId!, reason);
    await addAccountEntry(client, to, amount, 'fund_transfer_in', transfer.id, req.session.userId!, reason);
    await audit(client, req.session.userId!, 'FUND_TRANSFER_CREATED', 'FundTransfer', transfer.id, null, transfer);
    await client.query('COMMIT'); res.status(201).json({ transfer });
  } catch (e) { await client.query('ROLLBACK'); res.status(400).json({ error: e instanceof Error ? e.message : 'Fund transfer failed' }); }
  finally { client.release(); }
});

app.get('/api/accounts/:account/ledger', auth, async (req, res) => {
  const account = String(req.params.account || '').toLowerCase();
  if (!ACCOUNT_METHODS.has(account)) return res.status(400).json({ error: 'Invalid account' });
  const { rows } = await pool.query('SELECT id,amount,source_type,source_id,occurred_at,note FROM account_entries WHERE lower(account_name)=lower($1) AND reversed_at IS NULL ORDER BY occurred_at DESC LIMIT 500',[account]);
  res.json({ account, rows });
});

const start = async () => {
  await pool.query('SELECT 1');
  app.listen(port, () => console.log('SIAM AIR API listening on port ' + port));
};
start();
