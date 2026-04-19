FROM oven/bun:1.3 AS base
WORKDIR /app
COPY package.json bun.lockb* ./

FROM base AS development
RUN bun install --frozen-lockfile
COPY . .
CMD ["bun", "run", "dev"]

FROM base AS production
ENV NODE_ENV=production

RUN bun install --frozen-lockfile --production
COPY . .
USER bun


CMD ["/bin/sh", "-c", "\
    echo '[startup] db:setup'; \
    bun run db:setup && \
    echo '[startup] db:migrate'; \
    bun run db:migrate && \
    echo '[startup] api start'; \
    bun src/index.ts"]
