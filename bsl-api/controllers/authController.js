const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Busca o usuário no banco (aqui assumimos que o campo username ou email armazena o email)
    const result = await pool.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'bsl_secret_key',
      { expiresIn: '1d' }
    );

    res.status(200).json({ token, user: { name: user.owner_name || user.username, email: user.username, company: user.company_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

exports.register = async (req, res) => {
  const { ownerName, companyName, email, whatsapp, password } = req.body;

  try {
    // Verifica se o e-mail já está sendo usado (username)
    const checkResult = await pool.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [email]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    // Cria o hash da senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insere o usuário com os novos campos
    const insertQuery = `
      INSERT INTO users (username, password_hash, owner_name, company_name, whatsapp)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, username, owner_name, company_name
    `;
    const result = await pool.query(insertQuery, [email, passwordHash, ownerName, companyName, whatsapp]);
    const user = result.rows[0];

    // Gera o JWT logo após o cadastro
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'bsl_secret_key',
      { expiresIn: '1d' }
    );

    res.status(201).json({ token, user: { name: user.owner_name, email: user.username, company: user.company_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
};
