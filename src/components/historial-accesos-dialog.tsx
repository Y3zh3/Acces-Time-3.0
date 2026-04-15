"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'

interface AccessLog {
  id: number
  userName: string
  userDni: string | null
  role: string
  status: string
  action: string
  zone: string
  type: string
  timestamp: string
}

interface HistorialAccesosDialogProps {
  open: boolean
  onClose: () => void
  dni: string
  nombreCompleto: string
}

export function HistorialAccesosDialog({ 
  open, 
  onClose, 
  dni, 
  nombreCompleto 
}: HistorialAccesosDialogProps) {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fechaFiltro, setFechaFiltro] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (open && dni) {
      loadHistorial()
    }
  }, [open, dni, fechaFiltro])

  const loadHistorial = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ dni, limit: '200' })
      if (fechaFiltro) {
        params.append('fecha', fechaFiltro)
      }
      
      const response = await fetch(`/api/access-log?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al cargar historial',
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cargar historial',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportarExcel = () => {
    const datosExport = logs.map(log => ({
      'Fecha y Hora': new Date(log.timestamp).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      'DNI': log.userDni || 'N/A',
      'Nombre': log.userName,
      'Acción': log.action,
      'Estado': log.status,
      'Zona': log.zone,
      'Rol': log.role,
    }))

    const ws = XLSX.utils.json_to_sheet(datosExport)
    ws['!cols'] = [
      { wch: 20 }, // Fecha y Hora
      { wch: 12 }, // DNI
      { wch: 30 }, // Nombre
      { wch: 10 }, // Acción
      { wch: 25 }, // Estado
      { wch: 20 }, // Zona
      { wch: 15 }, // Rol
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Historial Accesos')
    
    const fecha = fechaFiltro || new Date().toISOString().split('T')[0]
    const fileName = `Historial_${nombreCompleto.replace(/\s/g, '_')}_${fecha}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast({
      title: "✅ Archivo exportado",
      description: fileName,
    })
  }

  const getStatusColor = (status: string) => {
    if (status.includes('Aprobado')) return 'bg-green-500'
    if (status.includes('Fuera de Horario - Con Pase')) return 'bg-yellow-500'
    if (status.includes('Fuera de Horario')) return 'bg-orange-500'
    if (status.includes('Denegado')) return 'bg-red-500'
    return 'bg-gray-500'
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Accesos - {nombreCompleto}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            DNI: {dni} • {logs.length} registro{logs.length !== 1 && 's'}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="fechaFiltro" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Filtrar por Fecha
              </Label>
              <Input
                id="fechaFiltro"
                type="date"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="max-w-xs"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => setFechaFiltro('')}
              disabled={!fechaFiltro}
            >
              Limpiar Filtro
            </Button>

            <Button
              variant="default"
              onClick={exportarExcel}
              disabled={logs.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>

          {/* Tabla de historial */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron registros de acceso
              {fechaFiltro && ' para la fecha seleccionada'}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Zona</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {new Date(log.timestamp).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.action === 'Entrada' ? 'default' : 'secondary'}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.zone}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
