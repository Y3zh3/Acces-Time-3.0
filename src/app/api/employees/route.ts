import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET - Obtener todos los empleados
 */
export async function GET(request: NextRequest) {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        biometric: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({ employees });
  } catch (error: any) {
    console.error('Error obteniendo empleados:', error);
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar un empleado
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      );
    }

    // Eliminar empleado (biometría se elimina en cascada)
    await prisma.employee.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando empleado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar empleado' },
      { status: 500 }
    );
  }
}
