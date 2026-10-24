# Política de segurança — Configuração e segredo JWT

**Dono:** Guilherme Gomes

## Ameaça a que responde

Como atacante, quero ler o segredo JWT escrito em `src/config.js`, através do repositório, forks, histórico do Git ou de um colaborador que saia, para assinar tokens com qualquer `sub` e `perfil`.

## Objetivo

Impedir que o segredo JWT seja exposto e usado para criar tokens falsos.

## Âmbito

Aplica-se ao `src/config.js`, às variáveis de ambiente, aos deployments, aos logs, ao histórico do Git e aos branches e pull requests que alterem a configuração. Ficam de fora os segredos que não sejam usados pela autenticação JWT.

## Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | O segredo JWT deve estar numa variável de ambiente e não no código. | Revisão do `src/config.js` confirma o uso de `process.env.JWT_SECRET`. |
| 2 | A aplicação deve falhar se `JWT_SECRET` não estiver definido. | Teste de arranque sem a variável definida. |
| 3 | Um segredo exposto deve ser rodado em todos os ambientes. | Token assinado com o segredo antigo deixa de ser aceite. |
| 4 | Segredos não podem aparecer no histórico ou nos logs. | Verificação com `gitleaks` e revisão dos logs. |

## Responsabilidades

**Dono PS:** Guilherme Gomes

**Aprova exceções / Revisor:** Francisco Neto

**Cumpre / Executa:** Guilherme Gomes
