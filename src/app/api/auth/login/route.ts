import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Credencial del administrador principal (hardcoded)
const ADMIN_CREDENTIAL = {
  username: "admin",
  password: "admin2026",
  fullName: "Administrador Principal",
  role: "ADMINISTRADOR",
  email: "admin@logistreams.com"
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, expectedRole } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Normalizar username a mayúsculas
    const normalizedUsername = username.toUpperCase();

    // Verificar primero si es el admin principal
    if (normalizedUsername === ADMIN_CREDENTIAL.username.toUpperCase() && password === ADMIN_CREDENTIAL.password) {
      // Si se espera rol admin, permitir
      if (expectedRole && expectedRole !== 'ADMINISTRADOR') {
        return NextResponse.json(
          { error: "Credenciales inválidas para este perfil" },
          { status: 401 }
        );
      }
      return NextResponse.json({
        success: true,
        user: {
          id: 0,
          username: ADMIN_CREDENTIAL.username,
          fullName: ADMIN_CREDENTIAL.fullName,
          role: ADMIN_CREDENTIAL.role,
          email: ADMIN_CREDENTIAL.email
        }
      });
    }

    // Si se intenta entrar como admin pero no es el admin
    if (expectedRole === 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: "Contraseña de administrador incorrecta" },
        { status: 401 }
      );
    }

    // Buscar en la base de datos
    const user = await prisma.systemUser.findUnique({
      where: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        password: true,
        fullName: true,
        role: true,
        email: true,
        status: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    // Verificar que el usuario esté activo
    if (user.status !== "Activo") {
      return NextResponse.json(
        { error: "Usuario inactivo. Contacte al administrador." },
        { status: 401 }
      );
    }

    // Verificar contraseña (en producción usar bcrypt)
    if (user.password !== password) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    // Verificar que el rol coincida con el esperado
    if (expectedRole && user.role !== expectedRole) {
      return NextResponse.json(
        { error: `Este usuario no tiene perfil de ${expectedRole === 'SUPERVISOR' ? 'Supervisor' : 'Seguridad'}` },
        { status: 401 }
      );
    }

    // Login exitoso
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}
