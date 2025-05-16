
  const express = require('express');
  const router = express.Router();
  const jwt = require('jsonwebtoken');
  const { v4: uuidv4 } = require('uuid');
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';
const JWT_EXPIRY = '10m'; 

router.post('/auth/anon', (req, res) => {
  const userId = uuidv4(); 

  const token = jwt.sign(
    { sub: userId }, 
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  res.json({ token });
});
module.exports = router