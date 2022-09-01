# syntax=docker/dockerfile:1
FROM node:lts as runner
WORKDIR /vent-app
ENV NODE_ENV production
COPY . .
RUN npm ci --only=production
CMD ["node", "src/server.js"]
EXPOSE 3000