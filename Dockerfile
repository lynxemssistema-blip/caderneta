# Imagem base oficial do Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de Build para o Vite
ARG VITE_SUPABASE_URL=https://supabase-supabasecardeneta.1cnep6.easypanel.host
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
ARG VITE_APP_URL=https://caderneta.lynxems.com.br
ARG VITE_EMAIL_API_URL=""

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_EMAIL_API_URL=$VITE_EMAIL_API_URL

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências completas para o build
RUN npm ci

# Copiar código fonte
COPY . .

# Compilar frontend React (Vite)
RUN npm run build

# ==========================================
# Estágio de Produção (Runner)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Instalar apenas dependências de produção para manter a imagem leve
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar build estático do frontend
COPY --from=builder /app/dist ./dist

# Copiar código do servidor backend
COPY server ./server

# Porta exposta para a VPS / EasyPanel
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Iniciar servidor unificado (Frontend SPA + API de Emails)
CMD ["npm", "start"]
