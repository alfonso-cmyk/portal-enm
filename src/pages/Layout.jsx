

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  Users,
  Building2,
  FileText,
  LogOut,
  Menu,
  Briefcase,
  Bell,
  Home,
  Clock,
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  UsersIcon,
  Calendar
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [horaActual, setHoraActual] = useState(new Date());
  const [empleadosOpen, setEmpleadosOpen] = useState(false);
  const [finanzasOpen, setFinanzasOpen] = useState(false);
  const [notificacionesOpen, setNotificacionesOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        
        if (!isAuthenticated) {
          if (location.pathname !== createPageUrl("Landing")) {
            window.location.href = createPageUrl("Landing");
          }
          setLoading(false);
          return;
        }

        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
        if (location.pathname !== createPageUrl("Landing")) {
          window.location.href = createPageUrl("Landing");
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();

    const interval = setInterval(() => {
      setHoraActual(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  // Auto-abrir secciones si estamos en una de sus páginas
  useEffect(() => {
    const empleadosPages = [
      "GestionEmpleados",
      "PanelFichajes", 
      "HistorialFichajes",
      "GestionDocumentos",
      "TrabajosRealizados",
      "Reportes",
      "CalendarioFestivos"
    ];

    const finanzasPages = [
      "GestionIngresos",
      "GestionGastos",
      "GestionGastosEmpleados",
      "ResumenFinanciero",
      "ResumenImpuestos", 
      "GestionProveedores" 
    ];

    const notificacionesPages = [
      "ConfiguracionAvisos",
      "NotificacionesAdmin"
    ];

    const employeeCalendarPage = ["CalendarioLaboral"];

    const currentPage = location.pathname.split('/').pop();
    if (empleadosPages.some(page => createPageUrl(page).includes(currentPage))) {
      setEmpleadosOpen(true);
    }
    if (finanzasPages.some(page => createPageUrl(page).includes(currentPage))) {
      setFinanzasOpen(true);
    }
    if (notificacionesPages.some(page => createPageUrl(page).includes(currentPage))) {
      setNotificacionesOpen(true);
    }
  }, [location.pathname]);

  const isAdmin = user?.role === 'admin';

  // ✅ CONTADOR DE NOTIFICACIONES PARA ADMIN
  const { data: solicitudesGenerales = [] } = useQuery({
    queryKey: ['solicitudes-pendientes'],
    queryFn: async () => {
      const solicitudes = await base44.entities.Solicitud.filter({ estado: "pendiente" });
      console.log('🔔 Solicitudes pendientes:', solicitudes);
      return solicitudes;
    },
    enabled: isAdmin && !!user,
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Refrescar cada minuto
    initialData: [],
  });

  const { data: solicitudesVacaciones = [] } = useQuery({
    queryKey: ['vacaciones-pendientes'],
    queryFn: async () => {
      const vacaciones = await base44.entities.SolicitudVacaciones.filter({ estado: "pendiente" });
      console.log('🏖️ Vacaciones pendientes:', vacaciones);
      return vacaciones;
    },
    enabled: isAdmin && !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    initialData: [],
  });

  const { data: misSolicitudes = [] } = useQuery({
    queryKey: ['mis-solicitudes-respondidas', user?.id],
    queryFn: () => base44.entities.Solicitud.filter({ 
      empleado_id: user.id
    }),
    enabled: !isAdmin && !!user,
    staleTime: 2 * 60 * 1000,
    initialData: [],
  });

  const { data: misVacaciones = [] } = useQuery({
    queryKey: ['mis-vacaciones-respondidas', user?.id],
    queryFn: () => base44.entities.SolicitudVacaciones.filter({ 
      empleado_id: user.id
    }),
    enabled: !isAdmin && !!user,
    staleTime: 2 * 60 * 1000,
    initialData: [],
  });

  const { data: notificacionesVistas = [] } = useQuery({
    queryKey: ['notificaciones-vistas', user?.id],
    queryFn: () => base44.entities.NotificacionVista.filter({ 
      empleado_id: user.id
    }),
    enabled: !isAdmin && !!user,
    staleTime: 2 * 60 * 1000,
    initialData: [],
  });

  if (currentPageName === "Landing") {
    return children;
  }
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba]" />
    </div>;
  }

  if (!user) {
    return null;
  }

  const notificacionesAdmin = solicitudesGenerales.length + solicitudesVacaciones.length;
  
  console.log('🔢 Contador notificaciones admin:', {
    solicitudesGenerales: solicitudesGenerales.length,
    solicitudesVacaciones: solicitudesVacaciones.length,
    total: notificacionesAdmin
  });
  
  const solicitudesRespondidas = misSolicitudes.filter(s => {
    if ((s.estado === 'aprobada' || s.estado === 'rechazada') && s.respuesta) {
      const yaVista = notificacionesVistas.some(nv => 
        nv.tipo_notificacion === 'solicitud_general' && nv.solicitud_id === s.id
      );
      return !yaVista;
    }
    return false;
  }).length;
  
  const vacacionesRespondidas = misVacaciones.filter(v => {
    if (v.estado !== 'pendiente') {
      const yaVista = notificacionesVistas.some(nv => 
        nv.tipo_notificacion === 'solicitud_vacaciones' && nv.solicitud_id === v.id
      );
      return !yaVista;
    }
    return false;
  }).length;
  
  const notificacionesEmpleado = solicitudesRespondidas + vacacionesRespondidas;

  const empleadosPages = [
    "GestionEmpleados",
    "PanelFichajes", 
    "HistorialFichajes",
    "GestionDocumentos",
    "TrabajosRealizados",
    "Reportes",
    "CalendarioFestivos"
  ];

  const finanzasPages = [
    "GestionIngresos",
    "GestionGastos",
    "GestionGastosEmpleados",
    "ResumenFinanciero",
    "ResumenImpuestos", 
    "GestionProveedores" 
  ];

  const notificacionesPages = [
    "ConfiguracionAvisos",
    "NotificacionesAdmin"
  ];

  const empleadosNavigation = [
    {
      title: "Gestión de Empleados",
      url: createPageUrl("GestionEmpleados"),
      icon: Users,
    },
    {
      title: "Panel de Fichajes",
      url: createPageUrl("PanelFichajes"),
      icon: Clock,
    },
    {
      title: "Historial de Fichajes",
      url: createPageUrl("HistorialFichajes"),
      icon: History,
    },
    {
      title: "Gestión de Documentos",
      url: createPageUrl("GestionDocumentos"),
      icon: FileText,
    },
    {
      title: "Trabajos Realizados",
      url: createPageUrl("TrabajosRealizados"),
      icon: ClipboardList,
    },
    {
      title: "Reportes",
      url: createPageUrl("Reportes"),
      icon: FileText,
    },
    {
      title: "Festivos",
      url: createPageUrl("CalendarioFestivos"),
      icon: Calendar,
    },
  ];

  const finanzasNavigation = [
    {
      title: "Ingresos",
      url: createPageUrl("GestionIngresos"),
      icon: TrendingUp,
    },
    {
      title: "Gastos",
      url: createPageUrl("GestionGastos"),
      icon: TrendingDown,
    },
    {
      title: "Gastos de Empleados",
      url: createPageUrl("GestionGastosEmpleados"),
      icon: UsersIcon,
    },
    {
      title: "Resumen Financiero",
      url: createPageUrl("ResumenFinanciero"),
      icon: FileText,
    },
    {
      title: "Resumen Impuestos",
      url: createPageUrl("ResumenImpuestos"),
      icon: FileText,
    },
    {
      title: "Proveedores",
      url: createPageUrl("GestionProveedores"),
      icon: Briefcase,
    },
  ];

  const notificacionesNavigation = [
    {
      title: "Avisos de Fichaje",
      url: createPageUrl("ConfiguracionAvisos"),
      icon: Bell,
    },
    {
      title: "Notificaciones",
      url: createPageUrl("NotificacionesAdmin"),
      icon: Bell,
      badge: notificacionesAdmin > 0 ? notificacionesAdmin : null,
    },
  ];

  const employeeNavigation = [
    {
      title: "Portal de Empleado",
      url: createPageUrl("PortalEmpleado"),
      icon: Home,
    },
    {
      title: "Fichar",
      url: createPageUrl("Fichar"),
      icon: Clock,
    },
    {
      title: "Registrar Trabajo",
      url: createPageUrl("RegistrarTrabajo"),
      icon: ClipboardList,
    },
    {
      title: "Mi Historial",
      url: createPageUrl("HistorialEmpleado"),
      icon: History,
    },
    {
      title: "Mis Documentos",
      url: createPageUrl("MisDocumentos"),
      icon: FileText,
    },
    {
      title: "Mis Vacaciones",
      url: createPageUrl("MisVacaciones"),
      icon: Calendar,
    },
    {
      title: "Calendario Laboral",
      url: createPageUrl("CalendarioLaboral"),
      icon: Calendar,
    },
    ...(user?.puede_subir_gastos ? [{
      title: "Subir Gasto",
      url: createPageUrl("SubirGasto"),
      icon: DollarSign,
    }] : []),
    {
      title: "Notificaciones",
      url: createPageUrl("NotificacionesEmpleado"),
      icon: Bell,
      badge: notificacionesEmpleado > 0 ? notificacionesEmpleado : null,
    },
  ];

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Landing"));
  };

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: 174 71% 45%;
          --primary-foreground: 0 0% 100%;
          --secondary: 45 85% 53%;
          --secondary-foreground: 0 0% 0%;
          --accent: 174 71% 96%;
          --accent-foreground: 0 0% 10%;
          --ring: 174 71% 45%;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#24c4ba] to-[#1ca89f] rounded-xl flex items-center justify-center shadow-lg">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-[#1a1a1a] text-lg">TrabajosCampo</h2>
                <p className="text-xs text-slate-500">Sistema de Registro</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-2xl font-bold">{format(horaActual, 'HH:mm:ss')}</span>
              </div>
              <p className="text-xs opacity-90">
                {format(horaActual, "EEEE, d 'de' MMMM", { locale: es })}
              </p>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            {isAdmin ? (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Administración
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        className={`rounded-xl mb-1 transition-all duration-200 ${
                          location.pathname === createPageUrl("Dashboard")
                            ? 'bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white shadow-md' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 px-4 py-3">
                          <LayoutDashboard className="w-5 h-5" />
                          <span className="font-medium">Panel General</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <div className="h-px bg-slate-200 my-3" />

                    <Collapsible open={empleadosOpen} onOpenChange={setEmpleadosOpen}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton 
                            className={`rounded-xl mb-1 transition-all duration-200 ${
                              empleadosPages.some(page => location.pathname === createPageUrl(page))
                                ? 'bg-slate-100 text-[#24c4ba]' 
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 px-4 py-3 w-full">
                              <Users className="w-5 h-5" />
                              <span className="font-medium flex-1">Empleados</span>
                              {empleadosOpen ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-4 mt-1 space-y-1">
                            {empleadosNavigation.map((item) => (
                              <SidebarMenuButton
                                key={item.title}
                                asChild
                                className={`rounded-lg transition-all duration-200 ${
                                  location.pathname === item.url
                                    ? 'bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white shadow-md'
                                    : 'hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <Link to={item.url} className="flex items-center gap-3 px-4 py-2">
                                  <item.icon className="w-4 h-4" />
                                  <span className="text-sm font-medium">{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>

                    <div className="h-px bg-slate-200 my-3" />

                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        className={`rounded-xl mb-1 transition-all duration-200 ${
                          location.pathname === createPageUrl("GestionCentros")
                            ? 'bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white shadow-md' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Link to={createPageUrl("GestionCentros")} className="flex items-center gap-3 px-4 py-3">
                          <Building2 className="w-5 h-5" />
                          <span className="font-medium">Gestión de Centros</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <div className="h-px bg-slate-200 my-3" />

                    <Collapsible open={finanzasOpen} onOpenChange={setFinanzasOpen}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton 
                            className={`rounded-xl mb-1 transition-all duration-200 ${
                              finanzasPages.some(page => location.pathname === createPageUrl(page))
                                ? 'bg-slate-100 text-[#24c4ba]' 
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 px-4 py-3 w-full">
                              <Briefcase className="w-5 h-5" />
                              <span className="font-medium flex-1">Finanzas</span>
                              {finanzasOpen ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-4 mt-1 space-y-1">
                            {finanzasNavigation.map((item) => (
                              <SidebarMenuButton
                                key={item.title}
                                asChild
                                className={`rounded-lg transition-all duration-200 ${
                                  location.pathname === item.url
                                    ? 'bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white shadow-md'
                                    : 'hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <Link to={item.url} className="flex items-center gap-3 px-4 py-2">
                                  <item.icon className="w-4 h-4" />
                                  <span className="text-sm font-medium">{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>

                    <div className="h-px bg-slate-200 my-3" />

                    <Collapsible open={notificacionesOpen} onOpenChange={setNotificacionesOpen}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton 
                            className={`rounded-xl mb-1 transition-all duration-200 ${
                              notificacionesPages.some(page => location.pathname === createPageUrl(page))
                                ? 'bg-slate-100 text-[#24c4ba]' 
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 px-4 py-3 w-full">
                              <Bell className="w-5 h-5" />
                              <span className="font-medium flex-1">Notificaciones</span>
                              {notificacionesAdmin > 0 && (
                                <Badge className="bg-[#d4af37] text-[#1a1a1a] border-0 font-bold">
                                  {notificacionesAdmin}
                                </Badge>
                              )}
                              {notificacionesOpen ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-4 mt-1 space-y-1">
                            {notificacionesNavigation.map((item) => (
                              <SidebarMenuButton
                                key={item.title}
                                asChild
                                className={`rounded-lg transition-all duration-200 ${
                                  location.pathname === item.url
                                    ? 'bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white shadow-md'
                                    : 'hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <Link to={item.url} className="flex items-center gap-3 px-4 py-2">
                                  <item.icon className="w-4 h-4" />
                                  <span className="text-sm font-medium flex-1">{item.title}</span>
                                  {item.badge && (
                                    <Badge className="bg-[#d4af37] text-[#1a1a1a] border-0 font-bold text-xs">
                                      {item.badge}
                                    </Badge>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Empleado
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {employeeNavigation.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`rounded-xl mb-1 transition-all duration-200 ${
                            location.pathname === item.url 
                              ? 'bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white shadow-md' 
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium flex-1">{item.title}</span>
                            {item.badge && (
                              <Badge className="bg-[#d4af37] text-[#1a1a1a] border-0 font-bold">
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10 bg-gradient-to-br from-[#24c4ba] to-[#1ca89f]">
                <AvatarFallback className="bg-transparent text-white font-semibold">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1a1a1a] text-sm truncate">
                  {user?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            {isAdmin && (
              <Badge className="w-full justify-center mb-2 bg-gradient-to-r from-[#d4af37] to-[#c9a332] text-[#1a1a1a] border-0">
                Administrador
              </Badge>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4 md:hidden shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-bold text-[#1a1a1a]">TrabajosCampo</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

