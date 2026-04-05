import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Eliminar foto
 */
async function deletePhoto(photoPath: string): Promise<void> {
  // En Vercel se guarda como base64, no hay sistema de archivos a borrar
}

/**
 * Guardar foto base64
 */
async function savePhoto(base64Data: string, dni: string): Promise<string> {
  return base64Data;
}

/**
 * GET - Obtener todo el personal de proveedores
 */
export async function GET(request: NextRequest) {
  try {
    const personnel = await prisma.providerPersonnel.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ personnel });
  } catch (error: any) {
    console.error('Error obteniendo personal de proveedores:', error);
    return NextResponse.json(
      { error: 'Error al obtener personal de proveedores' },
      { status: 500 }
    );
  }
}

/**
 * POST - Registrar nuevo personal de proveedor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, dni, company, position, phone, photoBase64, descriptor, entryDateTime, exitDateTime } = body;

    console.log('🔵 API Provider-Personnel POST recibido:');
    console.log('  - Nombre:', fullName);
    console.log('  - DNI:', dni);
    console.log('  - Tiene foto:', !!photoBase64);
    console.log('  - Descriptor recibido:', descriptor ? `Array de ${descriptor.length} valores` : 'null');

    // Validaciones
    if (!fullName || !dni || !company) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (fullName, dni, company)' },
        { status: 400 }
      );
    }

    // Verificar si ya existe el DNI
    const existing = await prisma.providerPersonnel.findUnique({
      where: { dni },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe personal con ese DNI' },
        { status: 400 }
      );
    }

    // Guardar foto si se proporcionó
    let photoPath = null;
    if (photoBase64) {
      try {
        photoPath = await savePhoto(photoBase64, dni);
        console.log('  ✅ Foto guardada en:', photoPath);
      } catch (error) {
        console.error('Error guardando foto:', error);
        // Continuar sin foto
      }
    }

    // Crear registro con transacción para incluir biométrico
    const newPersonnel = await prisma.$transaction(async (tx) => {
      // Crear registro de personal
      const personnel = await tx.providerPersonnel.create({
        data: {
          fullName,
          dni,
          company,
          position: position || null,
          phone: phone || null,
          photoPath,
          entryDateTime: entryDateTime ? new Date(entryDateTime) : null,
          exitDateTime: exitDateTime ? new Date(exitDateTime) : null,
          status: 'Activo',
        },
      });

      console.log('  ✅ Personal creado con ID:', personnel.id);

      // Si hay descriptor, crear registro biométrico
      if (descriptor && Array.isArray(descriptor)) {
        const biometric = await tx.faceBiometric.create({
          data: {
            providerPersonnelId: personnel.id,
            descriptor: JSON.stringify(descriptor),
          },
        });
        console.log(`  ✅ Registro biométrico creado con ID: ${biometric.id} para ${fullName} (Proveedor)`);
      } else {
        console.warn('  ⚠️ No se recibió descriptor - NO se creó registro biométrico');
      }

      return personnel;
    });

    return NextResponse.json({ success: true, personnel: newPersonnel });
  } catch (error: any) {
    console.error('Error registrando personal de proveedor:', error);
    return NextResponse.json(
      { error: 'Error al registrar personal de proveedor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar personal de proveedor
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

    await prisma.providerPersonnel.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando personal de proveedor:', error);
    return NextResponse.json(
      { error: 'Error al eliminar personal de proveedor' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Actualizar personal de proveedor
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const { fullName, dni, company, position, phone, photoPath, entryDateTime, exitDateTime } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      );
    }

    // Si hay nueva foto (base64), guardarla primero y eliminar la antigua
    let newPhotoPath = undefined;
    if (photoPath && photoPath.startsWith('data:image')) {
      try {
        // Obtener registro actual para eliminar foto antigua
        const current = await prisma.providerPersonnel.findUnique({
          where: { id: parseInt(id) },
          select: { photoPath: true }
        });

        // Eliminar foto antigua si existe
        if (current?.photoPath) {
          await deletePhoto(current.photoPath);
        }

        // Guardar nueva foto
        newPhotoPath = await savePhoto(photoPath, dni || 'temp');
        console.log('✅ Nueva foto guardada:', newPhotoPath);
      } catch (error) {
        console.error('Error guardando nueva foto:', error);
        // Continuar sin actualizar la foto
      }
    }

    const updated = await prisma.providerPersonnel.update({
      where: { id: parseInt(id) },
      data: {
        fullName: fullName || undefined,
        dni: dni || undefined,
        company: company || undefined,
        position: position || undefined,
        phone: phone || undefined,
        photoPath: newPhotoPath || undefined,
        entryDateTime: entryDateTime ? new Date(entryDateTime) : undefined,
        exitDateTime: exitDateTime ? new Date(exitDateTime) : undefined,
      },
    });

    return NextResponse.json({ success: true, personnel: updated });
  } catch (error: any) {
    console.error('Error actualizando personal de proveedor:', error);
    return NextResponse.json(
      { error: 'Error al actualizar personal de proveedor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualizar estado del personal de proveedor
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID y status requeridos' },
        { status: 400 }
      );
    }

    const updated = await prisma.providerPersonnel.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    return NextResponse.json({ success: true, personnel: updated });
  } catch (error: any) {
    console.error('Error actualizando personal de proveedor:', error);
    return NextResponse.json(
      { error: 'Error al actualizar personal de proveedor' },
      { status: 500 }
    );
  }
}
