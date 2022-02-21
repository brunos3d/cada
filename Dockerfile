FROM node:lts-alpine
WORKDIR /var/cada

RUN apk add --no-cache git openssh

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean

COPY . .

RUN yarn build

ARG NODE_ENV=production
ENV NODE_ENV=production

RUN adduser -S cada
USER cada

ENTRYPOINT [ "node", "dist/index.js" ]