const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');

router.get('/dashboard', financialController.getDashboard.bind(financialController));
router.get('/export', financialController.exportReport.bind(financialController));
router.post('/expense', financialController.postExpense.bind(financialController));
router.post('/insights', financialController.generateInsights.bind(financialController));
router.delete('/transaction/:id', financialController.deleteTransaction.bind(financialController));

module.exports = router;
