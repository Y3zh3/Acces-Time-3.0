import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { FirebaseStorage } from 'firebase/storage';

/**
 * Sube una imagen en formato base64 a Firebase Storage
 * @param storage - Instancia de Firebase Storage
 * @param imageDataUri - Imagen en formato data:image/jpeg;base64,...
 * @param dni - DNI del empleado (para nombrar el archivo)
 * @returns URL pública de la imagen subida
 */
export async function uploadBiometricImage(
  storage: FirebaseStorage,
  imageDataUri: string,
  dni: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `biometric-photos/${dni}_${timestamp}.jpg`;
  const storageRef = ref(storage, fileName);

  // Subir imagen en formato base64
  await uploadString(storageRef, imageDataUri, 'data_url');

  // Obtener URL pública
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}
