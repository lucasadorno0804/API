const repo = require('../repositories/financialRepository');

class FinancialService {
  getDateRanges(period) {
    const now = new Date();
    let startDate, endDate, prevStartDate, prevEndDate;
    let groupByMonth = false;

    // Reset to start of day for 'now' logic based periods to be safe
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'this_week') {
      const dayOfWeek = today.getDay(); // 0 is Sunday
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diffToMonday);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(startDate.getDate() - 7);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(endDate.getDate() - 7);

    } else if (period === 'last_week') {
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diffToMonday - 7);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(startDate.getDate() - 7);
      prevEndDate = new Date(endDate);
      prevEndDate.setDate(endDate.getDate() - 7);

    } else if (period === 'this_year') {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

      prevStartDate = new Date(today.getFullYear() - 1, 0, 1);
      prevEndDate = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      groupByMonth = true;

    } else { // default 'this_month'
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    }

    return { startDate, endDate, prevStartDate, prevEndDate, groupByMonth };
  }

  async getDashboardData(period = 'this_month') {
    const { startDate, endDate, prevStartDate, prevEndDate, groupByMonth } = this.getDateRanges(period);

    const receitaPeriod = await repo.getReceitas(startDate, endDate);
    const receitaPrev = await repo.getReceitas(prevStartDate, prevEndDate);
    const despesasPeriod = await repo.getDespesas(startDate, endDate);

    let variation = 0;
    if (receitaPrev > 0) {
      variation = ((receitaPeriod - receitaPrev) / receitaPrev) * 100;
    } else if (receitaPeriod > 0) {
      variation = 100;
    }

    const pendingCommissions = await repo.getPendingCommissions(startDate, endDate);
    const totalCommissions = pendingCommissions.reduce((acc, curr) => acc + Number(curr.commission_value), 0);

    const netCashFlow = Number(receitaPeriod) - Number(despesasPeriod);

    const flowDataRaw = await repo.getFlowData(startDate, endDate, groupByMonth);
    
    // Format flow data for Recharts
    const flowData = [];
    if (groupByMonth) {
      // Create an array for all 12 months
      for (let i = 0; i < 12; i++) {
        const d = new Date(startDate.getFullYear(), i, 1);
        const monthStr = d.toISOString().substring(0, 7); // YYYY-MM
        const found = flowDataRaw.find(f => {
          const fDate = new Date(f.data_ref).toISOString().substring(0, 7);
          return fDate === monthStr;
        });
        flowData.push({
          day: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
          entrada: found ? Number(found.receita) : 0,
          saida: found ? Number(found.despesa) : 0,
        });
      }
    } else {
      // Calculate days diff
      const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
      for (let i = 0; i <= daysDiff; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const found = flowDataRaw.find(f => {
          const fDate = new Date(f.data_ref).toISOString().split('T')[0];
          return fDate === dateStr;
        });
        
        // Se for mes, usamos o dia do mes (ex: 01, 02). Se for semana usamos dia da semana (Seg, Ter)
        let label = '';
        if (daysDiff > 14) {
          label = d.getDate().toString().padStart(2, '0');
        } else {
          label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
        }

        flowData.push({
          day: label,
          entrada: found ? Number(found.receita) : 0,
          saida: found ? Number(found.despesa) : 0,
        });
      }
    }

    return {
      kpis: {
        receitaTotal: Number(receitaPeriod),
        variation: variation.toFixed(1),
        comissoesPendentes: totalCommissions,
        despesas: Number(despesasPeriod),
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

  async generateReportCSV(period) {
    const { startDate, endDate } = this.getDateRanges(period);
    const transactions = await repo.getAllTransactions(startDate, endDate);

    // CSV Header com BOM (Byte Order Mark) para garantir que o Excel abra em UTF-8
    let csv = "\uFEFFData,Tipo,Valor,Metodo de Pagamento,Cliente,Servico\n";

    // Format rows
    for (const t of transactions) {
      const dateStr = new Date(t.created_at).toLocaleDateString('pt-BR');
      const valStr = Number(t.amount).toFixed(2).replace('.', ',');
      const client = t.client_name || 'Avulso';
      const serv = t.service_name || 'N/A';
      
      // Escape commas in strings just in case
      const clientEscaped = `"${client.replace(/"/g, '""')}"`;
      const servEscaped = `"${serv.replace(/"/g, '""')}"`;

      csv += `${dateStr},${t.transaction_type},R$ ${valStr},${t.payment_method},${clientEscaped},${servEscaped}\n`;
    }

    return csv;
  }

  async addExpense(category, amount) {
    if (amount <= 0) throw new Error("Valor deve ser maior que zero.");
    return await repo.createExpense(category, amount);
  }
  async generateAIInsights(period) {
    if (!process.env.AI_API_KEY) {
      throw new Error("Chave de API da Inteligência Artificial (AI_API_KEY) não configurada.");
    }

    const dashboardData = await this.getDashboardData(period);
    
    // Formatar os dados como um objeto JSON estruturado
    const dataSummary = {
      periodo: period,
      kpis: {
        receitaTotal: Number(dashboardData.kpis.receitaTotal),
        despesasOperacionais: Number(dashboardData.kpis.despesas),
        comissoesPendentes: Number(dashboardData.kpis.comissoesPendentes),
        fluxoDeCaixaLiquido: Number(dashboardData.kpis.fluxoLiquido),
        variacaoPercentualReceita: Number(dashboardData.kpis.variation)
      },
      // Passar também os agregados diários/mensais para a IA poder encontrar tendências
      tendenciaDeCaixa: dashboardData.flowData
    };

    const prompt = `Analise os seguintes dados financeiros reais do banco de dados (em BRL):
\`\`\`json
${JSON.stringify(dataSummary, null, 2)}
\`\`\`

Gere o seu relatório estruturado em Markdown conforme as diretrizes da sua persona. Você deve incluir obrigatoriamente:
1. 3 Pontos Críticos de Despesa (analise rapidamente o impacto).
2. 2 Oportunidades de Alavancagem de Lucro (focado em serviços de estética premium).
3. 1 Plano de Ação Imediato (o que o dono da loja deve fazer hoje ou amanhã).
`;

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const { AI_PERSONA } = require('../utils/aiPersona');

    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
    
    // Injetar o AI_PERSONA como systemInstruction (recurso avançado do Gemini)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: AI_PERSONA
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

module.exports = new FinancialService();
