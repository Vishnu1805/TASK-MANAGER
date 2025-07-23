# ---------- Stage 1: Build Expo Web ----------
FROM node:18 AS builder

WORKDIR /app
COPY . .

# Install dependencies
RUN npm install

# Set environment variable for Webpack bundler
ENV EXPO_USE_STATIC_WEBPACK_CONFIG=1

# Export static web build
RUN npx expo export:web

# ---------- Stage 2: Serve with NGINX ----------
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
