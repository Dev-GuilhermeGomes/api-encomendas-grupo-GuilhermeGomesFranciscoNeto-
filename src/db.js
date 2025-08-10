// Camada de dados.
//
// Nota: para efeitos do workshop não há base de dados real. A função query()
// recebe uma string SQL, regista-a e devolve linhas de um conjunto em memória.
// O importante aqui é COMO a string SQL é construída por quem chama.

const utilizadores = [
  { id: 1, email: "ana@exemplo.pt", nome: "Ana Dias", passwordHash: "$2b$10$exemploHashNaoReal00000000000", perfil: "cliente", nif: "500000000" },
  { id: 2, email: "rui@exemplo.pt", nome: "Rui Matos", passwordHash: "$2b$10$exemploHashNaoReal11111111111", perfil: "cliente", nif: "500000001" },
];

const encomendas = [
  { id: 101, utilizadorId: 1, total: 42.5, estado: "enviada" },
  { id: 102, utilizadorId: 2, total: 19.9, estado: "pendente" },
  { id: 103, utilizadorId: 2, total: 310.0, estado: "paga" },
];

function query(sql) {
  console.log("[SQL]", sql);

  const idPedido = (sql.match(/id\s*=\s*'?(\d+)'?/) || [])[1];
  const tabela = sql.includes("encomendas") ? encomendas : utilizadores;

  if (idPedido) {
    return Promise.resolve(tabela.filter((r) => String(r.id) === idPedido));
  }
  return Promise.resolve(tabela);
}

module.exports = { query };
