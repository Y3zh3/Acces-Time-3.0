/**
 * Guarda una imagen biométrica.
 * @param imageDataUri - Imagen en formato data:image/jpeg;base64,...
 * @param dni - DNI del empleado
 * @returns La cadena Base64
 */
export async function saveBiometricImage(
  imageDataUri: string,
  dni: string
): Promise<string> {
  return imageDataUri;
}

/**
 * Elimina una imagen biométrica
 * @param photoPath - Base64 o Ruta
 */
export async function deleteBiometricImage(photoPath: string): Promise<void> {
  return;
}
