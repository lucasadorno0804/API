require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Força o PostgreSQL a usar UTF-8 no envio e recebimento de dados,
// corrigindo o problema de caracteres como "ç" e "ã" aparecendo como "????"
pool.on('connect', client => {
  client.query("SET client_encoding = 'UTF8'");
});

module.exports = pool;
