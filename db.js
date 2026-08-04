const { Pool } = require('pg');
require('dotenv').config();

// DATABASE_URL vem pronta do Supabase/Render, no formato:
// postgresql://usuario:senha@host:porta/banco
// Para conexao local sem SSL, deixe DB_SSL=false no .env
const useSSL = process.env.DB_SSL !== 'false';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: useSSL ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cria_tech',
        port: process.env.DB_PORT || 5432,
        ssl: useSSL ? { rejectUnauthorized: false } : false
      }
);

module.exports = pool;
