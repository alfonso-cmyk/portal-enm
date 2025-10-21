import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Users, Clock, CheckCircle, Filter, Download, Trash2, MessageSquare, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import StatsCards from "../components/dashboard/StatsCards";
import RegistrosTable from "../components/dashboard/RegistrosTable";
import FiltrosAvanzados from "../components/dashboard/FiltrosAvanzados";
import GraficoSemanal from "../components/dashboard/GraficoSemanal";
import EstadisticasAlmacenamiento from "../components/dashboard/EstadisticasAlmacenamiento";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState({
    empleado: "todos",
    centro: "todos",
    fecha_inicio: format(startOfWeek(new Date(), { locale: es }), "yyyy-MM-dd"),
    fecha_fin: format(endOfWeek(new Date(), { locale: es }), "yyyy-MM-dd"),
    estado: "todos"
  });
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  const [mensajeNotificacion, setMensajeNotificacion] = useState('');
  const [mostrarAlmacenamiento, setMostrarAlmacenamiento] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  // Queries optimizadas con staleTime
  const { data: registros = [], isLoading: loadingRegistros } = useQuery({
    queryKey: ['registros'],
    queryFn: () => base44.entities.RegistroTrabajo.list("-fecha"),
    staleTime: 2 * 60 * 1000, // 2 minutos
    initialData: [],
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10 * 60 * 1000, // 10 minutos - los empleados no cambian frecuentemente
    initialData: [],
  });

  const { data: centros = [] } = useQuery({
    queryKey: ['centros'],
    queryFn: () => base44.entities.Centro.list(),
    staleTime: 10 * 60 * 1000,
    initialData: [],
  });

  const deleteRegistroMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistroTrabajo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros'] });
      setRegistroSeleccionado(null);
    },
  });

  const enviarNotificacionMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Solicitud.create({
        empleado_id: data.empleado_id,
        empleado_nombre: data.empleado_nombre,
        tipo_solicitud: 'otro',
        asunto: `Sobre tu registro del ${format(new Date(data.fecha), 'dd/MM/yyyy')}`,
        descripcion: data.mensaje,
        estado: 'aprobada',
        respuesta: data.mensaje
      });
    },
    onSuccess: () => {
      alert('Notificación enviada al empleado');
      setMostrarNotificacion(false);
      setMensajeNotificacion('');
      setRegistroSeleccionado(null);
    },
  });

  // Memoizar cálculos pesados
  const registrosFiltrados = useMemo(() => {
    return registros.filter(registro => {
      const matchEmpleado = filtros.empleado === "todos" || registro.empleado_id === filtros.empleado;
      const matchCentro = filtros.centro === "todos" || registro.centro_id === filtros.centro;
      const matchEstado = filtros.estado === "todos" || registro.estado === filtros.estado;
      const matchFecha = (!filtros.fecha_inicio || registro.fecha >= filtros.fecha_inicio) &&
                         (!filtros.fecha_fin || registro.fecha <= filtros.fecha_fin);
      return matchEmpleado && matchCentro && matchEstado && matchFecha;
    });
  }, [registros, filtros]);

  const { totalHoras, registrosPendientes } = useMemo(() => {
    return {
      totalHoras: registrosFiltrados.reduce((sum, r) => sum + (r.horas_trabajadas || 0), 0),
      registrosPendientes: registros.filter(r => r.estado === "pendiente").length
    };
  }, [registrosFiltrados, registros]);

  const exportarDatos = () => {
    const csvContent = [
      ['Empleado', 'Centro', 'Fecha', 'Ubicación', 'Descripción', 'Horas', 'Estado'].join(','),
      ...registrosFiltrados.map(r => [
        r.empleado_nombre,
        r.centro_nombre,
        format(new Date(r.fecha), "dd/MM/yyyy"),
        r.ubicacion,
        r.descripcion_trabajo,
        r.horas_trabajadas,
        r.estado
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registros_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEliminar = (registro) => {
    if (confirm(`¿Estás seguro de eliminar el registro de ${registro.empleado_nombre} del ${format(new Date(registro.fecha), 'dd/MM/yyyy')}?`)) {
      deleteRegistroMutation.mutate(registro.id);
    }
  };

  const handleEnviarNotificacion = (registro) => {
    setRegistroSeleccionado(registro);
    setMostrarNotificacion(true);
  };

  const handleSubmitNotificacion = () => {
    if (!mensajeNotificacion.trim()) {
      alert('Por favor, escribe un mensaje');
      return;
    }

    enviarNotificacionMutation.mutate({
      empleado_id: registroSeleccionado.empleado_id,
      empleado_nombre: registroSeleccionado.empleado_nombre,
      fecha: registroSeleccionado.fecha,
      mensaje: mensajeNotificacion
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
          <p className="text-slate-600">Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Panel de Control</h1>
            <p className="text-slate-600">Gestión completa de registros de trabajo</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setMostrarAlmacenamiento(!mostrarAlmacenamiento)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {mostrarAlmacenamiento ? 'Ocultar' : 'Ver'} Almacenamiento
            </Button>
            <Button
              onClick={exportarDatos}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Download className="w-5 h-5" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {mostrarAlmacenamiento && (
          <div className="mb-8">
            <EstadisticasAlmacenamiento 
              registros={registros} 
              empleados={empleados}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCards
            title="Total Registros"
            value={registrosFiltrados.length}
            icon={Calendar}
            gradient="from-blue-500 to-blue-600"
          />
          <StatsCards
            title="Horas Totales"
            value={`${totalHoras.toFixed(1)}h`}
            icon={Clock}
            gradient="from-teal-500 to-teal-600"
          />
          <StatsCards
            title="Empleados Activos"
            value={empleados.filter(e => e.activo).length}
            icon={Users}
            gradient="from-purple-500 to-purple-600"
          />
          <StatsCards
            title="Pendientes"
            value={registrosPendientes}
            icon={CheckCircle}
            gradient="from-amber-500 to-amber-600"
          />
        </div>

        <FiltrosAvanzados
          filtros={filtros}
          setFiltros={setFiltros}
          empleados={empleados}
          centros={centros}
        />

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <RegistrosTable
              registros={registrosFiltrados}
              isLoading={loadingRegistros}
              centros={centros}
              onEliminar={handleEliminar}
              onNotificar={handleEnviarNotificacion}
            />
          </div>
          <div>
            <GraficoSemanal registros={registrosFiltrados} />
          </div>
        </div>
      </div>

      {mostrarNotificacion && (
        <Dialog open={true} onOpenChange={() => setMostrarNotificacion(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar Notificación a {registroSeleccionado?.empleado_nombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Mensaje para el empleado</Label>
                <Textarea
                  value={mensajeNotificacion}
                  onChange={(e) => setMensajeNotificacion(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  className="mt-2 h-32"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMostrarNotificacion(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitNotificacion}
                  className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f]"
                  disabled={enviarNotificacionMutation.isPending}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}