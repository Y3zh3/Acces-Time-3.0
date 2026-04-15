"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  ScanFace,
  ShieldAlert as ShieldIcon,
  LogIn,
  LogOut,
  Clock,
  CreditCard,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { verifyBiometricReal } from "@/lib/face-verification-real"
import { loadFaceModels } from "@/lib/face-recognition"


export default function AccessValidation() {
  const [isValidating, setIsValidating] = useState(false)
  const [result, setResult] = useState<null | { success: boolean, name?: string, role?: string, reason?: string, category?: string, dni?: string }>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [isRecordingAccess, setIsRecordingAccess] = useState(false)
  const [validationMode, setValidationMode] = useState<'facial' | 'manual'>('facial')
  const [manualDni, setManualDni] = useState('')
  const [cameraFailures, setCameraFailures] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  // Cargar modelos al iniciar
  useEffect(() => {
    loadFaceModels()
      .then(() => {
        setModelsLoaded(true)
        toast({
          title: "Modelos cargados",
          description: "Sistema de reconocimiento facial listo"
        })
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Error cargando modelos",
          description: "Revisa que /public/models esté configurado"
        })
      })
  }, [toast])

  useEffect(() => {
    const getCameraPermission = async () => {
      if (isCameraActive) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCameraFailures(0); // Reset si la cámara funciona
        } catch (error) {
          setIsCameraActive(false);
          const newFailures = cameraFailures + 1;
          setCameraFailures(newFailures);
          
          // Detectar falla de cámara y sugerir modo manual
          if (newFailures >= 2) {
            toast({ 
              variant: "destructive", 
              title: "⚠️ Cámara no disponible",
              description: "Se activó el modo manual para ingresar por DNI"
            });
            setValidationMode('manual');
          } else {
            toast({ variant: "destructive", title: "Cámara bloqueada" });
          }
        }
      }
    };
    getCameraPermission();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  }, [isCameraActive, toast]);

  // Log access is now handled by the API endpoints
  const logAccess = (userName: string, role: string, zone: string, action: string, category: string, type: "success" | "critical" = "success") => {
    // No-op: API endpoints handle logging automatically
  }

  const handleManualValidation = async () => {
    if (!manualDni || manualDni.length !== 8) {
      toast({
        variant: "destructive",
        title: "DNI inválido",
        description: "Ingresa un DNI de 8 dígitos"
      });
      return;
    }

    setIsValidating(true);
    setResult(null);

    try {
      const response = await fetch('/api/validate-dni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: manualDni })
      });

      const data = await response.json();

      if (data.authorized) {
        setResult({
          success: true,
          name: data.name,
          role: data.role,
          category: data.category,
          dni: data.dni
        });
        toast({
          title: "✅ Personal encontrado",
          description: `${data.name} - ${data.category}`
        });
      } else {
        setResult({
          success: false,
          reason: data.reason || 'DNI no registrado'
        });
        toast({
          variant: "destructive",
          title: "Acceso denegado",
          description: data.reason
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo validar el DNI"
      });
    } finally {
      setIsValidating(false);
    }
  }

  const handleBiometricFace = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    if (!modelsLoaded) {
      toast({
        variant: "destructive",
        title: "Modelos cargando",
        description: "Espera a que los modelos se carguen"
      });
      return;
    }
    
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx)  return;
    
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    
    setIsValidating(true);
    setResult(null);

    try {
      const response = await verifyBiometricReal({ imageElement: canvas });
      
      if (response.authorized) {
        setResult({ 
          success: true, 
          name: response.userName, 
          role: response.role, 
          category: response.category,
          dni: response.dni || 'N/A'
        });
      } else {
        setResult({ success: false, reason: response.reason });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error en reconocimiento" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleAccessLog = async (action: 'Entrada' | 'Salida') => {
    if (!result?.success || !result.name) return;

    setIsRecordingAccess(true);

    try {
      const response = await fetch('/api/access-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: result.dni || 'N/A',
          fullName: result.name,
          role: result.role || 'N/A',
          action,
          category: result.category || 'Personal'
        })
      });

      const data = await response.json();

      if (data.success) {
        const isOutOfHours = data.accessStatus && data.accessStatus !== 'Aprobado';
        
        toast({
          title: isOutOfHours ? `⚠️ ${action} Registrada - ${data.accessStatus}` : `✅ ${action} Registrada`,
          description: `${result.name} - ${new Date().toLocaleTimeString('es-AR')}`,
          variant: isOutOfHours ? "default" : "default",
        });
        
        // Reiniciar después de 2 segundos
        setTimeout(() => {
          setResult(null);
          setIsCameraActive(false);
          setManualDni('');
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Error al registrar",
          description: data.error || "Intenta nuevamente"
        });
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error de conexión" 
      });
    } finally {
      setIsRecordingAccess(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-primary tracking-tight">AccessTime | Validación Planta</h1>
        <p className="text-muted-foreground uppercase tracking-widest text-[9px] font-black opacity-60">Reconocimiento Facial Biométrico - Control de Acceso</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-start">
        <Card className="shadow-lg border-none bg-white rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Terminal de Control de Acceso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={validationMode} onValueChange={(v) => setValidationMode(v as 'facial' | 'manual')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="facial" className="text-xs">
                  <ScanFace className="h-4 w-4 mr-2" />
                  Facial
                </TabsTrigger>
                <TabsTrigger value="manual" className="text-xs">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manual DNI
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="facial" className="space-y-4 mt-4">
                <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
                  <video ref={videoRef} className={"w-full h-full object-cover scale-x-[-1] " + (isCameraActive ? "block" : "hidden")} autoPlay muted playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                  {!isCameraActive && (
                    <Button onClick={() => setIsCameraActive(true)} variant="secondary" className="bg-white text-primary">
                      <ScanFace className="mr-2 h-5 w-5" />
                      Activar Sensor
                    </Button>
                  )}
                  {isCameraActive && !isValidating && <div className="absolute top-1/2 left-0 w-full h-[1px] bg-primary/40 animate-scan" />}
                </div>
                <Button 
                  className="w-full h-12 font-bold bg-primary" 
                  onClick={handleBiometricFace} 
                  disabled={isValidating || !isCameraActive || !modelsLoaded}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <ScanFace className="mr-2 h-5 w-5" />
                      Escanear Rostro
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-8 border-2 border-blue-200">
                  {cameraFailures >= 2 && (
                    <div className="absolute top-4 left-4 right-4 bg-orange-100 border border-orange-300 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-orange-800 font-medium">Cámara no disponible - Modo manual activado</p>
                    </div>
                  )}
                  <CreditCard className="h-16 w-16 text-blue-400 mb-4" />
                  <p className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-6">Ingreso Manual por DNI</p>
                  <div className="w-full space-y-3">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ingresa DNI (8 dígitos)"
                      value={manualDni}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setManualDni(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualDni.length === 8) {
                          handleManualValidation();
                        }
                      }}
                      className="text-center text-lg font-mono tracking-wider h-12"
                      maxLength={8}
                    />
                    <p className="text-xs text-center text-blue-600 font-medium">
                      {manualDni.length}/8 dígitos
                    </p>
                  </div>
                </div>
                <Button 
                  className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700" 
                  onClick={handleManualValidation}
                  disabled={isValidating || manualDni.length !== 8}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Buscar por DNI
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

          <div className="space-y-4">
            {isValidating && (
              <Card className="h-full flex flex-col items-center justify-center p-12 bg-white min-h-[350px] rounded-2xl">
                <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
                <p className="mt-4 font-black text-primary uppercase tracking-widest text-[9px]">Verificando...</p>
              </Card>
            )}
            {result?.success && (
              <Card className="h-full border-none shadow-xl bg-white flex flex-col min-h-[350px] rounded-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className={"h-2 w-full " + (result.category === "Transporte" ? "bg-orange-600" : "bg-accent")} />
                <CardContent className="flex-1 flex flex-col items-center justify-center px-8 text-center py-8">
                  <ShieldCheck className="h-12 w-12 text-accent mb-4" />
                  <h3 className="text-xl font-black text-primary uppercase">Acceso Aprobado</h3>
                  <div className="mt-4 w-full p-4 bg-muted/30 rounded-xl space-y-2">
                    <p className="text-sm font-black text-primary">{result.name}</p>
                    <Badge className="bg-primary text-[9px] uppercase">{result.role}</Badge>
                    {result.dni && result.dni !== 'N/A' && (
                      <p className="text-xs text-muted-foreground">DNI: {result.dni}</p>
                    )}
                  </div>
                  
                  <div className="w-full mt-6 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Registrar:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        className="h-14 bg-green-600 hover:bg-green-700 flex flex-col gap-1"
                        onClick={() => handleAccessLog('Entrada')}
                        disabled={isRecordingAccess}
                      >
                        {isRecordingAccess ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <LogIn className="h-5 w-5" />
                            <span className="text-xs font-bold">ENTRADA</span>
                          </>
                        )}
                      </Button>
                      <Button 
                        className="h-14 bg-red-600 hover:bg-red-700 flex flex-col gap-1"
                        onClick={() => handleAccessLog('Salida')}
                        disabled={isRecordingAccess}
                      >
                        {isRecordingAccess ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <LogOut className="h-5 w-5" />
                            <span className="text-xs font-bold">SALIDA</span>
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                      <Clock className="h-3 w-3" />
                      <span>{new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {result && !result.success && (
              <Card className="h-full border-none shadow-xl bg-white flex flex-col min-h-[350px] rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2">
                <div className="h-2 bg-destructive w-full" />
                <CardContent className="flex-1 flex flex-col items-center justify-center px-8 text-center py-8">
                  <ShieldIcon className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-xl font-black text-destructive uppercase">Denegado</h3>
                  <p className="text-xs text-muted-foreground mt-2">{result.reason}</p>
                  <Button variant="outline" className="w-full mt-6" onClick={() => setResult(null)}>Reintentar</Button>
                </CardContent>
              </Card>
            )}
            {!isValidating && !result && (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 min-h-[350px]">
                <ScanFace className="h-12 w-12 text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Esperando Validación</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
