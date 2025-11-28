# ---------- Stage 1: Build Expo Web ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy only package files first for caching
COPY package*.json ./

# Install only production dependencies first (dev will be installed when needed)
RUN npm install

# Copy the rest of the project
COPY . .

# Set environment variable for bundler
ENV EXPO_USE_STATIC_WEBPACK_CONFIG=1

# Export web build
RUN npx expo export --platform web --output-dir web-build

# ---------- Stage 2: Serve with NGINX ----------
FROM nginx:alpine

# Copy build output from builder
COPY --from=builder /app/web-build /usr/share/nginx/html

# Optional: Improve performance with gzip & brotli
# RUN apk add --no-cache nginx-mod-http-brotli nginx-mod-http-gzip-static

# Optional: Custom NGINX config
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
