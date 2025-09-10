// Configuração da aplicação.
// TODO (João, há 14 meses): mover estes valores para variáveis de ambiente
// antes de passar a produção.

const config = {
  porta: process.env.PORT || 3000,
  ambiente: process.env.NODE_ENV || "development",

  jwtSecret: "istec_jwt_naoUsar_7f3a9c21b8e64d05a1f2c3b4",
  apiKeyPagamentos: process.env.API_KEY_PAGAMENTOS,
};

module.exports = config;
