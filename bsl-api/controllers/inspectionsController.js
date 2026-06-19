const inspectionsRepository = require('../repositories/inspectionsRepository');

exports.getInspection = async (req, res) => {
  const { appointmentId } = req.params;
  try {
    const inspection = await inspectionsRepository.getByAppointmentId(appointmentId);
    if (!inspection) return res.status(404).json({ error: 'Vistoria não encontrada' });
    res.json(inspection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInspectionById = async (req, res) => {
  const { id } = req.params;
  try {
    const inspection = await inspectionsRepository.getById(id);
    if (!inspection) return res.status(404).json({ error: 'Vistoria não encontrada' });
    res.json(inspection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createInspection = async (req, res) => {
  const { appointmentId, type } = req.body;
  try {
    const inspection = await inspectionsRepository.create(appointmentId, type || 'Entrada');
    res.json(inspection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateChecklist = async (req, res) => {
  const { id } = req.params;
  const { checklist, diagramType } = req.body;
  try {
    const isLocked = await inspectionsRepository.isLocked(id);
    if (isLocked) return res.status(403).json({ error: 'Vistoria bloqueada. Nenhuma alteração permitida.' });

    const updated = await inspectionsRepository.updateChecklist(id, checklist, diagramType);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar checklist' });
  }
};

exports.updateVehicle = async (req, res) => {
  const { id } = req.params;
  const { vehicleId } = req.body;
  try {
    const isLocked = await inspectionsRepository.isLocked(id);
    if (isLocked) return res.status(403).json({ error: 'Vistoria bloqueada. Nenhuma alteração permitida.' });

    const updated = await inspectionsRepository.updateVehicle(id, vehicleId);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao vincular veículo' });
  }
};

exports.uploadImage = async (req, res) => {
  const { id } = req.params;
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const isLocked = await inspectionsRepository.isLocked(id);
    if (isLocked) {
      // Remove a imagem que foi "upada" pelo multer se estiver trancado
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Vistoria finalizada e bloqueada para edições.' });
    }

    // Usaremos localhost:5000/uploads/... mas para flexibilidade salvamos o caminho relativo.
    // O frontend pode prepender a REACT_APP_API_URL
    const imageUrl = `/uploads/${req.file.filename}`;

    const updated = await inspectionsRepository.addImageUrl(id, imageUrl);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.lockInspection = async (req, res) => {
  const { id } = req.params;
  const { signature } = req.body;
  try {
    const isLocked = await inspectionsRepository.isLocked(id);
    if (isLocked) return res.status(403).json({ error: 'Vistoria já estava bloqueada.' });

    const updated = await inspectionsRepository.lock(id, signature);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
