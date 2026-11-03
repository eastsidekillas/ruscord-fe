FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json ./
RUN npm ci
COPY . .
RUN npm run build --configuration=production

FROM nginx:1.27-alpine
# Rendered to conf.d/default.conf at start; only RUSCORD_* variables are
# substituted, nginx's own $variables stay as they are.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER=^RUSCORD_ RUSCORD_CSP_CONNECT=""
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/proxy_params /etc/nginx/proxy_params
COPY --from=build /app/dist/ruscord-fe-v2/browser /app/frontend
