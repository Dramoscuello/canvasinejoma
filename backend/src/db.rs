use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};
use std::collections::HashMap;
use crate::models::{User, Session};

pub type RoomChannels = Arc<Mutex<HashMap<String, broadcast::Sender<String>>>>;
pub type RoomStudentCounts = Arc<Mutex<HashMap<String, usize>>>;

#[derive(Clone, Default)]
pub struct DbStore {
    pub users: Arc<Mutex<HashMap<String, User>>>,
    pub sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl DbStore {
    pub fn new() -> Self {
        Self {
            users: Arc::new(Mutex::new(HashMap::new())),
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Inicializa las tablas en PostgreSQL local si la variable DATABASE_URL está configurada
    pub async fn init_postgres_tables() {
        if let Ok(db_url) = std::env::var("DATABASE_URL") {
            tracing::info!("🔌 Conectando a PostgreSQL local con la URL: {}", db_url);
            match tokio_postgres::connect(&db_url, tokio_postgres::NoTls).await {
                Ok((client, connection)) => {
                    tokio::spawn(async move {
                        if let Err(e) = connection.await {
                            tracing::error!("Error en la conexión a PostgreSQL: {}", e);
                        }
                    });

                    // Crear tablas si no existen
                    let _ = client.batch_execute("
                        CREATE TABLE IF NOT EXISTS users (
                            id UUID PRIMARY KEY,
                            username VARCHAR(50) UNIQUE NOT NULL,
                            password_hash TEXT NOT NULL,
                            created_at VARCHAR(100) NOT NULL
                        );
                        CREATE TABLE IF NOT EXISTS sessions (
                            id UUID PRIMARY KEY,
                            title VARCHAR(100) NOT NULL,
                            code VARCHAR(10) NOT NULL,
                            is_active BOOLEAN DEFAULT TRUE,
                            spectators_count INT DEFAULT 0,
                            canvas_data JSONB,
                            created_at VARCHAR(100) NOT NULL
                        );
                    ").await;
                    tracing::info!("✅ Tablas 'users' y 'sessions' verificadas/creadas en PostgreSQL.");
                }
                Err(e) => {
                    tracing::warn!("⚠️ No se pudo conectar a PostgreSQL local ({}), usando modo almacén rápido en memoria.", e);
                }
            }
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub db: DbStore,
    pub channels: RoomChannels,
    pub student_counts: RoomStudentCounts,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            db: DbStore::new(),
            channels: Arc::new(Mutex::new(HashMap::new())),
            student_counts: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}
