import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

const main = async () => {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'SIAM AIR Administrator';

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!username || !password) throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (username,password_hash,full_name,role,permissions,is_active)
     VALUES ($1,$2,$3,'admin',$4::jsonb,true)
     ON CONFLICT (username) DO UPDATE
       SET password_hash=EXCLUDED.password_hash,
           full_name=EXCLUDED.full_name,
           role='admin',
           permissions=EXCLUDED.permissions,
           is_active=true
     RETURNING username`,
    [username, passwordHash, fullName, JSON.stringify({ all: true })]
  );

  console.log(`Admin account ready: ${result.rows[0].username}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => pool.end());
