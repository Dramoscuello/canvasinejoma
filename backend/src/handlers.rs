use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use futures_util::{SinkExt, StreamExt};
use rand::Rng;
use serde::Deserialize;
use serde_json::json;
use tokio::sync::broadcast;

use crate::auth::{create_jwt, verify_password};
use crate::db::AppState;
use crate::models::{CreateSessionRequest, LoginRequest, LoginResponse, Session};

#[derive(Deserialize)]
pub struct WsParams {
    pub role: Option<String>,
}

/// Genera un código aleatorio de 4 caracteres (Mayúsculas y minúsculas)
pub fn generate_4char_code() -> String {
    const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::thread_rng();
    (0..4)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

/// Endpoint /api/auth/login
pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let users = state.db.users.lock().await;

    if let Some(user) = users.get(&payload.username) {
        if verify_password(&payload.password, &user.password_hash) {
            if let Ok(token) = create_jwt(&user.username) {
                return (
                    StatusCode::OK,
                    Json(json!(LoginResponse {
                        token,
                        username: user.username.clone()
                    })),
                );
            }
        }
    }

    let expected_user = std::env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
    let expected_pass = std::env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "admin123".to_string());

    if payload.username == expected_user && payload.password == expected_pass {
        let token = create_jwt(&expected_user).unwrap_or_default();
        return (
            StatusCode::OK,
            Json(json!(LoginResponse {
                token,
                username: expected_user
            })),
        );
    }

    (
        StatusCode::UNAUTHORIZED,
        Json(json!({"error": "Credenciales inválidas"})),
    )
}

/// Endpoint POST /api/sessions (Crear Clase)
pub async fn create_session_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateSessionRequest>,
) -> impl IntoResponse {
    let code = generate_4char_code();
    let session = Session {
        id: uuid::Uuid::new_v4(),
        title: payload.title,
        code: code.clone(),
        is_active: true,
        spectators_count: 0,
        canvas_data: None,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let mut sessions = state.db.sessions.lock().await;
    sessions.insert(code.clone(), session.clone());

    (StatusCode::CREATED, Json(json!(session)))
}

/// Endpoint GET /api/sessions/:code
pub async fn get_session_handler(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> impl IntoResponse {
    let sessions = state.db.sessions.lock().await;
    if let Some(session) = sessions.get(&code) {
        if session.is_active {
            return (StatusCode::OK, Json(json!(session)));
        } else {
            return (
                StatusCode::GONE,
                Json(json!({"error": "El código de sesión de 4 caracteres ya no está activo"})),
            );
        }
    }
    (
        StatusCode::NOT_FOUND,
        Json(json!({"error": "Sesión no encontrada"})),
    )
}

/// Endpoint POST /api/sessions/:code/finish (Finalizar Sesión)
pub async fn finish_session_handler(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> impl IntoResponse {
    let mut sessions = state.db.sessions.lock().await;
    if let Some(session) = sessions.get_mut(&code) {
        session.is_active = false;
        return (
            StatusCode::OK,
            Json(json!({"message": "Sesión finalizada exitosamente"})),
        );
    }
    (
        StatusCode::NOT_FOUND,
        Json(json!({"error": "Sesión no encontrada"})),
    )
}

/// Endpoint GET /api/sessions/history
pub async fn get_history_handler(State(state): State<AppState>) -> impl IntoResponse {
    let sessions = state.db.sessions.lock().await;
    let list: Vec<Session> = sessions.values().cloned().collect();
    (StatusCode::OK, Json(json!(list)))
}

/// Handler de WebSockets /ws/:room_code
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(room_code): Path<String>,
    Query(params): Query<WsParams>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let is_teacher = params.role.as_deref() == Some("teacher");

    // Obtener o crear canal Broadcast para la sala
    let tx = {
        let mut chans = state.channels.lock().await;
        chans
            .entry(room_code.clone())
            .or_insert_with(|| {
                let (tx, _) = broadcast::channel(100);
                tx
            })
            .clone()
    };

    ws.on_upgrade(move |socket| handle_socket(socket, room_code, is_teacher, tx, state))
}

async fn handle_socket(
    socket: WebSocket,
    room_code: String,
    is_teacher: bool,
    tx: broadcast::Sender<String>,
    state: AppState,
) {
    // Si se conecta un estudiante, incrementar el contador de espectadores de la sala
    if !is_teacher {
        let count = {
            let mut counts = state.student_counts.lock().await;
            let counter = counts.entry(room_code.clone()).or_insert(0);
            *counter += 1;
            *counter
        };

        // Emitir transmisión de nuevo conteo a la sala
        let spectator_msg = json!({
            "type": "SPECTATOR_COUNT",
            "roomCode": room_code,
            "count": count
        }).to_string();
        let _ = tx.send(spectator_msg);
    } else {
        // Si el profesor se conecta, enviarle de inmediato el conteo actual de estudiantes
        let current_count = {
            let counts = state.student_counts.lock().await;
            *counts.get(&room_code).unwrap_or(&0)
        };
        let spectator_msg = json!({
            "type": "SPECTATOR_COUNT",
            "roomCode": room_code,
            "count": current_count
        }).to_string();
        let _ = tx.send(spectator_msg);
    }

    let (mut sender, mut receiver) = socket.split();
    let mut rx = tx.subscribe();

    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    let state_clone = state.clone();
    let room_code_clone = room_code.clone();
    let tx_clone = tx.clone();

    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                if is_teacher {
                    // Guardar último estado en BD
                    if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(canvas_data) = json_val.get("data") {
                            let mut sessions = state_clone.db.sessions.lock().await;
                            if let Some(sess) = sessions.get_mut(&room_code_clone) {
                                sess.canvas_data = Some(canvas_data.clone());
                            }
                        }
                    }
                    // Broadcast del dibujo a todos los estudiantes de la sala
                    let _ = tx_clone.send(text);
                }
            }
        }
    });

    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    // Al desconectarse un estudiante, decrementar el contador de la sala
    if !is_teacher {
        let count = {
            let mut counts = state.student_counts.lock().await;
            let counter = counts.entry(room_code.clone()).or_insert(0);
            if *counter > 0 {
                *counter -= 1;
            }
            *counter
        };

        // Emitir transmisión del conteo actualizado
        let spectator_msg = json!({
            "type": "SPECTATOR_COUNT",
            "roomCode": room_code,
            "count": count
        }).to_string();
        let _ = tx.send(spectator_msg);
    }
}
