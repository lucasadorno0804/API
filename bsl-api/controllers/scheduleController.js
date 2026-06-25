const pool = require('../db');

// Busca os recursos necessários para o formulário e tela de schedule
exports.getResources = async (req, res) => {
  try {
    const clientsResult = await pool.query(`
      SELECT c.id as client_id, c.name as client_name, 
             v.id as vehicle_id, v.brand, v.model, v.plate
      FROM clients c
      LEFT JOIN vehicles v ON c.id = v.client_id
    `);

    // Organizar no formato: { client_id: { name: '...', vehicles: [] } }
    const clientsMap = {};
    clientsResult.rows.forEach(row => {
      if (!clientsMap[row.client_id]) {
        clientsMap[row.client_id] = {
          id: row.client_id,
          name: row.client_name,
          vehicles: []
        };
      }
      if (row.vehicle_id) {
        clientsMap[row.client_id].vehicles.push({
          id: row.vehicle_id,
          brand: row.brand,
          model: row.model,
          plate: row.plate
        });
      }
    });

    const servicesResult = await pool.query('SELECT * FROM service_catalog ORDER BY category, name');
    const boxesResult = await pool.query('SELECT * FROM boxes ORDER BY number');
    const professionalsResult = await pool.query('SELECT * FROM professionals ORDER BY name');

    res.json({
      clients: Object.values(clientsMap),
      services: servicesResult.rows,
      boxes: boxesResult.rows,
      professionals: professionalsResult.rows,
      visualFeed: {
        imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1000",
        message: "Ao Vivo Box 01" // ou histórico se livre
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar recursos' });
  }
};

// Busca agendamentos do dia (ou período)
exports.getAppointments = async (req, res) => {
  const { start_date, end_date } = req.query;
  
  try {
    let whereClause = '';
    let params = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE a.start_time >= $1 AND a.start_time <= $2';
      params = [start_date, end_date];
    }

    const query = `
      SELECT a.id, a.box_number, a.start_time, a.end_time, a.status, a.professional_id,
             s.name as service_name, s.estimated_time,
             v.brand, v.model, v.plate,
             c.name as client_name,
             p.name as professional_name
      FROM appointments a
      JOIN service_catalog s ON a.service_id = s.id
      JOIN vehicles v ON a.vehicle_id = v.id
      JOIN clients c ON v.client_id = c.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      ${whereClause}
      ORDER BY a.start_time ASC
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

exports.createAppointment = async (req, res) => {
  const { vehicle_id, service_id, box_number, start_time } = req.body;
  try {
    // Buscar o tempo estimado do serviço para setar end_time
    const serviceRes = await pool.query('SELECT estimated_time FROM service_catalog WHERE id = $1', [service_id]);
    if (serviceRes.rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    
    const estimatedMinutes = serviceRes.rows[0].estimated_time;
    
    // Calcula end_time
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + estimatedMinutes * 60000);

    const query = `
      INSERT INTO appointments (vehicle_id, service_id, box_number, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, box_number, start_time, end_time, status
    `;
    const result = await pool.query(query, [vehicle_id, service_id, box_number, startDate.toISOString(), endDate.toISOString()]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    // Erro 23P01 = EXCLUSION CONSTRAINT VIOLATION no Postgres
    if (error.code === '23P01') {
      return res.status(400).json({ error: 'Horário indisponível! O Box já possui outro veículo agendado neste período.' });
    }
    res.status(500).json({ error: 'Erro interno ao criar agendamento' });
  }
};

// Edição (usado pelo arrastar e soltar da agenda ou mudança de status)
exports.updateAppointment = async (req, res) => {
  const { id } = req.params;
  const { box_number, start_time, status } = req.body;

  try {
    const currentRes = await pool.query('SELECT service_id, box_number, start_time, end_time, status FROM appointments WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    
    let queryArgs = [];
    let setClauses = [];
    let argCount = 1;

    if (box_number !== undefined && start_time !== undefined) {
      const serviceRes = await pool.query('SELECT estimated_time FROM service_catalog WHERE id = $1', [currentRes.rows[0].service_id]);
      const estimatedMinutes = serviceRes.rows[0].estimated_time || 60;
      
      const startDate = new Date(start_time);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ error: 'Data de início inválida' });
      }
      const endDate = new Date(startDate.getTime() + estimatedMinutes * 60000);

      setClauses.push(`box_number = $${argCount++}`);
      queryArgs.push(box_number);
      
      setClauses.push(`start_time = $${argCount++}`);
      queryArgs.push(startDate.toISOString());
      
      setClauses.push(`end_time = $${argCount++}`);
      queryArgs.push(endDate.toISOString());
    }

    if (status !== undefined) {
      setClauses.push(`status = $${argCount++}`);
      queryArgs.push(status);
    }

    if (setClauses.length === 0) {
      return res.json(currentRes.rows[0]);
    }

    queryArgs.push(id);
    const updateQuery = `
      UPDATE appointments 
      SET ${setClauses.join(', ')}
      WHERE id = $${argCount}
      RETURNING id, box_number, start_time, end_time, status
    `;

    const result = await pool.query(updateQuery, queryArgs);
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23P01') {
      return res.status(400).json({ error: 'Conflito de Horário! O Drop (soltar) não é permitido neste box e horário porque já está ocupado.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
};

exports.createClient = async (req, res) => {
  const { name, phone, email, plate, brand, model } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const insertClientQuery = `
      INSERT INTO clients (name, phone, email) 
      VALUES ($1, $2, $3) 
      RETURNING id
    `;
    const clientRes = await client.query(insertClientQuery, [name, phone, email]);
    const clientId = clientRes.rows[0].id;
    
    const insertVehicleQuery = `
      INSERT INTO vehicles (client_id, plate, brand, model) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id
    `;
    const vehicleRes = await client.query(insertVehicleQuery, [clientId, plate, brand, model]);
    const vehicleId = vehicleRes.rows[0].id;
    
    await client.query('COMMIT');
    
    res.status(201).json({
      client_id: clientId,
      vehicle_id: vehicleId,
      message: 'Cliente cadastrado com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    if (error.code === '23505') {
       return res.status(409).json({ error: 'Erro: Placa já cadastrada no sistema.' });
    }
    res.status(500).json({ error: 'Erro interno ao cadastrar cliente e veículo.' });
  } finally {
    client.release();
  }
};

exports.deleteAppointment = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json({ message: 'Agendamento removido com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover agendamento' });
  }
};

exports.createService = async (req, res) => {
  const { name, category, base_price, estimated_time } = req.body;
  
  try {
    const query = `
      INSERT INTO service_catalog (name, category, base_price, estimated_time) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    const result = await pool.query(query, [name, category, base_price, estimated_time]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao cadastrar serviço no catálogo.' });
  }
};

exports.createProfessional = async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query('INSERT INTO professionals (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao cadastrar profissional.' });
  }
};

exports.deleteProfessional = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM professionals WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Profissional não encontrado' });
    res.json({ message: 'Profissional removido' });
  } catch (error) {
    console.error(error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Não é possível remover profissionais com serviços vinculados na agenda.' });
    }
    res.status(500).json({ error: 'Erro ao remover profissional.' });
  }
};

exports.getServices = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM service_catalog ORDER BY category, name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar serviços.' });
  }
};

exports.updateService = async (req, res) => {
  const { id } = req.params;
  const { name, category, base_price, estimated_time } = req.body;
  try {
    const query = `
      UPDATE service_catalog 
      SET name = $1, category = $2, base_price = $3, estimated_time = $4
      WHERE id = $5
      RETURNING *
    `;
    const result = await pool.query(query, [name, category, base_price, estimated_time, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar serviço no catálogo.' });
  }
};
