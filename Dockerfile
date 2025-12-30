## Set global build ENV
ARG NODEJS_VERSION="24"

## Base image for all building stages
FROM node:${NODEJS_VERSION}-slim AS base

ARG USE_CN_MIRROR
ENV DEBIAN_FRONTEND="noninteractive"

RUN <<'EOF'
set -e
if [ "${USE_CN_MIRROR:-false}" = "true" ]; then
    sed -i "s/deb.debian.org/mirrors.ustc.edu.cn/g" "/etc/apt/sources.list.d/debian.sources"
fi
apt update
apt install ca-certificates proxychains-ng -qy
mkdir -p /distroless/bin /distroless/etc /distroless/etc/ssl/certs /distroless/lib
cp /usr/lib/$(arch)-linux-gnu/libproxychains.so.4 /distroless/lib/libproxychains.so.4
cp /usr/lib/$(arch)-linux-gnu/libdl.so.2 /distroless/lib/libdl.so.2
cp /usr/bin/proxychains4 /distroless/bin/proxychains
cp /etc/proxychains4.conf /distroless/etc/proxychains4.conf
cp /usr/lib/$(arch)-linux-gnu/libstdc++.so.6 /distroless/lib/libstdc++.so.6
cp /usr/lib/$(arch)-linux-gnu/libgcc_s.so.1 /distroless/lib/libgcc_s.so.1
cp /usr/local/bin/node /distroless/bin/node
cp /etc/ssl/certs/ca-certificates.crt /distroless/etc/ssl/certs/ca-certificates.crt
rm -rf /tmp/* /var/lib/apt/lists/* /var/tmp/*
EOF

## Builder image, install all the dependencies and build the app
FROM base AS builder

ARG USE_CN_MIRROR
ARG NEXT_PUBLIC_BASE_PATH
ARG NEXT_PUBLIC_ENABLE_BETTER_AUTH
ARG NEXT_PUBLIC_ENABLE_NEXT_AUTH
ARG NEXT_PUBLIC_ENABLE_CLERK_AUTH
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_ANALYTICS_POSTHOG
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_ANALYTICS_UMAMI
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG FEATURE_FLAGS

ENV NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH}" \
    FEATURE_FLAGS="${FEATURE_FLAGS}" \
    NEXT_PUBLIC_ENABLE_BETTER_AUTH="${NEXT_PUBLIC_ENABLE_BETTER_AUTH:-0}" \
    NEXT_PUBLIC_ENABLE_NEXT_AUTH="${NEXT_PUBLIC_ENABLE_NEXT_AUTH:-1}" \
    NEXT_PUBLIC_ENABLE_CLERK_AUTH="${NEXT_PUBLIC_ENABLE_CLERK_AUTH:-0}" \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}" \
    CLERK_WEBHOOK_SECRET="whsec_xxx" \
    APP_URL="http://app.com" \
    DATABASE_DRIVER="node" \
    DATABASE_URL="postgres://postgres:password@localhost:5432/postgres" \
    KEY_VAULTS_SECRET="use-for-build" \
    NODE_OPTIONS="--max-old-space-size=6144"

WORKDIR /app

# 1. 拷贝 Monorepo 配置文件
COPY package.json pnpm-workspace.yaml .npmrc ./
# 2. 拷贝所有包含 package.json 的目录，确保 pnpm 识别所有 workspace 成员
# 这里直接拷贝整个目录是最稳的，因为 LobeChat 的 workspace 包分布在多处
COPY packages ./packages
COPY apps ./apps

RUN <<'EOF'
set -e
if [ "${USE_CN_MIRROR:-false}" = "true" ]; then
    export SENTRYCLI_CDNURL="https://npmmirror.com/mirrors/sentry-cli"
    npm config set registry "https://registry.npmmirror.com/"
    echo 'canvas_binary_host_mirror=https://npmmirror.com/mirrors/canvas' >> .npmrc
fi
npm i -g corepack@latest
corepack enable
pnpm i
EOF

# 拷贝全量源码并构建
COPY . .
RUN npm run build:docker

## Application image, copy all the files for production
FROM busybox:latest AS app
COPY --from=base /distroless/ /

# 使用 --chown 一次性解决权限
COPY --from=builder --chown=1001:1001 /app/.next/standalone /app/
COPY --from=builder --chown=1001:1001 /app/public /app/public
COPY --from=builder --chown=1001:1001 /app/.next/static /app/.next/static
COPY --from=builder --chown=1001:1001 /app/packages/database/migrations /app/migrations
COPY --from=builder --chown=1001:1001 /app/scripts/migrateServerDB/docker.cjs /app/docker.cjs
COPY --from=builder --chown=1001:1001 /app/scripts/migrateServerDB/errorHint.js /app/errorHint.js
COPY --from=builder --chown=1001:1001 /app/scripts/serverLauncher/startServer.js /app/startServer.js

RUN <<'EOF'
set -e
addgroup -S -g 1001 nodejs
adduser -D -G nodejs -H -S -h /app -u 1001 nextjs
chown nextjs:nodejs /etc/proxychains4.conf
EOF

## Production image, copy all the files and run next
FROM scratch
COPY --from=app / /

ENV NODE_ENV="production" \
    NODE_OPTIONS="--dns-result-order=ipv4first --use-openssl-ca" \
    SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
    HOSTNAME="0.0.0.0" \
    PORT="3210" \
    MIDDLEWARE_REWRITE_THROUGH_LOCAL="1"

# 省略部分 ENV 默认值声明以保持简洁，生产环境会通过 -e 传入
USER nextjs
EXPOSE 3210/tcp
ENTRYPOINT ["/bin/node"]
CMD ["/app/startServer.js"]
