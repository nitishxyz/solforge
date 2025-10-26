FROM oven/bun:1-alpine

WORKDIR /app

COPY apps/ai/package.json apps/ai/bun.lock* ./
RUN bun install --frozen-lockfile

COPY apps/ai/ ./

EXPOSE 3030

CMD ["bun", "run", "index.ts"]
