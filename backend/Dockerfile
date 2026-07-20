FROM node:20-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001

# Sem isto o processo roda como root: qualquer execução de código arbitrária
# dentro do container começa com privilégio total. `node` já existe na imagem
# oficial. O chown cobre o dist/ e o client do Prisma gerados no build acima.
RUN chown -R node:node /app
USER node

CMD ["node", "start.js"]
