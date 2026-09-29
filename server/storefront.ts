import type { Express, Request, Response, NextFunction } from 'express';
import type { Pool } from 'pg';

type Guard = (req: Request, res: Response, next: NextFunction) => void;

export const registerStorefrontRoutes = (app: Express, pool: Pool, auth: Guard, adminOnly: Guard) => {
  app.use('/api/storefront', (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/storefront', async (_req, res) => {
    try {
      const [settingsResult, servicesResult] = await Promise.all([
        pool.query('SELECT value FROM app_settings WHERE key=$1', ['business_settings']),
        pool.query('SELECT id,name,category,enabled,sort_order FROM services WHERE enabled=true ORDER BY sort_order,name'),
      ]);
      const value = settingsResult.rows[0]?.value && typeof settingsResult.rows[0].value === 'object'
        ? settingsResult.rows[0].value as Record<string, unknown>
        : {};
      res.json({
        settings: {
          name: value.name || 'SIAM AIR & DIGITAL SERVICE',
          tagline: value.tagline || '',
          logoUrl: value.logoUrl || '',
          address: value.address || '',
          mobile: value.mobile || '',
          whatsapp: value.whatsapp || '',
          email: value.email || '',
          website: value.website || '',
        },
        services: servicesResult.rows,
      });
    } catch (e) {
      res.status(503).json({ error: e instanceof Error ? e.message : 'Unable to load storefront data' });
    }
  });

  app.post('/api/storefront/orders', async (req, res) => {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS ecommerce_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name text NOT NULL,
        phone text NOT NULL,
        email text,
        service text,
        amount numeric(14,2) NOT NULL DEFAULT 0,
        note text,
        status text NOT NULL DEFAULT 'NEW',
        source text NOT NULL DEFAULT 'ecommerce',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      const customerName = String(req.body?.customerName || '').trim();
      const phone = String(req.body?.phone || '').trim();
      if (!customerName || !phone) return res.status(400).json({ error: 'Customer name and phone are required' });
      const { rows } = await pool.query(
        'INSERT INTO ecommerce_orders (customer_name,phone,email,service,amount,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [customerName, phone, req.body?.email || null, req.body?.service || null, Number(req.body?.amount || 0), req.body?.note || null]
      );
      res.status(201).json({ order: rows[0] });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Order creation failed' });
    }
  });

  app.get('/api/storefront/orders', adminOnly, async (_req, res) => {
    await pool.query(`CREATE TABLE IF NOT EXISTS ecommerce_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name text NOT NULL,
      phone text NOT NULL,
      email text,
      service text,
      amount numeric(14,2) NOT NULL DEFAULT 0,
      note text,
      status text NOT NULL DEFAULT 'NEW',
      source text NOT NULL DEFAULT 'ecommerce',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await pool.query('SELECT * FROM ecommerce_orders ORDER BY created_at DESC');
    res.json(rows);
  });

  app.patch('/api/storefront/orders/:id', adminOnly, async (req, res) => {
    const allowed = ['NEW','CONFIRMED','PROCESSING','READY','DELIVERED','COMPLETED','CANCELLED'];
    const status = String(req.body?.status || '').toUpperCase();
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid order status' });
    const { rows } = await pool.query(
      'UPDATE ecommerce_orders SET status=$1, updated_at=now() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: rows[0] });
  });
};
