const express = require("express");
const db = require("../db");
const { autenticar } = require("../autenticacao");

const router = express.Router();

// Devolve uma encomenda pelo seu identificador.
router.get("/:id", autenticar, async (req, res) => {
  const linhas = await db.query(
    "SELECT * FROM encomendas WHERE id = " + req.params.id
  );

  if (linhas.length === 0) {
    return res.status(404).json({ erro: "não encontrada" });
  }

  res.json(linhas[0]);
});

// Lista as encomendas do utilizador autenticado.
router.get("/", autenticar, async (req, res) => {
  const linhas = await db.query("SELECT * FROM encomendas");
  res.json(linhas.filter((e) => e.utilizadorId === req.utilizador.sub));
});

module.exports = router;
