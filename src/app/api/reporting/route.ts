import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams
    const action = searchParams.get('action')

    if (action === 'current-occupancy') {
      // Personal actualmente en planta
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Obtener todos los registros de acceso (entradas y salidas)
      const allLogs = await prisma.accessLog.findMany({
        where: {
          entryTime: { gte: today },
        },
        include: {
          employee: true,
          transport: true,
          provider: true,
        },
        orderBy: { entryTime: 'desc' },
      })

      // Calcular ocupación por categoría
      const occupancy: Record<string, { entradas: number; salidas: number; actual: number }> = {
        EMPLEADOS: { entradas: 0, salidas: 0, actual: 0 },
        TRANSPORTE: { entradas: 0, salidas: 0, actual: 0 },
        PROVEEDORES: { entradas: 0, salidas: 0, actual: 0 },
      }

      // Rastrear el último estado de cada persona por DNI
      const personStatus: Record<string, { category: string; inPlant: boolean; lastEntry: Date }> = {}

      // Procesar todos los logs
      allLogs.forEach((log) => {
        // Determinar categoría según relación
        let category = 'EMPLEADOS'
        if (log.transport) {
          category = 'TRANSPORTE'
        } else if (log.provider) {
          category = 'PROVEEDORES'
        }

        // Contar entradas
        occupancy[category].entradas++

        // Si tiene exitTime, es una salida completa
        if (log.exitTime) {
          occupancy[category].salidas++
          if (log.userDni) {
            personStatus[log.userDni] = { 
              category, 
              inPlant: false,
              lastEntry: new Date(log.entryTime)
            }
          }
        } else {
          // No tiene exitTime, está en planta
          if (log.userDni) {
            const existing = personStatus[log.userDni]
            // Solo actualizar si es más reciente o no existe
            if (!existing || new Date(log.entryTime) > existing.lastEntry) {
              personStatus[log.userDni] = { 
                category, 
                inPlant: true,
                lastEntry: new Date(log.entryTime)
              }
            }
          }
        }
      })

      // Contar cuántos están actualmente en planta
      Object.values(personStatus).forEach((status) => {
        if (status.inPlant) {
          occupancy[status.category].actual++
        }
      })

      console.log('📊 Ocupación calculada:', occupancy)
      console.log('👥 Estado de personas:', personStatus)

      return NextResponse.json(occupancy)
    }

    if (action === 'hourly-traffic') {
      // Tráfico por hora del día actual
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const logsToday = await prisma.accessLog.findMany({
        where: {
          entryTime: {
            gte: today,
            lt: tomorrow,
          },
        },
      })

      // Agrupar por hora
      const hourlyData: Record<number, { entradas: number; salidas: number }> = {}
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = { entradas: 0, salidas: 0 }
      }

      logsToday.forEach((log) => {
        const hour = new Date(log.entryTime).getHours()
        hourlyData[hour].entradas++
        
        if (log.exitTime) {
          const exitHour = new Date(log.exitTime).getHours()
          hourlyData[exitHour].salidas++
        }
      })

      return NextResponse.json(hourlyData)
    }

    if (action === 'compliance-stats') {
      // Estadísticas de cumplimiento
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const logsToday = await prisma.accessLog.findMany({
        where: {
          entryTime: { gte: today },
        },
      })

      const total = logsToday.length
      const aprobados = logsToday.filter(l => l.status.includes('Aprobado') && !l.status.toLowerCase().includes('fuera')).length
      const fueraDeHorario = logsToday.filter(l => l.status.toLowerCase().includes('fuera')).length
      const denegados = logsToday.filter(l => l.status === 'Denegado').length

      return NextResponse.json({
        total,
        aprobados,
        fueraDeHorario,
        denegados,
        porcentajePuntualidad: total > 0 ? ((aprobados / total) * 100).toFixed(1) : '0',
      })
    }

    if (action === 'weekly-summary') {
      // Resumen de los últimos 7 días
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const logsWeek = await prisma.accessLog.findMany({
        where: {
          entryTime: { gte: sevenDaysAgo },
        },
      })

      // Agrupar por día
      const dailyData: Record<string, { entradas: number; salidas: number }> = {}

      logsWeek.forEach((log) => {
        const date = new Date(log.entryTime).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
        })
        
        if (!dailyData[date]) {
          dailyData[date] = { entradas: 0, salidas: 0 }
        }

        dailyData[date].entradas++
        
        if (log.exitTime) {
          const exitDate = new Date(log.exitTime).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
          })
          if (!dailyData[exitDate]) {
            dailyData[exitDate] = { entradas: 0, salidas: 0 }
          }
          dailyData[exitDate].salidas++
        }
      })

      return NextResponse.json(dailyData)
    }

    if (action === 'company-stats') {
      // Estadísticas por empresa (transporte y proveedores)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Obtener logs de hoy con relaciones
      const logsToday = await prisma.accessLog.findMany({
        where: {
          entryTime: { gte: today },
          status: { contains: 'Aprobado' },
        },
        include: {
          transport: true,
          provider: true,
        },
        orderBy: { entryTime: 'asc' },
      })

      // Rastrear el último estado de cada persona
      const personStatus: Record<string, { inPlant: boolean; company: string; lastEntry: Date }> = {}

      logsToday.forEach(log => {
        if (!log.userDni) return

        let company = ''
        if (log.transport) {
          company = log.transport.company
        } else if (log.provider) {
          company = log.provider.company
        } else {
          return // No es transporte ni proveedor
        }

        const existing = personStatus[log.userDni]
        const entryTime = new Date(log.entryTime)
        
        // Solo actualizar si es más reciente o no existe
        if (!existing || entryTime > existing.lastEntry) {
          personStatus[log.userDni] = { 
            inPlant: !log.exitTime, // Si no tiene exitTime, está en planta
            company,
            lastEntry: entryTime
          }
        }
      })

      // Contar por empresa solo los que están en planta
      const companyCount: Record<string, number> = {}

      Object.values(personStatus).forEach(status => {
        if (status.inPlant) {
          const companyUpper = status.company.toUpperCase()
          companyCount[companyUpper] = (companyCount[companyUpper] || 0) + 1
        }
      })

      // Ordenar por cantidad descendente y tomar top 10
      const sorted = Object.entries(companyCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((acc, [company, count]) => {
          acc[company] = count
          return acc
        }, {} as Record<string, number>)

      return NextResponse.json(sorted)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in reporting API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
