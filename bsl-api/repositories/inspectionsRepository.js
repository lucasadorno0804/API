const pool = require('../db');

class InspectionsRepository {
  async getByAppointmentId(appointmentId) {
    const res = await pool.query(`
      SELECT vi.*, 
             COALESCE(v.id, v2.id) as vehicle_id,
             COALESCE(v.model, v2.model) as vehicle_model,
             COALESCE(v.brand, v2.brand) as vehicle_brand,
             COALESCE(v.plate, v2.plate) as vehicle_plate,
             COALESCE(c.id, c2.id) as client_id,
             COALESCE(c.name, c2.name) as client_name
      FROM vehicle_inspections vi
      LEFT JOIN appointments a ON vi.appointment_id = a.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN clients c ON v.client_id = c.id
      LEFT JOIN vehicles v2 ON vi.vehicle_id = v2.id
      LEFT JOIN clients c2 ON v2.client_id = c2.id
      WHERE vi.appointment_id = $1 LIMIT 1
    `, [appointmentId]);
    return res.rows[0];
  }

  async getById(id) {
    const res = await pool.query(`
      SELECT vi.*, 
             COALESCE(v.id, v2.id) as vehicle_id,
             COALESCE(v.model, v2.model) as vehicle_model,
             COALESCE(v.brand, v2.brand) as vehicle_brand,
             COALESCE(v.plate, v2.plate) as vehicle_plate,
             COALESCE(c.id, c2.id) as client_id,
             COALESCE(c.name, c2.name) as client_name
      FROM vehicle_inspections vi
      LEFT JOIN appointments a ON vi.appointment_id = a.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN clients c ON v.client_id = c.id
      LEFT JOIN vehicles v2 ON vi.vehicle_id = v2.id
      LEFT JOIN clients c2 ON v2.client_id = c2.id
      WHERE vi.id = $1 LIMIT 1
    `, [id]);
    return res.rows[0];
  }

  async updateVehicle(id, vehicleId) {
    const res = await pool.query(`
      UPDATE vehicle_inspections 
      SET vehicle_id = $1
      WHERE id = $2 
      RETURNING *
    `, [vehicleId, id]);
    return await this.getById(id);
  }

  async isLocked(id) {
    const inspection = await this.getById(id);
    return inspection ? inspection.is_locked : false;
  }

  async create(appointmentId, type) {
    // Se por acaso passar um appointment nulo no teste.
    // E garantir default JSON arrays
    const res = await pool.query(`
      INSERT INTO vehicle_inspections (appointment_id, type, checklist, images_urls)
      VALUES ($1, $2, '[]'::jsonb, '[]'::jsonb)
      RETURNING id
    `, [appointmentId || null, type]);
    
    return await this.getById(res.rows[0].id);
  }

  async updateChecklist(id, checklist, diagramType) {
    const res = await pool.query(`
      UPDATE vehicle_inspections 
      SET checklist = $1::jsonb,
          selected_diagram_type = COALESCE($2, selected_diagram_type)
      WHERE id = $3 
      RETURNING *
    `, [JSON.stringify(checklist), diagramType || null, id]);
    return res.rows[0];
  }

  async addImageUrl(id, imageUrl) {
    // Busca URLs atuais
    const inspection = await this.getById(id);
    let urls = inspection.images_urls || [];
    if (typeof urls === 'string') urls = JSON.parse(urls);

    urls.push(imageUrl);

    const res = await pool.query(`
      UPDATE vehicle_inspections 
      SET images_urls = $1::jsonb 
      WHERE id = $2 
      RETURNING *
    `, [JSON.stringify(urls), id]);
    return res.rows[0];
  }

  async lock(id, signatureBase64) {
    const res = await pool.query(`
      UPDATE vehicle_inspections 
      SET signature = $1, is_locked = true 
      WHERE id = $2 
      RETURNING *
    `, [signatureBase64, id]);
    return res.rows[0];
  }
}

module.exports = new InspectionsRepository();
