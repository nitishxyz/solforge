FROM oven/bun:1.3.1

WORKDIR /app

# Copy the entire workspace (filtering handled by .dockerignore)
COPY bun.lock package.json ./
COPY apps ./apps
COPY packages ./packages

# Install only the AI workspace dependencies
RUN bun install --frozen-lockfile --filter @solforge/ai

ENV NODE_ENV=production \
    PORT=4000

EXPOSE 4000

CMD ["bun", "apps/ai/index.ts"]
