
import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { AuthGuard } from '@/components/auth-guard';

export const metadata: Metadata = {
  title: 'AccessTime | LOGISTREAM SOLUTIONS S.A.',
  description: 'Sistema corporativo de control y validación de acceso biométrico',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthGuard>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-14 items-center px-4 md:hidden border-b bg-white">
                <SidebarTrigger />
              </header>
              <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
                {children}
              </main>
            </SidebarInset>
            <Toaster />
          </SidebarProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
