FROM oven/bun:1.3.1

WORKDIR /app

COPY apps/ai apps/ai
# Install only the AI workspace dependencies
RUN cd apps/ai && bun install

ENV NODE_ENV=production \
    PORT=4000

EXPOSE 4000

CMD ["bun", "apps/ai/index.ts"]
