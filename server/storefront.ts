import type { Express, Request, Response, NextFunction } from 'express';
import type { Pool } from 'pg';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

type Guard = (req: Request, res: Response, next: NextFunction) => void;
const hashPassword = (password: string) => scryptSync(password, 'siam-ecom-password-v1', 32).toString('hex');
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const normalizePhone = (value: unknown) => String(value || '').replace(/[^0-9+]/g, '').replace(/^00/, '+');
const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

const ensureEcommerceSchema = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecommerce_products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL DEFAULT 'product', sku text, name text NOT NULL,
      name_bn text, description text, description_bn text, category text, image_url text,
      price numeric(14,2) NOT NULL DEFAULT 0, compare_price numeric(14,2), stock integer,
      active boolean NOT NULL DEFAULT true, featured boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_products_sku ON ecommerce_products(sku) WHERE sku IS NOT NULL AND sku <> '';
    CREATE INDEX IF NOT EXISTS idx_ecommerce_products_active ON ecommerce_products(active, sort_order, name);

    CREATE TABLE IF NOT EXISTS ecommerce_customers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, phone text NOT NULL UNIQUE, email text UNIQUE,
      password_hash text NOT NULL, address text, city text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS ecommerce_customer_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES ecommerce_customers(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ecommerce_customer_sessions_token ON ecommerce_customer_sessions(token_hash);

    CREATE TABLE IF NOT EXISTS ecommerce_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number text NOT NULL UNIQUE, customer_id uuid REFERENCES ecommerce_customers(id) ON DELETE SET NULL,
      customer_name text NOT NULL, phone text NOT NULL, email text, address text, city text, items jsonb NOT NULL DEFAULT '[]'::jsonb,
      subtotal numeric(14,2) NOT NULL DEFAULT 0, delivery_fee numeric(14,2) NOT NULL DEFAULT 0, discount numeric(14,2) NOT NULL DEFAULT 0,
      total numeric(14,2) NOT NULL DEFAULT 0, payment_method text NOT NULL DEFAULT 'cod', payment_status text NOT NULL DEFAULT 'UNPAID',
      status text NOT NULL DEFAULT 'NEW', note text, source text NOT NULL DEFAULT 'ecommerce',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS order_number text;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS customer_id uuid;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS address text;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS city text;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS discount numeric(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS total numeric(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod';
    ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'UNPAID';
    UPDATE ecommerce_orders SET order_number = 'SA-' || to_char(created_at, 'YYMMDDHH24MISS') || '-' || substr(replace(id::text,'-',''),1,4) WHERE order_number IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_orders_order_number ON ecommerce_orders(order_number);

    CREATE TABLE IF NOT EXISTS ecommerce_settings (
      id integer PRIMARY KEY DEFAULT 1, value jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO ecommerce_settings(id,value) VALUES (1, '{"currency":"BDT","announcement":"Order online — fast service from SIAM AIR & DIGITAL SERVICE","heroTitle":"Everything you need, in one trusted store.","heroSubtitle":"Air tickets, visa services, digital solutions and selected products — order online.","primaryColor":"#0f766e","secondaryColor":"#dc2626","deliveryFee":80,"freeDeliveryMinimum":3000,"requireLoginForCheckout":true,"codEnabled":true,"bkashEnabled":true,"nagadEnabled":true,"bankEnabled":true,"whatsappEnabled":true,"smsEnabled":false,"smsNotificationPhone":""}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS ecommerce_notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
      channel text NOT NULL, recipient text, message text NOT NULL, status text NOT NULL DEFAULT 'PENDING', provider_id text, created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
};

const getSettings = async (pool: Pool) => {
  const { rows } = await pool.query('SELECT value FROM ecommerce_settings WHERE id=1');
  return (rows[0]?.value || {}) as Record<string, unknown>;
};
const issueCustomerToken = async (pool: Pool, customerId: string) => {
  const token = randomBytes(32).toString('hex');
  await pool.query("INSERT INTO ecommerce_customer_sessions(customer_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 days')", [customerId, hashToken(token)]);
  return token;
};
const requireCustomer = async (pool: Pool, req: Request, res: Response) => {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) { res.status(401).json({ error: 'Customer sign-in required' }); return null; }
  const { rows } = await pool.query("SELECT c.* FROM ecommerce_customer_sessions s JOIN ecommerce_customers c ON c.id=s.customer_id WHERE s.token_hash=$1 AND s.expires_at>now()", [hashToken(token)]);
  if (!rows[0]) { res.status(401).json({ error: 'Customer session expired. Please sign in again.' }); return null; }
  return rows[0];
};
const sendSms = async (to: string, body: string) => {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim(), authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim(), from = String(process.env.TWILIO_NUMBER || '').trim();
  if (!accountSid || !authToken || !from || !to) return { sent: false, reason: 'SMS provider not configured' };
  const params = new URLSearchParams({ Body: body, From: from, To: to });
  const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(accountSid) + '/Messages.json', {
    method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString()
  });
  if (!response.ok) return { sent: false, reason: (await response.text()).slice(0,300) };
  const payload = await response.json() as { sid?: string };
  return { sent: true, sid: payload.sid || '' };
};
const logSms = async (pool: Pool, order: any, recipient: string, message: string, result: {sent:boolean;sid?:string}) => {
  await pool.query('INSERT INTO ecommerce_notifications(order_id,channel,recipient,message,status,provider_id) VALUES($1,$2,$3,$4,$5,$6)', [order.id,'sms',recipient,message,result.sent?'SENT':'FAILED',result.sent?result.sid:null]);
};
const notifyOrder = async (pool: Pool, order: any) => {
  const s = await getSettings(pool); if (s.smsEnabled !== true) return;
  const to = normalizePhone(s.smsNotificationPhone); if (!to) return;
  const msg = 'SIAM AIR NEW ORDER ' + order.order_number + ' | ' + order.customer_name + ' | ' + order.phone + ' | ৳' + Number(order.total||0).toFixed(0) + ' | ' + order.status;
  await logSms(pool, order, to, msg, await sendSms(to,msg));
};
const notifyCustomer = async (pool: Pool, order: any) => {
  const s = await getSettings(pool); if (s.smsEnabled !== true || !order.phone) return;
  const to = normalizePhone(order.phone), msg = 'SIAM AIR order ' + order.order_number + ' status: ' + order.status + '. Thank you for choosing SIAM AIR & DIGITAL SERVICE.';
  await logSms(pool, order, to, msg, await sendSms(to,msg));
};
const nextOrderNumber = async (pool: Pool) => {
  for (let i=0;i<5;i++) {
    const candidate='SA-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+randomBytes(3).toString('hex').toUpperCase();
    const {rows}=await pool.query('SELECT 1 FROM ecommerce_orders WHERE order_number=$1',[candidate]); if(!rows[0]) return candidate;
  }
  return 'SA-'+Date.now();
};

export const registerStorefrontRoutes = (app: Express, pool: Pool, auth: Guard, adminOnly: Guard) => {
  app.use('/api/storefront', (_req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    if(_req.method==='OPTIONS') return res.sendStatus(204); next();
  });
  app.use(['/api/storefront','/api/ecommerce'], async (_req,_res,next)=>{ try { await ensureEcommerceSchema(pool); next(); } catch(e){ next(e); } });

  app.get('/api/storefront', async (_req,res)=>{
    try {
      const [settingsResult,servicesResult,productsResult,ecomSettings]=await Promise.all([
        pool.query('SELECT value FROM app_settings WHERE key=$1',['business_settings']),
        pool.query('SELECT id,name,category,enabled,sort_order FROM services WHERE enabled=true ORDER BY sort_order,name'),
        pool.query('SELECT * FROM ecommerce_products WHERE active=true ORDER BY featured DESC,sort_order,name'),
        getSettings(pool)
      ]);
      const value=settingsResult.rows[0]?.value&&typeof settingsResult.rows[0].value==='object'?settingsResult.rows[0].value as Record<string,unknown>:{};
      res.json({settings:{name:value.name||'SIAM AIR & DIGITAL SERVICE',tagline:value.tagline||'',logoUrl:value.logoUrl||'',address:value.address||'',mobile:value.mobile||'',whatsapp:value.whatsapp||'',email:value.email||'',website:value.website||''},services:servicesResult.rows,products:productsResult.rows,ecommerce:ecomSettings});
    } catch(e){res.status(503).json({error:e instanceof Error?e.message:'Unable to load storefront data'});}
  });
  app.get('/api/storefront/products',async(_req,res)=>{const{rows}=await pool.query('SELECT * FROM ecommerce_products WHERE active=true ORDER BY featured DESC,sort_order,name');res.json(rows);});

  app.post('/api/storefront/register',async(req,res)=>{
    const name=String(req.body?.name||'').trim(),phone=normalizePhone(req.body?.phone),email=normalizeEmail(req.body?.email),password=String(req.body?.password||'');
    if(!name||!phone||password.length<6)return res.status(400).json({error:'Name, phone and a password of at least 6 characters are required.'});
    try{
      const{rows}=await pool.query('INSERT INTO ecommerce_customers(name,phone,email,password_hash,address,city) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,phone,email,address,city,created_at',[name,phone,email||null,hashPassword(password),req.body?.address||null,req.body?.city||null]);
      res.status(201).json({customer:rows[0],token:await issueCustomerToken(pool,rows[0].id)});
    }catch(e){const m=String(e instanceof Error?e.message:e);res.status(m.includes('duplicate')?409:400).json({error:m.includes('duplicate')?'Phone or email is already registered.':'Registration failed'});}
  });
  app.post('/api/storefront/login',async(req,res)=>{
    const identifier=String(req.body?.identifier||'').trim(),password=String(req.body?.password||''),phone=normalizePhone(identifier),email=normalizeEmail(identifier);
    const{rows}=await pool.query('SELECT * FROM ecommerce_customers WHERE phone=$1 OR email=$2 LIMIT 1',[phone,email]);const c=rows[0];
    if(!c)return res.status(401).json({error:'Invalid phone/email or password'});
    const a=Buffer.from(String(c.password_hash),'hex'),b=Buffer.from(hashPassword(password),'hex');
    if(a.length!==b.length||!timingSafeEqual(a,b))return res.status(401).json({error:'Invalid phone/email or password'});
    res.json({customer:{id:c.id,name:c.name,phone:c.phone,email:c.email,address:c.address,city:c.city},token:await issueCustomerToken(pool,c.id)});
  });
  app.get('/api/storefront/me',async(req,res)=>{const c=await requireCustomer(pool,req,res);if(!c)return;res.json({customer:{id:c.id,name:c.name,phone:c.phone,email:c.email,address:c.address,city:c.city}});});
  app.patch('/api/storefront/me',async(req,res)=>{const c=await requireCustomer(pool,req,res);if(!c)return;const{rows}=await pool.query('UPDATE ecommerce_customers SET name=$1,email=$2,address=$3,city=$4,updated_at=now() WHERE id=$5 RETURNING id,name,phone,email,address,city',[String(req.body?.name||c.name).trim(),normalizeEmail(req.body?.email)||null,req.body?.address||null,req.body?.city||null,c.id]);res.json({customer:rows[0]});});
  app.get('/api/storefront/my-orders',async(req,res)=>{const c=await requireCustomer(pool,req,res);if(!c)return;const{rows}=await pool.query('SELECT * FROM ecommerce_orders WHERE customer_id=$1 ORDER BY created_at DESC',[c.id]);res.json(rows);});

  app.post('/api/storefront/orders',async(req,res)=>{
    const c=await requireCustomer(pool,req,res);if(!c)return;
    const client=await pool.connect();
    try{
      await client.query('BEGIN'); const rawItems=Array.isArray(req.body?.items)?req.body.items:[]; if(!rawItems.length){await client.query('ROLLBACK');return res.status(400).json({error:'Cart is empty'});}
      const itemRows:any[]=[]; let subtotal=0;
      for(const raw of rawItems){
        const id=String(raw.productId||''),qty=Math.max(1,Math.floor(Number(raw.quantity||1)));
        const{rows}=await client.query('SELECT * FROM ecommerce_products WHERE id=$1 AND active=true FOR UPDATE',[id]);const p=rows[0];
        if(!p){await client.query('ROLLBACK');return res.status(400).json({error:'One of the items is no longer available.'});}
        if(p.kind==='product'&&p.stock!==null&&Number(p.stock)<qty){await client.query('ROLLBACK');return res.status(409).json({error:p.name+' has only '+p.stock+' in stock.'});}
        const line=Number(p.price)*qty;subtotal+=line;itemRows.push({productId:p.id,name:p.name,kind:p.kind,sku:p.sku,price:Number(p.price),quantity:qty,total:line,imageUrl:p.image_url||''});
        if(p.kind==='product'&&p.stock!==null)await client.query('UPDATE ecommerce_products SET stock=stock-$1,updated_at=now() WHERE id=$2',[qty,p.id]);
      }
      const s=await getSettings(pool),delivery=subtotal>=Number(s.freeDeliveryMinimum||0)?0:Number(s.deliveryFee||0),discount=Math.max(0,Number(req.body?.discount||0)),total=Math.max(0,subtotal+delivery-discount),orderNumber=await nextOrderNumber(pool);
      const{rows}=await client.query('INSERT INTO ecommerce_orders(order_number,customer_id,customer_name,phone,email,address,city,items,subtotal,delivery_fee,discount,total,payment_method,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',[orderNumber,c.id,c.name,c.phone,c.email,req.body?.address||c.address||null,req.body?.city||c.city||null,JSON.stringify(itemRows),subtotal,delivery,discount,total,String(req.body?.paymentMethod||'cod'),req.body?.note||null]);
      await client.query('COMMIT'); void notifyOrder(pool,rows[0]).catch(console.error); res.status(201).json({order:rows[0]});
    }catch(e){try{await client.query('ROLLBACK')}catch{}res.status(400).json({error:e instanceof Error?e.message:'Order creation failed'});}finally{client.release();}
  });

  app.get('/api/storefront/orders',adminOnly,async(_req,res)=>{const{rows}=await pool.query('SELECT * FROM ecommerce_orders ORDER BY created_at DESC');res.json(rows);});
  app.patch('/api/storefront/orders/:id',adminOnly,async(req,res)=>{
    const allowed=['NEW','CONFIRMED','PROCESSING','READY','SHIPPED','DELIVERED','COMPLETED','CANCELLED'],status=String(req.body?.status||'').toUpperCase();if(!allowed.includes(status))return res.status(400).json({error:'Invalid order status'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');const current=await client.query('SELECT * FROM ecommerce_orders WHERE id=$1 FOR UPDATE',[req.params.id]);if(!current.rows[0]){await client.query('ROLLBACK');return res.status(404).json({error:'Order not found'});}
      const old=current.rows[0];if(status==='CANCELLED'&&old.status!=='CANCELLED'){for(const item of(Array.isArray(old.items)?old.items:[])){if(item.kind==='product'&&item.productId)await client.query('UPDATE ecommerce_products SET stock=CASE WHEN stock IS NULL THEN NULL ELSE stock+$1 END,updated_at=now() WHERE id=$2',[Number(item.quantity||0),item.productId]);}}
      const{rows}=await client.query('UPDATE ecommerce_orders SET status=$1,updated_at=now() WHERE id=$2 RETURNING *',[status,req.params.id]);await client.query('COMMIT');void notifyCustomer(pool,rows[0]).catch(console.error);res.json({order:rows[0]});
    }catch(e){try{await client.query('ROLLBACK')}catch{}res.status(400).json({error:e instanceof Error?e.message:'Order update failed'});}finally{client.release();}
  });

  app.get('/api/ecommerce/products',adminOnly,async(_req,res)=>{const{rows}=await pool.query('SELECT * FROM ecommerce_products ORDER BY sort_order,name');res.json(rows);});
  app.post('/api/ecommerce/products',adminOnly,async(req,res)=>{
    const{rows}=await pool.query('INSERT INTO ecommerce_products(kind,sku,name,name_bn,description,description_bn,category,image_url,price,compare_price,stock,active,featured,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',['service',req.body?.sku||null,String(req.body?.name||'').trim(),req.body?.nameBn||null,req.body?.description||null,req.body?.descriptionBn||null,req.body?.category||null,req.body?.imageUrl||null,Number(req.body?.price||0),req.body?.comparePrice===''?null:Number(req.body?.comparePrice||0),req.body?.stock===''||req.body?.stock===null||req.body?.stock===undefined?null:Math.max(0,Math.floor(Number(req.body.stock))),req.body?.active!==false,req.body?.featured===true,Number(req.body?.sortOrder||0)]);res.status(201).json({product:rows[0]});
  });
  app.patch('/api/ecommerce/products/:id',adminOnly,async(req,res)=>{
    const{rows}=await pool.query('UPDATE ecommerce_products SET kind=COALESCE($1,kind),sku=COALESCE($2,sku),name=COALESCE($3,name),name_bn=COALESCE($4,name_bn),description=COALESCE($5,description),description_bn=COALESCE($6,description_bn),category=COALESCE($7,category),image_url=COALESCE($8,image_url),price=COALESCE($9,price),compare_price=$10,stock=$11,active=COALESCE($12,active),featured=COALESCE($13,featured),sort_order=COALESCE($14,sort_order),updated_at=now() WHERE id=$15 RETURNING *',[req.body?.kind??null,req.body?.sku??null,req.body?.name??null,req.body?.nameBn??null,req.body?.description??null,req.body?.descriptionBn??null,req.body?.category??null,req.body?.imageUrl??null,req.body?.price===undefined?null:Number(req.body.price),req.body?.comparePrice===''?null:req.body?.comparePrice===undefined?null:Number(req.body.comparePrice),req.body?.stock===''||req.body?.stock===undefined?null:Math.max(0,Math.floor(Number(req.body.stock))),req.body?.active===undefined?null:Boolean(req.body.active),req.body?.featured===undefined?null:Boolean(req.body.featured),req.body?.sortOrder===undefined?null:Number(req.body.sortOrder),req.params.id]);if(!rows[0])return res.status(404).json({error:'Product not found'});res.json({product:rows[0]});
  });
  app.delete('/api/ecommerce/products/:id',adminOnly,async(req,res)=>{await pool.query('DELETE FROM ecommerce_products WHERE id=$1',[req.params.id]);res.json({ok:true});});
  app.get('/api/ecommerce/settings',adminOnly,async(_req,res)=>res.json({settings:await getSettings(pool)}));
  app.patch('/api/ecommerce/settings',adminOnly,async(req,res)=>{const next={...(await getSettings(pool)),...(req.body||{})};await pool.query('UPDATE ecommerce_settings SET value=$1,updated_at=now() WHERE id=1',[JSON.stringify(next)]);res.json({settings:next});});
  app.get('/api/ecommerce/notifications',adminOnly,async(_req,res)=>{const{rows}=await pool.query('SELECT * FROM ecommerce_notifications ORDER BY created_at DESC LIMIT 200');res.json(rows);});
};
