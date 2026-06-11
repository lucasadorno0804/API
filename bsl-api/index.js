require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedule');
const checkoutRoutes = require('./routes/checkout');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/financial', require('./routes/financial'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/inspections', require('./routes/inspections'));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
