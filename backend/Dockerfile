# Etapa 1: Construcción
FROM rust:1.80-alpine AS builder

RUN apk add --no-cache build-base musl-dev openssl-dev pkgconfig perl make

WORKDIR /usr/src/backend
COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release

# Etapa 2: Ejecución ultraligera de producción
FROM alpine:latest

# Instalar unicamente certificados CA y zonas horarias (sin dependencias C pesadas)
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /usr/src/backend/target/release/canva_inejoma_backend /app/backend
COPY --from=builder /usr/src/backend/target/release/seed /app/seed

EXPOSE 8000

ENV RUST_LOG=info

CMD ["/app/backend"]
