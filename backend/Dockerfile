# Etapa 1: Construcción
FROM rust:1.80-alpine AS builder

# Instalar dependencias esenciales de compilación para Rust en Alpine
RUN apk add --no-cache build-base musl-dev openssl-dev pkgconfig perl make

WORKDIR /usr/src/backend
COPY Cargo.toml ./
COPY src ./src

# Compilar binarios de producción
RUN cargo build --release

# Etapa 2: Ejecución ultraligera de producción
FROM alpine:latest

# Instalar bibliotecas de ejecución ligeras
RUN apk add --no-cache libgcc openssl ca-certificates

WORKDIR /app

COPY --from=builder /usr/src/backend/target/release/canva_inejoma_backend /app/backend
COPY --from=builder /usr/src/backend/target/release/seed /app/seed

EXPOSE 8000

ENV RUST_LOG=info

CMD ["/app/backend"]
