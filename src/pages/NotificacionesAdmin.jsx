
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Send, CheckCircle, XCircle, Calendar, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Helper function for badge styling
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'aprobada':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'rechazada':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'en_revision':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export default function NotificacionesAdmin() {
  const [user, setUser] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [filtroEstado, setFiltroEstado] = useState("todos"); // New state for filtering
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: solicitudesGenerales = [] } = useQuery({
    queryKey: ['solicitudes-admin'],
    queryFn: () => base44.entities.Solicitud.list("-created_date"),
    initialData: [],
  });

  const { data: solicitudesVacaciones = [] } = useQuery({
    queryKey: ['vacaciones-admin'],
    queryFn: () => base44.entities.SolicitudVacaciones.list("-created_date"),
    initialData: [],
  });

  const updateSolicitudMutation = useMutation({
    mutationFn: ({ id, estado, respuesta }) => {
      return base44.entities.Solicitud.update(id, {
        estado,
        respuesta,
        fecha_respuesta: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['solicitudes-pendientes'] });
      setRespuestas({});
    },
  });

  const updateVacacionMutation = useMutation({
    mutationFn: async ({ id, estado, respuesta, empleado_id, dias_solicitados }) => {
      await base44.entities.SolicitudVacaciones.update(id, {
        estado,
        respuesta_admin: respuesta,
        fecha_respuesta: new Date().toISOString().split('T')[0]
      });

      if (estado === 'aprobada') {
        const vacaciones = await base44.entities.Vacacion.filter({
          empleado_id,
          anio: new Date().getFullYear()
        });
        
        if (vacaciones.length > 0) {
          const vacacion = vacaciones[0];
          const nuevosDiasUsados = vacacion.dias_usados + dias_solicitados;
          const nuevosDiasPendientes = vacacion.dias_totales - nuevosDiasUsados;
          
          await base44.entities.Vacacion.update(vacacion.id, {
            dias_usados: nuevosDiasUsados,
            dias_pendientes: nuevosDiasPendientes
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacaciones-admin'] });
      queryClient.invalidateQueries({ queryKey: ['vacaciones-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['vacaciones-info'] });
      setRespuestas({});
    },
  });

  const handleResponderSolicitud = (solicitud, estado) => {
    const respuesta = respuestas[solicitud.id] || '';
    if (!respuesta.trim()) {
      alert('Por favor, escribe una respuesta');
      return;
    }
    updateSolicitudMutation.mutate({ id: solicitud.id, estado, respuesta });
  };

  const handleResponderVacacion = (solicitud, estado) => {
    const respuesta = respuestas[solicitud.id] || '';
    if (!respuesta.trim()) {
      alert('Por favor, escribe una respuesta');
      return;
    }
    
    updateVacacionMutation.mutate({ 
      id: solicitud.id, 
      estado, 
      respuesta,
      empleado_id: solicitud.empleado_id,
      dias_solicitados: solicitud.dias_solicitados
    });
  };

  const solicitudesPendientes = solicitudesGenerales.filter(s => s.estado === 'pendiente');
  const vacacionesPendientes = solicitudesVacaciones.filter(v => v.estado === 'pendiente');
  const totalPendientes = solicitudesPendientes.length + vacacionesPendientes.length;

  // Filtrado
  const solicitudesFiltradas = filtroEstado === "todos" 
    ? solicitudesGenerales 
    : solicitudesGenerales.filter(s => s.estado === filtroEstado);

  const vacacionesFiltradas = filtroEstado === "todos"
    ? solicitudesVacaciones
    : solicitudesVacaciones.filter(v => v.estado === filtroEstado);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Acceso Restringido</h2>
          <p className="text-slate-600">Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] flex items-center gap-3">
            <Bell className="w-10 h-10 text-[#24c4ba]" />
            Centro de Notificaciones
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona todas las solicitudes - 
            <span className="font-bold text-[#d4af37] ml-2">
              {totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''}
            </span>
          </p>
        </div>

        <Tabs defaultValue="pendientes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white p-2 rounded-xl shadow-lg">
            <TabsTrigger value="pendientes" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#d4af37] data-[state=active]:to-[#c9a332] data-[state=active]:text-[#1a1a1a]">
              Pendientes ({totalPendientes})
            </TabsTrigger>
            <TabsTrigger value="solicitudes" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#24c4ba] data-[state=active]:to-[#1ca89f] data-[state=active]:text-white">
              Todas las Solicitudes ({solicitudesGenerales.length})
            </TabsTrigger>
            <TabsTrigger value="vacaciones" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#24c4ba] data-[state=active]:to-[#1ca89f] data-[state=active]:text-white">
              Todas las Vacaciones ({solicitudesVacaciones.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes">
            <div className="space-y-6">
              {vacacionesPendientes.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-[#24c4ba]" />
                    Solicitudes de Vacaciones Pendientes
                  </h2>
                  <div className="space-y-4">
                    {vacacionesPendientes.map((solicitud) => (
                      <SolicitudVacacionCard
                        key={solicitud.id}
                        solicitud={solicitud}
                        respuestas={respuestas}
                        setRespuestas={setRespuestas}
                        onResponder={handleResponderVacacion}
                        isPending={updateVacacionMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {solicitudesPendientes.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <Send className="w-6 h-6 text-[#24c4ba]" />
                    Solicitudes Generales Pendientes
                  </h2>
                  <div className="space-y-4">
                    {solicitudesPendientes.map((solicitud) => (
                      <SolicitudGeneralCard
                        key={solicitud.id}
                        solicitud={solicitud}
                        respuestas={respuestas}
                        setRespuestas={setRespuestas}
                        onResponder={handleResponderSolicitud}
                        isPending={updateSolicitudMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {totalPendientes === 0 && (
                <Card className="shadow-lg border-0">
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2">
                      ¡Todo al día!
                    </h3>
                    <p className="text-slate-600">No hay solicitudes pendientes</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="solicitudes">
            <div className="mb-6">
              <Card className="shadow-lg border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Filter className="w-5 h-5 text-slate-600" />
                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los Estados</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en_revision">En Revisión</SelectItem>
                        <SelectItem value="aprobada">Aprobada</SelectItem>
                        <SelectItem value="rechazada">Rechazada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {solicitudesFiltradas.map((solicitud) => (
                <SolicitudGeneralCard
                  key={solicitud.id}
                  solicitud={solicitud}
                  respuestas={respuestas}
                  setRespuestas={setRespuestas}
                  onResponder={handleResponderSolicitud}
                  isPending={updateSolicitudMutation.isPending}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vacaciones">
            <div className="mb-6">
              <Card className="shadow-lg border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Filter className="w-5 h-5 text-slate-600" />
                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los Estados</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="aprobada">Aprobada</SelectItem>
                        <SelectItem value="rechazada">Rechazada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {vacacionesFiltradas.map((solicitud) => (
                <SolicitudVacacionCard
                  key={solicitud.id}
                  solicitud={solicitud}
                  respuestas={respuestas}
                  setRespuestas={setRespuestas}
                  onResponder={handleResponderVacacion}
                  isPending={updateVacacionMutation.isPending}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SolicitudVacacionCard({ solicitud, respuestas, setRespuestas, onResponder, isPending }) {
  return (
    <Card className="shadow-xl border-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-lg text-[#1a1a1a]">
                {solicitud.empleado_nombre}
              </h3>
              <Badge className="bg-[#d4af37] text-[#1a1a1a] border-yellow-200">
                {solicitud.dias_solicitados} días
              </Badge>
              <Badge className={`capitalize ${getStatusBadgeClass(solicitud.estado)}`}>
                {solicitud.estado.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              <strong>Desde:</strong> {format(parseISO(solicitud.fecha_inicio), "dd MMM yyyy", { locale: es })}
              {' - '}
              <strong>Hasta:</strong> {format(parseISO(solicitud.fecha_fin), "dd MMM yyyy", { locale: es })}
            </p>
            {solicitud.motivo && (
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg mb-3">{solicitud.motivo}</p>
            )}
            <p className="text-xs text-slate-500">
              Solicitado el {format(new Date(solicitud.created_date), "dd MMM yyyy HH:mm", { locale: es })}
            </p>
          </div>
        </div>

        {solicitud.estado === 'pendiente' && (
          <div className="space-y-3 pt-4 border-t">
            <Textarea
              placeholder="Escribe tu respuesta al empleado..."
              value={respuestas[solicitud.id] || ''}
              onChange={(e) => setRespuestas({...respuestas, [solicitud.id]: e.target.value})}
              className="h-24"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onResponder(solicitud, 'aprobada')}
                disabled={isPending}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => onResponder(solicitud, 'rechazada')}
                disabled={isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rechazar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SolicitudGeneralCard({ solicitud, respuestas, setRespuestas, onResponder, isPending }) {
  return (
    <Card className="shadow-xl border-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-[#1a1a1a] mb-1">{solicitud.asunto}</h3>
            <p className="text-sm text-slate-600 capitalize mb-2">
              <strong>{solicitud.empleado_nombre}</strong> - {solicitud.tipo_solicitud?.replace(/_/g, ' ')}
            </p>
            <Badge className={`capitalize ${getStatusBadgeClass(solicitud.estado)} mb-2`}>
              {solicitud.estado.replace('_', ' ')}
            </Badge>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg mb-3">{solicitud.descripcion}</p>
            <p className="text-xs text-slate-500">
              Enviada el {format(new Date(solicitud.created_date), "dd MMM yyyy HH:mm", { locale: es })}
            </p>
          </div>
        </div>

        {solicitud.estado === 'pendiente' && (
          <div className="space-y-3 pt-4 border-t">
            <Textarea
              placeholder="Escribe tu respuesta..."
              value={respuestas[solicitud.id] || ''}
              onChange={(e) => setRespuestas({...respuestas, [solicitud.id]: e.target.value})}
              className="h-24"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onResponder(solicitud, 'aprobada')}
                disabled={isPending}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => onResponder(solicitud, 'rechazada')}
                disabled={isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rechazar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
