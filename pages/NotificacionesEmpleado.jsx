
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle, XCircle, Clock, Calendar, EyeOff } from "lucide-react"; // Added EyeOff
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const estadoColors = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_revision: "bg-blue-100 text-blue-800",
  aprobada: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800"
};

const estadoIcons = {
  pendiente: Clock,
  en_revision: Clock,
  aprobada: CheckCircle,
  rechazada: XCircle
};

export default function NotificacionesEmpleado() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Marcar notificaciones como vistas
      if (userData) {
        marcarNotificacionesComoVistas(userData.id);
      }
    };
    loadUser();
  }, []);

  const marcarNotificacionesComoVistas = async (empleadoId) => {
    try {
      const solicitudesRespondidas = await base44.entities.Solicitud.filter({ 
        empleado_id: empleadoId,
      });
      
      const vacacionesRespondidas = await base44.entities.SolicitudVacaciones.filter({ 
        empleado_id: empleadoId
      });

      // Marcar solicitudes generales como vistas
      for (const sol of solicitudesRespondidas) {
        if ((sol.estado === 'aprobada' || sol.estado === 'rechazada') && sol.respuesta) {
          const yaVista = await base44.entities.NotificacionVista.filter({
            empleado_id: empleadoId,
            tipo_notificacion: 'solicitud_general',
            solicitud_id: sol.id
          });
          
          if (yaVista.length === 0) {
            await base44.entities.NotificacionVista.create({
              empleado_id: empleadoId,
              tipo_notificacion: 'solicitud_general',
              solicitud_id: sol.id,
              fecha_vista: new Date().toISOString()
            });
          }
        }
      }

      // Marcar solicitudes de vacaciones como vistas
      for (const vac of vacacionesRespondidas) {
        if (vac.estado !== 'pendiente') {
          const yaVista = await base44.entities.NotificacionVista.filter({
            empleado_id: empleadoId,
            tipo_notificacion: 'solicitud_vacaciones',
            solicitud_id: vac.id
          });
          
          if (yaVista.length === 0) {
            await base44.entities.NotificacionVista.create({
              empleado_id: empleadoId,
              tipo_notificacion: 'solicitud_vacaciones',
              solicitud_id: vac.id,
              fecha_vista: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error marcando notificaciones como vistas:', error);
    }
  };

  const { data: solicitudesGenerales = [] } = useQuery({
    queryKey: ['mis-solicitudes-notif', user?.id],
    queryFn: () => base44.entities.Solicitud.filter({ empleado_id: user.id }, "-created_date"),
    enabled: !!user,
    initialData: [],
  });

  const { data: solicitudesVacaciones = [] } = useQuery({
    queryKey: ['mis-vacaciones-notif', user?.id],
    queryFn: () => base44.entities.SolicitudVacaciones.filter({ empleado_id: user.id }, "-created_date"),
    enabled: !!user,
    initialData: [],
  });

  const { data: notificacionesOcultas = [] } = useQuery({
    queryKey: ['notificaciones-ocultas', user?.id],
    queryFn: () => base44.entities.NotificacionOcultaEmpleado.filter({ empleado_id: user.id }),
    enabled: !!user,
    initialData: [],
  });

  const ocultarNotificacionMutation = useMutation({
    mutationFn: async ({ tipo, solicitudId }) => {
      return base44.entities.NotificacionOcultaEmpleado.create({
        empleado_id: user.id,
        tipo,
        solicitud_id: solicitudId,
        fecha_ocultacion: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-ocultas'] });
      // Invalidate the source queries to re-filter the displayed notifications
      queryClient.invalidateQueries({ queryKey: ['mis-solicitudes-notif'] });
      queryClient.invalidateQueries({ queryKey: ['mis-vacaciones-notif'] });
      alert('✅ Notificación ocultada');
    },
  });

  const handleOcultarSolicitud = (solicitudId, tipo) => {
    if (confirm('¿Ocultar esta notificación? (No se eliminará del sistema)')) {
      ocultarNotificacionMutation.mutate({ tipo, solicitudId });
    }
  };

  // Filtrar solicitudes que NO estén ocultas y que tengan respuesta
  const solicitudesRespondidas = solicitudesGenerales.filter(s => {
    const isResponded = (s.estado === 'aprobada' || s.estado === 'rechazada' || s.estado === 'en_revision') && s.respuesta;
    const isHidden = notificacionesOcultas.some(no => no.tipo === 'solicitud_general' && no.solicitud_id === s.id);
    return isResponded && !isHidden;
  });

  const vacacionesRespondidas = solicitudesVacaciones.filter(v => {
    const isResponded = v.estado !== 'pendiente';
    const isHidden = notificacionesOcultas.some(no => no.tipo === 'solicitud_vacaciones' && no.solicitud_id === v.id);
    return isResponded && !isHidden;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] flex items-center gap-3">
            <Bell className="w-10 h-10 text-[#24c4ba]" />
            Mis Notificaciones
          </h1>
          <p className="text-slate-600 mt-1">Respuestas a tus solicitudes</p>
        </div>

        <Tabs defaultValue="todas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white p-2 rounded-xl shadow-lg">
            <TabsTrigger value="todas" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#24c4ba] data-[state=active]:to-[#1ca89f] data-[state=active]:text-white">
              Todas ({solicitudesRespondidas.length + vacacionesRespondidas.length})
            </TabsTrigger>
            <TabsTrigger value="generales" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#24c4ba] data-[state=active]:to-[#1ca89f] data-[state=active]:text-white">
              Solicitudes ({solicitudesRespondidas.length})
            </TabsTrigger>
            <TabsTrigger value="vacaciones" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#24c4ba] data-[state=active]:to-[#1ca89f] data-[state=active]:text-white">
              Vacaciones ({vacacionesRespondidas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todas">
            <div className="space-y-4">
              {[...vacacionesRespondidas.map(v => ({...v, tipo: 'vacacion'})), ...solicitudesRespondidas.map(s => ({...s, tipo: 'general'}))]
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .map((item) => (
                  <NotificacionCard 
                    key={item.id} 
                    item={item} 
                    onOcultar={handleOcultarSolicitud} // Changed from onEliminar to onOcultar
                  />
                ))}
              {(solicitudesRespondidas.length + vacacionesRespondidas.length === 0) && (
                <Card className="shadow-lg border-0">
                  <CardContent className="p-12 text-center">
                    <Bell className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600">No tienes notificaciones</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="generales">
            <div className="space-y-4">
              {solicitudesRespondidas.map((solicitud) => (
                <NotificacionCard 
                  key={solicitud.id} 
                  item={{...solicitud, tipo: 'general'}} 
                  onOcultar={handleOcultarSolicitud} // Changed from onEliminar to onOcultar
                />
              ))}
              {solicitudesRespondidas.length === 0 && (
                <Card className="shadow-lg border-0">
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-600">No tienes notificaciones de solicitudes</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vacaciones">
            <div className="space-y-4">
              {vacacionesRespondidas.map((vacacion) => (
                <NotificacionCard 
                  key={vacacion.id} 
                  item={{...vacacion, tipo: 'vacacion'}} 
                  onOcultar={handleOcultarSolicitud} // Changed from onEliminar to onOcultar
                />
              ))}
              {vacacionesRespondidas.length === 0 && (
                <Card className="shadow-lg border-0">
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-600">No tienes notificaciones de vacaciones</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function NotificacionCard({ item, onOcultar }) { // Changed prop name from onEliminar to onOcultar
  const Icon = estadoIcons[item.estado];
  const esVacacion = item.tipo === 'vacacion';
  
  return (
    <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            item.estado === 'aprobada' ? 'bg-green-100' : item.estado === 'rechazada' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            {esVacacion ? <Calendar className={`w-6 h-6 ${
              item.estado === 'aprobada' ? 'text-green-600' : item.estado === 'rechazada' ? 'text-red-600' : 'text-blue-600'
            }`} /> : <Icon className={`w-6 h-6 ${
              item.estado === 'aprobada' ? 'text-green-600' : item.estado === 'rechazada' ? 'text-red-600' : 'text-blue-600'
            }`} />}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className={estadoColors[item.estado]}>
                {item.estado}
              </Badge>
              <span className="text-sm text-slate-500">
                {format(new Date(item.created_date), "dd MMM yyyy HH:mm", { locale: es })}
              </span>
            </div>
            
            {esVacacion ? (
              <>
                <h3 className="font-bold text-lg text-[#1a1a1a] mb-2">
                  Solicitud de Vacaciones - {item.dias_solicitados} días
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  <strong>Desde:</strong> {format(parseISO(item.fecha_inicio), "dd MMM yyyy", { locale: es })} - <strong>Hasta:</strong> {format(parseISO(item.fecha_fin), "dd MMM yyyy", { locale: es })}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-lg text-[#1a1a1a] mb-2">{item.asunto}</h3>
                <p className="text-sm text-slate-600 capitalize mb-2">
                  {item.tipo_solicitud?.replace(/_/g, ' ')}
                </p>
              </>
            )}

            {(item.respuesta_admin || item.respuesta) && (
              <div className="mt-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm font-semibold text-[#1a1a1a] mb-2">Respuesta del administrador:</p>
                <p className="text-slate-700">{item.respuesta_admin || item.respuesta}</p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOcultar(item.id, esVacacion ? 'solicitud_vacaciones' : 'solicitud_general')} // Updated onClick handler
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" // Changed color to orange
            title="Ocultar notificación (no se elimina del sistema)" // Updated title
          >
            <EyeOff className="w-5 h-5" /> {/* Changed icon from Trash2 to EyeOff */}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
