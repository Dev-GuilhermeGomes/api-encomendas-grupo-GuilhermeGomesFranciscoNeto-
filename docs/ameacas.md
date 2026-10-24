# Modelo de ameaças — api-encomendas

**Grupo:** Guilherme Gomes e Francisco Neto / Gameplay RJ

Análise feita sobre o código completo do repositório (`src/`, `package.json`, CI, `README.md`, `.gitleaks.toml`). Nota: o `README.md` diz que a API está **«em produção desde 2025»**, por isso tudo o que está "simplificado" no código deve ser tratado como risco real, não como exercício teórico.

## Casos de abuso

Formato: «Como atacante, quero *fazer X*, para *conseguir Y*.»

### Autenticação e autorização

1. **Entrar com o email de outra pessoa.** Como atacante, quero fazer `POST /auth/login` só com o email de outro utilizador (sem palavra-passe), para obter um token válido e agir como essa pessoa durante 2 horas.
   - **Onde:** `src/routes/auth.js:9-15`. A rota só procura o email; `passwordHash` nunca é comparado. `{"email":"ana@exemplo.pt"}` já devolve um token da Ana.
   - **Mitigação:** comparar com `bcrypt.compare`; mensagem de erro igual para email e palavra-passe errados (evitar enumeração).

2. **Forjar tokens com o segredo que está no código.** Como atacante, quero ler o segredo JWT escrito em `config.js` (repositório, forks, histórico do Git ou um colaborador que saia), para assinar os meus próprios tokens com qualquer `sub` e `perfil` — por exemplo `admin` — sem passar pelo login.
   - **Onde:** `src/config.js:8` (`jwtSecret: "istec_jwt_naoUsar_..."`), usado cegamente por `src/autenticacao.js:14` e em `src/routes/auth.js`. O TODO «mover para variáveis de ambiente» tem 14 meses; o nome do segredo («naoUsar») mostra que era um valor provisório que foi parar a produção.
   - **Agravante:** mesmo depois de mover para variável de ambiente, fica no histórico do Git — tem de ser **rodado**, não só movido.
   - **Mitigação:** `process.env.JWT_SECRET` (falhar o arranque se não existir), rodar o segredo, ativar `gitleaks` no CI.

3. **Escalada de privilégio latente via `perfil`.** Como atacante, quero explorar o facto de o `perfil` do JWT nunca ser verificado em nenhuma rota, para ficar pronto a escalar privilégios no dia em que existir um endpoint de administração.
   - **Onde:** `src/autenticacao.js` só confirma assinatura e expiração; nenhuma rota em `src/routes/` lê `req.utilizador.perfil`. Combinado com o caso 2, um atacante já pode emitir hoje um token com `perfil: "admin"`.
   - **Mitigação:** middleware de autorização por `perfil`/`scope` em cada rota sensível, desde já — não esperar pelo endpoint de admin para o implementar.

4. **Força bruta / enumeração de contas.** Como atacante, quero fazer milhares de tentativas de login por minuto, para adivinhar palavras-passe ou confirmar que emails existem — e já hoje para explorar o caso 1 em massa.
   - **Onde:** `src/routes/auth.js` não tem limite de tentativas, bloqueio nem atraso.
   - **Mitigação:** `express-rate-limit` em `/auth/login`, bloqueio progressivo, alertas.

### Injeção e validação de entrada

5. **Injeção de SQL.** Como atacante, quero enviar `GET /encomendas/0 OR 1=1` (ou `UNION SELECT ... FROM utilizadores`), para alterar a query executada e tentar extrair dados de outras tabelas, incluindo hashes de palavras-passe.
   - **Onde:** `src/routes/encomendas.js:8-10` (concatenação com `req.params.id`) e `src/routes/utilizadores.js:10` (template string com `req.utilizador.sub`; combinado com o caso 2, o atacante controla o próprio `sub`).
   - **Nota de impacto real:** `db.js` é um mock em memória que só extrai o primeiro número via regex (`id\s*=\s*'?(\d+)'?`), por isso hoje o efeito prático é limitado. O padrão de código é injetável; com uma base de dados real o payload passa tal e qual.
   - **Mitigação:** queries parametrizadas, validar que `:id` é inteiro.

### Autorização indevida entre utilizadores (IDOR / BOLA)

6. **Ver encomendas de outros clientes.** Como atacante autenticado (com o meu próprio token válido), quero pedir `GET /encomendas/102`, `/103`… com IDs de outras pessoas, para ler totais e estados de encomendas que não são minhas.
   - **Onde:** `src/routes/encomendas.js:8-18`. A rota exige token mas nunca compara `utilizadorId` da encomenda com `req.utilizador.sub`; só `GET /encomendas` (sem id) filtra por utilizador. Os IDs são sequenciais e fáceis de adivinhar.
   - **Mitigação:** `WHERE id = ? AND utilizador_id = ?` (ou verificar o dono antes de responder) e devolver 404 se não for o dono.

### Exposição de dados sensíveis

7. **Roubar hash da palavra-passe e NIF.** Como atacante autenticado (com token meu ou forjado), quero chamar `GET /utilizadores/me`, para receber `passwordHash`, `nif` e restantes campos, e tentar quebrar o hash offline ou usar o NIF para fraude.
   - **Onde:** `src/routes/utilizadores.js:6-17` usa `SELECT *` e devolve `linhas[0]` inteiro.
   - **Mitigação:** selecionar só os campos necessários (`id, nome, email`); nunca devolver `passwordHash`.

8. **Fuga via logs.** Como atacante, quero ler os logs do servidor, para ver as queries SQL completas — incluindo payloads injetados por mim ou por outros, e potencialmente dados de clientes.
   - **Onde:** `src/db.js:16-19` — `console.log("[SQL]", sql)` regista a string inteira em cada pedido, sem redação nem controlo de nível de log.
   - **Mitigação:** não registar SQL com dados de utilizador; separar log técnico de log com PII.

### Disponibilidade

9. **Negar serviço com um pedido mal formado.** Como atacante, quero enviar um `id` que provoque erro na base de dados (por exemplo `abc'`), para causar uma rejeição de promessa não tratada e derrubar o processo.
   - **Onde:** os handlers `async` em `encomendas.js`, `utilizadores.js` e `auth.js` não têm `try/catch`. No Express 4 um erro assíncrono não chega ao tratamento de erros, e no Node ≥ 15 uma rejeição não tratada termina o processo.
   - **Mitigação:** `try/catch` ou wrapper para rotas async, middleware de erros global, supervisor que reinicie o processo.

10. **Sobrecarregar com leitura total em memória.** Como atacante, quero chamar `GET /encomendas` repetidamente, para forçar o servidor a carregar sempre a tabela inteira de encomendas de todos os utilizadores antes de filtrar.
    - **Onde:** `src/routes/encomendas.js:22-23` — `db.query("SELECT * FROM encomendas")` traz tudo e só depois filtra em memória por `utilizadorId`. Qualquer bug futuro no filtro expõe os dados de toda a gente, e o custo cresce com o volume de dados.
    - **Mitigação:** filtrar na própria query (`WHERE utilizador_id = ?`), paginação.

### Configuração e cadeia de fornecimento

11. **Stack trace exposto em erro.** Como atacante, quero provocar um pedido inválido (ex.: JSON malformado), para ver um stack trace com caminhos e detalhes internos do servidor.
    - **Onde:** `src/config.js:7` — `ambiente` cai por omissão em `"development"` se `NODE_ENV` não estiver definida; o tratador de erros por omissão do Express mostra stack trace quando `NODE_ENV !== "production"`, e não há tratador de erros próprio em `src/server.js`.
    - **Mitigação:** fixar `NODE_ENV=production` no deploy, tratador de erros próprio que nunca devolva stack trace ao cliente.

12. **Dependência antiga e desatualizada.** Como atacante, quero atacar vulnerabilidades conhecidas do `lodash@4.17.11` (fixado sem `^`), para conseguir poluição de protótipo, execução de comandos via `_.template` ou ReDoS, caso a dependência passe a ser usada em código novo.
    - **Onde:** `package.json` — versão com CVEs conhecidos (ex. CVE-2019-10744, CVE-2020-8203, CVE-2021-23337, CVE-2020-28500). Hoje não é importada em `src/` nem `test/`, por isso é risco de cadeia de fornecimento, não exploração atual.
    - **Mitigação:** remover a dependência (ou subir para ≥ 4.17.21), adicionar `npm audit`/Dependabot ao CI.

### Processo e pipeline

13. **Código malicioso direto no `main`.** Como atacante (ou colaborador comprometido), quero fazer push direto para o `main`, para introduzir código malicioso ou alterar o pipeline sem revisão de ninguém.
    - **Onde:** o `README.md` confirma «o `main` aceita integração direta» e «nunca chegámos a pôr verificações de segurança no CI». O `.github/workflows/testes.yml` só corre o teste de fumo — sem gitleaks, sem `npm audit`, sem análise estática — e as *actions* estão fixadas por tag (`@v4`), não por SHA.
    - **Mitigação:** proteção do ramo (PR + aprovação + checks obrigatórios), CODEOWNERS para `.github/`, pinar *actions* por SHA, permissões mínimas do `GITHUB_TOKEN`.

### Outros achados menores

- Sem `helmet`, sem CORS definido e `X-Powered-By` ainda ativo.
- `jwt.verify` sem `algorithms` explícito e sem revogação de tokens (ficam válidos 2h fixas mesmo que a conta seja bloqueada entretanto).
- `apiKeyPagamentos` pode ficar `undefined` sem a aplicação falhar ao arrancar — falha silenciosa de configuração.
- `.gitignore` tem a linha `.DS_Store` repetida (trivial, sem impacto de segurança).

## Cadeia de ataque (combinação dos casos acima)

Os casos não são independentes. Com o segredo do JWT exposto (#2), um atacante forja um token com qualquer `sub`; chama `GET /utilizadores/me` desse utilizador (#7) e obtém `passwordHash` e `nif` de qualquer conta; combinado com #3, o mesmo token já pode trazer `perfil: "admin"`, pronto a usar no dia em que uma rota de administração for criada sem verificar esse campo. Um único segredo hardcoded abre caminho às duas falhas de exposição de dados mais graves da lista — e nem exige saber a palavra-passe de ninguém, porque o caso 1 já dispensa isso.

## As quatro que não aceitamos correr

**Critério:** impacto (acesso a dados/contas de terceiros) × probabilidade (explorável por qualquer pessoa, sem ferramentas especiais) × custo de correção baixo.

| # | Ameaça | Onde na API | Política |
|---|--------|-------------|----------|
| 1 | Login sem verificar a palavra-passe: qualquer pessoa entra como qualquer utilizador só com o email (caso 1) | `POST /auth/login` — `src/routes/auth.js` | [`auth.md`](politicas/auth.md) |
| 2 | Segredo JWT escrito no código: qualquer pessoa com acesso ao repositório forja tokens com qualquer `sub`/`perfil` (caso 2) | `src/config.js:8` / `src/autenticacao.js` (afeta todas as rotas protegidas) | [`config.md`](politicas/config.md) |
| 3 | IDOR: um cliente lê encomendas de outros clientes pelo `id` (caso 6) | `GET /encomendas/:id` — `src/routes/encomendas.js` | [`idor-encomendas.md`](politicas/idor-encomendas.md) |
| 4 | Exposição de `passwordHash` e NIF (caso 7) | `GET /utilizadores/me` — `src/routes/utilizadores.js` | [`exposicao-passwordhash-nif.md`](politicas/exposicao-passwordhash-nif.md) |

**Nota sobre o 4º lugar:**
- **Opção A — Injeção de SQL (caso 5).** É o padrão de vulnerabilidade mais "clássico" e mais fácil de justificar a um júri que procura OWASP Top 10. Contra: no mock deste workshop o impacto real é limitado, por isso a demonstração ao vivo ("Execução VERMELHA") fica menos impressionante do que parece no papel.
- **Opção B — Exposição de `passwordHash`/`nif` (caso 7).** Explora-se com um único `curl` autenticado, sem payload nenhum, e expõe diretamente uma credencial e um dado pessoal identificável (NIF) com valor fora da própria API. É mais fácil de demonstrar ao vivo do que a SQLi.

Foi escolhida a **Opção B**. A SQLi fica registada no backlog, porque o padrão de código continua errado e será um risco maior quando existir uma base de dados real.

**Justificação dos três consensuais:**
- **#1** — zero esforço de exploração (não precisa de saber nenhuma palavra-passe) e dá controlo total da conta.
- **#2** — um único segredo compromete *todos* os tokens emitidos, passados e futuros, e habilita a escalada latente do `perfil` (caso 3).
- **#3** — quebra o isolamento entre clientes, que é a garantia mínima de uma API de encomendas.

Os restantes casos (4, 5, 8-13) ficam em *backlog*, ordenados por impacto decrescente.