/**
 * Flujo de Verificación Biométrica REAL usando descriptores faciales
 * Usa la API de MySQL en lugar de Firebase
 */

import { extractFaceDescriptor, descriptorToArray } from '@/lib/face-recognition';

export interface RealBiometricInput {
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
}

export interface RealBiometricOutput {
  authorized: boolean;
  confidence?: number;
  userName?: string;
  dni?: string;
  role?: string;
  category?: string;
  reason: string;
}

/**
 * Verifica un rostro comparándolo con la base de datos MySQL vía API
 */
export async function verifyBiometricReal(
  input: RealBiometricInput
): Promise<RealBiometricOutput> {
  try {
    // 1. Extraer descriptor del rostro capturado
    const faceDescriptor = await extractFaceDescriptor(input.imageElement);
    
    if (!faceDescriptor) {
      return {
        authorized: false,
        confidence: 0,
        reason: "No se detectó rostro. Mejora la iluminación y posición."
      };
    }

    // 2. Convertir descriptor a array
    const descriptorArray = descriptorToArray(faceDescriptor);

    // 3. Enviar a la API para verificación
    const response = await fetch('/api/biometric/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor: descriptorArray }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        authorized: false,
        reason: error.error || 'Error en la verificación'
      };
    }

    const result = await response.json();
    
    if (result.authorized) {
      return {
        authorized: true,
        confidence: parseFloat(result.confidence),
        userName: result.userName,
        dni: result.dni,
        role: result.role,
        category: result.category,
        reason: `Acceso autorizado - Confianza: ${(parseFloat(result.confidence) * 100).toFixed(1)}%`
      };
    }

    return {
      authorized: false,
      reason: result.reason || 'Rostro no reconocido'
    };
    
  } catch (error) {
    console.error('Error en verificación biométrica:', error);
    return {
      authorized: false,
      reason: "Error técnico en el sistema de verificación"
    };
  }
}
