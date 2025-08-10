const express = require("express");
const config = require("./config");

const auth = require("./routes/auth");
const encomendas = require("./routes/encomendas");
const utilizadores = require("./routes/utilizadores");

const app = express();
app.use(express.json());

app.use("/auth", auth);
app.use("/encomendas", encomendas);
app.use("/utilizadores", utilizadores);

app.get("/saude", (req, res) => res.json({ ok: true }));

if (require.main === module) {
  app.listen(config.porta, () => {
    console.log(`api-encomendas a escutar na porta ${config.porta}`);
  });
}

module.exports = app;
