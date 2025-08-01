# ---------- Stage 1: Build Expo Web ----------
FROM node:18 AS builder

WORKDIR /app
COPY . .

# Install dependencies
RUN npm install

# Set environment variable for bundler
ENV EXPO_USE_STATIC_WEBPACK_CONFIG=1

# Export web build to custom folder
RUN npx expo export --platform web --output-dir web-build

# ---------- Stage 2: Serve with NGINX ----------
FROM nginx:alpine

# Clear default NGINX html content
RUN rm -rf /usr/share/nginx/html/*

# Copy exported static build
COPY --from=builder /app/web-build /usr/share/nginx/html

# Expose web port
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
