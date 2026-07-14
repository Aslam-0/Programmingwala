FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

RUN npm ci --prefix frontend
RUN npm ci --omit=dev --prefix backend

COPY frontend ./frontend
COPY backend ./backend

RUN npm run build --prefix frontend

FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "server.js"]
