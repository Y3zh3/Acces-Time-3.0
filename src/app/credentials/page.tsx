"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Trash2, 
  ShieldCheck,
  Fingerprint,
  Loader2,
  Search,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Users,
  UserCheck,
  Building,
  ArrowDownCircle,
  ArrowUpCircle
} from "lucide-react"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { HistorialAccesosDialog } from "@/components/historial-accesos-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { usePermissions } from "@/hooks/use-permissions"
import { ROLE_LABELS, UserRole } from "@/lib/roles"
import { ProtectedPage } from "@/components/protected-page"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Mapeo de cargos internos a labels legibles
const CARGO_LABELS: Record<string, string> = {
  'GERENTE_GENERAL': 'Gerente General',
  'GERENTE_AREA': 'Gerente de Área',
  'JEFE_ALMACEN': 'Jefe de Almacén',
  'SUPERVISOR': 'Supervisor',
  'ASISTENTE_ADMIN': 'Asistente',
  'OPERARIO_ALMACEN': 'Operario de Almacén',
  'MONTACARGUISTA': 'Montacarguista',
  'DESPACHADOR': 'Despachador',
  'INVENTARISTA': 'Inventarista',
  'EMPAQUETADOR': 'Empaquetador',
  'SEGURIDAD': 'Seguridad',
  'LIMPIEZA': 'Personal de Limpieza',
  'MANTENIMIENTO': 'Mantenimiento'
}

const getCargoLabel = (cargo: string | undefined | null): string => {
  if (!cargo) return '-'
  return CARGO_LABELS[cargo] || cargo
}

export default function PersonalManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState("nombre") // dni, nombre, cargo, area, fecha
  const [accessLogs, setAccessLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<{ dni: string; fullName: string } | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { toast } = useToast()
  const permissions = usePermissions()

  // Cargar TODOS los registros de acceso históricos
  const loadAccessLogs = async () => {
    try {
      setLoading(true)
      // Sin parámetro de fecha para obtener todos los registros
      const response = await fetch('/api/access-log?limit=1000')
      if (!response.ok) throw new Error('Error al cargar registros')
      const data = await response.json()
      
      // Filtrar solo registros de empleados internos (que tienen employeeId)
      const employeeLogs = data.logs?.filter((log: any) => 
        log.employeeId !== null && log.employeeId !== undefined
      ) || []
      
      setAccessLogs(employeeLogs)
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los registros'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccessLogs()
  }, [])

  const filteredAccessLogs = useMemo(() => {
    if (!accessLogs) return []
    if (!searchTerm) return accessLogs

    return accessLogs.filter(log => {
      const searchLower = searchTerm.toLowerCase()
      
      switch(searchType) {
        case 'dni':
          return log.userDni?.toLowerCase().includes(searchLower)
        case 'nombre':
          return log.userName?.toLowerCase().includes(searchLower)
        case 'cargo':
          const cargoLabel = getCargoLabel(log.employee?.position)
          return cargoLabel.toLowerCase().includes(searchLower) || 
                 log.employee?.role?.toLowerCase().includes(searchLower)
        case 'area':
          return log.employee?.department?.toLowerCase().includes(searchLower)
        case 'fecha':
          const entryDate = log.entryTime ? format(new Date(log.entryTime), 'dd/MM/yyyy') : ''
          return entryDate.includes(searchTerm)
        default:
          return log.userName?.toLowerCase().includes(searchLower) || 
                 log.userDni?.toLowerCase().includes(searchLower)
      }
    })
  }, [accessLogs, searchTerm, searchType])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este registro de acceso?')) return

    try {
      const response = await fetch(`/api/access-log?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Error al eliminar')

      toast({ 
        title: "Registro eliminado", 
        description: "Registro de acceso eliminado correctamente" 
      })
      
      // Recargar lista
      loadAccessLogs()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el registro'
      })
    }
  }

  const exportToExcel = () => {
    // Validar filtros de fecha
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        toast({
          variant: 'destructive',
          title: 'Fechas inválidas',
          description: 'Los filtros de fecha no son válidos. Verifica el formato.',
        });
        return;
      }
      
      if (to < from) {
        toast({
          variant: 'destructive',
          title: 'Rango de fechas inválido',
          description: 'La fecha "Hasta" debe ser posterior a la fecha "Desde".',
        });
        return;
      }
    }

    // Filtrar por rango de fechas si se especificó
    let dataToFilter = filteredAccessLogs;
    if (dateFrom || dateTo) {
      dataToFilter = filteredAccessLogs.filter(log => {
        const logDate = new Date(log.entryTime);
        logDate.setHours(0, 0, 0, 0);
        
        if (dateFrom && dateTo) {
          const from = new Date(dateFrom);
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          return logDate >= from && logDate <= to;
        } else if (dateFrom) {
          const from = new Date(dateFrom);
          return logDate >= from;
        } else if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          return logDate <= to;
        }
        return true;
      });
    }

    if (dataToFilter.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin registros',
        description: 'No hay registros en el rango de fechas seleccionado.',
      });
      return;
    }

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    
    const fechaStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    
    const totalRegistros = dataToFilter.length;
    const entradas = dataToFilter.length;
    const salidas = dataToFilter.filter(log => log.exitTime !== null).length;
    const aprobados = dataToFilter.filter(log => log.status === 'Aprobado').length;
    const fueraHorario = dataToFilter.filter(log => log.status.includes('Fuera de Horario')).length;
    
    // Personas únicas que ingresaron
    const personasUnicas = new Set(dataToFilter.map(log => log.userDni)).size;

    const resumenData = [
      ['INFORME DE ACCESOS - GESTIÓN DE PERSONAL'],
      [''],
      ['Fecha generación:', fechaStr],
      ['Generado:', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })],
      dateFrom && dateTo ? ['Período:', `${format(new Date(dateFrom), 'dd/MM/yyyy')} - ${format(new Date(dateTo), 'dd/MM/yyyy')}`] : ['Período:', 'Todos los registros'],
      [''],
      ['═══════════════════════════════════════════════════════'],
      ['RESUMEN HISTÓRICO'],
      ['═══════════════════════════════════════════════════════'],
      [''],
      ['Total de Registros:', totalRegistros],
      ['Personas Únicas:', personasUnicas],
      ['Entradas:', entradas],
      ['Salidas:', salidas],
      ['Accesos Aprobados:', aprobados],
      ['Fuera de Horario:', fueraHorario],
      [''],
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

    // Hoja de detalle
    const dataToExport = dataToFilter.map(log => ({
      'DNI': log.userDni,
      'NOMBRE COMPLETO': log.userName.toUpperCase(),
      'CARGO': getCargoLabel(log.employee?.position) || log.employee?.role || log.role,
      'ÁREA': log.employee?.department || '-',
      'ESTADO': log.status.toUpperCase(),
      'HORA ENTRADA': new Date(log.entryTime).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      'HORA SALIDA': log.exitTime ? new Date(log.exitTime).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) : 'En planta',
      'ROL SISTEMA': log.role.toUpperCase(),
    }));

    const wsDetalle = XLSX.utils.json_to_sheet(dataToExport);
    wsDetalle['!cols'] = [
      { wch: 12 }, // DNI
      { wch: 30 }, // Nombre
      { wch: 15 }, // Cargo
      { wch: 20 }, // Área
      { wch: 25 }, // Estado
      { wch: 18 }, // Hora Entrada
      { wch: 18 }, // Hora Salida
      { wch: 15 }, // Rol Sistema
    ];
    XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle de Accesos');
    
    // Guardar archivo
    const fileName = `Informe_Accesos_Personal_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: '📄 Informe Generado',
      description: `${fileName} - ${totalRegistros} registros`,
    });
  }

  const exportToPDF = () => {
    // Validar filtros de fecha (igual que en Excel)
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        toast({
          variant: 'destructive',
          title: 'Fechas inválidas',
          description: 'Los filtros de fecha no son válidos. Verifica el formato.',
        });
        return;
      }
      
      if (to < from) {
        toast({
          variant: 'destructive',
          title: 'Rango de fechas inválido',
          description: 'La fecha "Hasta" debe ser posterior a la fecha "Desde".',
        });
        return;
      }
    }

    // Filtrar por rango de fechas si se especificó
    let dataToFilter = filteredAccessLogs;
    if (dateFrom || dateTo) {
      dataToFilter = filteredAccessLogs.filter(log => {
        const logDate = new Date(log.entryTime);
        logDate.setHours(0, 0, 0, 0);
        
        if (dateFrom && dateTo) {
          const from = new Date(dateFrom);
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          return logDate >= from && logDate <= to;
        } else if (dateFrom) {
          const from = new Date(dateFrom);
          return logDate >= from;
        } else if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          return logDate <= to;
        }
        return true;
      });
    }

    if (dataToFilter.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin registros',
        description: 'No hay registros en el rango de fechas seleccionado.',
      });
      return;
    }

    const doc = new jsPDF();
    const fechaStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    
    const totalRegistros = dataToFilter.length;
    const entradas = dataToFilter.length;
    const salidas = dataToFilter.filter(log => log.exitTime !== null).length;
    const aprobados = dataToFilter.filter(log => log.status === 'Aprobado').length;
    const fueraHorario = dataToFilter.filter(log => log.status.includes('Fuera de Horario')).length;
    const personasUnicas = new Set(dataToFilter.map(log => log.userDni)).size;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME DE ACCESOS - GESTIÓN DE PERSONAL', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha generación: ${fechaStr}`, 14, 25);
    doc.text(`Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`, 14, 30);
    
    if (dateFrom && dateTo) {
      doc.text(`Período: ${format(new Date(dateFrom), 'dd/MM/yyyy')} - ${format(new Date(dateTo), 'dd/MM/yyyy')}`, 14, 35);
    } else {
      doc.text('Período: Todos los registros', 14, 35);
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN HISTÓRICO', 14, 45);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de Registros: ${totalRegistros}`, 14, 53);
    doc.text(`Personas Únicas: ${personasUnicas}`, 14, 58);
    doc.text(`Entradas: ${entradas}`, 14, 63);
    doc.text(`Salidas: ${salidas}`, 14, 68);
    doc.text(`Accesos Aprobados: ${aprobados}`, 14, 73);
    doc.text(`Fuera de Horario: ${fueraHorario}`, 14, 78);

    const tableData = dataToFilter.map(log => [
      log.userDni,
      log.userName.toUpperCase(),
      getCargoLabel(log.employee?.position) || log.employee?.role || log.role,
      log.employee?.department || '-',
      log.status.toUpperCase(),
      new Date(log.entryTime).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      log.exitTime ? new Date(log.exitTime).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) : 'En planta'
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['DNI', 'NOMBRE', 'CARGO', 'ÁREA', 'ESTADO', 'ENTRADA', 'SALIDA']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 30 }
      },
      margin: { left: 14, right: 14 }
    });

    const fileName = `Informe_Accesos_Personal_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
    doc.save(fileName);

    toast({
      title: '📄 Informe PDF Generado',
      description: `${fileName} - ${totalRegistros} registros`,
    });
  }

  return (
    <ProtectedPage requireAny={['canManageEmployees', 'isAdmin', 'isSupervisor']}>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline tracking-tight">Personal - Historial de Accesos</h1>
            <p className="text-muted-foreground">Registros completos de entrada y salida del personal.</p>
          </div>
        
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <Label htmlFor="dateFrom" className="text-sm whitespace-nowrap">Desde:</Label>
              <Input 
                id="dateFrom"
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
              <Label htmlFor="dateTo" className="text-sm whitespace-nowrap">Hasta:</Label>
              <Input 
                id="dateTo"
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2 items-center justify-end">
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                onClick={exportToPDF}
                disabled={filteredAccessLogs.length === 0}
              >
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                onClick={exportToExcel}
                disabled={filteredAccessLogs.length === 0}
              >
                <Download className="mr-2 h-4 w-4" /> EXCEL
              </Button>
            </div>
          </div>
        </div>

        {/* Tarjetas de Estadísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">TOTAL REGISTROS</p>
                  <p className="text-2xl font-bold">{accessLogs.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ENTRADAS</p>
                  <p className="text-2xl font-bold text-green-600">
                    {accessLogs.filter(log => log.entryTime).length}
                  </p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-semibold">SALIDAS</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {accessLogs.filter(log => log.exitTime).length}
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

      <div className="flex gap-3 items-center">
        <Select value={searchType} onValueChange={setSearchType}>
          <SelectTrigger className="w-[180px] h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nombre">Buscar por Nombre</SelectItem>
            <SelectItem value="dni">Buscar por DNI</SelectItem>
            <SelectItem value="cargo">Buscar por Cargo</SelectItem>
            <SelectItem value="area">Buscar por Área</SelectItem>
            <SelectItem value="fecha">Buscar por Fecha</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={
              searchType === 'fecha' 
                ? 'DD/MM/YYYY' 
                : `Buscar por ${searchType}...`
            } 
            className="pl-10 h-11" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>DNI</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Rol</TableHead>
              {!permissions.isSecurity && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredAccessLogs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono">{log.userDni}</TableCell>
                <TableCell className="font-medium">{log.userName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase font-semibold">
                    {getCargoLabel(log.employee?.position) || log.employee?.role || log.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.employee?.department || '-'}
                </TableCell>
                <TableCell>
                  <Badge 
                    className={
                      log.status === 'Aprobado' 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : log.status.includes('Fuera de Horario')
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                    }
                    variant="outline"
                  >
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-green-500" />
                    {new Date(log.entryTime).toLocaleString('es-PE', {
                      timeZone: 'America/Lima',
                      year: 'numeric',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                </TableCell>
                <TableCell className="font-mono">
                  {log.exitTime ? (
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-orange-500" />
                      {new Date(log.exitTime).toLocaleString('es-PE', {
                        timeZone: 'America/Lima',
                        year: 'numeric',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </div>
                  ) : (
                    <Badge className="bg-blue-500">En Planta</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase font-semibold border-blue-200 bg-blue-50 text-blue-700">
                    {log.role}
                  </Badge>
                </TableCell>
                {!permissions.isSecurity && (
                <TableCell className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive" 
                      onClick={() => handleDelete(log.id)}
                      title="Eliminar registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                )}
              </TableRow>
            ))
            }
            {!loading && filteredAccessLogs.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground italic">No hay registros de acceso.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      
      {/* Diálogo de Historial de Accesos */}
      {selectedPerson && (
        <HistorialAccesosDialog
          open={historialDialogOpen}
          onClose={() => {
            setHistorialDialogOpen(false)
            setSelectedPerson(null)
          }}
          dni={selectedPerson.dni}
          nombreCompleto={selectedPerson.fullName}
        />
      )}
      </div>
    </ProtectedPage>
  )
}
