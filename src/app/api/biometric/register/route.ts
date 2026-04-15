import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveBiometricImage } from '@/lib/file-storage';

// Función para calcular distancia euclidiana entre dos descriptors
function euclideanDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return Infinity;
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Función para verificar si el descriptor es similar a alguno existente
async function checkDuplicateFace(newDescriptor: number[]): Promise<{ isDuplicate: boolean; matchName?: string; matchDni?: string }> {
  const SIMILARITY_THRESHOLD = 0.6; // Umbral de similitud (más bajo = más estricto)
  
  try {
    // Obtener todos los descriptors activos
    const allBiometrics = await prisma.faceBiometric.findMany({
      where: { isActive: true },
      include: {
        employee: true,
        transportPersonnel: true,
        providerPersonnel: true
      }
    });

    // Comparar con cada descriptor existente
    for (const biometric of allBiometrics) {
      const existingDescriptor = JSON.parse(biometric.descriptor);
      const distance = euclideanDistance(newDescriptor, existingDescriptor);
      
      if (distance < SIMILARITY_THRESHOLD) {
        // Foto duplicada detectada
        const matchName = biometric.employee?.fullName || 
                         biometric.transportPersonnel?.fullName || 
                         biometric.providerPersonnel?.fullName || 
                         'Desconocido';
        const matchDni = biometric.employee?.dni || 
                        biometric.transportPersonnel?.dni || 
                        biometric.providerPersonnel?.dni || 
                        'Sin DNI';
        
        return { 
          isDuplicate: true, 
          matchName,
          matchDni
        };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error verificando foto duplicada:', error);
    return { isDuplicate: false }; // En caso de error, permitir el registro
  }
}

// Mapear cargos de empresa a roles del sistema
function mapCargoToRole(cargo: string): string {
  const roleMap: Record<string, string> = {
    'GERENTE_GENERAL': 'ADMINISTRADOR',
    'GERENTE_AREA': 'SUPERVISOR',
    'JEFE_ALMACEN': 'SUPERVISOR',
    'SUPERVISOR': 'SUPERVISOR',
    'ASISTENTE_ADMIN': 'EMPLEADO',
    'OPERARIO_ALMACEN': 'EMPLEADO',
    'MONTACARGUISTA': 'EMPLEADO',
    'DESPACHADOR': 'EMPLEADO',
    'INVENTARISTA': 'EMPLEADO',
    'EMPAQUETADOR': 'EMPLEADO',
    'SEGURIDAD': 'SEGURIDAD',
    'LIMPIEZA': 'EMPLEADO',
    'MANTENIMIENTO': 'EMPLEADO'
  };
  
  return roleMap[cargo] || 'EMPLEADO';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, dni, role, department, email, photoDataUri, descriptor, contractExpiry, category, sede } = body;

    // Validaciones
    if (!fullName || !dni || !photoDataUri || !descriptor || !category) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const cleanDni = dni.toUpperCase();

    // Verificar si la foto ya existe (detección de duplicados)
    const duplicateCheck = await checkDuplicateFace(descriptor);
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        { 
          error: 'Esta foto facial ya está registrada',
          details: `La foto coincide con ${duplicateCheck.matchName} (DNI: ${duplicateCheck.matchDni}). No se puede usar la misma foto para diferentes personas.`
        },
        { status: 409 }
      );
    }

    // Guardar foto en sistema de archivos
    const photoPath = await saveBiometricImage(photoDataUri, cleanDni);

    // Preparar fecha de contrato si viene
    const contractExpiryDate = contractExpiry ? new Date(contractExpiry) : null;
    
    // Mapear cargo a rol del sistema
    const systemRole = mapCargoToRole(role || 'EMPLEADO');

    // Según la categoría, guardar en la tabla correspondiente
    let result;

    if (category === 'Personal') {
      // Gestión de personal → tabla employees
      result = await prisma.$transaction(async (tx: any) => {
        const employee = await tx.employee.create({
          data: {
            fullName,
            dni: cleanDni,
            role: systemRole,
            position: role, // Cargo original (ASISTENTE_ADMIN, OPERARIO_ALMACEN, etc.)
            department: department || 'General',
            location: sede || null, // Sede de trabajo (Lima, Ves, SJL)
            email: email || null,
            photoPath,
            status: 'Activo',
            hasBiometric: true,
            contractExpiry: contractExpiryDate,
          },
        });

        await tx.faceBiometric.create({
          data: {
            employeeId: employee.id,
            descriptor: JSON.stringify(descriptor),
            isActive: true,
          },
        });

        return { type: 'employee', id: employee.id, name: employee.fullName };
      });

    } else if (category === 'Transporte') {
      // Personal transporte → tabla transport_personnel
      result = await prisma.$transaction(async (tx: any) => {
        const transport = await tx.transportPersonnel.create({
          data: {
            fullName,
            dni: cleanDni,
            company: department || 'Sin empresa',
            vehicle: null,
            licensePlate: null,
            photoPath,
            status: 'Activo',
          },
        });

        await tx.faceBiometric.create({
          data: {
            transportPersonnelId: transport.id,
            descriptor: JSON.stringify(descriptor),
            isActive: true,
          },
        });

        return { type: 'transport', id: transport.id, name: transport.fullName };
      });

    } else if (category === 'Proveedor') {
      // Personal proveedores → tabla provider_personnel
      result = await prisma.$transaction(async (tx: any) => {
        const provider = await tx.providerPersonnel.create({
          data: {
            fullName,
            dni: cleanDni,
            company: department || 'Sin empresa',
            position: role || null,
            phone: email || null,
            photoPath,
            status: 'Activo',
          },
        });

        await tx.faceBiometric.create({
          data: {
            providerPersonnelId: provider.id,
            descriptor: JSON.stringify(descriptor),
            isActive: true,
          },
        });

        return { type: 'provider', id: provider.id, name: provider.fullName };
      });

    } else {
      return NextResponse.json(
        { error: 'Categoría inválida' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
      message: 'Personal registrado exitosamente',
    });
  } catch (error: any) {
    console.error('Error en registro biométrico:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El DNI ya está registrado' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error al registrar personal', details: error.message },
      { status: 500 }
    );
  }
}
