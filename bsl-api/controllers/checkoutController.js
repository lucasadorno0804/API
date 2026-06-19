const pool = require('../db');

exports.getActiveAppointments = async (req, res) => {
  try {
    const query = `
      SELECT a.id, a.box_number, a.start_time, a.end_time, a.status,
             s.id as service_id, s.name as service_name, s.base_price,
             v.brand as vehicle_brand, v.model as vehicle_model, v.plate,
             c.name as client_name, c.phone as client_phone
      FROM appointments a
      JOIN service_catalog s ON a.service_id = s.id
      JOIN vehicles v ON a.vehicle_id = v.id
      JOIN clients c ON v.client_id = c.id
      WHERE a.status = 'Finalizado'
      ORDER BY a.start_time ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos ativos' });
  }
};

exports.payCheckout = async (req, res) => {
  const { id } = req.params;
  const { amount, payment_method, extra_services } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obter detalhes do appointment
    const getAppQuery = `SELECT a.client_id, a.end_time FROM appointments a JOIN vehicles v ON a.vehicle_id = v.id WHERE a.id = $1`;
    const appRes = await client.query(getAppQuery, [id]);
    
    if (appRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const clientId = appRes.rows[0].client_id;
    let newEndTime = appRes.rows[0].end_time;
    
    // Se o checkout ocorrer antes da end_time, ajustamos a end_time para liberar a vaga imediatamente
    if (new Date() < new Date(newEndTime)) {
        newEndTime = new Date().toISOString();
    }

    // 2. Criar Transação Financeira principal
    const insertTransactionQuery = `
      INSERT INTO financial_transactions 
      (appointment_id, client_id, transaction_type, amount, payment_method, paid_status, paid_at)
      VALUES ($1, $2, 'RECEITA', $3, $4, true, CURRENT_TIMESTAMP)
    `;
    await client.query(insertTransactionQuery, [id, clientId, amount, payment_method || 'PIX']);

    // 3. Atualizar Status do Agendamento (e liberar box caso antecipado)
    const updateAppQuery = `
      UPDATE appointments 
      SET status = 'Finalizado/Entregue', end_time = $1
      WHERE id = $2
    `;
    await client.query(updateAppQuery, [newEndTime, id]);

    // 4. (Opcional) Podemos inserir os extra_services se tivéssemos uma tabela
    // Mas no momento eles são agregados na fatura da financial_transaction

    await client.query('COMMIT');
    res.status(200).json({ message: 'Pagamento concluído e veículo liberado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar pagamento' });
  } finally {
    client.release();
  }
};
