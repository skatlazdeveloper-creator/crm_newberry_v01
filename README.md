# Chatwoot -> Supabase (PostgreSQL) -> Vercel

Projeto Node.js ESM. Compatível com as tabelas no schema `core` de `chatwoot_relatorios_core.sql`.

## Instalação
1. Execute `chatwoot_core_instalacao_com_dados.sql` no SQL Editor do Supabase. Esse arquivo ja cria as 4 tabelas, insere 335 registros e cria a tabela auxiliar de controle de eventos.
2. Nao e necessario executar `schema_extra.sql` separadamente apos o SQL completo.
3. Faça upload desta pasta para um repositório Git e importe o repositório na Vercel; Framework Preset: Other. Configure as variáveis do `.env.example` no dashboard (Environment Variables). Não publique `.env`.
4. Configure o **Root Directory** como a raiz desta pasta e faça Deploy.
5. Teste `https://SEU-PROJETO.vercel.app/api/health`.
6. No Chatwoot: Settings -> Integrations -> Webhooks, adicione `https://SEU-PROJETO.vercel.app/api/webhook?token=WEBHOOK_TOKEN` e selecione `conversation_created`, `conversation_status_changed` e `conversation_updated` (eventos disponíveis variam conforme instalação). Alternativa mais segura: assine o webhook usando `CHATWOOT_WEBHOOK_SECRET` e configure o segredo de assinatura no Chatwoot; quando assinatura chega legível ao runtime, não é preciso token na URL. A rota sempre valida a assinatura se ela estiver presente e for configurada.

## O que é sincronizado automaticamente
O webhook nativo envia **eventos JSON e não exports CSV**. Aqui:
- `conversation_created`: incrementa `core.conversation_traffic` na data/hora local do evento.
- `conversation_status_changed` / `conversation_updated` com `status=resolved`: incrementa `core.resolution_heatmap` na data/hora local.
- `chatwoot_ingested_events` impede contagem duplicada para mesmo account/conversation/kind.

**Limitações:** histórico anterior à instalação não é preenchido; por design, primeira resolução é contada uma única vez por conversa, mesmo quando reaberta. A métrica pode divergir das definições internas do Chatwoot. Os campos de tempos médios e as tabelas `agent_report` e `label_report` exigem relatórios de origem (ou integração específica com os endpoints de relatório, dependentes da versão do Chatwoot). Não são calculados a partir de webhooks genéricos. O app **não solicita nem recebe CSVs automaticamente**.

## Atualização das quatro tabelas via JSON de relatórios
Acesse a página inicial, preencha `SYNC_TOKEN`, cole JSON normalizado e clique **Atualizar tabelas**. A mesma rota pode ser chamada por seu exportador/API:

```bash
curl -X POST 'https://SEU-PROJETO.vercel.app/api/import' \
  -H 'Content-Type: application/json' -H 'x-sync-token: SEU_SYNC_TOKEN' \
  --data '{"agent_report":[{"period_start":"2026-09-08","period_end":"2026-09-15","agent_name":"Ana","assigned_conversations":3,"resolution_count":2}],"label_report":[{"period_start":"2026-09-08","period_end":"2026-09-15","label_name":"suporte","conversation_count":4,"resolution_count":2}],"conversation_traffic":[{"traffic_date":"2026-09-14","hour_of_day":11,"conversation_count":8}],"resolution_heatmap":[{"resolution_date":"2026-09-14","hour_of_day":11,"resolution_count":4}]}'
```

`avg_first_response`, `avg_resolution`, `avg_customer_wait` e `avg_response` aceitam **valores INTERVAL do PostgreSQL**, como `02:15:00`, `1 day 04:00:00` ou `null`. Por padrão, chaves únicas executam UPSERT, não adicionam duplicatas. Limite 1000 linhas por tabela/requisição. A importação manual substitui contagens da mesma chave (não soma), então é recomendável escolher um único mecanismo como fonte oficial para contagens de tráfego/resolução.

## Segurança e conexão
- Use conexão via Supabase Session Pooler IPv4 quando Vercel não tiver IPv6; consulte a string exata no dashboard do Supabase.
- `DATABASE_URL` deve permanecer somente em variáveis secretas da Vercel; preferir usuário de banco com permissões mínimas às tabelas, jamais expor no HTML.
- `WEBHOOK_TOKEN` na URL deve ser longo e aleatório e pode aparecer em logs de acesso; quando viável use a assinatura nativa. **Existe relato de versões do Chatwoot com incompatibilidade de segredo de HMAC; teste na sua instalação.**
- Se você usou tabelas no schema `public`, defina `DB_SCHEMA=public` e edite `schema_extra.sql` para public.
- Os webhooks precisam ser configurados somente após criação do banco e das tabelas.

## Testes
`npm install && npm test`


## Correção do erro "No entrypoint found" (Vercel)
- `index.js` exporta uma aplicação Express, com rotas `/api/webhook`, `/api/import`, `/api/health` e a página `/`.
- Configure **Framework Preset = Express** (ou permita detecção automática).
- **Root Directory**: selecione a pasta que contém `package.json` e `index.js`. Neste ZIP, é `chatwoot-vercel` caso você suba a pasta externa; se copiar apenas o conteúdo da pasta para a raiz do GitHub, deixe Root Directory vazio.
- Build Command: padrão; Output Directory: padrão. `vercel.json` não cria rotas redundantes.
- Configure `DATABASE_URL`, `DB_SCHEMA=core`, `WEBHOOK_TOKEN` e `SYNC_TOKEN` nas variáveis de ambiente da Vercel. Use a connection string do Supabase Session Pooler se necessário.
- Teste `GET /api/health` após executar o SQL de criação das tabelas.
- Para desenvolvimento local: `npm install && npm start`.

Observação: o botão Atualizar importa JSON fornecido pelo usuário; não baixa relatórios CSV do Chatwoot automaticamente.
