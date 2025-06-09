import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
console.log('🔎 Iniciando conexão com o banco...');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Erro na conexão com o banco:', err);
    } else {
      console.log('🟢 Conexão com o banco bem-sucedida:', res.rows[0]);
    }
  });

export default pool;