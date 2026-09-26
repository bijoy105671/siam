import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'SIAM AIR Administrator';

  // Bootstrap is intentionally optional. If credentials are not configured,
  // startup continues normally and no secret is exposed or generated.
  if (!username || !password) {
    console.log('Admin bootstrap skipped: ADMIN_USERNAME / ADMIN_PASSWORD not configured.');
    return;
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  }

  const existing = await pool.query(
    'SELECT id, role, is_active FROM users WHERE lower(username)=lower($1) LIMIT 1',
    [username]
  );

  if (existing.rows[0]) {
    console.log(`Admin bootstrap skipped: account already exists (${username}).`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (username,password_hash,full_name,role,permissions,is_active)
     VALUES ($1,$2,$3,'admin',$4::jsonb,true)`,
    [username, passwordHash, fullName, JSON.stringify({ all: true })]
  );

  console.log(`Admin account created: ${username}`);
};

main()
  .catch((error) => {
    console.error('Admin bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
