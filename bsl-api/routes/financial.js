const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');

router.get('/dashboard', financialController.getDashboard.bind(financialController));
router.post('/expense', financialController.postExpense.bind(financialController));

module.exports = router;
