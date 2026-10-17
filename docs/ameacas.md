# Modelo de ameaças — api-encomendas

**Grupo:** NN

Análise feita sobre o código completo do repositório (`src/`, `package.json`, CI, `README.md`, `.gitleaks.toml`). Nota: o `README.md` diz que a API está **«em produção desde 2025»**, por isso tudo o que está "simplificado" no código deve ser tratado como real.

## Casos de abuso

Formato: «Como atacante, quero *fazer X*, para *conseguir Y*.»

### 1. Entrar com o email de outra pessoa
Como atacante, quero **fazer `POST /auth/login` só com o email de outro utilizador (sem palavra-passe)**, para **obter um token válido e ficar a agir como essa pessoa durante 2 horas**.
- **Onde:** `src/routes/auth.js:9-25`. O código só procura o email; `passwordHash` nunca é verificado. O comentário diz que está «simplificado para o exercício», mas a API está em produção.
- **Exemplo:** `{"email":"ana@exemplo.pt"}` devolve um token da Ana.
- **Mitigação:** comparar a palavra-passe com `bcrypt.compare`, mensagem de erro igual para email e palavra-passe errados.

### 2. Forjar tokens com o segredo que está no código
Como atacante, quero **ler o segredo JWT que está escrito em `config.js` (repositório, forks, histórico do Git ou um colaborador que saia)**, para **assinar os meus próprios tokens com qualquer `sub` e `perfil` (por exemplo `admin`) sem passar pelo login**.
- **Onde:** `src/config.js:9` (`jwtSecret: "istec_jwt_naoUsar_..."`). O TODO «mover para variáveis de ambiente» tem 14 meses. O nome do segredo («naoUsar») mostra que era um valor provisório que foi para produção.
- **Agravante:** mesmo depois de o mover para uma variável de ambiente, fica no histórico do Git, por isso tem de ser **rodado**.
- **Mitigação:** `process.env.JWT_SECRET` (falhar ao arrancar se não existir), rodar o segredo, ativar o `gitleaks` no CI.

### 3. Ver encomendas de outros clientes (IDOR / BOLA)
Como atacante, quero **autenticar-me como cliente normal e pedir `GET /encomendas/102`, `/103`… (IDs de outros)**, para **ler encomendas, totais e estados que não são minhas**.
- **Onde:** `src/routes/encomendas.js:8-18`. A rota exige token, mas nunca compara `utilizadorId` da encomenda com `req.utilizador.sub`. Os IDs são sequenciais e fáceis de adivinhar.
- **Mitigação:** `WHERE id = ? AND utilizador_id = ?` (ou verificar o dono antes de responder) e devolver 404 se não for o dono.

### 4. Injeção de SQL
Como atacante, quero **enviar `GET /encomendas/0 OR 1=1` (ou `UNION SELECT ... FROM utilizadores`)**, para **extrair todas as encomendas e dados de outras tabelas, incluindo hashes de palavras-passe**.
- **Onde:** `src/routes/encomendas.js:10` (concatenação com `req.params.id`) e `src/routes/utilizadores.js:10` (template string com `req.utilizador.sub`; combinado com o caso 2, o atacante controla o `sub`).
- **Nota:** `db.js` simula a base de dados, mas o próprio ficheiro diz que o que importa é **como a string SQL é construída**; com uma base real isto é injetável.
- **Mitigação:** queries parametrizadas, validar que `:id` é um inteiro.

### 5. Roubar o hash da palavra-passe e o NIF do perfil
Como atacante, quero **chamar `GET /utilizadores/me` com um token válido (meu ou forjado)**, para **receber `passwordHash`, `nif` e restantes campos, e tentar quebrar o hash offline ou usar o NIF para fraude**.
- **Onde:** `src/routes/utilizadores.js:9-17` usa `SELECT *` e devolve `linhas[0]` inteiro.
- **Mitigação:** selecionar só os campos necessários (`id, nome, email`) e nunca devolver `passwordHash`.

### 6. Deitar a API abaixo com um pedido mal formado
Como atacante, quero **enviar um `id` que provoque erro na base de dados (por exemplo `abc'`)**, para **provocar uma rejeição de promessa não tratada e fazer cair o processo (negação de serviço)**.
- **Onde:** os handlers `async` em `encomendas.js`, `utilizadores.js` e `auth.js` não têm `try/catch`. No Express 4 um erro assíncrono não vai para o tratamento de erros e, no Node ≥ 15, uma rejeição não tratada termina o processo.
- **Mitigação:** `try/catch` ou wrapper para async, middleware de erros, validação de entrada, supervisor que reinicie o processo.

### 7. Adivinhar palavras-passe por força bruta
Como atacante, quero **fazer milhares de tentativas de login por minuto (credential stuffing)**, para **descobrir palavras-passe válidas assim que o caso 1 for corrigido**.
- **Onde:** `src/routes/auth.js` não tem limite de tentativas, bloqueio nem atraso.
- **Mitigação:** `express-rate-limit` no `/auth/login`, bloqueio progressivo, alertas.

### 8. Explorar uma dependência antiga
Como atacante, quero **atacar vulnerabilidades conhecidas do `lodash@4.17.11` (fixado sem `^`)**, para **conseguir poluição de protótipo, execução de comandos via `_.template` ou ReDoS**.
- **Onde:** `package.json:14`. Esta versão tem CVEs conhecidos (por exemplo CVE-2019-10744, CVE-2020-8203, CVE-2021-23337, CVE-2020-28500). O `lodash` nem sequer é usado em `src/`, por isso é superfície de ataque sem utilidade.
- **Mitigação:** remover a dependência (ou subir para ≥ 4.17.21), adicionar `npm audit`/Dependabot ao CI.

### 9. Meter código malicioso diretamente no `main`
Como atacante (ou colaborador comprometido), quero **fazer push direto para o `main`**, para **introduzir código malicioso ou alterar o pipeline sem que ninguém reveja**.
- **Onde:** o `README.md` diz «o `main` aceita integração direta». O CI (`.github/workflows/testes.yml`) só corre um teste de fumo, sem gitleaks, sem `npm audit`, sem análise estática; e as *actions* estão fixadas por tag (`@v4`) e não por SHA.
- **Mitigação:** proteção do ramo (PR + aprovação + checks obrigatórios), CODEOWNERS para `.github/`, pinar *actions* por SHA, permissões mínimas do `GITHUB_TOKEN`.

### 10. Aproveitar os logs e o carregamento total de dados
Como atacante, quero **enviar pedidos com texto malicioso ou muitas chamadas a `GET /encomendas`**, para **poluir/forjar linhas nos logs e sobrecarregar a memória do servidor**.
- **Onde:** `src/db.js:19` regista o SQL completo (dados pessoais e payloads); `src/routes/encomendas.js:22-23` carrega **todas** as encomendas de **todos** os utilizadores e só depois filtra em memória (qualquer bug no filtro expõe tudo, e o custo cresce com os dados).
- **Mitigação:** não registar SQL com dados, filtrar na query (`WHERE utilizador_id = ?`), paginação.

### Outros achados menores
- Sem `helmet`, sem CORS definido e `X-Powered-By` ativo.
- `jwt.verify` sem `algorithms` explícito e sem revogação de tokens (2 h fixos).
- `ambiente` assume `"development"` se `NODE_ENV` não existir; `apiKeyPagamentos` pode ficar `undefined` sem a app falhar.
- `.gitignore` tem a linha `.DS_Store` repetida (trivial).

## As quatro que não aceitamos correr

Critério: **impacto** (acesso a dados/contas de terceiros) × **probabilidade** (explorável por qualquer pessoa, sem ferramentas especiais) × **custo de correção** baixo.

| # | Ameaça | Onde na API |
|---|--------|-------------|
| 1 | Login sem verificar a palavra-passe: qualquer pessoa entra como qualquer utilizador só com o email (caso 1) | `POST /auth/login` — `src/routes/auth.js` |
| 2 | Segredo JWT escrito no código: qualquer pessoa com acesso ao repositório forja tokens com qualquer `sub`/`perfil` (caso 2) | `src/config.js:9` / `src/autenticacao.js` (afeta todas as rotas protegidas) |
| 3 | IDOR: um cliente lê encomendas de outros clientes pelo `id` (caso 3) | `GET /encomendas/:id` — `src/routes/encomendas.js` |
| 4 | Injeção de SQL por concatenação de strings (caso 4) | `GET /encomendas/:id` e `GET /utilizadores/me` — `encomendas.js:10`, `utilizadores.js:10` |

Os casos 5 a 10 ficam em *backlog*: o caso 5 (fuga de `passwordHash`/NIF) é grave e deve entrar logo a seguir.
