FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npm run build

CMD ["node", "dist/main.js"]

EXPOSE 3000