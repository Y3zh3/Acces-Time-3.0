"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Clock, 
  Building2,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface OccupancyData {
  EMPLEADOS: { entradas: number; salidas: number; actual: number }
  TRANSPORTE: { entradas: number; salidas: number; actual: number }
  PROVEEDORES: { entradas: number; salidas: number; actual: number }
}

interface ComplianceStats {
  total: number
  aprobados: number
  fueraDeHorario: number
  denegados: number
  porcentajePuntualidad: string
}

export default function Dashboard() {
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null)
  const [hourlyTraffic, setHourlyTraffic] = useState<any[]>([])
  const [compliance, setCompliance] = useState<ComplianceStats | null>(null)
  const [weeklySummary, setWeeklySummary] = useState<any[]>([])
  const [companyStats, setCompanyStats] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setIsLoading(true)

      const [occData, hourlyData, compData, weeklyData, companyData] = await Promise.all([
        fetch('/api/reporting?action=current-occupancy').then(r => r.json()),
        fetch('/api/reporting?action=hourly-traffic').then(r => r.json()),
        fetch('/api/reporting?action=compliance-stats').then(r => r.json()),
        fetch('/api/reporting?action=weekly-summary').then(r => r.json()),
        fetch('/api/reporting?action=company-stats').then(r => r.json()),
      ])

      console.log('📊 Datos de ocupación:', occData)
      console.log('⏰ Datos por hora:', hourlyData)
      console.log('✅ Cumplimiento:', compData)
      console.log('📅 Resumen semanal:', weeklyData)
      console.log('🏢 Por empresa:', companyData)

      setOccupancy(occData)
      setCompliance(compData)
      setCompanyStats(companyData)

      // Formatear datos para gráficos
      const hourlyFormatted = Object.entries(hourlyData).map(([hour, data]: any) => ({
        hora: `${hour}:00`,
        entradas: data.entradas,
        salidas: data.salidas,
      }))
      setHourlyTraffic(hourlyFormatted)

      const weeklyFormatted = Object.entries(weeklyData).map(([date, data]: any) => ({
        fecha: date,
        entradas: data.entradas,
        salidas: data.salidas,
      }))
      setWeeklySummary(weeklyFormatted)

    } catch (error) {
      console.error('❌ Error al cargar datos:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los reportes',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()

    // Hoja 1: Resumen Ejecutivo
    const today = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })

    const totalEnPlanta = occupancy 
      ? (occupancy.EMPLEADOS?.actual || 0) + (occupancy.TRANSPORTE?.actual || 0) + (occupancy.PROVEEDORES?.actual || 0)
      : 0

    const summaryData = [
      ['DASHBOARD - ANÁLISIS CONSOLIDADO'],
      [''],
      ['FECHA DE GENERACIÓN:', today],
      ['HORA:', new Date().toLocaleTimeString('es-AR')],
      [''],
      ['═══════════════════════════════════════════════════════'],
      ['OCUPACIÓN ACTUAL DE PLANTA'],
      ['═══════════════════════════════════════════════════════'],
      [''],
      ['PERSONAL EN PLANTA:', totalEnPlanta],
      ['  - EMPLEADOS:', occupancy?.EMPLEADOS?.actual || 0],
      ['  - TRANSPORTE:', occupancy?.TRANSPORTE?.actual || 0],
      ['  - PROVEEDORES:', occupancy?.PROVEEDORES?.actual || 0],
      [''],
      ['═══════════════════════════════════════════════════════'],
      ['CUMPLIMIENTO HOY'],
      ['═══════════════════════════════════════════════════════'],
      [''],
      ['TOTAL INGRESOS:', compliance?.total || 0],
      ['APROBADOS (PUNTUALES):', compliance?.aprobados || 0],
      ['FUERA DE HORARIO:', compliance?.fueraDeHorario || 0],
      ['DENEGADOS:', compliance?.denegados || 0],
      ['PORCENTAJE PUNTUALIDAD:', `${compliance?.porcentajePuntualidad || 0}%`],
    ]

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumen Ejecutivo')

    // Hoja 2: Tráfico por Hora
    const hourlyExport = hourlyTraffic.map(h => ({
      'HORA': h.hora,
      'ENTRADAS': h.entradas,
      'SALIDAS': h.salidas,
      'BALANCE': h.entradas - h.salidas,
    }))

    const wsHourly = XLSX.utils.json_to_sheet(hourlyExport)
    wsHourly['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, wsHourly, 'Tráfico por Hora')

    // Hoja 3: Resumen Semanal
    const weeklyExport = weeklySummary.map(w => ({
      'FECHA': w.fecha,
      'ENTRADAS': w.entradas,
      'SALIDAS': w.salidas,
      'BALANCE': w.entradas - w.salidas,
    }))

    const wsWeekly = XLSX.utils.json_to_sheet(weeklyExport)
    wsWeekly['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, wsWeekly, 'Resumen Semanal')

    // Hoja 4: Por Empresa
    const companyExport = Object.entries(companyStats).map(([company, count]) => ({
      'EMPRESA': company,
      'PERSONAL EN PLANTA': count,
    }))

    const wsCompany = XLSX.utils.json_to_sheet(companyExport)
    wsCompany['!cols'] = [{ wch: 35 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, wsCompany, 'Por Empresa')

    const fileName = `Dashboard_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`
    XLSX.writeFile(workbook, fileName)

    toast({
      title: '📊 Reporte Generado',
      description: fileName,
    })
  }

  const totalEnPlanta = occupancy 
    ? (occupancy.EMPLEADOS?.actual || 0) + (occupancy.TRANSPORTE?.actual || 0) + (occupancy.PROVEEDORES?.actual || 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Análisis consolidado y estadísticas operativas en tiempo real.</p>
        </div>
        <Button
          variant="outline"
          onClick={exportToExcel}
          disabled={isLoading}
        >
          <Download className="mr-2 h-4 w-4" /> DESCARGAR REPORTE
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">Cargando reportes...</p>
      ) : (
        <>
          {/* Ocupación Actual */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-semibold">TOTAL EN PLANTA</p>
                    <p className="text-3xl font-bold text-purple-900">{totalEnPlanta}</p>
                  </div>
                  <Users className="h-10 w-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">EMPLEADOS</p>
                    <p className="text-2xl font-bold text-blue-600">{occupancy?.EMPLEADOS?.actual || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ↑{occupancy?.EMPLEADOS?.entradas || 0} ↓{occupancy?.EMPLEADOS?.salidas || 0}
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">TRANSPORTE</p>
                    <p className="text-2xl font-bold text-orange-600">{occupancy?.TRANSPORTE?.actual || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ↑{occupancy?.TRANSPORTE?.entradas || 0} ↓{occupancy?.TRANSPORTE?.salidas || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">PROVEEDORES</p>
                    <p className="text-2xl font-bold text-green-600">{occupancy?.PROVEEDORES?.actual || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ↑{occupancy?.PROVEEDORES?.entradas || 0} ↓{occupancy?.PROVEEDORES?.salidas || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cumplimiento Hoy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Cumplimiento de Horarios - Hoy
              </CardTitle>
              <CardDescription>Análisis de puntualidad en los accesos del día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TOTAL INGRESOS</p>
                    <p className="text-2xl font-bold">{compliance?.total || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PUNTUALES</p>
                    <p className="text-2xl font-bold text-green-600">{compliance?.aprobados || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">FUERA DE HORARIO</p>
                    <p className="text-2xl font-bold text-yellow-600">{compliance?.fueraDeHorario || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">DENEGADOS</p>
                    <p className="text-2xl font-bold text-red-600">{compliance?.denegados || 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">ÍNDICE DE PUNTUALIDAD</span>
                  <span className="text-3xl font-bold text-primary">{compliance?.porcentajePuntualidad || 0}%</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ width: `${compliance?.porcentajePuntualidad || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tráfico por Hora */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tráfico por Hora - Hoy
                </CardTitle>
                <CardDescription>Distribución de entradas y salidas durante el día</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyTraffic}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="entradas" fill="#3b82f6" name="Entradas" />
                    <Bar dataKey="salidas" fill="#f97316" name="Salidas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tendencia Semanal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendencia Últimos 7 Días
                </CardTitle>
                <CardDescription>Evolución de accesos en la semana</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklySummary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="entradas" stroke="#3b82f6" strokeWidth={2} name="Entradas" />
                    <Line type="monotone" dataKey="salidas" stroke="#f97316" strokeWidth={2} name="Salidas" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Empresas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Personal Por Empresa - Hoy
              </CardTitle>
              <CardDescription>Top 10 empresas con mayor personal en planta actualmente</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(companyStats).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No hay registros de empresas externas hoy</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(companyStats).map(([company, count]) => (
                    <div key={company} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="font-medium">{company}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${(count / Math.max(...Object.values(companyStats))) * 100}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-primary min-w-[3rem] text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
