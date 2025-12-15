# Etap budowania aplikacji
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN rm -rf ./backend ./analize

RUN npm run build

# Etap produkcyjny
FROM node:20-slim AS runner

WORKDIR /app

# Instalacja niezbędnych zależności dla Chromium (Debian/Ubuntu)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Kopiowanie artefaktów z buildera
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./

# Instalacja zależności produkcyjnych
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Dodanie użytkownika nie-root i nadanie uprawnień
RUN useradd -m nextjs && chown -R nextjs:nextjs /app
USER nextjs

# Rozpakuj Chromium (opcjonalnie)
RUN node -e "require('@sparticuz/chromium')"

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3000

CMD ["npm", "start"]
