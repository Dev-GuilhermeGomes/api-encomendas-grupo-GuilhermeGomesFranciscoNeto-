# api-encomendas

API de encomendas. Em produção desde 2025.

## Correr localmente

```
npm install
npm start
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Autenticação, devolve token |
| GET | `/encomendas` | Encomendas do utilizador autenticado |
| GET | `/encomendas/:id` | Uma encomenda |
| GET | `/utilizadores/me` | Perfil do utilizador autenticado |
| GET | `/saude` | Estado do serviço |

## Notas da equipa anterior

- Há um TODO antigo no `src/config.js` sobre variáveis de ambiente.
- Nunca chegámos a pôr verificações de segurança no CI.
- O `main` aceita integração direta.
