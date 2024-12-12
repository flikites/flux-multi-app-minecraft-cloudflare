FROM node:alpine

WORKDIR /usr/src/app
COPY package*.json ./

RUN  mkdir -p /root/cluster && npm install --production

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && apk add --no-cache curl jq

ENTRYPOINT ["/entrypoint.sh"]
#CMD [ "npm", "run", "start" ]
