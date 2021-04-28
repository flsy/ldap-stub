FROM node:15.5.1-alpine3.10
WORKDIR /app
COPY yarn.lock package.json tsconfig.json ./
COPY src/ ./src/
RUN yarn install
RUN yarn build
CMD ["yarn", "start"]