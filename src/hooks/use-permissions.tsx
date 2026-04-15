"use client"

import { useSession } from './use-session'
import { UserRole, hasPermission } from '@/lib/roles'

export function usePermissions() {
  const { user } = useSession()
  
  const userRole = user?.role as UserRole | undefined

  return {
    canManageEmployees: userRole ? hasPermission(userRole, 'canManageEmployees') : false,
    canIssuePasses: userRole ? hasPermission(userRole, 'canIssuePasses') : false,
    canValidateAccess: userRole ? hasPermission(userRole, 'canValidateAccess') : false,
    canViewReports: userRole ? hasPermission(userRole, 'canViewReports') : false,
    canExportData: userRole ? hasPermission(userRole, 'canExportData') : false,
    canManageContracts: userRole ? hasPermission(userRole, 'canManageContracts') : false,
    canManageSystem: userRole ? hasPermission(userRole, 'canManageSystem') : false,
    userRole,
    isAdmin: userRole === UserRole.ADMINISTRADOR,
    isSupervisor: userRole === UserRole.SUPERVISOR,
    isSecurity: userRole === UserRole.SEGURIDAD,
  }
}
