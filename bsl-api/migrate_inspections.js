const pool = require('./db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS signature TEXT;`);
    await pool.query(`ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;`);
    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
