FROM node:22.3-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build --configuration=production

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/proxy_params /etc/nginx/proxy_params
COPY --from=build /app/dist/ruscord-fe/browser /app/frontend
