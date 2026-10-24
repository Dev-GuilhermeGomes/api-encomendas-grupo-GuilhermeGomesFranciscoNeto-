# Política de segurança — Exposição de passwordHash e NIF
**Dono:** Francisco Neto

## Ameaça a que responde
Como atacante autenticado (com token meu ou forjado), quero chamar `GET /utilizadores/me`, para receber `passwordHash`, `nif` e restantes campos, e tentar quebrar o hash offline ou usar o NIF para fraude. *(`src/routes/utilizadores.js:6-17` — usa `SELECT *` e devolve `linhas[0]` inteiro.)*

## Objetivo
Evitar que a API devolva o `passwordHash`, o NIF ou outros dados pessoais desnecessários.

## Âmbito
Aplica-se à rota `GET /utilizadores/me`, ao `src/routes/utilizadores.js`, às queries de utilizadores e às respostas da API. Ficam de fora os dados mínimos necessários para o funcionamento autorizado da conta.

## Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | A resposta não pode incluir `passwordHash`. | Teste da resposta confirma que o campo não existe. |
| 2 | A resposta não deve incluir o NIF sem necessidade. | Teste da resposta confirma que só são devolvidos campos permitidos. |
| 3 | A query deve selecionar apenas os campos necessários. | Revisão da query confirma que não usa `SELECT *`. |

## Responsabilidades

**Dono PS:** Francisco Neto

**Aprova exceções / Revisor:** Guilherme Gomes

**Cumpre / Executa:** programador responsável pelos utilizadores.