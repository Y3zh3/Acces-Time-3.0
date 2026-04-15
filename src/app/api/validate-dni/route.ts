import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/validate-dni
 * Busca una persona por DNI en todas las tablas (empleados, transporte, proveedores)
 * NO registra acceso automáticamente - solo retorna información
 * La UI debe llamar a /api/access-log para registrar entrada/salida
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dni } = body;

    if (!dni) {
      return NextResponse.json(
        { error: 'DNI es requerido' },
        { status: 400 }
      );
    }

    const searchDni = dni.trim();

    // Buscar en empleados
    const employee = await prisma.employee.findUnique({
      where: { dni: searchDni },
      select: {
        id: true,
        fullName: true,
        dni: true,
        role: true,
        department: true,
        photoPath: true,
        status: true,
        position: true,
      },
    });

    if (employee) {
      if (employee.status === 'Inactivo') {
        return NextResponse.json({
          authorized: false,
          reason: 'Personal inactivo en el sistema',
          name: employee.fullName,
          dni: employee.dni,
        });
      }

      return NextResponse.json({
        authorized: true,
        name: employee.fullName,
        role: employee.position || employee.role,
        category: 'Personal',
        dni: employee.dni,
        type: 'employee',
        employeeId: employee.id,
      });
    }

    // Buscar en personal de transporte
    const transport = await prisma.transportPersonnel.findUnique({
      where: { dni: searchDni },
      select: {
        id: true,
        fullName: true,
        dni: true,
        company: true,
        vehicle: true,
        licensePlate: true,
        status: true,
      },
    });

    if (transport) {
      if (transport.status === 'Inactivo') {
        return NextResponse.json({
          authorized: false,
          reason: 'Personal de transporte inactivo',
          name: transport.fullName,
          dni: transport.dni,
        });
      }

      return NextResponse.json({
        authorized: true,
        name: transport.fullName,
        role: `${transport.company} - ${transport.vehicle}`,
        category: 'Transporte',
        dni: transport.dni,
        type: 'transport',
        transportId: transport.id,
      });
    }

    // Buscar en personal de proveedores
    const provider = await prisma.providerPersonnel.findUnique({
      where: { dni: searchDni },
      select: {
        id: true,
        fullName: true,
        dni: true,
        company: true,
        position: true,
        phone: true,
        status: true,
      },
    });

    if (provider) {
      if (provider.status === 'Inactivo') {
        return NextResponse.json({
          authorized: false,
          reason: 'Personal de proveedor inactivo',
          name: provider.fullName,
          dni: provider.dni,
        });
      }

      return NextResponse.json({
        authorized: true,
        name: provider.fullName,
        role: `${provider.company} - ${provider.position}`,
        category: 'Proveedor',
        dni: provider.dni,
        type: 'provider',
        providerId: provider.id,
      });
    }

    // No encontrado
    return NextResponse.json({
      authorized: false,
      reason: 'DNI no registrado en el sistema',
    });
  } catch (error: any) {
    console.error('Error en validación de DNI:', error);
    return NextResponse.json(
      { error: 'Error al validar DNI', details: error.message },
      { status: 500 }
    );
  }
}
