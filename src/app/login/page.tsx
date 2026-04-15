
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Factory, ShieldCheck, Loader2, UserCircle, Terminal, Lock, Shield, Users, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RoleSelection = null | 'ADMINISTRADOR' | 'SUPERVISOR' | 'SEGURIDAD';

interface SystemUser {
  id: number;
  username: string;
  fullName: string;
}

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleSelection>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [availableUsers, setAvailableUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Cargar usuarios cuando se selecciona un rol
  useEffect(() => {
    if (selectedRole && selectedRole !== 'ADMINISTRADOR') {
      loadUsersByRole(selectedRole);
    }
  }, [selectedRole]);

  const loadUsersByRole = async (role: string) => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/system-users?role=${role}`);
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor, ingrese la contraseña.",
      });
      return;
    }

    // Para Supervisor y Seguridad también se requiere usuario
    if (selectedRole !== 'ADMINISTRADOR' && !username) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor, seleccione un usuario.",
      });
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // Para admin, usar credencial fija
      const loginUsername = selectedRole === 'ADMINISTRADOR' ? 'admin' : username;
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: loginUsername, 
          password,
          expectedRole: selectedRole 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Acceso Denegado",
          description: data.error || "Credenciales inválidas",
        });
        setIsLoggingIn(false);
        return;
      }
      
      const sessionUser = {
        uid: 'user-' + data.user.id,
        fullName: data.user.fullName,
        role: data.user.role,
        email: data.user.email,
        isActive: true,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('logistream_session', JSON.stringify(sessionUser));
      
      toast({
        title: "✓ Acceso Concedido",
        description: `Bienvenido, ${data.user.fullName}`,
      });
      
      window.dispatchEvent(new Event('storage'));
      router.push('/');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error de conexión. Intente nuevamente.",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBack = () => {
    setSelectedRole(null);
    setUsername("");
    setPassword("");
    setAvailableUsers([]);
  };

  const roleButtons = [
    { role: 'ADMINISTRADOR' as const, label: 'Administrador', icon: Shield, color: 'bg-red-500 hover:bg-red-600', description: 'Acceso completo al sistema' },
    { role: 'SUPERVISOR' as const, label: 'Supervisor', icon: Users, color: 'bg-blue-500 hover:bg-blue-600', description: 'Gestión de personal' },
    { role: 'SEGURIDAD' as const, label: 'Seguridad', icon: ShieldCheck, color: 'bg-green-500 hover:bg-green-600', description: 'Control de accesos' },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] p-4">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden bg-white">
        <div className="h-2 bg-primary w-full" />
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/5 rounded-full">
              <Factory className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black text-primary uppercase tracking-tighter text-center">AccessTime</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 text-center">
              LOGISTREAM SOLUTIONS S.A.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-12 px-8">
          {!selectedRole ? (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-sm font-bold text-slate-700 uppercase">Seleccione su Perfil</h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Elija el tipo de acceso para continuar
                </p>
              </div>
              
              <div className="space-y-3">
                {roleButtons.map((btn) => (
                  <Button
                    key={btn.role}
                    className={`w-full h-16 ${btn.color} text-white shadow-lg font-bold transition-all active:scale-95 flex items-center justify-start gap-4 px-6`}
                    onClick={() => setSelectedRole(btn.role)}
                  >
                    <btn.icon className="h-6 w-6" />
                    <div className="text-left">
                      <div className="text-sm font-bold">{btn.label}</div>
                      <div className="text-[10px] opacity-80 font-normal">{btn.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-sm font-bold text-slate-700 uppercase">
                    Acceso {selectedRole === 'ADMINISTRADOR' ? 'Administrador' : selectedRole === 'SUPERVISOR' ? 'Supervisor' : 'Seguridad'}
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedRole === 'ADMINISTRADOR' ? 'Ingrese la contraseña de administrador' : 'Ingrese sus credenciales'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                {selectedRole !== 'ADMINISTRADOR' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-wider">
                      <UserCircle className="h-3.5 w-3.5 text-primary" /> Usuario
                    </label>
                    <Select value={username} onValueChange={setUsername} disabled={loadingUsers}>
                      <SelectTrigger className="h-12 bg-white border-slate-200 shadow-sm">
                        <SelectValue placeholder={loadingUsers ? "Cargando..." : "Seleccione usuario"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.length === 0 ? (
                          <SelectItem value="no-users" disabled>
                            No hay usuarios registrados
                          </SelectItem>
                        ) : (
                          availableUsers.map((user, index) => (
                            <SelectItem key={user.id} value={user.username}>
                              {selectedRole === 'SUPERVISOR' ? `Supervisor ${index + 1}` : `Seguridad ${index + 1}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-wider">
                    <Lock className="h-3.5 w-3.5 text-primary" /> Contraseña
                  </label>
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    className="h-12 bg-white border-slate-200 shadow-sm focus:ring-primary"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    autoFocus={selectedRole === 'ADMINISTRADOR'}
                  />
                </div>

                <Button 
                  className="w-full h-12 bg-primary text-white hover:bg-primary/90 shadow-lg font-bold text-sm uppercase tracking-widest transition-all active:scale-95"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Terminal className="h-5 w-5 mr-2" />
                  )}
                  {isLoggingIn ? "Validando..." : "Iniciar Sesión"}
                </Button>
              </div>
            </>
          )}
          
          <div className="flex items-center gap-2 justify-center text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] pt-4 opacity-40">
            <ShieldCheck className="h-3 w-3" /> Seguridad Corporativa Activa
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
