FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:24-alpine AS backend
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY scripts/container-start.cjs ./scripts/container-start.cjs
COPY scripts/create-admin.cjs ./scripts/create-admin.cjs
USER node
EXPOSE 3000
CMD ["node", "scripts/container-start.cjs"]

FROM nginx:1.28-alpine AS frontend
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
