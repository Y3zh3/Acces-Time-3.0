import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Verifica si el acceso está dentro del horario laboral
 */
function isWithinWorkingHours(workStart: string | null, workEnd: string | null): boolean {
  if (!workStart || !workEnd) return true; // Si no hay horario configurado, se permite

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  return currentTime >= workStart && currentTime <= workEnd;
}

/**
 * Verifica si la entrada está dentro de la ventana permitida (Personal interno)
 * Permite ingresar desde 60 minutos ANTES de la hora de inicio hasta 60 minutos DESPUÉS de la hora de fin del horario laboral
 */
function isWithinEmployeeEntryWindow(workStart: string | null, workEnd: string | null): { allowed: boolean; windowStart: string; windowEnd: string } {
  if (!workStart || !workEnd) {
    return { allowed: true, windowStart: 'N/A', windowEnd: 'N/A' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parsear hora de inicio y fin
  const [startHour, startMinute] = workStart.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  
  const [endHour, endMinute] = workEnd.split(':').map(Number);
  const endMinutes = endHour * 60 + endMinute;
  
  // Calcular ventana: 60 minutos antes de hora inicio hasta 60 minutos después de hora de fin (MÁS FLEXIBLE)
  const windowStartMinutes = startMinutes - 60;
  const windowEndMinutes = endMinutes + 60;
  
  // Calcular horas para retornar
  const wsHour = Math.floor(windowStartMinutes / 60);
  const wsMinute = windowStartMinutes % 60;
  const weHour = Math.floor(windowEndMinutes / 60);
  const weMinute = windowEndMinutes % 60;
  
  const windowStart = `${wsHour.toString().padStart(2, '0')}:${wsMinute.toString().padStart(2, '0')}`;
  const windowEnd = `${weHour.toString().padStart(2, '0')}:${weMinute.toString().padStart(2, '0')}`;
  
  // Verificar si está dentro de la ventana
  const allowed = currentMinutes >= windowStartMinutes && currentMinutes <= windowEndMinutes;
  
  return { allowed, windowStart, windowEnd };
}

/**
 * Verifica si la salida está dentro de la ventana permitida (Personal interno)
 * Permite salir desde 60 minutos ANTES de la hora programada hasta 120 minutos DESPUÉS (MÁS FLEXIBLE)
 */
function isWithinEmployeeExitWindow(workEnd: string | null): { allowed: boolean; windowStart: string; windowEnd: string } {
  if (!workEnd) {
    return { allowed: true, windowStart: 'N/A', windowEnd: 'N/A' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parsear hora de salida
  const [endHour, endMinute] = workEnd.split(':').map(Number);
  const endMinutes = endHour * 60 + endMinute;
  
  // Calcular ventana: desde 60 minutos antes hasta 120 minutos después (MÁS FLEXIBLE)
  const windowStartMinutes = endMinutes - 60;
  const windowEndMinutes = endMinutes + 120;
  
  // Calcular horas para retornar
  const wsHour = Math.floor(windowStartMinutes / 60);
  const wsMinute = windowStartMinutes % 60;
  const weHour = Math.floor(windowEndMinutes / 60);
  const weMinute = windowEndMinutes % 60;
  
  const windowStart = `${wsHour.toString().padStart(2, '0')}:${wsMinute.toString().padStart(2, '0')}`;
  const windowEnd = `${weHour.toString().padStart(2, '0')}:${weMinute.toString().padStart(2, '0')}`;
  
  // Verificar si está dentro de la ventana
  const allowed = currentMinutes >= windowStartMinutes && currentMinutes <= windowEndMinutes;
  
  return { allowed, windowStart, windowEnd };
}

/**
 * Verifica si la entrada está dentro de la ventana permitida (Transporte/Proveedores)
 * Permite ingresar desde 60 minutos ANTES de la hora programada hasta 120 minutos DESPUÉS (MÁS FLEXIBLE)
 * @param entryDateTime - Fecha y hora completa programada de entrada
 * @returns Objeto con validación y ventanas de tiempo
 */
function isWithinProviderEntryWindow(entryDateTime: Date | null): { allowed: boolean; windowStart: string; windowEnd: string } {
  if (!entryDateTime) {
    return { allowed: true, windowStart: 'N/A', windowEnd: 'N/A' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Extraer hora de la fecha programada
  const programmedHour = entryDateTime.getHours();
  const programmedMinute = entryDateTime.getMinutes();
  const programmedMinutes = programmedHour * 60 + programmedMinute;
  
  // Calcular ventana: desde 60 minutos antes hasta 120 minutos después (MÁS FLEXIBLE)
  const windowStartMinutes = programmedMinutes - 60;
  const windowEndMinutes = programmedMinutes + 120;
  
  // Calcular horas para retornar
  const wsHour = Math.floor(windowStartMinutes / 60);
  const wsMinute = windowStartMinutes % 60;
  const weHour = Math.floor(windowEndMinutes / 60);
  const weMinute = windowEndMinutes % 60;
  
  const windowStart = `${wsHour.toString().padStart(2, '0')}:${wsMinute.toString().padStart(2, '0')}`;
  const windowEnd = `${weHour.toString().padStart(2, '0')}:${weMinute.toString().padStart(2, '0')}`;
  
  // Verificar si está dentro de la ventana
  const allowed = currentMinutes >= windowStartMinutes && currentMinutes <= windowEndMinutes;
  
  return { allowed, windowStart, windowEnd };
}

/**
 * Verifica si la entrada está dentro de la ventana permitida (Transporte/Proveedores - legacy)
 * Permite ingresar desde la hora programada hasta 30 minutos después
 */
function isWithinEntryWindow(workStart: string | null): boolean {
  if (!workStart) return true; // Si no hay horario configurado, se permite

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parsear hora de inicio
  const [startHour, startMinute] = workStart.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  
  // Calcular ventana: desde inicio hasta 30 minutos después
  const endMinutes = startMinutes + 30;
  
  // Verificar si está dentro de la ventana
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Calcula la hora final de la ventana de entrada (hora + 30 minutos)
 */
function calculateEntryWindowEnd(workStart: string | null): string {
  if (!workStart) return 'N/A';
  
  const [startHour, startMinute] = workStart.split(':').map(Number);
  const totalMinutes = startHour * 60 + startMinute + 30;
  
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  
  return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
}

/**
 * Busca un pase temporal válido para un DNI en la fecha/hora actual
 */
async function findValidTemporaryPass(dni: string): Promise<any | null> {
  const now = new Date();
  
  try {
    const pass = await prisma.temporaryPass.findFirst({
      where: {
        dni: dni,
        status: 'Activo',
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    });
    
    return pass;
  } catch (error) {
    console.error('Error buscando pase temporal:', error);
    return null;
  }
}

/**
 * POST - Registrar entrada o salida de personal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dni, fullName, role, action, category } = body;

    if (!dni || !fullName || !action) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (dni, fullName, action)' },
        { status: 400 }
      );
    }

    const now = new Date();
    let accessStatus = 'Aprobado';
    let accessType: 'success' | 'warning' | 'critical' = 'success';
    let workStart: string | null = null;
    let workEnd: string | null = null;
    let employeeId: number | null = null;
    let transportId: number | null = null;
    let providerId: number | null = null;

    console.log(`📝 Procesando ${action}: DNI=${dni}, Nombre=${fullName}, Categoría=${category}`);

    // Obtener horarios y employeeId según categoría
    if (category !== 'Transporte' && category !== 'Chofer' && category !== 'Proveedor') {
      // Gestión de personal → tabla employees
      try {
        const employee = await prisma.employee.findUnique({
          where: { dni: dni },
        });

        if (employee) {
          workStart = employee.workStartTime;
          workEnd = employee.workEndTime;
          employeeId = employee.id; // Guardar ID del empleado
          
          // Personal interno: Validar con tolerancias personalizadas
          if (action === 'Entrada') {
            const entryValidation = isWithinEmployeeEntryWindow(workStart, workEnd);
            
            if (!entryValidation.allowed) {
              const temporaryPass = await findValidTemporaryPass(dni);
              
              if (temporaryPass) {
                accessStatus = 'Fuera de Horario - Con Pase';
                accessType = 'warning';
              } else {
                // ACCESO DENEGADO: Fuera de ventana permitida
                console.log(`🚫 Acceso denegado: ${fullName} intentó ingresar fuera de su ventana permitida (${entryValidation.windowStart} - ${entryValidation.windowEnd})`);
                return NextResponse.json(
                  { 
                    error: 'Acceso denegado',
                    message: `No puede ingresar fuera de su horario laboral. Horario: ${workStart} - ${workEnd} (puede ingresar desde 1 hora antes de su hora de inicio hasta 1 hora después de su hora de fin). Solicite un pase temporal si necesita acceso fuera de este horario.`,
                    workStartTime: workStart,
                    workEndTime: workEnd,
                    allowedWindow: `${entryValidation.windowStart} - ${entryValidation.windowEnd}`
                  },
                  { status: 403 }
                );
              }
            }
          } else if (action === 'Salida') {
            const exitValidation = isWithinEmployeeExitWindow(workEnd);
            
            if (!exitValidation.allowed) {
              // Para salidas, podríamos solo registrar con advertencia en vez de denegar
              accessStatus = 'Salida Fuera de Horario';
              accessType = 'warning';
            }
          }
        }
      } catch (error) {
        console.error('❌ Error al buscar empleado:', error);
      }
    } else if (category === 'Transporte' || category === 'Chofer') {
      // Personal de transporte
      try {
        const transport = await prisma.transportPersonnel.findUnique({
          where: { dni: dni },
        });

        if (transport) {
          transportId = transport.id; // Guardar ID del transporte
          // Usar entryDateTime para validación de ventana de acceso
          const entryValidation = isWithinProviderEntryWindow(transport.entryDateTime);
          
          if (action === 'Entrada' && !entryValidation.allowed) {
            const temporaryPass = await findValidTemporaryPass(dni);
            if (temporaryPass) {
              accessStatus = 'Fuera de Horario - Con Pase';
              accessType = 'warning';
            } else {
              // ACCESO DENEGADO: Fuera de ventana de entrada sin pase temporal
              const programmedTime = transport.entryDateTime 
                ? new Date(transport.entryDateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                : 'N/A';
              console.log(`🚫 Acceso denegado: ${fullName} intentó ingresar fuera de la ventana permitida (${entryValidation.windowStart} - ${entryValidation.windowEnd})`);
              return NextResponse.json(
                { 
                  error: 'Acceso denegado',
                  message: `No puede ingresar fuera de su ventana de entrada. Horario programado: ${programmedTime} (tolerancia desde 1 hora antes hasta 2 horas después).`,
                  programmedTime: programmedTime,
                  allowedWindow: `${entryValidation.windowStart} - ${entryValidation.windowEnd}`
                },
                { status: 403 }
              );
            }
          }
        }
      } catch (error) {
        console.error('❌ Error al buscar transporte:', error);
      }
    } else if (category === 'Proveedor') {
      // Personal de proveedores
      try {
        const provider = await prisma.providerPersonnel.findUnique({
          where: { dni: dni },
        });

        if (provider) {
          providerId = provider.id; // Guardar ID del proveedor
          // Usar entryDateTime para validación de ventana de acceso
          const entryValidation = isWithinProviderEntryWindow(provider.entryDateTime);
          
          if (action === 'Entrada' && !entryValidation.allowed) {
            const temporaryPass = await findValidTemporaryPass(dni);
            if (temporaryPass) {
              accessStatus = 'Fuera de Horario - Con Pase';
              accessType = 'warning';
            } else {
              // ACCESO DENEGADO: Fuera de ventana de entrada sin pase temporal
              const programmedTime = provider.entryDateTime 
                ? new Date(provider.entryDateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                : 'N/A';
              console.log(`🚫 Acceso denegado: ${fullName} intentó ingresar fuera de la ventana permitida (${entryValidation.windowStart} - ${entryValidation.windowEnd})`);
              return NextResponse.json(
                { 
                  error: 'Acceso denegado',
                  message: `No puede ingresar fuera de su ventana de entrada. Horario programado: ${programmedTime} (tolerancia desde 1 hora antes hasta 2 horas después).`,
                  programmedTime: programmedTime,
                  allowedWindow: `${entryValidation.windowStart} - ${entryValidation.windowEnd}`
                },
                { status: 403 }
              );
            }
          }
        }
      } catch (error) {
        console.error('❌ Error al buscar proveedor:', error);
      }
    }

    let accessLog;

    if (action === 'Entrada') {
      // ENTRADA: Crear nuevo registro con hora de entrada
      accessLog = await prisma.accessLog.create({
        data: {
          userName: fullName,
          userDni: dni,
          role: role || 'N/A',
          status: accessStatus,
          zone: 'Portería - Ingreso',
          type: accessType,
          entryTime: now,
          exitTime: null, // Sin salida aún
          employeeId: employeeId, // Relacionar con empleado si existe
          transportId: transportId, // Relacionar con transporte si existe
          providerId: providerId, // Relacionar con proveedor si existe
        },
      });

      // Actualizar actualEntryDateTime en TransportPersonnel o ProviderPersonnel
      if (category === 'Transporte' || category === 'Chofer') {
        try {
          await prisma.transportPersonnel.update({
            where: { dni: dni },
            data: { actualEntryDateTime: now }
          });
          console.log(`✅ actualEntryDateTime actualizado en TransportPersonnel para DNI ${dni}`);
        } catch (error) {
          console.error('❌ Error actualizando actualEntryDateTime en TransportPersonnel:', error);
        }
      } else if (category === 'Proveedor') {
        try {
          await prisma.providerPersonnel.update({
            where: { dni: dni },
            data: { actualEntryDateTime: now }
          });
          console.log(`✅ actualEntryDateTime actualizado en ProviderPersonnel para DNI ${dni}`);
        } catch (error) {
          console.error('❌ Error actualizando actualEntryDateTime en ProviderPersonnel:', error);
        }
      }

      console.log(`✅ Entrada registrada: ${fullName} a las ${now.toLocaleTimeString('es-AR')}`);
    } else if (action === 'Salida') {
      // SALIDA: Buscar el último registro sin exitTime y actualizarlo
      const lastEntry = await prisma.accessLog.findFirst({
        where: {
          userDni: dni,
          exitTime: null, // Sin salida registrada
        },
        orderBy: {
          entryTime: 'desc', // El más reciente
        },
      });

      if (lastEntry) {
        // Actualizar el registro con la hora de salida
        accessLog = await prisma.accessLog.update({
          where: { id: lastEntry.id },
          data: {
            exitTime: now,
            zone: 'Portería - Salida', // Actualizar zona
          },
        });

        // Actualizar actualExitDateTime en TransportPersonnel o ProviderPersonnel
        if (category === 'Transporte' || category === 'Chofer') {
          try {
            await prisma.transportPersonnel.update({
              where: { dni: dni },
              data: { actualExitDateTime: now }
            });
            console.log(`✅ actualExitDateTime actualizado en TransportPersonnel para DNI ${dni}`);
          } catch (error) {
            console.error('❌ Error actualizando actualExitDateTime en TransportPersonnel:', error);
          }
        } else if (category === 'Proveedor') {
          try {
            await prisma.providerPersonnel.update({
              where: { dni: dni },
              data: { actualExitDateTime: now }
            });
            console.log(`✅ actualExitDateTime actualizado en ProviderPersonnel para DNI ${dni}`);
          } catch (error) {
            console.error('❌ Error actualizando actualExitDateTime en ProviderPersonnel:', error);
          }
        }

        console.log(`✅ Salida registrada: ${fullName} a las ${now.toLocaleTimeString('es-AR')}`);
      } else {
        // No hay entrada previa - DENEGAR la salida
        console.log(`🚫 Salida denegada: ${fullName} no tiene entrada previa registrada`);
        return NextResponse.json(
          { 
            error: 'Salida denegada',
            message: 'No puede registrar salida sin tener una entrada previa. Por favor, registre primero su entrada.',
            userName: fullName,
            dni: dni
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Acción inválida. Debe ser "Entrada" o "Salida"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      log: accessLog,
      accessStatus,
      message: accessStatus === 'Aprobado' 
        ? `${action} registrada exitosamente a las ${now.toLocaleTimeString('es-AR')}`
        : `${action} registrada - ${accessStatus}`,
    });
  } catch (error: any) {
    console.error('Error registrando acceso:', error);
    return NextResponse.json(
      { error: 'Error al registrar acceso', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener logs de acceso
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const dni = searchParams.get('dni');
    const fecha = searchParams.get('fecha'); // Formato: YYYY-MM-DD

    // Construir filtros
    const where: any = {};
    
    if (dni) {
      where.userDni = dni;
    }
    
    if (fecha) {
      // Filtrar por fecha específica (todo el día)
      const [year, month, day] = fecha.split('-').map(Number);
      
      // Crear fechas en zona horaria local del servidor
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
      
      console.log(`📅 Filtrando registros del día ${fecha}:`);
      console.log(`   Desde: ${startOfDay.toLocaleString('es-AR')}`);
      console.log(`   Hasta: ${endOfDay.toLocaleString('es-AR')}`);
      
      where.entryTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const logs = await prisma.accessLog.findMany({
      where,
      orderBy: { entryTime: 'desc' }, // Ordenar por hora de entrada
      take: limit,
      include: {
        employee: {
          select: {
            role: true,
            position: true, // Cargo específico del empleado
            department: true,
          },
        },
      },
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Error obteniendo logs:', error);
    return NextResponse.json(
      { error: 'Error al obtener logs' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar registro de acceso
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de registro no proporcionado' },
        { status: 400 }
      );
    }

    await prisma.accessLog.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true, message: 'Registro eliminado correctamente' });
  } catch (error: any) {
    console.error('Error eliminando registro:', error);
    return NextResponse.json(
      { error: 'Error al eliminar registro', details: error.message },
      { status: 500 }
    );
  }
}
