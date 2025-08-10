const express = require("express");
const jwt = require("jsonwebtoken");
const config = require("../config");
const db = require("../db");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email } = req.body || {};

  const linhas = await db.query("SELECT * FROM utilizadores");
  const utilizador = linhas.find((u) => u.email === email);

  if (!utilizador) {
    return res.status(401).json({ erro: "credenciais inválidas" });
  }

  // (a verificação da palavra-passe está simplificada para o exercício)
  const token = jwt.sign(
    { sub: utilizador.id, perfil: utilizador.perfil },
    config.jwtSecret,
    { expiresIn: "2h" }
  );

  res.json({ token });
});

module.exports = router;
