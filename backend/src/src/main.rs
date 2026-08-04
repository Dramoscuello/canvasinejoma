use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod db;
mod handlers;
mod models;

use db::DbStore;
use handlers::{
    create_session_handler, finish_session_handler, get_history_handler, get_session_handler,
    login_handler, ws_handler, RoomChannels,
};

#[tokio::main]
async fn main() {
    // Inicializar sistema de logs
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,canva_inejoma_backend=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🎨 Iniciando CanvaInejoma Backend en Rust...");

    let db = DbStore::new();
    let channels: RoomChannels = Default::default();

    // Configurar CORS para permitir comunicación desde el Frontend de React
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Configurar rutas API REST y WebSockets
    let app = Router::new()
        .route("/api/auth/login", post(login_handler))
        .route("/api/sessions", post(create_session_handler))
        .route("/api/sessions/history", get(get_history_handler))
        .route("/api/sessions/:code", get(get_session_handler))
        .route("/api/sessions/:code/finish", post(finish_session_handler))
        .route("/ws/:room_code", get(ws_handler))
        .with_state((db, channels))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    tracing::info!("🚀 Servidor Rust listo y escuchando en http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
