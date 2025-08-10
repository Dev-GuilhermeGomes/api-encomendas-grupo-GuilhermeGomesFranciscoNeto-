const express = require("express");
const db = require("../db");
const { autenticar } = require("../autenticacao");

const router = express.Router();

// Perfil do utilizador autenticado.
router.get("/me", autenticar, async (req, res) => {
  const linhas = await db.query(
    `SELECT * FROM utilizadores WHERE id = ${req.utilizador.sub}`
  );

  if (linhas.length === 0) {
    return res.status(404).json({ erro: "não encontrado" });
  }

  res.json(linhas[0]);
});

module.exports = router;
