// Tipos y constantes para el sistema de roles simplificado

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  SUPERVISOR = 'SUPERVISOR',
  SEGURIDAD = 'SEGURIDAD'
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMINISTRADOR]: 'Administrador',
  [UserRole.SUPERVISOR]: 'Supervisor',
  [UserRole.SEGURIDAD]: 'Seguridad'
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMINISTRADOR]: 'Acceso completo al sistema',
  [UserRole.SUPERVISOR]: 'Gestión de personal y reportes',
  [UserRole.SEGURIDAD]: 'Control de accesos y validación'
}

// Permisos por rol
export const ROLE_PERMISSIONS = {
  [UserRole.ADMINISTRADOR]: {
    canManageEmployees: true,
    canIssuePasses: true,
    canValidateAccess: true,
    canViewReports: true,
    canExportData: true,
    canManageContracts: true,
    canManageSystem: true
  },
  [UserRole.SUPERVISOR]: {
    canManageEmployees: true,
    canIssuePasses: true,
    canValidateAccess: true,
    canViewReports: true,
    canExportData: true,
    canManageContracts: false,
    canManageSystem: false
  },
  [UserRole.SEGURIDAD]: {
    canManageEmployees: true,
    canIssuePasses: false,
    canValidateAccess: true,
    canViewReports: false,
    canExportData: false,
    canManageContracts: false,
    canManageSystem: false
  }
} as const

export function hasPermission(role: UserRole, permission: keyof typeof ROLE_PERMISSIONS[UserRole]) {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return false
  }
  return ROLE_PERMISSIONS[role][permission]
}

export const ALL_ROLES = Object.values(UserRole)
