"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Truck,
  Trash2,
  Loader2,
  Download,
  Users,
  Clock,
  Calendar as CalendarIcon,
  ArrowDownCircle,
  ArrowUpCircle,
  Search
} from "lucide-react"
import * as XLSX from 'xlsx'
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { HistorialAccesosDialog } from "@/components/historial-accesos-dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function TransportManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState("nombre") // nombre, dni, empresa, fecha
  const [accessLogs, setAccessLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<{ dni: string; fullName: string } | null>(null)
  const { toast } = useToast()
  const permissions = usePermissions()
  
  // Estados para edición
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    dni: '',
    company: '',
    vehicle: '',
    licensePlate: '',
    entryDateTime: '',
    exitDateTime: ''
  })
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>("")
  const [newPhoto, setNewPhoto] = useState<string>("")

  // Cargar personal de transporte
  const loadAccessLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transport`)
      if (!response.ok) throw new Error('Error al cargar personal')
      const data = await response.json()
      
      // Cargar todo el personal de transporte
      setAccessLogs(data.transport || [])
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el personal de transporte'
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
          return log.dni?.toLowerCase().includes(searchLower)
        case 'nombre':
          return log.fullName?.toLowerCase().includes(searchLower)
        case 'empresa':
          return log.company?.toLowerCase().includes(searchLower)
        case 'fecha':
          // Buscar por fecha en formato DD/MM/YYYY
          const entryDate = log.entryDateTime ? format(new Date(log.entryDateTime), 'dd/MM/yyyy', { locale: es }) : ''
          const exitDate = log.exitDateTime ? format(new Date(log.exitDateTime), 'dd/MM/yyyy', { locale: es }) : ''
          return entryDate.includes(searchTerm) || exitDate.includes(searchTerm)
        default:
          return true
      }
    })
  }, [accessLogs, searchTerm, searchType])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este registro de transporte?')) return

    try {
      const response = await fetch(`/api/transport?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Error al eliminar')

      toast({ 
        title: "Registro eliminado", 
        description: "Personal de transporte eliminado correctamente" 
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

  const handleEdit = (person: any) => {
    setEditingPerson(person)
    
    // Formatear fechas para datetime-local input
    const formatDateTimeLocal = (date: string | null) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
    }
    
    setEditFormData({
      fullName: person.fullName || '',
      dni: person.dni || '',
      company: person.company || '',
      vehicle: person.vehicle || '',
      licensePlate: person.licensePlate || '',
      entryDateTime: formatDateTimeLocal(person.entryDateTime),
      exitDateTime: formatDateTimeLocal(person.exitDateTime)
    })
    setEditPhotoPreview(person.photoPath || '')
    setNewPhoto('')
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingPerson) return

    try {
      const dataToSend: any = {
        ...editFormData
      }

      // Solo incluir photoPath si hay nueva foto
      if (newPhoto) {
        dataToSend.photoPath = newPhoto
      }

      const response = await fetch(`/api/transport?id=${editingPerson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) throw new Error('Error al actualizar')

      toast({
        title: "Registro actualizado",
        description: "Personal de transporte actualizado correctamente"
      })

      setEditDialogOpen(false)
      loadAccessLogs()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el registro'
      })
    }
  }

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setNewPhoto(base64)
      setEditPhotoPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const fechaStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    
    const totalRegistros = filteredAccessLogs.length;
    const activos = filteredAccessLogs.filter(log => log.status === 'Activo').length;
    const inactivos = filteredAccessLogs.filter(log => log.status === 'Inactivo').length;

    const resumenData = [
      ['INFORME DE PERSONAL DE TRANSPORTE'],
      [''],
      ['Fecha generación:', fechaStr],
      ['Generado:', new Date().toLocaleString('es-AR')],
      [''],
      ['═══════════════════════════════════════════════════════'],
      ['RESUMEN DE PERSONAL'],
      ['═══════════════════════════════════════════════════════'],
      [''],
      ['Total Personal:', totalRegistros],
      ['Activos:', activos],
      ['Inactivos:', inactivos],
      [''],
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

    const dataToExport = filteredAccessLogs.map(log => ({
      'DNI': log.dni,
      'NOMBRE COMPLETO': log.fullName?.toUpperCase() || '',
      'EMPRESA': log.company?.toUpperCase() || '',
      'VEHÍCULO': log.vehicle?.toUpperCase() || '-',
      'PATENTE': log.licensePlate?.toUpperCase() || '-',
      'ESTADO': log.status?.toUpperCase() || '',
      'FECHA/HORA INGRESO': log.actualEntryDateTime ? new Date(log.actualEntryDateTime).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-',
      'FECHA/HORA SALIDA': log.actualExitDateTime ? new Date(log.actualExitDateTime).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-',
      'ENTRADA PROGRAMADA': log.entryDateTime ? new Date(log.entryDateTime).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-',
      'SALIDA PROGRAMADA': log.exitDateTime ? new Date(log.exitDateTime).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-',
    }));

    const wsDetalle = XLSX.utils.json_to_sheet(dataToExport);
    wsDetalle['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Personal de Transporte');
    
    const fileName = `Informe_Personal_Transporte_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: '📄 Informe Generado',
      description: `${fileName} - ${totalRegistros} registros`,
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight flex items-center gap-3">
            <Truck className="h-8 w-8" />
            Personal de Transporte
          </h1>
          <p className="text-muted-foreground">Gestión del personal de transporte y choferes.</p>
        </div>
      
        <div className="flex gap-2 items-center">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            onClick={exportToExcel}
            disabled={filteredAccessLogs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> INFORME
          </Button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">TOTAL PERSONAL</p>
                <p className="text-2xl font-bold">{accessLogs.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-semibold">ACTIVOS</p>
                <p className="text-2xl font-bold text-green-900">
                  {accessLogs.filter(log => log.status === 'Activo').length}
                </p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-semibold">INACTIVOS</p>
                <p className="text-2xl font-bold text-red-900">
                  {accessLogs.filter(log => log.status === 'Inactivo').length}
                </p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 items-center">
        <Select value={searchType} onValueChange={setSearchType}>
          <SelectTrigger className="w-[200px] h-11">
            <SelectValue placeholder="Buscar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nombre">Buscar por Nombre</SelectItem>
            <SelectItem value="dni">Buscar por DNI</SelectItem>
            <SelectItem value="empresa">Buscar por Empresa</SelectItem>
            <SelectItem value="fecha">Buscar por Fecha</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={searchType === 'fecha' ? 'DD/MM/YYYY' : `Buscar por ${searchType}...`} 
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
              <TableHead>Empresa</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Patente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha/Hora Ingreso</TableHead>
              <TableHead>Fecha/Hora Salida</TableHead>
              <TableHead>Entrada Prog.</TableHead>
              <TableHead>Salida Prog.</TableHead>
              {!permissions.isSecurity && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredAccessLogs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">{log.dni}</TableCell>
                <TableCell className="font-medium">{log.fullName}</TableCell>
                <TableCell>{log.company}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.vehicle || '-'}</TableCell>
                <TableCell className="font-mono text-xs uppercase">{log.licensePlate || '-'}</TableCell>
                <TableCell>
                  <Badge 
                    className={
                      log.status === 'Activo' 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : 'bg-red-100 text-red-800 border-red-300'
                    }
                    variant="outline"
                  >
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {log.actualEntryDateTime ? new Date(log.actualEntryDateTime).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {log.actualExitDateTime ? new Date(log.actualExitDateTime).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {log.entryDateTime ? new Date(log.entryDateTime).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {log.exitDateTime ? new Date(log.exitDateTime).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
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
              <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground italic">No hay personal de transporte registrado.</TableCell></TableRow>
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

      {/* Diálogo de Edición */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Personal de Transporte</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-fullName">Nombre Completo</Label>
              <Input
                id="edit-fullName"
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-dni">DNI</Label>
              <Input
                id="edit-dni"
                value={editFormData.dni}
                onChange={(e) => setEditFormData({ ...editFormData, dni: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-company">Empresa</Label>
              <Input
                id="edit-company"
                value={editFormData.company}
                onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-vehicle">Vehículo</Label>
              <Input
                id="edit-vehicle"
                value={editFormData.vehicle}
                onChange={(e) => setEditFormData({ ...editFormData, vehicle: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-licensePlate">Patente</Label>
              <Input
                id="edit-licensePlate"
                value={editFormData.licensePlate}
                onChange={(e) => setEditFormData({ ...editFormData, licensePlate: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-entryDateTime">Entrada Programada</Label>
              <Input
                id="edit-entryDateTime"
                type="datetime-local"
                value={editFormData.entryDateTime}
                onChange={(e) => setEditFormData({ ...editFormData, entryDateTime: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-exitDateTime">Salida Programada</Label>
              <Input
                id="edit-exitDateTime"
                type="datetime-local"
                value={editFormData.exitDateTime}
                onChange={(e) => setEditFormData({ ...editFormData, exitDateTime: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-photo">Foto del Pase</Label>
              {editPhotoPreview && (
                <div className="flex justify-center mb-2">
                  <img 
                    src={editPhotoPreview} 
                    alt="Vista previa" 
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
              <Input
                id="edit-photo"
                type="file"
                accept="image/*"
                onChange={handleEditPhotoChange}
              />
              <p className="text-xs text-muted-foreground">
                {newPhoto ? "Nueva foto seleccionada. Se actualizará al guardar." : "Selecciona una nueva foto para cambiar la actual."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
