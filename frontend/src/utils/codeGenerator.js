/**
 * Genera un código único de 4 caracteres combinando letras mayúsculas y minúsculas.
 * Ejemplo: "aK9z", "Xb3Q", "mP7y"
 */
export function generate4CharRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
