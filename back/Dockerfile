FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts

COPY . .

RUN chown -R node:node /app

USER node

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "index.js"]