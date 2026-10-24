# Política de Segurança — api-encomendas

**Grupo:** NN · **Versão:** 0.1 · **Data:** 2026-10-24

## Objetivo

Impedir a falsificação de tokens JWT e o acesso a contas através de logins sem verificação da palavra-passe.

## Âmbito

Aplica-se ao código em `src/config.js`, `src/autenticacao.js` e `src/routes/auth.js`, às configurações de todos os ambientes, ao histórico do Git e aos branches e PRs que alterem autenticação, segredos ou o pipeline. Ficam fora desta política as restantes vulnerabilidades da API, salvo quando dependam diretamente destes controlos.

## Regras

| # | Regra | Como se verifica |
|---|-------|------------------|
| 1 | O segredo JWT não pode estar escrito no código, em ficheiros versionados ou em logs. | `jwtSecret` vem de `JWT_SECRET`; a aplicação falha ao arrancar se a variável não existir; `gitleaks` não encontra segredos no conteúdo nem no histórico. |
| 2 | O segredo JWT deve ser rodado quando é exposto ou quando um colaborador com acesso deixa a equipa. | O segredo é substituído em todos os ambientes e os tokens emitidos com o segredo anterior deixam de ser aceites. |
| 3 | O login só pode emitir um token depois de validar a palavra-passe contra o `passwordHash` armazenado. | Testes cobrem palavra-passe correta, palavra-passe incorreta e pedido sem palavra-passe; os dois últimos devolvem a mesma resposta de erro. |
| 4 | O endpoint de login não pode revelar se um email existe. | Os casos de email inexistente e de palavra-passe incorreta devolvem o mesmo código e mensagem. |
| 5 | Alterações a autenticação, gestão de segredos ou CI exigem revisão antes de chegar ao `main`. | O PR inclui testes e verificações de segredos, e é aprovado por pelo menos um responsável pelo projeto. |

## Quem aprova

Guilherme Gomes e Francisco Neto aprovam PRs que alterem autenticação, gestão de segredos ou o pipeline. Apenas membros autorizados podem alterar a configuração do CI ou fazer merge no `main`.

## Relato de vulnerabilidades

Problemas de segurança devem ser comunicados de forma privada aos donos do projeto, com a descrição do impacto, passos para reproduzir e, quando possível, uma correção proposta. Não devem ser publicados no repositório antes de existir uma correção ou mitigação.

## Guia das políticas

| Política | Ficheiro de apoio | Dono |
|---|---|---|
| Login sem verificar a palavra-passe | `docs/politicas/auth.md` | Guilherme Gomes |
| Segredo JWT escrito no código | `docs/politicas/config.md` | Guilherme Gomes |
| IDOR em encomendas | `docs/politicas/idor-encomendas.md` | Francisco Neto |
| Exposição de `passwordHash` e NIF | `docs/politicas/exposicao-passwordhash-nif.md` | Francisco Neto |

## Políticas específicas

### Política de segurança — Login sem verificar a palavra-passe

**Dono:** Guilherme Gomes

#### Ameaça a que responde

Como atacante, quero fazer `POST /auth/login` só com o email de outro utilizador (sem palavra-passe), para obter um token válido e agir como essa pessoa durante 2 horas. *(`src/routes/auth.js:9-15` — a rota só procura o email; `passwordHash` nunca é comparado.)*

#### Objetivo

Evitar que alguém consiga entrar na conta de outro utilizador apenas por saber o email, sem confirmar a palavra-passe.

#### Âmbito

Aplica-se ao `POST /auth/login`, ao `src/routes/auth.js`, à validação das credenciais e aos testes relacionados com o login. Ficam de fora as outras rotas e problemas que não estejam ligados à verificação da palavra-passe.

#### Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | O login deve verificar a palavra-passe antes de criar o token. | Teste com palavra-passe correta devolve `200` e um token. |
| 2 | Um pedido sem palavra-passe ou com palavra-passe errada deve ser recusado. | Os dois casos devolvem `401`. |
| 3 | Email inexistente e palavra-passe errada devem ter a mesma resposta. | Teste automático compara o código e a mensagem. |

#### Responsabilidades

**Dono PS:** Guilherme Gomes

**Aprova exceções / Revisor:** Francisco Neto

**Cumpre / Executa:** programador responsável pela autenticação.

### Política de segurança — Segredo JWT escrito no código

**Dono:** Guilherme Gomes

#### Ameaça a que responde

Como atacante, quero ler o segredo JWT escrito em `config.js` (repositório, forks, histórico do Git ou um colaborador que saia), para assinar os meus próprios tokens com qualquer `sub` e `perfil` — por exemplo `admin` — sem passar pelo login. *(`src/config.js:8` — `jwtSecret` hardcoded, usado cegamente por `src/autenticacao.js:14`.)*

#### Objetivo

Evitar que alguém descubra o segredo JWT e consiga criar tokens falsos para entrar na API como outro utilizador.

#### Âmbito

Aplica-se ao `src/config.js`, ao `src/autenticacao.js`, às variáveis de ambiente, ao histórico do Git e aos branches e pull requests que mexam na autenticação ou nos segredos. Ficam de fora os problemas que não estejam relacionados com o segredo JWT.

#### Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | O segredo JWT deve ficar numa variável de ambiente e não pode estar escrito no código. | Revisão do `src/config.js` confirma o uso de `process.env.JWT_SECRET`. |
| 2 | A aplicação deve falhar se `JWT_SECRET` não estiver definido. | Teste de arranque sem a variável definida. |
| 3 | Um segredo exposto deve ser rodado em todos os ambientes. | Tokens assinados com o segredo antigo deixam de funcionar. |
| 4 | O segredo não pode aparecer no histórico do Git ou nos logs. | Verificação com `gitleaks` e revisão dos logs. |

#### Responsabilidades

**Dono PS:** Guilherme Gomes

**Aprova exceções / Revisor:** Francisco Neto

**Cumpre / Executa:** responsável pelo deployment e pela configuração.

### Política de segurança — IDOR em encomendas

**Dono:** Francisco Neto

#### Ameaça a que responde

Como atacante autenticado (com o meu próprio token válido), quero pedir `GET /encomendas/102`, `/103`… com IDs de outras pessoas, para ler totais e estados de encomendas que não são minhas. *(`src/routes/encomendas.js:8-18` — a rota nunca compara `utilizadorId` da encomenda com `req.utilizador.sub`.)*

#### Objetivo

Impedir que um utilizador consiga consultar encomendas que pertencem a outra pessoa.

#### Âmbito

Aplica-se às rotas `GET /encomendas` e `GET /encomendas/:id`, ao `src/routes/encomendas.js`, à autenticação e à validação dos IDs. Ficam de fora as operações administrativas que ainda não existem.

#### Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | Uma encomenda só pode ser devolvida ao seu dono. | Um pedido com ID de outro cliente devolve `404` ou `403`. |
| 2 | O ID da encomenda deve ser validado como inteiro. | Um ID inválido devolve `400`. |
| 3 | A query deve filtrar pelo ID e pelo utilizador autenticado. | Revisão da query e teste entre dois utilizadores. |

#### Responsabilidades

**Dono PS:** Francisco Neto

**Aprova exceções / Revisor:** Guilherme Gomes

**Cumpre / Executa:** programador responsável pelas encomendas.

### Política de segurança — Exposição de passwordHash e NIF

**Dono:** Francisco Neto

#### Ameaça a que responde

Como atacante autenticado (com token meu ou forjado), quero chamar `GET /utilizadores/me`, para receber `passwordHash`, `nif` e restantes campos, e tentar quebrar o hash offline ou usar o NIF para fraude. *(`src/routes/utilizadores.js:6-17` — usa `SELECT *` e devolve `linhas[0]` inteiro.)*

#### Objetivo

Evitar que a API devolva o `passwordHash`, o NIF ou outros dados pessoais desnecessários.

#### Âmbito

Aplica-se à rota `GET /utilizadores/me`, ao `src/routes/utilizadores.js`, às queries de utilizadores e às respostas da API. Ficam de fora os dados mínimos necessários para o funcionamento autorizado da conta.

#### Regras

| # | Regra | Como se verifica |
|---|---|---|
| 1 | A resposta não pode incluir `passwordHash`. | Teste da resposta confirma que o campo não existe. |
| 2 | A resposta não deve incluir o NIF sem necessidade. | Teste da resposta confirma que só são devolvidos campos permitidos. |
| 3 | A query deve selecionar apenas os campos necessários. | Revisão da query confirma que não usa `SELECT *`. |

#### Responsabilidades

**Dono PS:** Francisco Neto

**Aprova exceções / Revisor:** Guilherme Gomes

**Cumpre / Executa:** programador responsável pelos utilizadores.
