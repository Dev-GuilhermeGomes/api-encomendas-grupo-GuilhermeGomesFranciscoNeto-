# Política de segurança — IDOR em encomendas
**Dono:** Francisco Neto

## Ameaça a que responde
Como atacante autenticado (com o meu próprio token válido), quero pedir `GET /encomendas/102`, `/103`… com IDs de outras pessoas, para ler totais e estados de encomendas que não são minhas. *(`src/routes/encomendas.js:8-18` — a rota nunca compara `utilizadorId` da encomenda com `req.utilizador.sub`.)*

## Objetivo
Impedir que um utilizador consiga consultar encomendas que pertencem a outra pessoa.

## Âmbito
Aplica-se às rotas `GET /encomendas` e `GET /encomendas/:id`, ao `src/routes/encomendas.js`, à autenticação e à validação dos IDs. Ficam de fora as operações administrativas que ainda não existem.

## Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | Uma encomenda só pode ser devolvida ao seu dono. | Um pedido com ID de outro cliente devolve `404` ou `403`. |
| 2 | O ID da encomenda deve ser validado como inteiro. | Um ID inválido devolve `400`. |
| 3 | A query deve filtrar pelo ID e pelo utilizador autenticado. | Revisão da query e teste entre dois utilizadores. |

## Responsabilidades

**Dono PS:** Francisco Neto

**Aprova exceções / Revisor:** Guilherme Gomes

**Cumpre / Executa:** programador responsável pelas encomendas.