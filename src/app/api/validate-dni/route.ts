import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const searchDni = dni.trim().toUpperCase();

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
      },
    });

    if (employee) {
      // Registrar acceso
      await prisma.accessLog.create({
        data: {
          userName: employee.fullName,
          userDni: employee.dni,
          role: employee.role,
          status: 'Aprobado',
          zone: 'Portería',
          type: 'success',
          employeeId: employee.id,
        },
      });

      return NextResponse.json({
        found: true,
        type: 'employee',
        data: employee,
        category: 'Personal',
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
      // Registrar acceso
      await prisma.accessLog.create({
        data: {
          userName: transport.fullName,
          userDni: transport.dni,
          role: 'Proveedores',
          status: 'Aprobado',
          zone: 'Muelle',
          type: 'success',
          transportId: transport.id,
        },
      });

      return NextResponse.json({
        found: true,
        type: 'transport',
        data: { ...transport, role: 'Proveedores' },
        category: 'Transporte',
      });
    }

    // No encontrado - registrar intento
    await prisma.accessLog.create({
      data: {
        userName: `DNI: ${searchDni}`,
        userDni: searchDni,
        role: 'N/A',
        status: 'Denegado',
        zone: 'Punto Control',
        type: 'critical',
      },
    });

    return NextResponse.json({
      found: false,
      message: 'DNI no registrado',
    });
  } catch (error: any) {
    console.error('Error en validación de DNI:', error);
    return NextResponse.json(
      { error: 'Error al validar DNI', details: error.message },
      { status: 500 }
    );
  }
}
