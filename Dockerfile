FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

FROM nginx:1.27-alpine
# Render only the configured public LiveKit URL at container startup. API keys
# and secrets are never sent to the frontend container.
ENV NGINX_ENVSUBST_FILTER=^RUSCORD_LIVEKIT_PUBLIC_URL$
ENV RUSCORD_LIVEKIT_PUBLIC_URL=
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/proxy_params /etc/nginx/proxy_params
COPY --from=build /app/dist/ruscord-fe-v2/browser /app/frontend
