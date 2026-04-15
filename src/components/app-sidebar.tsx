"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  Scan, 
  Users,
  ScanFace,
  Factory,
  Truck,
  Package,
  LogOut,
  User,
  UserCog
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/hooks/use-session"
import { usePermissions } from "@/hooks/use-permissions"
import { ROLE_LABELS } from "@/lib/roles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout, isLoading } = useSession()
  const permissions = usePermissions()

  // Definir items con sus permisos requeridos
  const allItems = [
    { title: "Dashboard Planta", url: "/", icon: LayoutDashboard, public: true },
    { title: "Validación Acceso", url: "/validation", icon: Scan, permission: 'canValidateAccess' },
    { title: "Registro Biométrico", url: "/face-registration", icon: ScanFace, permission: 'canManageEmployees', excludeSecurity: true },
    { title: "Personal Registrados", url: "/personal-registrados", icon: Users, permission: 'canManageEmployees', excludeSecurity: true },
    { title: "Gestión Personal", url: "/credentials", icon: User, permission: 'canManageEmployees' },
    { title: "Personal Transporte", url: "/transport", icon: Truck, permission: 'canManageEmployees' },
    { title: "Personal Proveedores", url: "/provider-personnel", icon: Package, permission: 'canManageEmployees' },
    { title: "Proveedores", url: "/providers", icon: Factory, permission: 'canManageEmployees', excludeSecurity: true },
    { title: "Gestión Usuarios", url: "/usuarios", icon: UserCog, adminOnly: true },
  ]

  // Filtrar items según permisos del usuario
  const items = allItems.filter(item => {
    if (item.public) return true
    if (item.adminOnly) return permissions.isAdmin
    if (item.excludeSecurity && permissions.isSecurity) return false
    if (!item.permission) return true
    return permissions[item.permission as keyof typeof permissions]
  })

  if (pathname === '/login' || isLoading) return null

  return (
    <Sidebar collapsible="icon" className="border-r-0 shadow-xl">
      <SidebarHeader className="h-20 flex items-center justify-center bg-primary text-white p-4">
        <div className="flex items-center gap-3">
          <Factory className="h-7 w-7 text-accent" />
          <div className="group-data-[collapsible=icon]:hidden">
            <span className="font-headline font-black text-base tracking-tight uppercase block leading-tight">LOGISTREAM</span>
            <span className="text-[8px] uppercase tracking-[0.15em] font-bold opacity-70">SOLUTIONS S.A.</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-6 px-3 bg-white">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.url}
                tooltip={item.title}
                className="h-11 rounded-xl data-[active=true]:bg-primary/5 data-[active=true]:text-primary mb-1 transition-all duration-300"
              >
                <Link href={item.url} className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span className="font-semibold">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

      <SidebarFooter className="p-4 border-t bg-slate-50">
        <div className="group-data-[collapsible=icon]:hidden space-y-3">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">
                {user?.fullName || 'Usuario'}
              </p>
              <Badge variant="secondary" className="text-[9px] mt-1 font-bold uppercase">
                {user?.role ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] : 'Sistema'}
              </Badge>
            </div>
          </div>

          <Button 
            onClick={logout}
            variant="outline" 
            size="sm" 
            className="w-full h-9 text-sm font-semibold border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

        <div className="group-data-[collapsible=icon]:block hidden">
          <Button 
            onClick={logout}
            variant="outline" 
            size="icon" 
            className="w-full border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  )
}
