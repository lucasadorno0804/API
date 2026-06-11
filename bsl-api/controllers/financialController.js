const { z } = require('zod');
const service = require('../services/financialService');

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
});

class FinancialController {
  async getDashboard(req, res) {
    try {
      const data = await service.getDashboardData();
      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar dashboard financeiro' });
    }
  }

  async postExpense(req, res) {
    try {
      const { category, amount } = expenseSchema.parse(req.body);
      const result = await service.addExpense(category, amount);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      console.error(error);
      res.status(500).json({ error: 'Erro ao lançar despesa' });
    }
  }
}

module.exports = new FinancialController();
