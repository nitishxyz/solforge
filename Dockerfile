FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 8899 8900 42069

CMD ["bun", "run", "apps/cli/src/cli/main.ts", "--ci", "--network"]
