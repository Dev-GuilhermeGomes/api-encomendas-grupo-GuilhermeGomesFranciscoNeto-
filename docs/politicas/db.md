# Política de segurança — Base de dados

**Dono:** Guilherme Gomes

## Ameaça a que responde

Como atacante, quero enviar valores manipulados nos parâmetros da API para alterar queries SQL, consultar dados de outros utilizadores ou provocar erros no servidor.

## Objetivo

Impedir injeção de SQL, exposição de dados e registos inseguros nas queries da base de dados.

## Âmbito

Aplica-se ao `src/db.js`, às queries construídas nas rotas, aos parâmetros recebidos pela API e aos logs da aplicação. Inclui a futura ligação a uma base de dados real. Ficam de fora os dados que não sejam processados pela camada de dados.

## Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | As queries devem usar parâmetros e nunca concatenação de input do utilizador. | Revisão do código e teste com payload de SQL injection. |
| 2 | Os parâmetros numéricos devem ser validados antes da query. | Valores inválidos devolvem `400` e não chegam à query. |
| 3 | Os logs não devem guardar queries com dados sensíveis. | Revisão dos logs depois de pedidos autenticados. |
| 4 | Erros da base de dados não devem terminar o processo. | Teste com pedido inválido e confirmação de que a API continua disponível. |

## Responsabilidades

**Dono PS:** Guilherme Gomes

**Aprova exceções / Revisor:** Francisco Neto

**Cumpre / Executa:** Guilherme Gomes
