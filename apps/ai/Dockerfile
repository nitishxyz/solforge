FROM oven/bun:1.3.1-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json bun.lock ./
COPY apps/ai/package.json apps/ai/package.json

# Install only the ai workspace dependencies
RUN bun install --frozen-lockfile --filter @solforge/ai

# Copy the ai service source code
COPY apps/ai ./apps/ai

# Build the AI service into a single executable
RUN bun build apps/ai/index.ts --compile --outfile /tmp/solforge-ai

FROM alpine:3.19 AS runner

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /tmp/solforge-ai ./solforge-ai

ENV NODE_ENV=production \
    PORT=3030

EXPOSE 3030

CMD ["./solforge-ai"]
