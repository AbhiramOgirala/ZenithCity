FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist/ ./dist/

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["node", "dist/index.js"]
