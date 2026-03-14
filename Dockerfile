FROM node:20-alpine

WORKDIR /portal

COPY package*.json ./
RUN npm install

COPY . .
COPY .env .env

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]