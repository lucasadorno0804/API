const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

// Não aplicamos middleware de autenticação JWT aqui ainda para acelerar testes puros do grid,
// mas em uma base final deveríamos encapsular estas rotas com validação de jwt.
router.get('/resources', scheduleController.getResources);
router.post('/clients', scheduleController.createClient);
router.get('/appointments', scheduleController.getAppointments);
router.post('/appointments', scheduleController.createAppointment);
router.patch('/appointments/:id', scheduleController.updateAppointment);
router.delete('/appointments/:id', scheduleController.deleteAppointment);
router.post('/services', scheduleController.createService);
router.post('/professionals', scheduleController.createProfessional);
router.delete('/professionals/:id', scheduleController.deleteProfessional);
router.get('/services', scheduleController.getServices);
router.patch('/services/:id', scheduleController.updateService);

module.exports = router;
