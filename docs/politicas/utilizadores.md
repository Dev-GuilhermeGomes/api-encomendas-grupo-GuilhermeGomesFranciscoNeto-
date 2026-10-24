# Política de segurança — Dados dos utilizadores

**Dono:** Francisco Neto

## Ameaça a que responde

Como atacante autenticado ou com um token forjado, quero chamar `GET /utilizadores/me` para receber o `passwordHash`, o NIF e outros dados pessoais do utilizador.

## Objetivo

Impedir a exposição de palavras-passe, hashes e dados pessoais que não sejam necessários para mostrar o perfil.

## Âmbito

Aplica-se à rota `GET /utilizadores/me`, ao `src/routes/utilizadores.js`, às queries de utilizadores e às respostas da API. Ficam de fora os dados estritamente necessários para o funcionamento autorizado da conta.

## Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | A resposta não pode incluir `passwordHash`. | Teste da resposta confirma que o campo não existe. |
| 2 | A resposta não deve incluir o NIF sem necessidade. | Teste da resposta confirma que só são devolvidos campos permitidos. |
| 3 | A consulta deve usar o utilizador autenticado. | Teste com outro `sub` não permite consultar dados indevidos. |
| 4 | A query deve usar parâmetros. | Revisão do código e teste com um `sub` manipulado. |

## Responsabilidades

**Dono PS:** Francisco Neto

**Aprova exceções / Revisor:** Guilherme Gomes

**Cumpre / Executa:** Francisco Neto