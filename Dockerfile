FROM oven/bun:1.3

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000
CMD ["bun", "run", "dev"]