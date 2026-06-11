require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedule');
const checkoutRoutes = require('./routes/checkout');

const app = express();

// 1. Configuração do CORS
/*app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));*/

// 1. Configuração do CORS
app.use(cors({
  // Dica de segurança: Como já está em produção, é muito mais seguro 
  // trocar o '*' pela URL exata do seu frontend para evitar ataques.
  origin: 'https://esteticabsl.netlify.app',

  // Aqui está a mágica: adicionamos o PATCH na lista!
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/financial', require('./routes/financial'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/inspections', require('./routes/inspections'));

// 3. Arquivos estáticos
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. Inicialização do servidor (Correção das crases no console.log)
const PORT = process.env.PORT || 3000; // Usa a porta do env ou 3000 como padrão
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});