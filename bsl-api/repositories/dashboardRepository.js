const pool = require('../db');

class DashboardRepository {
  async getOccupancy() {
    const res = await pool.query(`
      SELECT COUNT(*) as current_count 
      FROM appointments 
      WHERE status IN ('Aguardando', 'Agendado', 'Em Processamento')
      AND DATE(start_time) = CURRENT_DATE
    `);
    return parseInt(res.rows[0].current_count || 0);
  }

  async getTotalBoxes() {
    const res = await pool.query('SELECT COUNT(*) as total FROM boxes');
    return parseInt(res.rows[0].total || 1);
  }


  async getRevenue(startDate, endDate) {
    const res = await pool.query(`
      SELECT SUM(amount) as total
      FROM financial_transactions
      WHERE transaction_type = 'RECEITA'
      AND created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);
    return parseFloat(res.rows[0].total || 0);
  }

  async getMonthlyRevenue(month, year) {
    // using PostgreSQL date functions or simple text matching
    const res = await pool.query(`
      SELECT SUM(amount) as total
      FROM financial_transactions
      WHERE transaction_type = 'RECEITA'
      AND EXTRACT(MONTH FROM created_at) = $1
      AND EXTRACT(YEAR FROM created_at) = $2
    `, [month, year]);
    return parseFloat(res.rows[0].total || 0);
  }

  async getUpcomingAppointments() {
    const res = await pool.query(`
      SELECT a.id, a.start_time, a.status,
             s.name as service_name, s.category,
             v.brand as vehicle_brand, v.model as vehicle_model, v.plate
      FROM appointments a
      JOIN service_catalog s ON a.service_id = s.id
      JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.status IN ('Aguardando', 'Agendado', 'Em Processamento')
      AND DATE(a.start_time) = CURRENT_DATE
      ORDER BY a.start_time ASC
      LIMIT 5
    `);
    return res.rows;
  }

  async getFinishedAppointments() {
    const res = await pool.query(`
      SELECT a.id, a.start_time, a.status,
             s.name as service_name, s.category,
             v.brand as vehicle_brand, v.model as vehicle_model, v.plate
      FROM appointments a
      JOIN service_catalog s ON a.service_id = s.id
      JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.status = 'Finalizado'
      AND DATE(a.start_time) = CURRENT_DATE
      ORDER BY a.end_time DESC
      LIMIT 5
    `);
    return res.rows;
  }
}

module.exports = new DashboardRepository();
