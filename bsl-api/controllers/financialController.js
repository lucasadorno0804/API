const { z } = require('zod');
const service = require('../services/financialService');

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
});

class FinancialController {
  async getDashboard(req, res) {
    try {
      const period = req.query.period || 'this_month';
      const data = await service.getDashboardData(period);
      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar dashboard financeiro' });
    }
  }

  async exportReport(req, res) {
    try {
      const period = req.query.period || 'this_month';
      const csvData = await service.generateReportCSV(period);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_${period}.csv"`);
      res.status(200).send(csvData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
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

  async generateInsights(req, res) {
    try {
      const period = req.query.period || req.body.period || 'this_month';
      const markdown = await service.generateAIInsights(period);
      res.status(200).json({ markdown });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Erro ao gerar relatório de inteligência artificial' });
    }
  }

  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      const deleted = await service.deleteTransaction(id);
      res.status(200).json({ success: true, deleted });
    } catch (error) {
      console.error(error);
      if (error.message.includes("não encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Erro ao excluir transação' });
    }
  }
}

module.exports = new FinancialController();
