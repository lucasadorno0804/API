const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardController');

router.get('/occupancy', controller.getOccupancy);
router.get('/revenue-today', controller.getRevenueToday);
router.get('/monthly-goal', controller.getMonthlyGoal);
router.get('/upcoming-services', controller.getUpcomingServices);
router.get('/finished-services', controller.getFinishedServices);
router.get('/alerts', controller.getAlerts);

module.exports = router;
