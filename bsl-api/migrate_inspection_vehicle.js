const pool = require('./db');

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add vehicle_id if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='vehicle_inspections' AND column_name='vehicle_id'
        ) THEN
          ALTER TABLE vehicle_inspections ADD COLUMN vehicle_id UUID REFERENCES vehicles(id);
        END IF;
      END
      $$;
    `);

    await client.query('COMMIT');
    console.log('Migration completed: vehicle_id added to vehicle_inspections');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
