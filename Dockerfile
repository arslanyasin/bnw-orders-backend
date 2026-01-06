# ========================================
# Proxy Server Backend - Dockerfile
# Optimized for Jenkins CI/CD builds

FROM node:21.4.0-alpine

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling and PDF processing dependencies
RUN apk add --no-cache \
    dumb-init \
    graphicsmagick \
    ghostscript \
    ghostscript-fonts

# Create necessary directories including temp directory for PDF processing
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nestjs:nodejs /app && \
    chmod 755 /app/tmp

# Set temp directory environment variable to app-owned directory
ENV TMPDIR=/app/tmp

# Copy built application from Jenkins workspace
# Note: These files are built in Jenkins pipeline stages
COPY --chown=nestjs:nodejs dist/ ./dist/
COPY --chown=nestjs:nodejs node_modules/ ./node_modules/
COPY --chown=nestjs:nodejs package*.json ./

# Copy scripts and configuration files
COPY --chown=nestjs:nodejs nest-cli.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"] 
