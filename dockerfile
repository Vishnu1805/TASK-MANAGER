# ---------- Stage 1: Build Expo Web ----------
FROM node:18-alpine AS builder
WORKDIR /app

# Copy only package files first for better caching
COPY package*.json ./

# Use 'npm ci' for faster, more consistent installs and clear cache immediately
RUN npm ci && npm cache clean --force

# Copy the rest of the project (ensure .dockerignore exists)
COPY . .

# Set environment variable for bundler
ENV EXPO_USE_STATIC_WEBPACK_CONFIG=1

# Export web build (Universal export command)
RUN npx expo export -p web --output-dir web-build

# ---------- Stage 2: Serve with NGINX ----------
FROM nginx:alpine

# The final image will only contain these static files and NGINX
COPY --from=builder /app/web-build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
