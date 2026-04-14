const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.get('/active', checkoutController.getActiveAppointments);
router.post('/:id/pay', checkoutController.payCheckout);

module.exports = router;
