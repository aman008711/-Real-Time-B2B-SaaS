# Stage 1: Build Vite React app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configurations
COPY package.json ./

# Install development and production dependencies
RUN npm install

# Copy configuration files and source code
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js index.html ./
COPY public ./public
COPY src ./src

# Compile the production assets
RUN npm run build

# Stage 2: Production web server container
FROM nginx:alpine

# Copy compiled static assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
