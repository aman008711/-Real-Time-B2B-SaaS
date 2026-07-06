# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configurations
COPY package.json ./

# Install all dependencies (including devDependencies) for compiling typescript
RUN npm install

# Copy configuration files and source code
COPY tsconfig.json ./
COPY src ./src

# Build the production bundle
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment flag
ENV NODE_ENV=production

# Copy package configurations
COPY package.json ./

# Install only runtime production dependencies to minimize image size footprint
RUN npm install --omit=dev

# Copy compiled JavaScript files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose server application port
EXPOSE 5000

# Run container process as a secure non-root node user
USER node

# Start the application
CMD ["node", "dist/index.js"]
