FROM node:20-bullseye as bot

WORKDIR /app
COPY package*.json ./

# Instalamos las dependencias necesarias
RUN apt-get update && apt-get install -y ffmpeg postgresql-client poppler-utils

# Instalamos las dependencias de la aplicación
RUN npm install
RUN npm install @ffmpeg-installer/ffmpeg

COPY . .

ARG RAILWAY_STATIC_URL
ARG PUBLIC_URL
ARG PORT

# Comando para iniciar la aplicación
CMD ["npm", "start"]
