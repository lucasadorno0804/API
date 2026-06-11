const pool = require('./db');

async function migrate() {
  try {
    await pool.query('ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS selected_diagram_type VARCHAR(50);');
    console.log('Tabela vehicle_inspections atualizada com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro na migração:', err);
    process.exit(1);
  }
}

migrate();
