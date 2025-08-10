const jwt = require("jsonwebtoken");
const config = require("./config");

// Confirma que o pedido traz um token válido e coloca o utilizador em req.utilizador.
function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || "";
  const token = cabecalho.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ erro: "sem token" });
  }

  try {
    req.utilizador = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (e) {
    return res.status(401).json({ erro: "token inválido" });
  }
}

module.exports = { autenticar };
