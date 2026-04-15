import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteBiometricImage } from '@/lib/file-storage';

// Eliminar empleado
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = parseInt(params.id);

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'ID de empleado inválido' },
        { status: 400 }
      );
    }

    // Buscar el empleado con su información de biométricos
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        biometric: true,
        accessLogs: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar foto del sistema de archivos si existe
    if (employee.photoPath) {
      await deleteBiometricImage(employee.photoPath);
    }

    // Eliminar empleado y sus relaciones en cascada
    await prisma.$transaction(async (tx: any) => {
      // Eliminar biométrico si existe
      if (employee.biometric) {
        await tx.faceBiometric.delete({
          where: { id: employee.biometric.id },
        });
      }

      // Eliminar registros de acceso
      if (employee.accessLogs.length > 0) {
        await tx.accessLog.deleteMany({
          where: { employeeId: employeeId },
        });
      }

      // Eliminar pases temporales emitidos
      await tx.temporaryPass.deleteMany({
        where: { issuedById: employeeId },
      });

      // Finalmente eliminar el empleado
      await tx.employee.delete({
        where: { id: employeeId },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Empleado eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando empleado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el empleado' },
      { status: 500 }
    );
  }
}

// Actualizar empleado
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = parseInt(params.id);

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'ID de empleado inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      dni,
      role,
      position,
      department,
      location,
      email,
      status,
      contractExpiry,
      workStartTime,
      workEndTime,
    } = body;

    // Verificar que el empleado existe
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el DNI ya existe (si se está cambiando)
    if (dni && dni !== existingEmployee.dni) {
      const dniExists = await prisma.employee.findUnique({
        where: { dni: dni.toUpperCase() },
      });

      if (dniExists) {
        return NextResponse.json(
          { error: 'El DNI ya está registrado para otro empleado' },
          { status: 400 }
        );
      }
    }

    // Preparar fecha de contrato
    const contractExpiryDate = contractExpiry ? new Date(contractExpiry) : null;

    // Actualizar empleado
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(fullName && { fullName }),
        ...(dni && { dni: dni.toUpperCase() }),
        ...(role && { role }),
        ...(position && { position }),
        ...(department && { department }),
        ...(location !== undefined && { location }),
        ...(email !== undefined && { email }),
        ...(status && { status }),
        ...(contractExpiryDate !== null && { contractExpiry: contractExpiryDate }),
        ...(workStartTime && { workStartTime }),
        ...(workEndTime && { workEndTime }),
      },
    });

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      message: 'Empleado actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando empleado:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el empleado' },
      { status: 500 }
    );
  }
}

// Obtener un empleado específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = parseInt(params.id);

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'ID de empleado inválido' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        biometric: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee,
    });
  } catch (error: any) {
    console.error('Error obteniendo empleado:', error);
    return NextResponse.json(
      { error: 'Error al obtener el empleado' },
      { status: 500 }
    );
  }
}
