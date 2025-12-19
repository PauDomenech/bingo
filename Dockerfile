FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package manifest(s) first and install deps (cache-friendly)
COPY package.json package-lock.json* ./
RUN npm install --production || true

# Copy app sources
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
