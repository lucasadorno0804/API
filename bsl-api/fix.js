const pool = require('./db');

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First figure out the exact name of the constraint
    const res = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'appointments'::regclass 
      AND contype = 'x'
    `);
    if (res.rows.length > 0) {
      const constraintName = res.rows[0].conname;
      await client.query(`ALTER TABLE appointments DROP CONSTRAINT "${constraintName}"`);
    }

    await client.query(`ALTER TABLE appointments ALTER COLUMN start_time TYPE TIMESTAMPTZ USING start_time AT TIME ZONE 'UTC'`);
    await client.query(`ALTER TABLE appointments ALTER COLUMN end_time TYPE TIMESTAMPTZ USING end_time AT TIME ZONE 'UTC'`);
    
    await client.query(`ALTER TABLE appointments ADD EXCLUDE USING gist (box_number WITH =, tstzrange(start_time, end_time) WITH &&)`);
    
    await client.query('COMMIT');
    console.log('Fixed timezones successfully');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error(e);
  } finally {
    client.release();
    process.exit();
  }
}
fix();
