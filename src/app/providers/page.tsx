"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Package, Building2, Plus, UserPlus, Truck, User, CreditCard, IdCard, AlertCircle, Clock, X, Download, Edit, Trash2, Phone } from "lucide-react"
import { extractFaceDescriptor, descriptorToArray, loadFaceModels } from "@/lib/face-recognition"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface TransportPersonnel {
  id: number
  fullName: string
  dni: string
  company: string
  vehicle: string | null
  licensePlate: string | null
  status: string
  createdAt: string
  position?: string // Para personal de proveedores
  entryDateTime?: string // Fecha/hora programada de entrada
  exitDateTime?: string // Fecha/hora programada de salida
}

interface ProviderCompany {
  id: number
  company: string
  ruc?: string
  supplyType?: string
  commercialContact?: string
  phone?: string
  address?: string
  transportPersonnel: TransportPersonnel[]
  providerPersonnel: TransportPersonnel[]
  activeCount: number
  vehicleCount: number
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPassDialogOpen, setIsPassDialogOpen] = useState(false)
  const [passType, setPassType] = useState<'personal' | 'driver'>('personal')
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [editingProvider, setEditingProvider] = useState<ProviderCompany | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null)
  
  // Estado para modal de visualización de pases
  const [viewPassesDialogOpen, setViewPassesDialogOpen] = useState(false)
  const [selectedProviderForPasses, setSelectedProviderForPasses] = useState<ProviderCompany | null>(null)
  
  const { toast } = useToast()

  // Form state para empresa
  const [companyFormData, setCompanyFormData] = useState({
    companyName: "",
    ruc: "",
    supplyType: "",
    commercialContact: "",
    phone: "",
    address: "",
  })

  // Form state para pases
  const [passFormData, setPassFormData] = useState({
    fullName: "",
    dni: "",
    position: "",
    phone: "",
    vehicle: "",
    licensePlate: "",
    validUntil: "",
    entryDate: "",
    entryTime: "",
    exitDate: "",
    exitTime: "",
  })
  
  const [passPhoto, setPassPhoto] = useState<string>("")
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null)
  const [modelsReady, setModelsReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Estados para edición de personal de proveedores
  const [editProviderPersonnelDialogOpen, setEditProviderPersonnelDialogOpen] = useState(false)
  const [editingProviderPersonnel, setEditingProviderPersonnel] = useState<any>(null)
  const [editProviderPersonnelFormData, setEditProviderPersonnelFormData] = useState({
    fullName: "",
    dni: "",
    company: "",
    position: "",
    phone: "",
    entryDateTime: "",
    exitDateTime: ""
  })
  const [editProviderPhotoPreview, setEditProviderPhotoPreview] = useState("")
  const [newProviderPhoto, setNewProviderPhoto] = useState("")

  // Estados para edición de transporte
  const [editTransportDialogOpen, setEditTransportDialogOpen] = useState(false)
  const [editingTransport, setEditingTransport] = useState<any>(null)
  const [editTransportFormData, setEditTransportFormData] = useState({
    fullName: "",
    dni: "",
    company: "",
    vehicle: "",
    licensePlate: "",
    entryDateTime: "",
    exitDateTime: ""
  })
  const [editTransportPhotoPreview, setEditTransportPhotoPreview] = useState("")
  const [newTransportPhoto, setNewTransportPhoto] = useState("")

  // Estado para alertas
  interface Alert {
    id: number
    fullName: string
    dni: string
    company: string
    exitDateTime: string
    type: 'Personal Transporte' | 'Personal Proveedor'
    minutesRemaining: number
    vehicle?: string
    licensePlate?: string
    position?: string
  }
  
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState(true)
  const [shownAlerts, setShownAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadProviders()
    loadAlerts() // Cargar alertas inicialmente
    
    // Actualizar alertas cada minuto
    const intervalId = setInterval(() => {
      loadAlerts()
    }, 60000) // 60 segundos

    return () => clearInterval(intervalId)
  }, [])

  // Cargar modelos de face-api.js
  useEffect(() => {
    loadFaceModels()
      .then(() => {
        setModelsReady(true)
      })
      .catch((error) => {
        console.error("Error cargando modelos:", error)
        toast({
          variant: "destructive",
          title: "Error cargando modelos de reconocimiento facial",
          description: "La validación biométrica puede no funcionar correctamente"
        })
      })
  }, [toast])

  const loadProviders = async () => {
    try {
      // Cargar empresas desde la nueva API
      const companiesResponse = await fetch('/api/providers')
      const companiesData = await companiesResponse.json()
      
      // Cargar personal de transporte y proveedores para estadísticas
      const transportResponse = await fetch('/api/transport')
      const transportData = await transportResponse.json()
      
      const personnelResponse = await fetch('/api/provider-personnel')
      const personnelData = await personnelResponse.json()
      
      if (companiesData.companies) {
        const providersList: ProviderCompany[] = companiesData.companies.map((company: any) => {
          // Mantener separado personal de transporte y proveedores
          const transportPersonnel = transportData.transport?.filter((p: any) => p.company === company.companyName) || []
          const providerPersonnel = personnelData.personnel?.filter((p: any) => p.company === company.companyName) || []
          const allPersonnel = [...transportPersonnel, ...providerPersonnel]
          
          return {
            id: company.id,
            company: company.companyName,
            ruc: company.ruc || '',
            supplyType: company.supplyType || '',
            commercialContact: company.commercialContact || '',
            phone: company.phone || '',
            address: company.address || '',
            transportPersonnel: transportPersonnel,
            providerPersonnel: providerPersonnel,
            activeCount: allPersonnel.filter((p: any) => p.status === "Activo").length,
            vehicleCount: transportPersonnel.filter((p: any) => p.licensePlate).length,
          }
        })

        setProviders(providersList)
      }
    } catch (error) {
      console.error("Error loading providers:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar proveedores",
        description: "No se pudieron cargar los datos"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/provider-alerts')
      const data = await response.json()
      
      if (data.alerts) {
        setAlerts(data.alerts)
        
        // Mostrar toasts para alertas a los 10 y 5 minutos
        data.alerts.forEach((alert: Alert) => {
          const alertKey10 = `${alert.id}-10`
          const alertKey5 = `${alert.id}-5`
          
          // Alerta a los 10 minutos (entre 9 y 10 minutos)
          if (alert.minutesRemaining <= 10 && alert.minutesRemaining > 8 && !shownAlerts.has(alertKey10)) {
            toast({
              title: "⚠️ Personal próximo a salir",
              description: `${alert.fullName} (${alert.type}) de ${alert.company} sale en ${alert.minutesRemaining} minutos`,
              variant: "default",
            })
            setShownAlerts(prev => new Set(prev).add(alertKey10))
          }
          
          // Alerta a los 5 minutos (entre 4 y 5 minutos)
          if (alert.minutesRemaining <= 5 && alert.minutesRemaining > 3 && !shownAlerts.has(alertKey5)) {
            toast({
              title: "🚨 URGENTE: Personal próximo a salir",
              description: `${alert.fullName} (${alert.type}) de ${alert.company} sale en ${alert.minutesRemaining} minutos`,
              variant: "destructive",
            })
            setShownAlerts(prev => new Set(prev).add(alertKey5))
          }
        })
      }
    } catch (error) {
      console.error("Error loading alerts:", error)
    }
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    // Sheet 1: Resumen Ejecutivo
    const totalCompanies = providers.length
    const totalTransport = providers.reduce((sum, p) => sum + (p.transportPersonnel?.length || 0), 0)
    const totalProvider = providers.reduce((sum, p) => sum + (p.providerPersonnel?.length || 0), 0)
    const totalPersonnel = totalTransport + totalProvider
    
    const activeCompanies = providers.filter(p => 
      (p.transportPersonnel && p.transportPersonnel.length > 0) || 
      (p.providerPersonnel && p.providerPersonnel.length > 0)
    ).length
    
    const summaryData = [
      ['INFORME GERENCIAL - PROVEEDORES'],
      ['Fecha de Generación', new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })],
      [''],
      ['RESUMEN GENERAL'],
      ['Total de Empresas Proveedoras', totalCompanies],
      ['Empresas con Personal Activo', activeCompanies],
      ['Total Personal de Transporte', totalTransport],
      ['Total Personal de Proveedores', totalProvider],
      ['Total General de Personal', totalPersonnel],
      [''],
      ['DISTRIBUCIÓN POR EMPRESA'],
      ['Empresa', 'Tipo de Suministro', 'Personal Transporte', 'Personal Proveedor', 'Total Personal']
    ]
    
    providers.forEach(provider => {
      const transportCount = provider.transportPersonnel?.length || 0
      const providerCount = provider.providerPersonnel?.length || 0
      summaryData.push([
        provider.companyName,
        provider.supplyType || 'N/A',
        transportCount,
        providerCount,
        transportCount + providerCount
      ])
    })
    
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    ws1['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, ws1, 'Resumen Ejecutivo')

    // Sheet 2: Detalle de Empresas
    const companyData = [
      ['DETALLE DE EMPRESAS PROVEEDORAS'],
      ['Empresa', 'RUC/CUIT', 'Tipo de Suministro', 'Contacto Comercial', 'Teléfono', 'Dirección', 'Personal Total']
    ]
    
    providers.forEach(provider => {
      const totalStaff = (provider.transportPersonnel?.length || 0) + (provider.providerPersonnel?.length || 0)
      companyData.push([
        provider.companyName,
        provider.ruc,
        provider.supplyType || 'N/A',
        provider.commercialContact || 'N/A',
        provider.phone || 'N/A',
        provider.address || 'N/A',
        totalStaff
      ])
    })
    
    const ws2 = XLSX.utils.aoa_to_sheet(companyData)
    ws2['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, ws2, 'Detalle Empresas')

    // Sheet 3: Nómina de Personal
    const personnelData = [
      ['NÓMINA COMPLETA DE PERSONAL'],
      ['DNI', 'Nombre Completo', 'Empresa', 'Tipo', 'Vehículo/Matrícula', 'Cargo/Posición', 'Horario Entrada', 'Horario Salida', 'Estado']
    ]
    
    providers.forEach(provider => {
      // Personal de Transporte
      if (provider.transportPersonnel) {
        provider.transportPersonnel.forEach(person => {
          personnelData.push([
            person.dni,
            person.fullName,
            provider.companyName,
            'Transporte',
            person.vehicleType ? `${person.vehicleType} - ${person.vehiclePlate || 'N/A'}` : 'N/A',
            'Conductor',
            person.workStartTime || '08:00',
            person.workEndTime || '17:45',
            person.isActive ? 'Activo' : 'Inactivo'
          ])
        })
      }
      
      // Personal de Proveedores
      if (provider.providerPersonnel) {
        provider.providerPersonnel.forEach(person => {
          personnelData.push([
            person.dni,
            person.fullName,
            provider.companyName,
            'Proveedor',
            'N/A',
            person.position || 'N/A',
            person.workStartTime || '08:00',
            person.workEndTime || '17:45',
            person.isActive ? 'Activo' : 'Inactivo'
          ])
        })
      }
    })
    
    const ws3 = XLSX.utils.aoa_to_sheet(personnelData)
    ws3['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(workbook, ws3, 'Nómina Personal')

    // Guardar archivo
    const fileName = `Informe_Gerencial_Proveedores_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`
    XLSX.writeFile(workbook, fileName)
    
    toast({
      title: "✅ Reporte generado",
      description: `${fileName} descargado exitosamente`
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyFormData.companyName || !companyFormData.ruc) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Completa nombre de empresa y RUC/CUIT"
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyFormData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "✅ Empresa registrada",
          description: `${companyFormData.companyName} - ${companyFormData.ruc}`
        })
        
        setIsDialogOpen(false)
        setCompanyFormData({
          companyName: "",
          ruc: "",
          supplyType: "",
          commercialContact: "",
          phone: "",
          address: "",
        })
        loadProviders()
      } else {
        toast({
          variant: "destructive",
          title: data.error || "Error al registrar",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditProvider = (provider: ProviderCompany) => {
    setEditingProvider(provider)
    setCompanyFormData({
      companyName: provider.company,
      ruc: provider.ruc || "",
      supplyType: provider.supplyType || "",
      commercialContact: provider.commercialContact || "",
      phone: provider.phone || "",
      address: provider.address || "",
    })
    setIsDialogOpen(true)
  }

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingProvider) return

    setIsSaving(true)

    try {
      const response = await fetch('/api/providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProvider.id,
          companyName: companyFormData.companyName,
          ruc: companyFormData.ruc,
          supplyType: companyFormData.supplyType,
          commercialContact: companyFormData.commercialContact,
          phone: companyFormData.phone,
          address: companyFormData.address,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "✅ Empresa actualizada",
          description: `${companyFormData.companyName} actualizado correctamente`
        })
        
        setIsDialogOpen(false)
        setEditingProvider(null)
        setCompanyFormData({
          companyName: "",
          ruc: "",
          supplyType: "",
          commercialContact: "",
          phone: "",
          address: "",
        })
        loadProviders()
      } else {
        toast({
          variant: "destructive",
          title: data.error || "Error al actualizar",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteProvider = async (provider: ProviderCompany) => {
    if (!confirm(`¿Estás seguro de eliminar la empresa "${provider.company}"? Esto no eliminará su personal registrado.`)) {
      return
    }

    try {
      const response = await fetch(`/api/providers?id=${provider.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "🗑️ Empresa eliminada",
          description: `${provider.company} ha sido eliminado`
        })
        loadProviders()
      } else {
        const data = await response.json()
        toast({
          variant: "destructive",
          title: data.error || "Error al eliminar",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
      })
    }
  }

  const handleDeleteProviderPersonnel = async (id: number, fullName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${fullName}?`)) return

    try {
      const response = await fetch(`/api/provider-personnel?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Personal eliminado",
          description: `${fullName} ha sido eliminado correctamente`
        })
        loadProviders()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al eliminar',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error de conexión',
      })
    }
  }

  const handleDeleteTransportPersonnel = async (id: number, fullName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${fullName}?`)) return

    try {
      const response = await fetch(`/api/transport?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Chofer eliminado",
          description: `${fullName} ha sido eliminado correctamente`
        })
        loadProviders()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al eliminar',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error de conexión',
      })
    }
  }

  const handleEditProviderPersonnel = (person: any) => {
    setEditingProviderPersonnel(person)
    
    const formatDateTimeLocal = (date: string | null) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toISOString().slice(0, 16)
    }
    
    setEditProviderPersonnelFormData({
      fullName: person.fullName || "",
      dni: person.dni || "",
      company: person.company || "",
      position: person.position || "",
      phone: person.phone || "",
      entryDateTime: formatDateTimeLocal(person.entryDateTime),
      exitDateTime: formatDateTimeLocal(person.exitDateTime)
    })
    setEditProviderPhotoPreview(person.photoPath || '')
    setNewProviderPhoto('')
    setEditProviderPersonnelDialogOpen(true)
  }

  const handleSaveEditProviderPersonnel = async () => {
    if (!editingProviderPersonnel) return

    try {
      const dataToSend: any = {
        ...editProviderPersonnelFormData
      }

      // Solo incluir photoPath si hay nueva foto
      if (newProviderPhoto) {
        dataToSend.photoPath = newProviderPhoto
      }

      const response = await fetch(`/api/provider-personnel?id=${editingProviderPersonnel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) throw new Error('Error al actualizar')

      toast({
        title: "✅ Cambios guardados",
        description: `${editProviderPersonnelFormData.fullName} actualizado correctamente`
      })

      setEditProviderPersonnelDialogOpen(false)
      loadProviders()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudieron guardar los cambios'
      })
    }
  }

  const handleEditProviderPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setNewProviderPhoto(base64)
      setEditProviderPhotoPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleEditTransport = (person: any) => {
    setEditingTransport(person)
    
    const formatDateTimeLocal = (date: string | null) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toISOString().slice(0, 16)
    }
    
    setEditTransportFormData({
      fullName: person.fullName || '',
      dni: person.dni || '',
      company: person.company || '',
      vehicle: person.vehicle || '',
      licensePlate: person.licensePlate || '',
      entryDateTime: formatDateTimeLocal(person.entryDateTime),
      exitDateTime: formatDateTimeLocal(person.exitDateTime)
    })
    setEditTransportPhotoPreview(person.photoPath || '')
    setNewTransportPhoto('')
    setEditTransportDialogOpen(true)
  }

  const handleSaveEditTransport = async () => {
    if (!editingTransport) return

    try {
      const dataToSend: any = {
        ...editTransportFormData
      }

      // Solo incluir photoPath si hay nueva foto
      if (newTransportPhoto) {
        dataToSend.photoPath = newTransportPhoto
      }

      const response = await fetch(`/api/transport?id=${editingTransport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) throw new Error('Error al actualizar')

      toast({
        title: "Registro actualizado",
        description: "Personal de transporte actualizado correctamente"
      })

      setEditTransportDialogOpen(false)
      loadProviders()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el registro'
      })
    }
  }

  const handleEditTransportPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setNewTransportPhoto(base64)
      setEditTransportPhotoPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passFormData.fullName || !passFormData.dni || !selectedCompany) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Completa nombre y DNI"
      })
      return
    }

    // Validar que si hay foto nueva, tenga descriptor
    if (passPhoto && !capturedDescriptor && !isEditMode) {
      console.error('❌ Foto sin descriptor detectado')
      toast({
        variant: "destructive",
        title: "Error en la foto",
        description: "La foto no tiene un rostro válido detectado. Sube una nueva foto."
      })
      return
    }

    console.log(isEditMode ? '✏️ Actualizando pase...' : '💾 Guardando pase...')
    console.log('📸 Tiene foto:', !!passPhoto)
    console.log('🔑 Tiene descriptor:', !!capturedDescriptor)
    if (capturedDescriptor) {
      console.log('📊 Descriptor length:', capturedDescriptor.length)
    }

    setIsSaving(true)

    try {
      let apiEndpoint = ''
      let dataToSend: any = {
        fullName: passFormData.fullName,
        dni: passFormData.dni,
        company: selectedCompany,
        entryDateTime: passFormData.entryDate && passFormData.entryTime 
          ? new Date(`${passFormData.entryDate}T${passFormData.entryTime}`).toISOString()
          : null,
        exitDateTime: passFormData.exitDate && passFormData.exitTime 
          ? new Date(`${passFormData.exitDate}T${passFormData.exitTime}`).toISOString()
          : null,
      }

      // Solo incluir foto si hay cambios en modo edición, o siempre en modo creación
      if (!isEditMode || capturedDescriptor) {
        dataToSend.photoBase64 = passPhoto || null
        dataToSend.descriptor = capturedDescriptor ? descriptorToArray(capturedDescriptor) : null
        console.log('📤 Enviando descriptor:', dataToSend.descriptor ? `${dataToSend.descriptor.length} valores` : 'null')
      }

      if (passType === 'driver') {
        // Enviar a API de transporte
        apiEndpoint = '/api/transport'
        dataToSend.vehicle = passFormData.vehicle || null
        dataToSend.licensePlate = passFormData.licensePlate || null
      } else {
        // Enviar a API de personal de proveedores
        apiEndpoint = '/api/provider-personnel'
        dataToSend.position = passFormData.position || null
        dataToSend.phone = passFormData.phone || null
      }

      // Usar PUT si está en modo edición, POST si está creando nuevo
      const method = isEditMode ? 'PUT' : 'POST'
      const url = isEditMode ? `${apiEndpoint}?id=${editingPersonId}` : apiEndpoint

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      const data = await response.json()

      if (response.ok) {
        const passTypeName = passType === 'driver' ? 'Chofer' : 'Personal'
        toast({
          title: isEditMode ? `✅ ${passTypeName} actualizado` : `✅ Pase ${passTypeName} registrado`,
          description: `${passFormData.fullName} - ${selectedCompany}`
        })
        setIsPassDialogOpen(false)
        setPassFormData({
          fullName: "",
          dni: "",
          position: "",
          phone: "",
          vehicle: "",
          licensePlate: "",
          validUntil: "",
          entryDate: "",
          entryTime: "",
          exitDate: "",
          exitTime: "",
        })
        setPassPhoto("")
        setPhotoPreview("")
        setCapturedDescriptor(null)
        setIsEditMode(false)
        setEditingPersonId(null)
        loadProviders()
      } else {
        toast({
          variant: "destructive",
          title: data.error || (isEditMode ? "Error al actualizar" : "Error al registrar"),
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const openPassDialog = (company: string, type: 'personal' | 'driver') => {
    setSelectedCompany(company)
    setPassType(type)
    setPassPhoto("")
    setPhotoPreview("")
    setCapturedDescriptor(null)
    setIsEditMode(false)
    setEditingPersonId(null)
    setIsPassDialogOpen(true)
  }

  const openViewPassesDialog = (provider: ProviderCompany) => {
    setSelectedProviderForPasses(provider)
    setViewPassesDialogOpen(true)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Archivo muy grande",
          description: "La foto no debe superar 5MB"
        })
        return
      }

      // Verificar que los modelos estén listos
      console.log('📸 Procesando foto... Modelos listos:', modelsReady)
      if (!modelsReady) {
        toast({
          variant: "destructive",
          title: "Sistema biométrico cargando",
          description: "Espera unos segundos e intenta de nuevo"
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        
        // Crear imagen para procesar
        const img = new Image()
        img.onload = async () => {
          console.log('🖼️ Imagen cargada:', img.width, 'x', img.height)
          
          // Dibujar en canvas
          if (!canvasRef.current) return
          const canvas = canvasRef.current
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return
          
          ctx.drawImage(img, 0, 0)
          
          // Extraer descriptor facial
          console.log('🔍 Extrayendo descriptor facial...')
          const descriptor = await extractFaceDescriptor(canvas)
          
          if (!descriptor) {
            console.error('❌ No se detectó rostro en la imagen')
            toast({
              variant: "destructive",
              title: "No se detectó rostro",
              description: "La foto debe mostrar claramente un rostro frontal"
            })
            setCapturedDescriptor(null)
            return
          }
          
          console.log('✅ Descriptor extraído:', descriptor.length, 'valores')
          
          // Guardar descriptor
          setCapturedDescriptor(descriptor)
          setPassPhoto(base64)
          setPhotoPreview(base64)
          
          toast({
            title: "✓ Foto y rostro capturados",
            description: "Listo para registrar"
          })
        }
        
        img.src = base64
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      {/* Panel de Alertas */}
      {alerts.length > 0 && showAlerts && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-5 w-5" />
                Personal Próximo a Salir ({alerts.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlerts(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.minutesRemaining <= 3
                      ? 'bg-red-50 border-red-200'
                      : alert.minutesRemaining <= 5
                      ? 'bg-orange-100 border-orange-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.type === 'Personal Transporte' ? 'default' : 'secondary'} className="text-xs">
                        {alert.type}
                      </Badge>
                      <span className="font-semibold text-sm">{alert.fullName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.company} • DNI: {alert.dni}
                      {alert.type === 'Personal Transporte' && alert.licensePlate && ` • Patente: ${alert.licensePlate}`}
                      {alert.type === 'Personal Proveedor' && alert.position && ` • ${alert.position}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Clock className={`h-4 w-4 ${
                      alert.minutesRemaining <= 3
                        ? 'text-red-600'
                        : alert.minutesRemaining <= 5
                        ? 'text-orange-600'
                        : 'text-yellow-600'
                    }`} />
                    <span className={`text-sm font-bold ${
                      alert.minutesRemaining <= 3
                        ? 'text-red-600'
                        : alert.minutesRemaining <= 5
                        ? 'text-orange-600'
                        : 'text-yellow-600'
                    }`}>
                      {alert.minutesRemaining} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8" />
            Proveedores de Carga
          </h1>
          <p className="text-muted-foreground mt-2">Gestión de empresas proveedoras y su personal.</p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={exportToExcel}
          >
            <Download className="h-4 w-4" />
            Informe Gerencial
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingProvider(null)
              setCompanyFormData({
                companyName: '',
                ruc: '',
                supplyType: '',
                commercialContact: '',
                phone: '',
                address: ''
              })
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {editingProvider ? "Editar Empresa de Suministros" : "Nueva Empresa de Suministros"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {editingProvider ? "Actualiza los datos legales de la empresa proveedora." : "Registra los datos legales de la empresa proveedora."}
              </p>
            </DialogHeader>
            <form onSubmit={editingProvider ? handleUpdateProvider : handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Nombre de Empresa
                  </Label>
                  <Input
                    id="companyName"
                    placeholder=""
                    value={companyFormData.companyName}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, companyName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ruc" className="flex items-center gap-2">
                    <IdCard className="h-4 w-4" />
                    RUC / CUIT
                  </Label>
                  <Input
                    id="ruc"
                    placeholder=""
                    value={companyFormData.ruc}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, ruc: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplyType" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Tipo de Suministro
                  </Label>
                  <Select
                    value={companyFormData.supplyType}
                    onValueChange={(value) => setCompanyFormData({ ...companyFormData, supplyType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione rubro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materiales">Materiales de Construcción</SelectItem>
                      <SelectItem value="alimentos">Alimentos y Bebidas</SelectItem>
                      <SelectItem value="tecnologia">Tecnología y Equipos</SelectItem>
                      <SelectItem value="limpieza">Productos de Limpieza</SelectItem>
                      <SelectItem value="seguridad">Equipos de Seguridad</SelectItem>
                      <SelectItem value="transporte">Servicios de Transporte</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commercialContact" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contacto Comercial
                  </Label>
                  <Input
                    id="commercialContact"
                    placeholder=""
                    value={companyFormData.commercialContact}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, commercialContact: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    📞 Teléfono Directo
                  </Label>
                  <Input
                    id="phone"
                    placeholder=""
                    value={companyFormData.phone}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    📍 Oficina Central
                  </Label>
                  <Input
                    id="address"
                    placeholder=""
                    value={companyFormData.address}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : (editingProvider ? "Actualizar Empresa" : "Confirmar Empresa")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>

        {/* Diálogo de Pases */}
        <Dialog open={isPassDialogOpen} onOpenChange={setIsPassDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {passType === 'driver' ? <Truck className="h-5 w-5" /> : <User className="h-5 w-5" />}
                Pase {passType === 'driver' ? 'Chofer' : 'Personal'} - {selectedCompany}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handlePassSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passFullName">Nombre Completo *</Label>
                <Input
                  id="passFullName"
                  value={passFormData.fullName}
                  onChange={(e) => setPassFormData({ ...passFormData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passDni">DNI *</Label>
                <Input
                  id="passDni"
                  value={passFormData.dni}
                  onChange={(e) => setPassFormData({ ...passFormData, dni: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passCompany">Empresa *</Label>
                <Input
                  id="passCompany"
                  value={selectedCompany}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryDate">Fecha de Ingreso Programado *</Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={passFormData.entryDate}
                    onChange={(e) => setPassFormData({ ...passFormData, entryDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryTime">Hora de Ingreso Programado *</Label>
                  <Input
                    id="entryTime"
                    type="time"
                    value={passFormData.entryTime}
                    onChange={(e) => setPassFormData({ ...passFormData, entryTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  ℹ️ <strong>Tolerancia de ingreso:</strong> Se permite el ingreso hasta 30 minutos antes de la hora programada.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exitDate">Fecha de Salida Programado *</Label>
                  <Input
                    id="exitDate"
                    type="date"
                    value={passFormData.exitDate}
                    onChange={(e) => setPassFormData({ ...passFormData, exitDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exitTime">Hora de Salida Programado *</Label>
                  <Input
                    id="exitTime"
                    type="time"
                    value={passFormData.exitTime}
                    onChange={(e) => setPassFormData({ ...passFormData, exitTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passPhoto">Foto para Biometría (Opcional)</Label>
                <Input
                  id="passPhoto"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
                {photoPreview && (
                  <div className="mt-2 relative w-32 h-32 mx-auto">
                    <img 
                      src={photoPreview} 
                      alt="Vista previa" 
                      className="w-full h-full object-cover rounded-lg border-2 border-primary"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Sube una foto frontal para habilitar validación biométrica
                </p>
              </div>

              {passType === 'driver' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="passVehicle">Tipo de Vehículo</Label>
                    <Input
                      id="passVehicle"
                      value={passFormData.vehicle}
                      onChange={(e) => setPassFormData({ ...passFormData, vehicle: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passLicensePlate">Patente</Label>
                    <Input
                      id="passLicensePlate"
                      value={passFormData.licensePlate}
                      onChange={(e) => setPassFormData({ ...passFormData, licensePlate: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="passPosition">Cargo/Posición</Label>
                    <Input
                      id="passPosition"
                      value={passFormData.position}
                      onChange={(e) => setPassFormData({ ...passFormData, position: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passPhone">Teléfono</Label>
                    <Input
                      id="passPhone"
                      value={passFormData.phone}
                      onChange={(e) => setPassFormData({ ...passFormData, phone: e.target.value })}
                    />
                  </div>
                </>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPassDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : `Emitir Pase ${passType === 'driver' ? 'Chofer' : 'Personal'}`}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">Cargando...</p>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <div>
              <p className="text-lg font-semibold text-muted-foreground">
                No hay proveedores registrados
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Comienza registrando el primer proveedor usando el botón "Nuevo Proveedor"
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {providers.map((provider) => (
            <Card key={provider.company} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle 
                    className="text-lg flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => openViewPassesDialog(provider)}
                  >
                    <Building2 className="h-5 w-5 text-primary" />
                    {provider.company}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleEditProvider(provider)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteProvider(provider)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                  {provider.supplyType && (
                    <p className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {provider.supplyType}
                    </p>
                  )}
                  {provider.commercialContact && (
                    <p className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {provider.commercialContact}
                    </p>
                  )}
                  {provider.phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {provider.phone}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <p className="text-2xl font-bold text-purple-600">{provider.providerPersonnel?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Personal</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <p className="text-2xl font-bold text-orange-600">{provider.transportPersonnel?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Choferes</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-2xl font-bold text-green-600">{provider.activeCount}</p>
                    <p className="text-xs text-muted-foreground">Activos</p>
                  </div>
                </div>

                <div className="pt-3 border-t flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => openPassDialog(provider.company, 'personal')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Pase Personal
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1"
                    onClick={() => openPassDialog(provider.company, 'driver')}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Pase Chofer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Diálogo de Edición de Personal de Proveedor */}
      <Dialog open={editProviderPersonnelDialogOpen} onOpenChange={setEditProviderPersonnelDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Personal de Proveedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-fullName">Nombre Completo</Label>
              <Input
                id="edit-provider-fullName"
                value={editProviderPersonnelFormData.fullName}
                onChange={(e) => setEditProviderPersonnelFormData({...editProviderPersonnelFormData, fullName: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-dni">DNI</Label>
              <Input
                id="edit-provider-dni"
                value={editProviderPersonnelFormData.dni}
                onChange={(e) => setEditProviderPersonnelFormData({...editProviderPersonnelFormData, dni: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-company">Empresa</Label>
              <Input
                id="edit-provider-company"
                value={editProviderPersonnelFormData.company}
                onChange={(e) => setEditProviderPersonnelFormData({...editProviderPersonnelFormData, company: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-position">Cargo</Label>
              <Input
                id="edit-provider-position"
                value={editProviderPersonnelFormData.position}
                onChange={(e) => setEditProviderPersonnelFormData({...editProviderPersonnelFormData, position: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-phone">Teléfono</Label>
              <Input
                id="edit-provider-phone"
                value={editProviderPersonnelFormData.phone}
                onChange={(e) => setEditProviderPersonnelFormData({...editProviderPersonnelFormData, phone: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-entryDateTime">Entrada Programada</Label>
              <Input
                id="edit-provider-entryDateTime"
                type="datetime-local"
                value={editProviderPersonnelFormData.entryDateTime}
                onChange={(e) => setEditProviderPersonnelFormData({...editProviderPersonnelFormData, entryDateTime: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-exitDateTime">Salida Programada</Label>
              <Input
                id="edit-provider-exitDateTime"
                type="datetime-local"
                value={editProviderPersonnelFormData.exitDateTime}
                onChange={(e) => setEditProviderPersonnelFormData({...editProviderPersonnelFormData, exitDateTime: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-photo">Foto del Pase</Label>
              {editProviderPhotoPreview && (
                <div className="flex justify-center mb-2">
                  <img 
                    src={editProviderPhotoPreview} 
                    alt="Vista previa" 
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
              <Input
                id="edit-provider-photo"
                type="file"
                accept="image/*"
                onChange={handleEditProviderPhotoChange}
              />
              <p className="text-xs text-muted-foreground">
                {newProviderPhoto ? "Nueva foto seleccionada. Se actualizará al guardar." : "Selecciona una nueva foto para cambiar la actual."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProviderPersonnelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditProviderPersonnel}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edición de Personal de Transporte */}
      <Dialog open={editTransportDialogOpen} onOpenChange={setEditTransportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Personal de Transporte</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-transport-fullName">Nombre Completo</Label>
              <Input
                id="edit-transport-fullName"
                value={editTransportFormData.fullName}
                onChange={(e) => setEditTransportFormData({ ...editTransportFormData, fullName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-transport-dni">DNI</Label>
              <Input
                id="edit-transport-dni"
                value={editTransportFormData.dni}
                onChange={(e) => setEditTransportFormData({ ...editTransportFormData, dni: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-transport-company">Empresa</Label>
              <Input
                id="edit-transport-company"
                value={editTransportFormData.company}
                onChange={(e) => setEditTransportFormData({ ...editTransportFormData, company: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-transport-vehicle">Vehículo</Label>
              <Input
                id="edit-transport-vehicle"
                value={editTransportFormData.vehicle}
                onChange={(e) => setEditTransportFormData({ ...editTransportFormData, vehicle: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-transport-licensePlate">Patente</Label>
              <Input
                id="edit-transport-licensePlate"
                value={editTransportFormData.licensePlate}
                onChange={(e) => setEditTransportFormData({ ...editTransportFormData, licensePlate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-transport-entryDateTime">Entrada Programada</Label>
              <Input
                id="edit-transport-entryDateTime"
                type="datetime-local"
                value={editTransportFormData.entryDateTime}
                onChange={(e) => setEditTransportFormData({ ...editTransportFormData, entryDateTime: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-transport-exitDateTime">Salida Programada</Label>
              <Input
                id="edit-transport-exitDateTime"
                type="datetime-local"
                value={editTransportFormData.exitDateTime}
                onChange={(e) => setEditTransportFormData({ ...editTransportFormData, exitDateTime: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-transport-photo">Foto del Pase</Label>
              {editTransportPhotoPreview && (
                <div className="flex justify-center mb-2">
                  <img 
                    src={editTransportPhotoPreview} 
                    alt="Vista previa" 
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
              <Input
                id="edit-transport-photo"
                type="file"
                accept="image/*"
                onChange={handleEditTransportPhotoChange}
              />
              <p className="text-xs text-muted-foreground">
                {newTransportPhoto ? "Nueva foto seleccionada. Se actualizará al guardar." : "Selecciona una nueva foto para cambiar la actual."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTransportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditTransport}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Visualización de Pases por Empresa */}
      <Dialog open={viewPassesDialogOpen} onOpenChange={setViewPassesDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Pases de {selectedProviderForPasses?.company}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Personal de Proveedores */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                Personal de Proveedores ({selectedProviderForPasses?.providerPersonnel?.length || 0})
              </h3>
              
              {selectedProviderForPasses?.providerPersonnel && selectedProviderForPasses.providerPersonnel.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Nombre</th>
                        <th className="text-left p-3 text-sm font-medium">DNI</th>
                        <th className="text-left p-3 text-sm font-medium">Cargo</th>
                        <th className="text-left p-3 text-sm font-medium">Estado</th>
                        <th className="text-left p-3 text-sm font-medium">Entrada Prog.</th>
                        <th className="text-left p-3 text-sm font-medium">Salida Prog.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProviderForPasses.providerPersonnel.map((person: any) => (
                        <tr key={person.id} className="border-t hover:bg-gray-50">
                          <td className="p-3 text-sm">{person.fullName}</td>
                          <td className="p-3 text-sm">{person.dni}</td>
                          <td className="p-3 text-sm">{person.position || 'N/A'}</td>
                          <td className="p-3">
                            <Badge variant={person.status === 'Activo' ? 'default' : 'secondary'}>
                              {person.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {person.entryDateTime 
                              ? new Date(person.entryDateTime).toLocaleString('es-AR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'N/A'}
                          </td>
                          <td className="p-3 text-sm">
                            {person.exitDateTime 
                              ? new Date(person.exitDateTime).toLocaleString('es-AR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8 bg-gray-50 rounded-lg">
                  No hay personal de proveedores registrado
                </p>
              )}
            </div>

            {/* Personal de Transporte (Choferes) */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-600" />
                Personal de Transporte ({selectedProviderForPasses?.transportPersonnel?.length || 0})
              </h3>
              
              {selectedProviderForPasses?.transportPersonnel && selectedProviderForPasses.transportPersonnel.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-orange-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Nombre</th>
                        <th className="text-left p-3 text-sm font-medium">DNI</th>
                        <th className="text-left p-3 text-sm font-medium">Vehículo</th>
                        <th className="text-left p-3 text-sm font-medium">Patente</th>
                        <th className="text-left p-3 text-sm font-medium">Estado</th>
                        <th className="text-left p-3 text-sm font-medium">Entrada Prog.</th>
                        <th className="text-left p-3 text-sm font-medium">Salida Prog.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProviderForPasses.transportPersonnel.map((person: any) => (
                        <tr key={person.id} className="border-t hover:bg-gray-50">
                          <td className="p-3 text-sm">{person.fullName}</td>
                          <td className="p-3 text-sm">{person.dni}</td>
                          <td className="p-3 text-sm">{person.vehicle || 'N/A'}</td>
                          <td className="p-3 text-sm">{person.licensePlate || 'N/A'}</td>
                          <td className="p-3">
                            <Badge variant={person.status === 'Activo' ? 'default' : 'secondary'}>
                              {person.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {person.entryDateTime 
                              ? new Date(person.entryDateTime).toLocaleString('es-AR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'N/A'}
                          </td>
                          <td className="p-3 text-sm">
                            {person.exitDateTime 
                              ? new Date(person.exitDateTime).toLocaleString('es-AR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8 bg-gray-50 rounded-lg">
                  No hay personal de transporte registrado
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setViewPassesDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Canvas oculto para procesamiento facial */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
