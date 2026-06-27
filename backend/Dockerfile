FROM node:20-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate resolve --applied 20260626062036_init 2>/dev/null || true && npx prisma migrate resolve --applied 20260627000000_add_tipo_profissional 2>/dev/null || true && npx prisma migrate deploy && node dist/index.js"]
