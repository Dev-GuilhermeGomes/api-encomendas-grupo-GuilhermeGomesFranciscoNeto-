# Política de segurança — Encomendas

**Dono:** Francisco Neto

## Ameaça a que responde

Como atacante autenticado, quero alterar o ID em `GET /encomendas/:id` para consultar encomendas de outros clientes, ou enviar um valor malformado para explorar a query.

## Objetivo

Garantir que cada utilizador só consegue consultar as suas próprias encomendas.

## Âmbito

Aplica-se as rotas `GET /encomendas` e `GET /encomendas/:id`, ao `src/routes/encomendas.js`, a autenticação e a validação dos IDs.Ficam de fora as operações administrativas que ainda não existem.

## Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | Uma encomenda só pode ser devolvida ao seu dono. | Pedido com ID de outro cliente devolve `404` ou `403`. |
| 2 | O ID da encomenda deve ser validado como inteiro. | ID inválido devolve `400`. |
| 3 | A query deve filtrar pelo ID e pelo utilizador autenticado. | Revisão da query e teste entre dois utilizadores. |
| 4 | A lista de encomendas deve ser filtrada na base de dados. | A query inclui o identificador do utilizador e suporta paginação. |

## Responsabilidades

**Dono PS:** Francisco Neto

**Aprova exceções / Revisor:** Guilherme Gomes

**Cumpre / Executa:** Francisco Neto
