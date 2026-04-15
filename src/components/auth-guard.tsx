"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface User {
  uid: string
  fullName: string
  role: string
  email: string
  isActive: boolean
  loginTime: string
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      // Permitir acceso público a la página de login
      if (pathname === '/login') {
        setIsLoading(false)
        setIsAuthenticated(true)
        return
      }

      // Verificar sesión en localStorage
      const sessionData = localStorage.getItem('logistream_session')
      
      if (!sessionData) {
        // No hay sesión, redirigir a login
        router.push('/login')
        return
      }

      try {
        const user: User = JSON.parse(sessionData)
        
        // Verificar que la sesión sea válida (no mayor a 12 horas)
        const loginTime = new Date(user.loginTime)
        const now = new Date()
        const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
        
        if (hoursDiff > 12 || !user.isActive) {
          // Sesión expirada o usuario inactivo
          localStorage.removeItem('logistream_session')
          router.push('/login')
          return
        }

        // Sesión válida
        setIsAuthenticated(true)
      } catch (error) {
        // Error al parsear sesión, redirigir a login
        localStorage.removeItem('logistream_session')
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Escuchar cambios en localStorage (para logout desde otra pestaña)
    const handleStorageChange = () => {
      checkAuth()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null
  }

  return <>{children}</>
}
