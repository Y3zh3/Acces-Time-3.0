import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Calcula la distancia euclidiana entre dos descriptores faciales
 */
function euclideanDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) {
    throw new Error('Descriptores deben tener el mismo tamaño');
  }
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { descriptor } = body;

    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json(
        { error: 'Descriptor inválido' },
        { status: 400 }
      );
    }

    // Obtener todos los descriptores activos
    const biometrics = await prisma.faceBiometric.findMany({
      where: { isActive: true },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            dni: true,
            role: true,
            department: true,
            photoPath: true,
            status: true,
            contractExpiry: true,
          },
        },
        transportPersonnel: {
          select: {
            id: true,
            fullName: true,
            dni: true,
            company: true,
            vehicle: true,
            photoPath: true,
            status: true,
          },
        },
        providerPersonnel: {
          select: {
            id: true,
            fullName: true,
            dni: true,
            company: true,
            position: true,
            photoPath: true,
            status: true,
          },
        },
      },
    });

    if (biometrics.length === 0) {
      return NextResponse.json({
        authorized: false,
        reason: 'No hay empleados registrados',
      });
    }

    // Buscar coincidencia
    const threshold = 0.6; // Umbral de similitud (ajústalo según tus necesidades)
    let bestMatch: any = null;
    let bestDistance = Infinity;

    console.log(`🔍 Verificando rostro contra ${biometrics.length} registros biométricos`);

    for (const bio of biometrics) {
      const storedDescriptor = JSON.parse(bio.descriptor);
      const distance = euclideanDistance(descriptor, storedDescriptor);

      // Determinar el nombre según el tipo de personal
      const personName = bio.employee?.fullName || bio.transportPersonnel?.fullName || bio.providerPersonnel?.fullName || 'Desconocido';
      
      console.log(`📊 [${personName}] Distancia: ${distance.toFixed(4)} (Threshold: ${threshold})`);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = bio;
      }
    }

    const matchName = bestMatch?.employee?.fullName || bestMatch?.transportPersonnel?.fullName || bestMatch?.providerPersonnel?.fullName || 'Ninguno';
    console.log(`✅ Mejor coincidencia: ${matchName} - Distancia: ${bestDistance.toFixed(4)}`);

    if (bestMatch && bestDistance < threshold) {
      // Determinar el tipo de personal y sus datos
      let person: any = null;
      let category: string = '';
      let role: string = '';
      
      if (bestMatch.employee) {
        person = bestMatch.employee;
        category = person.department || 'Personal';
        role = person.role || 'N/A';
        
        // Verificar si el empleado está activo
        if (person.status !== 'Activo') {
          return NextResponse.json({
            authorized: false,
            reason: 'Usuario inactivo',
          });
        }

        // Verificar vencimiento de contrato
        if (person.contractExpiry) {
          const expiryDate = new Date(person.contractExpiry);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expiryDate.setHours(0, 0, 0, 0);

          if (expiryDate < today) {
            return NextResponse.json({
              authorized: false,
              reason: `Contrato vencido el ${expiryDate.toLocaleDateString('es-ES')}`,
            });
          }
        }
      } else if (bestMatch.transportPersonnel) {
        person = bestMatch.transportPersonnel;
        category = 'Transporte';
        role = 'Chofer';
        
        // Verificar si está activo
        if (person.status !== 'Activo') {
          return NextResponse.json({
            authorized: false,
            reason: 'Personal de transporte inactivo',
          });
        }
      } else if (bestMatch.providerPersonnel) {
        person = bestMatch.providerPersonnel;
        category = 'Proveedor';
        role = person.position || 'Personal de Proveedor';
        
        // Verificar si está activo
        if (person.status !== 'Activo') {
          return NextResponse.json({
            authorized: false,
            reason: 'Personal de proveedor inactivo',
          });
        }
      } else {
        return NextResponse.json({
          authorized: false,
          reason: 'No se pudo determinar el tipo de personal',
        });
      }

      // Verificación exitosa - NO registrar acceso aquí
      // El registro se hace cuando el usuario presiona Entrada/Salida
      return NextResponse.json({
        authorized: true,
        userName: person.fullName,
        dni: person.dni,
        role: role,
        category: category,
        photoPath: person.photoPath,
        confidence: (1 - bestDistance).toFixed(3),
      });
    } else {
      // Rostro no reconocido - NO registrar acceso aquí
      return NextResponse.json({
        authorized: false,
        reason: 'Rostro no reconocido en la base de datos',
      });
    }
  } catch (error: any) {
    console.error('Error en verificación biométrica:', error);
    return NextResponse.json(
      { error: 'Error al verificar biometría', details: error.message },
      { status: 500 }
    );
  }
}
