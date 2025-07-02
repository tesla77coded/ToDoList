import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false,
  },
  family: 4,
});

pool.connect()
  .then(() => console.log('✅ Connected to Supabase PostgreSQL.'))
  .catch((err) => console.error('❌ Connection error: ', err));


export default pool;
