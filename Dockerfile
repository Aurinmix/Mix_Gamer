FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Asegurar que exista la carpeta de persistencia
RUN mkdir -p /app/data

CMD ["npm", "start"]
