import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveBiometricImage } from '@/lib/file-storage';

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
