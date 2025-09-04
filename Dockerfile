FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
