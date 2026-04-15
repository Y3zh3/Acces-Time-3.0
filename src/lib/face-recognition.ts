/**
 * Servicio de Reconocimiento Facial Real usando face-api.js
 * Extrae embeddings faciales y compara con base de datos
 * NOTA: Solo funciona en el navegador (cliente)
 */

// Variable para almacenar faceapi cuando se cargue dinámicamente
let faceapi: typeof import('face-api.js') | null = null;
let modelsLoaded = false;

/**
 * Carga face-api.js dinámicamente (solo en el navegador)
 */
async function loadFaceApi() {
  if (typeof window === 'undefined') {
    throw new Error('face-api.js solo puede usarse en el navegador');
  }
  
  if (!faceapi) {
    faceapi = await import('face-api.js');
  }
  return faceapi;
}

/**
 * Carga los modelos de ML necesarios para reconocimiento facial
 * Solo se ejecuta una vez
 */
export async function loadFaceModels(): Promise<void> {  
  if (modelsLoaded) return;
  
  const api = await loadFaceApi();
  
  try {
    const MODEL_URL = '/models'; // Los modelos se descargarán en /public/models
    
    await Promise.all([
      api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    modelsLoaded = true;
    console.log('✅ Modelos de reconocimiento facial cargados');
  } catch (error) {
    console.error('❌ Error cargando modelos:', error);
    throw new Error('No se pudieron cargar los modelos de reconocimiento facial');
  }
}

/**
 * Extrae el descriptor facial (embedding de 128 dimensiones) de una imagen
 * @param imageElement - Elemento de imagen (HTMLImageElement, HTMLVideoElement, HTMLCanvasElement)
 * @returns Array de números representando el rostro, o null si no se detecta
 */
export async function extractFaceDescriptor(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  await loadFaceModels();
  
  const api = await loadFaceApi();
  const detection = await api
    .detectSingleFace(imageElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  if (!detection) {
    return null;
  }
  
  return detection.descriptor;
}

/**
 * Compara dos descriptores faciales y retorna la distancia euclidiana
 * Distancia < 0.6 = mismo rostro
 * Distancia > 0.6 = rostros diferentes
 */
export async function compareFaces(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): Promise<number> {
  const api = await loadFaceApi();
  return api.euclideanDistance(descriptor1, descriptor2);
}

/**
 * Encuentra la mejor coincidencia en una base de datos de rostros
 * @param faceDescriptor - Descriptor del rostro a buscar
 * @param database - Base de datos de rostros conocidos
 * @param threshold - Umbral de similitud (default: 0.6)
 * @returns Objeto con el match encontrado o null
 */
export interface FaceMatch {
  id: string;
  fullName: string;
  role: string;
  category: string;
  distance: number;
  confidence: number;
}

export async function findBestMatch(
  faceDescriptor: Float32Array,
  database: Array<{
    id: string;
    fullName: string;
    role: string;
    category: string;
    descriptor: number[];
  }>,
  threshold: number = 0.6
): Promise<FaceMatch | null> {
  const api = await loadFaceApi();
  let bestMatch: FaceMatch | null = null;
  let minDistance = threshold;
  
  for (const person of database) {
    const dbDescriptor = new Float32Array(person.descriptor);
    const distance = api.euclideanDistance(faceDescriptor, dbDescriptor);
    
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = {
        id: person.id,
        fullName: person.fullName,
        role: person.role,
        category: person.category,
        distance,
        confidence: Math.round((1 - distance) * 100),
      };
    }
  }
  
  return bestMatch;
}

/**
 * Convierte un descriptor de Float32Array a array normal para almacenar en Firestore
 */
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

/**
 * Convierte un array a Float32Array para comparación
 */
export function arrayToDescriptor(arr: number[]): Float32Array {
  return new Float32Array(arr);
}

/**
 * Detecta si hay un rostro visible en el video/imagen actual
 */
export async function detectFace(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<boolean> {
  await loadFaceModels();
  
  const api = await loadFaceApi();
  const detection = await api.detectSingleFace(imageElement);
  return detection !== undefined;
}
