"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, RefreshCw, Loader2, Search, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProtectedPage } from "@/components/protected-page"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function PersonalRegistrados() {
  const [employees, setEmployees] = useState<any[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [deletingEmployee, setDeletingEmployee] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const { toast } = useToast()

  // Cargar personal registrado
  const loadEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const response = await fetch('/api/employees')
      const data = await response.json()
      if (data.employees) {
        setEmployees(data.employees)
        setFilteredEmployees(data.employees)
      }
    } catch (error) {
      console.error('Error cargando empleados:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la lista de personal"
      })
    } finally {
      setLoadingEmployees(false)
    }
  }

  // Cargar empleados al montar el componente
  useEffect(() => {
    loadEmployees()
  }, [])

  // Abrir diálogo de confirmación de eliminación
  const openDeleteDialog = (employee: any) => {
    setSelectedEmployee(employee)
    setDeleteDialogOpen(true)
  }

  // Eliminar empleado
  const handleDelete = async () => {
    if (!selectedEmployee) return

    setDeletingEmployee(true)
    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Empleado eliminado",
          description: `${selectedEmployee.fullName} ha sido eliminado del sistema`
        })
        loadEmployees() // Recargar lista
      } else {
        const data = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "No se pudo eliminar el empleado"
        })
      }
    } catch (error) {
      console.error('Error eliminando empleado:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar el empleado"
      })
    } finally {
      setDeletingEmployee(false)
      setDeleteDialogOpen(false)
      setSelectedEmployee(null)
    }
  }

  // Editar empleado
  const handleEdit = (employee: any) => {
    setSelectedEmployee(employee)
    setEditFormData({
      fullName: employee.fullName || '',
      dni: employee.dni || '',
      position: employee.position || '',
      department: employee.department || '',
      location: employee.location || '',
      email: employee.email || '',
      status: employee.status || 'Activo',
      contractExpiry: employee.contractExpiry ? new Date(employee.contractExpiry).toISOString().split('T')[0] : '',
      workStartTime: employee.workStartTime || '08:00',
      workEndTime: employee.workEndTime || '17:45',
    })
    setEditDialogOpen(true)
  }

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!selectedEmployee) return

    setSavingEdit(true)
    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Empleado actualizado",
          description: `${editFormData.fullName} ha sido actualizado exitosamente`
        })
        loadEmployees() // Recargar lista
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "No se pudo actualizar el empleado"
        })
      }
    } catch (error) {
      console.error('Error actualizando empleado:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar el empleado"
      })
    } finally {
      setSavingEdit(false)
      setEditDialogOpen(false)
      setSelectedEmployee(null)
    }
  }

  // Filtrar empleados por búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredEmployees(employees)
    } else {
      const filtered = employees.filter(emp => 
        emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.dni?.includes(searchTerm) ||
        emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredEmployees(filtered)
    }
  }, [searchTerm, employees])

  return (
    <ProtectedPage requireAny={['canManageEmployees', 'isAdmin', 'isSupervisor']}>
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">
              Personal Registrado
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Base de datos de empleados con registro biométrico
            </p>
          </div>
          <Button
            onClick={loadEmployees}
            disabled={loadingEmployees}
            variant="outline"
            size="sm"
          >
            {loadingEmployees ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualizar
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg font-bold">
                    Total de Personal: {filteredEmployees.length}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {employees.length} personas registradas en el sistema
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabla de empleados */}
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-lg">
                  {searchTerm ? "No se encontraron resultados" : "No hay personal registrado"}
                </p>
                <p className="text-sm">
                  {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza registrando el primer empleado en Registro Biométrico"}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Foto</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Nombre Completo</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">DNI</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Cargo</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Área</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Sede</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Hora Entrada</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Hora Salida</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Email</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Vence Contrato</th>
                        <th className="text-left p-4 text-xs font-bold uppercase text-slate-600">Estado</th>
                        <th className="text-center p-4 text-xs font-bold uppercase text-slate-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee, index) => (
                        <tr 
                          key={employee.id} 
                          className={`border-t hover:bg-slate-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <td className="p-4">
                            {employee.photoPath ? (
                              <img 
                                src={employee.photoPath} 
                                alt={employee.fullName}
                                className="h-14 w-14 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center">
                                <Users className="h-7 w-7 text-slate-400" />
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-sm">{employee.fullName}</span>
                          </td>
                          <td className="p-4 text-sm font-mono">{employee.dni}</td>
                          <td className="p-4 text-sm">{employee.position || employee.role || 'N/A'}</td>
                          <td className="p-4 text-sm">{employee.department || 'N/A'}</td>
                          <td className="p-4 text-sm">{employee.location || employee.sede || 'N/A'}</td>
                          <td className="p-4 text-sm font-mono text-green-600">{employee.workStartTime || '08:00'}</td>
                          <td className="p-4 text-sm font-mono text-red-600">{employee.workEndTime || '17:45'}</td>
                          <td className="p-4 text-sm text-muted-foreground">{employee.email || 'Ninguno'}</td>
                          <td className="p-4 text-sm">
                            {employee.contractExpiry ? (
                              <span className={`font-medium ${
                                new Date(employee.contractExpiry) < new Date() 
                                  ? 'text-red-600' 
                                  : new Date(employee.contractExpiry) < new Date(Date.now() + 30*24*60*60*1000)
                                    ? 'text-orange-600'
                                    : 'text-green-600'
                              }`}>
                                {new Date(employee.contractExpiry).toLocaleDateString('es-PE', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit' 
                                })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Sin definir</span>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={employee.status === 'Activo' ? 'default' : 'secondary'} 
                              className="text-xs"
                            >
                              {employee.status || 'Activo'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={() => handleEdit(employee)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Editar empleado"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => openDeleteDialog(employee)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Eliminar empleado"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diálogo de confirmación de eliminación */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
              <AlertDialogDescription>
                Estás a punto de eliminar a <strong>{selectedEmployee?.fullName}</strong> (DNI: {selectedEmployee?.dni}) del sistema.
                Esta acción no se puede deshacer y eliminará también su registro biométrico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingEmployee}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deletingEmployee}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingEmployee ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de edición de empleado */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Empleado</DialogTitle>
              <DialogDescription>
                Modifica los datos de {selectedEmployee?.fullName}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Nombre Completo */}
              <div className="grid gap-2">
                <Label htmlFor="edit-fullName">Nombre Completo *</Label>
                <Input
                  id="edit-fullName"
                  value={editFormData.fullName || ''}
                  onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                  placeholder=""
                />
              </div>

              {/* DNI */}
              <div className="grid gap-2">
                <Label htmlFor="edit-dni">DNI *</Label>
                <Input
                  id="edit-dni"
                  value={editFormData.dni || ''}
                  onChange={(e) => setEditFormData({...editFormData, dni: e.target.value})}
                  placeholder=""
                  maxLength={20}
                />
              </div>

              {/* Cargo */}
              <div className="grid gap-2">
                <Label htmlFor="edit-position">Cargo</Label>
                <Input
                  id="edit-position"
                  value={editFormData.position || ''}
                  onChange={(e) => setEditFormData({...editFormData, position: e.target.value})}
                  placeholder=""
                />
              </div>

              {/* Área/Departamento */}
              <div className="grid gap-2">
                <Label htmlFor="edit-department">Área/Departamento</Label>
                <Input
                  id="edit-department"
                  value={editFormData.department || ''}
                  onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                  placeholder=""
                />
              </div>

              {/* Sede */}
              <div className="grid gap-2">
                <Label htmlFor="edit-location">Sede</Label>
                <Select 
                  value={editFormData.location || ''} 
                  onValueChange={(value) => setEditFormData({...editFormData, location: value})}
                >
                  <SelectTrigger id="edit-location">
                    <SelectValue placeholder="Selecciona una sede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lima">Lima</SelectItem>
                    <SelectItem value="Ves">Ves</SelectItem>
                    <SelectItem value="SJL">SJL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vencimiento de Contrato */}
              <div className="grid gap-2">
                <Label htmlFor="edit-contractExpiry">Vencimiento de Contrato</Label>
                <Input
                  id="edit-contractExpiry"
                  type="date"
                  value={editFormData.contractExpiry || ''}
                  onChange={(e) => setEditFormData({...editFormData, contractExpiry: e.target.value})}
                />
              </div>

              {/* Hora de Entrada */}
              <div className="grid gap-2">
                <Label htmlFor="edit-workStartTime">Hora de Entrada</Label>
                <Input
                  id="edit-workStartTime"
                  type="time"
                  value={editFormData.workStartTime || '08:00'}
                  onChange={(e) => setEditFormData({...editFormData, workStartTime: e.target.value})}
                />
              </div>

              {/* Hora de Salida */}
              <div className="grid gap-2">
                <Label htmlFor="edit-workEndTime">Hora de Salida</Label>
                <Input
                  id="edit-workEndTime"
                  type="time"
                  value={editFormData.workEndTime || '17:45'}
                  onChange={(e) => setEditFormData({...editFormData, workEndTime: e.target.value})}
                />
              </div>

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  placeholder=""
                />
              </div>

              {/* Estado */}
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Estado</Label>
                <Select 
                  value={editFormData.status || 'Activo'} 
                  onValueChange={(value) => setEditFormData({...editFormData, status: value})}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                    <SelectItem value="Suspendido">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={savingEdit}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editFormData.fullName || !editFormData.dni}
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedPage>
  )
}
