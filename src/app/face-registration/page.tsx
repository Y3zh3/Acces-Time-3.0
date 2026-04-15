"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, UserPlus, Loader2, CheckCircle, XCircle, Upload, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { extractFaceDescriptor, descriptorToArray, loadFaceModels } from "@/lib/face-recognition"
import { ProtectedPage } from "@/components/protected-page"

// Cargos típicos de empresa/almacén
const CARGOS_EMPRESA = [
  { value: "GERENTE_GENERAL", label: "Gerente General", description: "Dirección y gestión general" },
  { value: "GERENTE_AREA", label: "Gerente de Área", description: "Gestión de departamento específico" },
  { value: "JEFE_ALMACEN", label: "Jefe de Almacén", description: "Supervisión de operaciones de almacén" },
  { value: "SUPERVISOR", label: "Supervisor", description: "Supervisión de personal y procesos" },
  { value: "ASISTENTE_ADMIN", label: "Asistente", description: "Soporte administrativo" },
  { value: "OPERARIO_ALMACEN", label: "Operario de Almacén", description: "Actividades operativas de almacén" },
  { value: "MONTACARGUISTA", label: "Montacarguista", description: "Operación de montacargas" },
  { value: "DESPACHADOR", label: "Despachador", description: "Despacho y recepción de mercadería" },
  { value: "INVENTARISTA", label: "Inventarista", description: "Control y registro de inventario" },
  { value: "EMPAQUETADOR", label: "Empaquetador", description: "Empaquetado y preparación de pedidos" },
  { value: "SEGURIDAD", label: "Seguridad", description: "Control y vigilancia" },
  { value: "LIMPIEZA", label: "Personal de Limpieza", description: "Mantenimiento y limpieza" },
  { value: "MANTENIMIENTO", label: "Mantenimiento", description: "Mantenimiento de instalaciones" }
];

// Sedes de la empresa
const SEDES = [
  { value: "Lima", label: "Lima" },
  { value: "Ves", label: "Villa El Salvador" },
  { value: "SJL", label: "San Juan de Lurigancho" }
];

// Áreas de la empresa
const AREAS = [
  { value: "Logística", label: "Logística" },
  { value: "Administrativo", label: "Administrativo" },
  { value: "Seguridad", label: "Seguridad" },
  { value: "Operaciones", label: "Operaciones" },
  { value: "Mantenimiento", label: "Mantenimiento" },
  { value: "RRHH", label: "Recursos Humanos" },
  { value: "Finanzas", label: "Finanzas" },
  { value: "Sistemas", label: "Sistemas/IT" }
];

export default function FaceRegistration() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [savedName, setSavedName] = useState("")
  const [captureMode, setCaptureMode] = useState<"camera" | "upload">("camera")
  const [formData, setFormData] = useState({
    fullName: "",
    dni: "",
    role: "OPERARIO_ALMACEN",
    area: "Logística",
    email: "",
    sede: "Lima",
    contractExpiry: ""
  })
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [faceDetected, setFaceDetected] = useState(false)
  const [modelsReady, setModelsReady] = useState(false)
  const [loadingModels, setLoadingModels] = useState(true)
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Cargar modelos al montar
  useEffect(() => {
    setLoadingModels(true)
    loadFaceModels()
      .then(() => {
        setModelsReady(true)
        setLoadingModels(false)
        toast({
          title: "✓ Modelos cargados",
          description: "Sistema de reconocimiento facial listo"
        })
      })
      .catch((error) => {
        console.error("Error cargando modelos:", error)
        setLoadingModels(false)
        toast({
          variant: "destructive",
          title: "Error cargando modelos de IA",
          description: "La detección puede fallar. Recarga la página"
        })
      })
  }, [toast])

  // Activar cámara (independiente de los modelos para mejor UX)
  useEffect(() => {
    const startCamera = async () => {
      if (isCapturing) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: 640, height: 480 } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error("Error accediendo a la cámara:", error)
          toast({ 
            variant: 'destructive', 
            title: 'Cámara bloqueada',
            description: 'Permite el acceso a la cámara en tu navegador'
          });
          setIsCapturing(false);
        }
      }
    };
    
    startCamera();
    
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  }, [isCapturing, toast]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Verificar que los modelos estén listos
    if (!modelsReady) {
      toast({
        variant: "destructive",
        title: "Modelos aún cargando",
        description: loadingModels ? "Espera unos segundos..." : "Recarga la página"
      });
      return;
    }
    
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    
    // Verificar que hay un rostro y extraer descriptor
    const descriptor = await extractFaceDescriptor(canvas);
    
    if (!descriptor) {
      toast({
        variant: "destructive",
        title: "No se detectó rostro",
        description: "Centra tu cara frente a la cámara y reintenta"
      });
      setFaceDetected(false);
      return;
    }
    
    // Guardar descriptor para no tener que extraerlo nuevamente
    setCapturedDescriptor(descriptor);
    
    // Guardar miniatura de baja calidad para vista previa (ahorra espacio)
    const imageData = canvas.toDataURL('image/jpeg', 0.3);
    
    setCapturedImage(imageData);
    setFaceDetected(true);
    
    // Detener cámara
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsCapturing(false);
    
    toast({
      title: "✓ Rostro capturado",
      description: "Completa los datos y guarda"
    });
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar que sea imagen
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Archivo inválido",
        description: "Selecciona una imagen (jpg, png, etc.)"
      });
      return;
    }

    // Verificar que los modelos estén listos
    if (!modelsReady) {
      toast({
        variant: "destructive",
        title: "Modelos aún cargando",
        description: loadingModels ? "Espera unos segundos..." : "Recarga la página"
      });
      return;
    }

    // Leer archivo como dataURL
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageDataUrl = event.target?.result as string;
      
      // Crear imagen para procesar
      const img = new Image();
      img.onload = async () => {
        // Dibujar en canvas
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0);
        
        // Extraer descriptor
        const descriptor = await extractFaceDescriptor(canvas);
        
        if (!descriptor) {
          toast({
            variant: "destructive",
            title: "No se detectó rostro",
            description: "La foto debe mostrar claramente un rostro frontal"
          });
          setFaceDetected(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        
        // Guardar descriptor
        setCapturedDescriptor(descriptor);
        
        // Crear miniatura para vista previa
        const previewCanvas = document.createElement('canvas');
        const maxSize = 640;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        previewCanvas.width = width;
        previewCanvas.height = height;
        const previewCtx = previewCanvas.getContext('2d');
        if (previewCtx) {
          previewCtx.drawImage(img, 0, 0, width, height);
          const previewData = previewCanvas.toDataURL('image/jpeg', 0.7);
          setCapturedImage(previewData);
          setFaceDetected(true);
          
          toast({
            title: "✓ Rostro detectado",
            description: "Foto cargada correctamente"
          });
        }
      };
      
      img.src = imageDataUrl;
    };
    
    reader.readAsDataURL(file);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!capturedImage || !faceDetected || !capturedDescriptor) {
      toast({
        variant: "destructive",
        title: "Foto requerida",
        description: "Captura una foto con rostro visible"
      });
      return;
    }

    if (!formData.fullName || !formData.dni) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Completa nombre y DNI"
      });
      return;
    }

    setIsSaving(true);

    try {
      console.log('📝 Iniciando guardado...');
      
      // Convertir descriptor a array
      const descriptorArray = descriptorToArray(capturedDescriptor);
      console.log('✅ Descriptor convertido:', descriptorArray.length, 'valores');

      // Enviar todo a la API
      const t0 = Date.now();
      
      const response = await fetch('/api/biometric/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          dni: formData.dni.toUpperCase(),
          role: formData.role,
          area: formData.area,
          sede: formData.sede,
          department: formData.area, // Guardar área en department para compatibilidad
          email: formData.email || null,
          photoDataUri: capturedImage,
          descriptor: descriptorArray,
          contractExpiry: formData.contractExpiry || null,
          category: "Personal", // Siempre personal de planta
        }),
      });

      console.log(`✅ Respuesta recibida en ${Date.now() - t0}ms`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al registrar');
      }

      const result = await response.json();
      console.log('✅ Guardado exitoso:', result);

      toast({
        title: "✅ Registro exitoso",
        description: `${formData.fullName} registrado en el sistema con foto`,
        duration: 5000,
      });

      // Mostrar pantalla de éxito
      setSavedName(formData.fullName);
      setSavedSuccessfully(true);

      // Reset después de 4 segundos
      setTimeout(() => {
        setFormData({
          fullName: "",
          dni: "",
          role: "OPERARIO_ALMACEN",
          area: "Logística",
          email: "",
          sede: "Lima",
          contractExpiry: ""
        });
        setCapturedImage(null);
        setFaceDetected(false);
        setCapturedDescriptor(null);
        setSavedSuccessfully(false);
        setSavedName("");
        if (fileInputRef.current) fileInputRef.current.value = '';
        setCaptureMode("camera");
      }, 4000);

    } catch (error: any) {
      console.error('❌ Error guardando:', error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error?.message || "Verifica la conexión a Firebase"
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ProtectedPage requireAny={['canManageEmployees', 'isAdmin', 'isSupervisor']}>
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Registro de Rostros Biométricos
          </h1>
          <p className="text-muted-foreground uppercase tracking-widest text-[9px] font-black opacity-60">
            Base de Datos de Personal Autorizado
          </p>
        </div>

        {savedSuccessfully ? (
        <Card className="shadow-2xl border-none bg-gradient-to-br from-green-50 to-white rounded-2xl animate-in zoom-in duration-300">
          <CardContent className="flex flex-col items-center justify-center p-12 space-y-6">
            <div className="bg-green-500 rounded-full p-6 animate-in zoom-in duration-500">
              <CheckCircle className="h-16 w-16 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-green-600">¡Registro Exitoso!</h2>
              <p className="text-xl font-bold text-primary">{savedName}</p>
              <p className="text-sm text-muted-foreground">
                Datos biométricos guardados correctamente
              </p>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Foto guardada</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Descriptor facial almacenado</span>
            </div>
            <p className="text-xs text-muted-foreground animate-pulse">
              Redirigiendo en 4 segundos...
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {/* Panel de Captura */}
        <Card className="shadow-lg border-none bg-white rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Captura Facial
            </CardTitle>
            <CardDescription className="text-xs">
              {loadingModels && "⏳ Cargando modelos de IA..."}
              {!loadingModels && modelsReady && "✓ Sistema listo"}
              {!loadingModels && !modelsReady && "⚠️ Error en modelos - Recarga la página"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={captureMode} onValueChange={(val) => setCaptureMode(val as "camera" | "upload")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="camera" className="text-xs">
                  <Camera className="h-3 w-3 mr-1" />
                  Cámara
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs">
                  <Upload className="h-3 w-3 mr-1" />
                  Subir Foto
                </TabsTrigger>
              </TabsList>

              {/* TAB: CÁMARA */}
              <TabsContent value="camera" className="mt-4">
                <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
                  {!isCapturing && !capturedImage && (
                    <Button 
                      onClick={() => setIsCapturing(true)} 
                      variant="secondary"
                      className="bg-white text-primary"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Activar Cámara
                    </Button>
                  )}
                  
                  {isCapturing && (
                    <>
                      <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover scale-x-[-1]" 
                        autoPlay 
                        muted 
                        playsInline 
                      />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                        <Button 
                          onClick={capturePhoto} 
                          size="lg" 
                          className="rounded-full"
                          disabled={loadingModels}
                        >
                          {loadingModels ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Camera className="h-5 w-5" />
                          )}
                        </Button>
                        {loadingModels && (
                          <p className="text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded">
                            Espera...
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  
                  {capturedImage && captureMode === "camera" && (
                    <>
                      <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                      {faceDetected && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Rostro OK
                        </div>
                      )}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <Button 
                          onClick={() => {
                            setCapturedImage(null);
                            setFaceDetected(false);
                            setCapturedDescriptor(null);
                            setIsCapturing(true);
                          }} 
                          variant="secondary"
                          size="sm"
                        >
                          Recapturar
                        </Button>
                      </div>
                    </>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </TabsContent>

              {/* TAB: SUBIR FOTO */}
              <TabsContent value="upload" className="mt-4">
                <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
                  {!capturedImage && (
                    <div className="flex flex-col items-center gap-4 p-8 text-center">
                      <Upload className="h-12 w-12 text-slate-600" />
                      <div className="space-y-2">
                        <p className="text-sm text-slate-300 font-semibold">
                          Sube una foto del rostro
                        </p>
                        <p className="text-xs text-slate-500">
                          La foto debe mostrar claramente el rostro frontal
                        </p>
                      </div>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="secondary"
                        className="bg-white text-primary"
                        disabled={loadingModels}
                      >
                        {loadingModels ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cargando IA...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Seleccionar Foto
                          </>
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  )}
                  
                  {capturedImage && captureMode === "upload" && (
                    <>
                      <img src={capturedImage} alt="Uploaded" className="w-full h-full object-cover" />
                      {faceDetected && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Rostro OK
                        </div>
                      )}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <Button 
                          onClick={() => {
                            setCapturedImage(null);
                            setFaceDetected(false);
                            setCapturedDescriptor(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }} 
                          variant="secondary"
                          size="sm"
                        >
                          Cambiar Foto
                        </Button>
                      </div>
                    </>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Formulario de Datos */}
        <Card className="shadow-lg border-none bg-white rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Datos del Empleado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Nombre Completo *
                </Label>
                <Input
                  placeholder=""
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  DNI / Documento * (8 dígitos)
                </Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="12345678"
                  value={formData.dni}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setFormData({...formData, dni: value});
                  }}
                  maxLength={8}
                  pattern="\d{8}"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    Cargo en la Empresa *
                  </Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {CARGOS_EMPRESA.map(cargo => (
                        <SelectItem key={cargo.value} value={cargo.value}>
                          <div className="flex flex-col">
                            <span className="font-semibold">{cargo.label}</span>
                            <span className="text-xs text-muted-foreground">{cargo.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    Área *
                  </Label>
                  <Select value={formData.area} onValueChange={(val) => setFormData({...formData, area: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AREAS.map(area => (
                        <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    Sede *
                  </Label>
                  <Select value={formData.sede} onValueChange={(val) => setFormData({...formData, sede: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEDES.map(sede => (
                        <SelectItem key={sede.value} value={sede.value}>{sede.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Vencimiento Contrato
                  </Label>
                  <Input
                    type="date"
                    value={formData.contractExpiry}
                    onChange={(e) => setFormData({...formData, contractExpiry: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Email (Opcional)
                </Label>
                <Input
                  type="email"
                  placeholder=""
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 font-bold"
                disabled={isSaving || !faceDetected}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Registrar Empleado
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      )}
      </div>
    </ProtectedPage>
  )
}
