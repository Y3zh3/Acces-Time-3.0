import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET - Obtener personal próximo a salir (10 minutos antes)
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Buscar personal de transporte próximo a salir
    const transportAlerts = await prisma.transportPersonnel.findMany({
      where: {
        status: 'Activo',
        exitDateTime: {
          gte: now,
          lte: tenMinutesFromNow,
        },
      },
      select: {
        id: true,
        fullName: true,
        dni: true,
        company: true,
        exitDateTime: true,
        vehicle: true,
        licensePlate: true,
      },
      orderBy: {
        exitDateTime: 'asc',
      },
    });

    // Buscar personal de proveedores próximo a salir
    const providerAlerts = await prisma.providerPersonnel.findMany({
      where: {
        status: 'Activo',
        exitDateTime: {
          gte: now,
          lte: tenMinutesFromNow,
        },
      },
      select: {
        id: true,
        fullName: true,
        dni: true,
        company: true,
        exitDateTime: true,
        position: true,
      },
      orderBy: {
        exitDateTime: 'asc',
      },
    });

    // Combinar alertas y añadir tipo
    const alerts = [
      ...transportAlerts.map(alert => ({
        ...alert,
        type: 'Personal Transporte' as const,
        minutesRemaining: Math.floor((new Date(alert.exitDateTime!).getTime() - now.getTime()) / 60000),
      })),
      ...providerAlerts.map(alert => ({
        ...alert,
        type: 'Personal Proveedor' as const,
        minutesRemaining: Math.floor((new Date(alert.exitDateTime!).getTime() - now.getTime()) / 60000),
      })),
    ].sort((a, b) => a.minutesRemaining - b.minutesRemaining);

    return NextResponse.json({ alerts, count: alerts.length });
  } catch (error: any) {
    console.error('Error obteniendo alertas:', error);
    return NextResponse.json(
      { error: 'Error al obtener alertas', details: error.message },
      { status: 500 }
    );
  }
}
