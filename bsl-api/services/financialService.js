const repo = require('../repositories/financialRepository');

class FinancialService {
  async getDashboardData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // To calculate previous month for variations
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const receitaMtd = await repo.getReceitas(startOfMonth, endOfMonth);
    const receitaPrev = await repo.getReceitas(startOfPrevMonth, endOfPrevMonth);
    const despesasMtd = await repo.getDespesas(startOfMonth, endOfMonth);

    let variation = 0;
    if (receitaPrev > 0) {
      variation = ((receitaMtd - receitaPrev) / receitaPrev) * 100;
    }

    const pendingCommissions = await repo.getPendingCommissions(startOfMonth, endOfMonth);
    const totalCommissions = pendingCommissions.reduce((acc, curr) => acc + Number(curr.commission_value), 0);

    const netCashFlow = Number(receitaMtd) - Number(despesasMtd);

    // Last 7 days flow
    const startOf7Days = new Date();
    startOf7Days.setDate(startOf7Days.getDate() - 6);
    startOf7Days.setHours(0, 0, 0, 0);

    const flowDataRaw = await repo.getFlowData(startOf7Days, endOfMonth);
    
    // Format flow data for Recharts (fill missing days)
    const flowData = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOf7Days);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const found = flowDataRaw.find(f => {
        // Handle JS date format from pg
        const fDate = new Date(f.data_ref).toISOString().split('T')[0];
        return fDate === dateStr;
      });
      flowData.push({
        day: d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', ''),
        entrada: found ? Number(found.receita) : 0,
        saida: found ? Number(found.despesa) : 0,
      });
    }

    return {
      kpis: {
        receitaTotal: Number(receitaMtd),
        variation: variation.toFixed(1),
        comissoesPendentes: totalCommissions,
        despesas: Number(despesasMtd),
        fluxoLiquido: netCashFlow
      },
      comissoes: pendingCommissions.map(c => ({
        ...c,
        base_price: Number(c.base_price),
        commission_rate: Number(c.commission_rate),
        commission_value: Number(c.commission_value)
      })),
      flowData
    };
  }

  async addExpense(category, amount) {
    if (amount <= 0) throw new Error("Valor deve ser maior que zero.");
    return await repo.createExpense(category, amount);
  }
}

module.exports = new FinancialService();
