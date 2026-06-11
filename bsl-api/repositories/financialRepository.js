const pool = require('../db');

class FinancialRepository {
  async getReceitas(startDate, endDate) {
    const res = await pool.query(`
      SELECT SUM(amount) as total
      FROM financial_transactions
      WHERE transaction_type = 'RECEITA'
      AND created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);
    return res.rows[0].total || 0;
  }

  async getDespesas(startDate, endDate) {
    const res = await pool.query(`
      SELECT SUM(amount) as total
      FROM financial_transactions
      WHERE transaction_type = 'DESPESA'
      AND created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);
    return res.rows[0].total || 0;
  }

  async getPendingCommissions(startDate, endDate) {
    const res = await pool.query(`
      SELECT 
        p.name as tech_name,
        s.name as service_name,
        s.base_price,
        p.commission_rate,
        (s.base_price * (p.commission_rate / 100)) as commission_value
      FROM appointments a
      JOIN professionals p ON a.professional_id = p.id
      JOIN service_catalog s ON a.service_id = s.id
      WHERE a.status = 'Finalizado'
      AND a.created_at >= $1 AND a.created_at <= $2
    `, [startDate, endDate]);
    return res.rows;
  }

  async getFlowData(startDate, endDate) {
    const res = await pool.query(`
      SELECT 
        DATE(created_at) as data_ref,
        SUM(CASE WHEN transaction_type = 'RECEITA' THEN amount ELSE 0 END) as receita,
        SUM(CASE WHEN transaction_type = 'DESPESA' THEN amount ELSE 0 END) as despesa
      FROM financial_transactions
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `, [startDate, endDate]);
    return res.rows;
  }

  async createExpense(category, amount) {
    const res = await pool.query(`
      INSERT INTO financial_transactions (transaction_type, amount, payment_method)
      VALUES ('DESPESA', $1, $2)
      RETURNING *
    `, [amount, category]);
    return res.rows[0];
  }
}

module.exports = new FinancialRepository();
