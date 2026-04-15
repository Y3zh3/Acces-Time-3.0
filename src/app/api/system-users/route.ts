import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Obtener todos los usuarios del sistema (con filtro opcional por rol)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');
    
    const whereClause = roleFilter && roleFilter !== 'ADMINISTRADOR' 
      ? { role: roleFilter, status: 'Activo' } 
      : {};

    const users = await prisma.systemUser.findMany({
      where: whereClause,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching system users:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario del sistema
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, fullName, role, email, status } = body;

    // Validaciones
    if (!username || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: usuario, contraseña, nombre completo y rol" },
        { status: 400 }
      );
    }

    // Verificar que el rol sea válido
    if (!["SUPERVISOR", "SEGURIDAD"].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido. Solo se pueden crear usuarios Supervisor o Seguridad" },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.systemUser.findUnique({
      where: { username: username.toUpperCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese nombre de usuario" },
        { status: 409 }
      );
    }

    // Crear el usuario (en producción, hashear la contraseña)
    const newUser = await prisma.systemUser.create({
      data: {
        username: username.toUpperCase(),
        password, // TODO: Hashear con bcrypt en producción
        fullName: fullName.toUpperCase(),
        role,
        email: email || null,
        status: status || "Activo",
      },
    });

    return NextResponse.json({
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      email: newUser.email,
      status: newUser.status,
      createdAt: newUser.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating system user:", error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar usuario del sistema
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, username, password, fullName, role, email, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere el ID del usuario" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.systemUser.findUnique({
      where: { id: Number(id) },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Verificar username único si se cambió
    if (username && username !== existingUser.username) {
      const userWithSameUsername = await prisma.systemUser.findUnique({
        where: { username },
      });
      if (userWithSameUsername) {
        return NextResponse.json(
          { error: "Ya existe otro usuario con ese nombre de usuario" },
          { status: 409 }
        );
      }
    }

    // Preparar datos de actualización
    const updateData: Record<string, string | undefined> = {};
    if (username) updateData.username = username.toUpperCase();
    if (password) updateData.password = password; // TODO: Hashear
    if (fullName) updateData.fullName = fullName.toUpperCase();
    if (role) updateData.role = role;
    if (email !== undefined) updateData.email = email;
    if (status) updateData.status = status;

    const updatedUser = await prisma.systemUser.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      email: updatedUser.email,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    console.error("Error updating system user:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario del sistema
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere el ID del usuario" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.systemUser.findUnique({
      where: { id: Number(id) },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    await prisma.systemUser.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting system user:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
