FROM node:14.3.0-alpine3.11

ENV PORT=3000 \
    PATH_TO_APP=/usr/src/app \
    NDOE_ENV=development

WORKDIR ${PATH_TO_APP}

COPY package.json yarn.lock ./

RUN yarn install

COPY . ./

EXPOSE ${PORT}

CMD yarn dev
