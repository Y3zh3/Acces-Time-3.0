"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProtectedPageProps {
  children: React.ReactNode
  requiredPermission?: keyof ReturnType<typeof usePermissions>
  requireAny?: Array<keyof ReturnType<typeof usePermissions>>
}

export function ProtectedPage({ children, requiredPermission, requireAny }: ProtectedPageProps) {
  const permissions = usePermissions()
  const router = useRouter()

  // Verificar permisos
  let hasAccess = true

  if (requiredPermission) {
    hasAccess = !!permissions[requiredPermission]
  }

  if (requireAny && requireAny.length > 0) {
    hasAccess = requireAny.some(perm => !!permissions[perm])
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold text-destructive">Acceso Denegado</h2>
            <p className="text-muted-foreground">
              No tienes permisos suficientes para acceder a esta sección.
            </p>
            <p className="text-sm text-muted-foreground">
              Tu rol actual: <strong>{permissions.userRole}</strong>
            </p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
