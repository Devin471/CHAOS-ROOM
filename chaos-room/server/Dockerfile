FROM node:20-alpine
WORKDIR /app

# Copy root and shared files
COPY package.json ./
COPY shared ./shared
COPY server ./server

WORKDIR /app/server
RUN npm install
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start"]
