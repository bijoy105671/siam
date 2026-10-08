CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  phone text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  login_locked_until timestamptz,
  otp_resend_count integer NOT NULL DEFAULT 0,
  otp_resend_locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL,
  whatsapp text,
  email text,
  address text,
  nid text,
  passport_number text,
  passport_expiry date,
  photo text,
  notes text,
  opening_due numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mobile)
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  mobile text,
  whatsapp text,
  email text,
  address text,
  account_info text,
  opening_payable numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  date date NOT NULL,
  time time NOT NULL,
  created_by uuid REFERENCES users(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  service_id uuid REFERENCES services(id),
  description text,
  flight_details jsonb,
  selling_price numeric(14,2) NOT NULL DEFAULT 0,
  customer_paid numeric(14,2) NOT NULL DEFAULT 0,
  customer_due numeric(14,2) NOT NULL DEFAULT 0,
  vendor_id uuid REFERENCES vendors(id),
  vendor_cost numeric(14,2) NOT NULL DEFAULT 0,
  vendor_paid numeric(14,2) NOT NULL DEFAULT 0,
  vendor_due numeric(14,2) NOT NULL DEFAULT 0,
  account_cost numeric(14,2) NOT NULL DEFAULT 0,
  account_cost_payment_method text,
  gross_profit numeric(14,2) NOT NULL DEFAULT 0,
  reminder_date date,
  reminder_time time,
  reminder_status text,
  reminder_note text,
  status text NOT NULL DEFAULT 'DUE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id)
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_cost numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_cost_payment_method text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id),
  payment_type text NOT NULL CHECK (payment_type IN ('customer','vendor')),
  entity_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES users(id),
  note text,
  reference text,
  reversed_at timestamptz,
  reversed_by uuid REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  note text,
  reversed_at timestamptz
);

CREATE TABLE IF NOT EXISTS fund_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account text NOT NULL,
  to_account text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  note text,
  created_by uuid REFERENCES users(id),
  reversed_at timestamptz
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  record_type text NOT NULL,
  record_id text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_opening_balances (
  account_name text PRIMARY KEY,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1001;
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES users(id);
ALTER TABLE fund_transfers ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_payments_entity ON payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS account_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  amount numeric(14,2) NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  note text,
  reversed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_account_entries_account ON account_entries(account_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_account_entries_source ON account_entries(source_type, source_id);
ALTER TABLE account_entries ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES payments(id);
ALTER TABLE account_entries ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES expenses(id);
ALTER TABLE account_entries ADD COLUMN IF NOT EXISTS fund_transfer_id uuid REFERENCES fund_transfers(id);
CREATE INDEX IF NOT EXISTS idx_account_entries_payment ON account_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_account_entries_expense ON account_entries(expense_id);
CREATE INDEX IF NOT EXISTS idx_account_entries_fund_transfer ON account_entries(fund_transfer_id);


CREATE TABLE IF NOT EXISTS loan_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type text NOT NULL CHECK (party_type IN ('customer','vendor')),
  party_id uuid NOT NULL,
  party_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('advance','loan')),
  direction text NOT NULL CHECK (direction IN ('received','given')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  note text,
  reference text,
  created_by uuid REFERENCES users(id),
  reversed_at timestamptz,
  reversed_by uuid REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_loan_advances_party ON loan_advances(party_type, party_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_loan_advances_active ON loan_advances(reversed_at, occurred_at);

CREATE TABLE IF NOT EXISTS loan_advance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_advance_id uuid NOT NULL REFERENCES loan_advances(id),
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  party_type text NOT NULL CHECK (party_type IN ('customer','vendor')),
  party_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_by uuid REFERENCES users(id),
  reversed_at timestamptz,
  reversed_by uuid REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_loan_adjustments_loan ON loan_advance_adjustments(loan_advance_id, reversed_at);
CREATE INDEX IF NOT EXISTS idx_loan_adjustments_tx ON loan_advance_adjustments(transaction_id, reversed_at);

-- Backfill account-funded service costs already recorded in account_entries.
UPDATE transactions t
SET account_cost = x.account_cost,
    account_cost_payment_method = x.account_cost_payment_method,
    gross_profit = t.selling_price - t.vendor_cost - x.account_cost
FROM (
  SELECT source_id,
         GREATEST(0, -COALESCE(SUM(amount),0)) AS account_cost,
         (ARRAY_AGG(account_name ORDER BY occurred_at DESC))[1] AS account_cost_payment_method
  FROM account_entries
  WHERE source_type='service_cost' AND reversed_at IS NULL
  GROUP BY source_id
) x
WHERE t.id::text=x.source_id AND COALESCE(t.account_cost,0)=0;


CREATE TABLE IF NOT EXISTS appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_mobile text,
  customer_email text,
  title text NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_date ON appointment_reminders(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_transaction ON appointment_reminders(transaction_id);


CREATE TABLE IF NOT EXISTS flight_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_no text NOT NULL,
  airline text,
  airline_code text,
  from_airport text NOT NULL,
  from_name text,
  to_airport text NOT NULL,
  to_name text,
  departure_time text,
  arrival_time text,
  duration text,
  aircraft text,
  terminal text,
  booking_class text,
  baggage text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flight_no, from_airport, to_airport)
);
CREATE INDEX IF NOT EXISTS idx_flight_directory_flight_no ON flight_directory(flight_no);
CREATE INDEX IF NOT EXISTS idx_flight_directory_route ON flight_directory(from_airport, to_airport);


-- SIAM SAAS MULTI-TENANT FOUNDATION v1
-- Additive foundation: existing accounting tables remain compatible while tenant-aware
-- routes are introduced. New public registrations start inactive until subscription/data isolation is activated.
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  owner_name text NOT NULL,
  phone text,
  email text,
  address text,
  logo_url text,
  tagline text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo text;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  price numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled','trial')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id,status,ends_at);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'BDT',
  method text,
  gateway text,
  gateway_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_org ON subscription_payments(organization_id,created_at);

INSERT INTO subscription_plans(name,duration_days,price,currency)
VALUES ('Monthly',30,0,'BDT'),('Quarterly',90,0,'BDT'),('Yearly',365,0,'BDT')
ON CONFLICT (name) DO NOTHING;

-- Convert the existing SIAM AIR installation into the first protected organization.
DO $$
DECLARE org_id uuid; owner_id uuid;
BEGIN
  SELECT id INTO owner_id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1;
  SELECT id INTO org_id FROM organizations WHERE business_name='SIAM AIR & DIGITAL SERVICE' ORDER BY created_at LIMIT 1;
  IF org_id IS NULL THEN
    INSERT INTO organizations(business_name,owner_name,phone,email,address,tagline,status)
    VALUES ('SIAM AIR & DIGITAL SERVICE',COALESCE((SELECT full_name FROM users WHERE id=owner_id),'SIAM AIR Admin'),'01883400808','bijoy105671@gmail.com','Ramkrisnapur Bazar / Shutradhar Super Market, Homna, Cumilla','All service in one doors','active')
    RETURNING id INTO org_id;
  END IF;
  UPDATE users SET organization_id=org_id WHERE organization_id IS NULL;
  IF owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE organization_id=org_id) THEN
    INSERT INTO subscriptions(organization_id,plan_id,status,starts_at,ends_at)
    SELECT org_id,id,'active',now(),now()+interval '3650 days' FROM subscription_plans WHERE name='Yearly' LIMIT 1;
  END IF;
END $$;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS photo text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE fund_transfers ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE account_opening_balances ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE account_entries ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE loan_advances ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE loan_advance_adjustments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE flight_directory ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

DO $$ DECLARE org_id uuid; BEGIN
  SELECT id INTO org_id FROM organizations WHERE business_name='SIAM AIR & DIGITAL SERVICE' ORDER BY created_at LIMIT 1;
  UPDATE customers SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE vendors SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE services SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE transactions SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE payments SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE expenses SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE fund_transfers SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE audit_logs SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE account_opening_balances SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE app_settings SET organization_id=org_id WHERE organization_id IS NULL AND NOT EXISTS (SELECT 1 FROM app_settings existing WHERE existing.organization_id=org_id AND existing.key=app_settings.key);
  UPDATE account_entries SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE loan_advances SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE loan_advance_adjustments SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE appointment_reminders SET organization_id=org_id WHERE organization_id IS NULL;
  UPDATE flight_directory SET organization_id=org_id WHERE organization_id IS NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_organization ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_organization ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_organization ON fund_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_organization ON app_settings(organization_id);


-- SIAM SAAS TENANT RLS v1
ALTER TABLE customers ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE vendors ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE transactions ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE payments ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE expenses ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE fund_transfers ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE audit_logs ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE account_opening_balances ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE account_entries ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE loan_advances ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE loan_advance_adjustments ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE appointment_reminders ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
ALTER TABLE flight_directory ALTER COLUMN organization_id SET DEFAULT NULLIF(current_setting('app.organization_id', true),'')::uuid;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','vendors','transactions','payments','expenses','fund_transfers','audit_logs','account_opening_balances','account_entries','loan_advances','loan_advance_adjustments','appointment_reminders','flight_directory']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR ALL USING (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;


-- SIAM SAAS TENANT UNIQUE CONSTRAINTS v1
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='customers'::regclass AND conname='customers_mobile_key') THEN
    ALTER TABLE customers DROP CONSTRAINT customers_mobile_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='services'::regclass AND conname='services_name_key') THEN
    ALTER TABLE services DROP CONSTRAINT services_name_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='transactions'::regclass AND conname='transactions_invoice_number_key') THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_invoice_number_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='account_opening_balances'::regclass AND conname='account_opening_balances_pkey') THEN
    ALTER TABLE account_opening_balances DROP CONSTRAINT account_opening_balances_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='app_settings'::regclass AND conname='app_settings_pkey') THEN
    ALTER TABLE app_settings DROP CONSTRAINT app_settings_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='flight_directory'::regclass AND conname='flight_directory_flight_no_from_airport_to_airport_key') THEN
    ALTER TABLE flight_directory DROP CONSTRAINT flight_directory_flight_no_from_airport_to_airport_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_org_mobile ON customers(organization_id,mobile);
CREATE UNIQUE INDEX IF NOT EXISTS uq_services_org_name ON services(organization_id,name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_org_invoice ON transactions(organization_id,invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_opening_balances_org_account ON account_opening_balances(organization_id,account_name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_org_key ON app_settings(organization_id,key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_flights_org_route ON flight_directory(organization_id,flight_no,from_airport,to_airport);


-- SIAM SAAS REGISTRATION / PAYMENT APPROVAL v2
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_status text NOT NULL DEFAULT 'approved';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_id uuid;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS sender_account text;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS payment_slip text;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES users(id);
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_payment_transaction ON subscription_payments(transaction_id) WHERE transaction_id IS NOT NULL;

INSERT INTO subscription_plans(name,duration_days,price,currency,description,is_lifetime,active)
VALUES
 ('1 Month Free',30,0,'BDT','Free trial access for 1 month',false,true),
 ('6 Months',180,3000,'BDT','Full business access for 6 months',false,true),
 ('1 Year',365,5000,'BDT','Full business access for 1 year',false,true),
 ('2 Years',730,8000,'BDT','Full business access for 2 years',false,true),
 ('5 Years',1825,15000,'BDT','Full business access for 5 years',false,true),
 ('Lifetime',365000,30000,'BDT','Lifetime business access',true,true)
ON CONFLICT (name) DO UPDATE SET
 duration_days=EXCLUDED.duration_days,
 price=EXCLUDED.price,
 currency=EXCLUDED.currency,
 description=EXCLUDED.description,
 is_lifetime=EXCLUDED.is_lifetime,
 active=EXCLUDED.active;
UPDATE subscription_plans SET active=false WHERE name='10 Years';

CREATE TABLE IF NOT EXISTS registration_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registration_otps_user ON registration_otps(user_id,created_at);

INSERT INTO app_settings(organization_id,key,value)
SELECT id, 'saas_payment_settings', '{"bkashNumber":"","bankName":"","bankAccountName":"","bankAccountNumber":"","bankBranch":"","instructions":"Send the exact package amount, then submit Transaction ID and payment slip."}'::jsonb
FROM organizations
WHERE business_name='SIAM AIR & DIGITAL SERVICE'
  AND NOT EXISTS (
    SELECT 1 FROM app_settings s
    WHERE s.organization_id=organizations.id AND s.key='saas_payment_settings'
  );


ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_locked_until timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_resend_count integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_resend_locked_until timestamptz;
ALTER TABLE login_otps ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0;
ALTER TABLE login_otps ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;
ALTER TABLE registration_otps ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0;
ALTER TABLE registration_otps ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;
