# Política de segurança — Autenticação

**Dono:** Guilherme Gomes

## Ameaça a que responde

Como atacante, quero fazer `POST /auth/login` só com o email de outro utilizador, sem indicar a palavra-passe, para obter um token válido e agir como essa pessoa durante 2 horas. A rota em `src/routes/auth.js` procura o email, mas não compara o `passwordHash`.

## Objetivo

Impedir que alguém entre na conta de outro utilizador sem provar que sabe a palavra-passe.

## Âmbito

Aplica-se ao `POST /auth/login`, à validação das credenciais, à criação de tokens e aos testes de autenticação. Inclui pedidos sem palavra-passe, com palavra-passe errada ou com email inexistente. Ficam de fora as rotas que não fazem login.

## Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | O login deve verificar a palavra-passe antes de criar o token. | Teste com credenciais corretas devolve `200` e um token. |
| 2 | Pedidos sem palavra-passe ou com palavra-passe errada devem ser recusados. | Os dois casos devolvem `401`. |
| 3 | Email inexistente e palavra-passe errada devem ter a mesma resposta. | Teste automático compara o código e a mensagem. |
| 4 | O login deve ter limite de tentativas. | Teste de várias tentativas confirma o bloqueio ou rate limit. |

## Responsabilidades

**Dono PS:** Guilherme Gomes

**Aprova exceções / Revisor:** Francisco Neto

**Cumpre / Executa:** Guilherme Gomes
