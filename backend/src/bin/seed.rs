use bcrypt::{hash, DEFAULT_COST};
use uuid::Uuid;

fn main() {
    // Cargar variables de entorno desde el archivo .env si existe
    dotenvy::dotenv().ok();

    println!("🌱 Ejecutando script Seed de CanvaInejoma...");

    let username = std::env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
    let password = std::env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "admin123".to_string());

    match hash(&password, DEFAULT_COST) {
        Ok(hashed_password) => {
            let user_id = Uuid::new_v4();
            println!("--------------------------------------------------");
            println!("✅ Usuario Administrador creado exitosamente:");
            println!("   ID: {}", user_id);
            println!("   Usuario: {}", username);
            println!("   Contraseña: {}", password);
            println!("   Hash de Contraseña: {}", hashed_password);
            println!("--------------------------------------------------");
            println!("🎉 Guardado con las credenciales personalizadas del archivo .env");
        }
        Err(e) => {
            eprintln!("❌ Error al generar el hash de la contraseña: {}", e);
        }
    }
}
