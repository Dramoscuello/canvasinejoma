# Etapa 1: Construcción eficiente con la imagen oficial de Rust
FROM rust:1.85-slim AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/backend

# Copiar manifiesto de dependencias primero (aprovecha cache de Docker)
COPY Cargo.toml Cargo.lock ./

# Copiar TODO el código fuente (incluye src/, src/bin/)
COPY src/ ./src/

RUN cargo build --release

# Etapa 2: Ejecución ultraligera de producción (Debian Slim)
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/src/backend/target/release/canva_inejoma_backend /app/backend
COPY --from=builder /usr/src/backend/target/release/seed /app/seed

EXPOSE 8000

ENV RUST_LOG=info

CMD ["/app/backend"]
