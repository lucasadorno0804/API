const service = require('../services/dashboardService');

class DashboardController {
  async getOccupancy(req, res) {
    try {
      const data = await service.getOccupancyData();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar ocupação' });
    }
  }

  async getRevenueToday(req, res) {
    try {
      const data = await service.getDailyRevenueData();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar receita diária' });
    }
  }

  async getMonthlyGoal(req, res) {
    try {
      const data = await service.getMonthlyGoalData();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar meta mensal' });
    }
  }

  async getUpcomingServices(req, res) {
    try {
      const data = await service.getUpcomingServicesData();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar próximos serviços' });
    }
  }

  async getFinishedServices(req, res) {
    try {
      const data = await service.getFinishedServicesData();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar serviços finalizados' });
    }
  }

  async getAlerts(req, res) {
    try {
      const data = await service.getAlertsData();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar alertas' });
    }
  }
}

module.exports = new DashboardController();
