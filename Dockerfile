FROM node:9.10.0-alpine

RUN mkdir /app
WORKDIR /app

COPY package.json /app
COPY index.js /app
COPY app.js /app
COPY router.js /app
COPY yarn.lock /app
COPY .babelrc /app

RUN npm i

EXPOSE 8080

CMD ["npm", "start"]