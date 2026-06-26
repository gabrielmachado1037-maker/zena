FROM node:20-alpine

WORKDIR /app

# Install all deps (including devDeps for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Prune devDeps after build (prisma stays — now in dependencies)
RUN npm prune --production

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
