# Guia de Deploy — Zena

## Stack de produção
- **Frontend** → Vercel (gratuito)
- **Backend** → Railway (~$5/mês)
- **Banco** → Neon PostgreSQL (gratuito até 0.5GB)
- **Email** → Resend (gratuito até 3k emails/mês)
- **Pagamentos** → Stripe

---

## Passo 1 — Banco de dados (Neon)

1. Crie conta em https://neon.tech (gratuito)
2. Crie um projeto "zena"
3. Copie a connection string (formato: `postgresql://user:pass@host/dbname?sslmode=require`)
4. No `backend/prisma/schema.prisma`, mude:
   ```prisma
   datasource db {
     provider = "postgresql"       // ← mude de sqlite para postgresql
     url      = env("DATABASE_URL")
   }
   ```
5. Rode: `npx prisma migrate deploy`

---

## Passo 2 — Backend (Railway)

1. Crie conta em https://railway.app
2. Novo projeto → "Deploy from GitHub" → selecione o repositório
3. Selecione a pasta `backend` como root directory
4. Configure as variáveis de ambiente:

```
DATABASE_URL=postgresql://...  ← URL do Neon
JWT_SECRET=<string aleatória de 64 chars>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MENSAL=price_...
STRIPE_PRICE_ANUAL=price_...
RESEND_API_KEY=re_...
FRONTEND_URL=https://app.zena.app
PORT=3001
```

5. Railway vai buildar automaticamente pelo Dockerfile
6. Copie a URL gerada (ex: `zena-backend.railway.app`)

---

## Passo 3 — Frontend (Vercel)

1. Crie conta em https://vercel.com
2. "Import Git Repository" → selecione o repo
3. Selecione a pasta `frontend` como root directory
4. Configure a variável de ambiente:
```
VITE_API_URL=https://zena-backend.railway.app/api
```
5. Deploy → copie a URL (ou configure domínio customizado)

---

## Passo 4 — Stripe

1. Crie conta em https://dashboard.stripe.com
2. Crie os produtos:
   - "Zena Mensal" → preço recorrente R$ 97/mês
   - "Zena Anual" → preço recorrente R$ 924/ano
3. Copie os Price IDs (começam com `price_`)
4. Configure webhook:
   - URL: `https://zena-backend.railway.app/api/billing/webhook`
   - Eventos: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
5. Copie o Webhook Secret (começa com `whsec_`)

---

## Passo 5 — Resend (email)

1. Crie conta em https://resend.com
2. Adicione e verifique seu domínio (ex: zena.app)
3. Crie uma API Key
4. Atualize o FROM em `backend/src/lib/email.ts`:
   ```typescript
   const FROM = "Zena <noreply@seudominio.com>";
   ```

---

## Domínio customizado

1. Compre um domínio (ex: zena.app no Google Domains, ~R$ 70/ano)
2. No Vercel: Settings > Domains > adicione `app.zena.app`
3. Configure DNS conforme instruções do Vercel

---

## Checklist pré-lançamento

- [ ] Banco PostgreSQL criado e migrado
- [ ] Backend rodando no Railway
- [ ] Frontend no Vercel com VITE_API_URL correto
- [ ] Stripe configurado com webhook
- [ ] Resend configurado com domínio verificado
- [ ] Domínio customizado configurado
- [ ] Testar fluxo completo: cadastro → trial → assinar → portal paciente
- [ ] Testar webhook do Stripe (modo teste primeiro)
