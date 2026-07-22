FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV PORT=8787
EXPOSE 8787
CMD ["npm", "run", "server:start"]
