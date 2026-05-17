FROM node:26-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 55433

CMD ["node", "server.js"]
