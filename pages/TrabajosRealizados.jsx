
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ClipboardList, Filter, Download, Trash2, MessageSquare, Eye, Search, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TrabajosRealizados() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState({
    empleado: "todos",
    centro: "todos",
    profesion: "todos",
    fecha_inicio: "",
    fecha_fin: "",
    busqueda: ""
  });
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  const [mensajeNotificacion, setMensajeNotificacion] = useState('');
  const [mesDescarga, setMesDescarga] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros'],
    queryFn: () => base44.entities.RegistroTrabajo.list("-fecha"),
    initialData: [],
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: centros = [] } = useQuery({
    queryKey: ['centros'],
    queryFn: () => base44.entities.Centro.list(),
    initialData: [],
  });

  const deleteRegistroMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistroTrabajo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros'] });
      setRegistroSeleccionado(null);
      alert('Registro eliminado correctamente');
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

  const profesiones = ["limpieza", "jardineria", "piscinero", "socorrista", "mantenimiento", "otro"];

  const registrosFiltrados = registros.filter(registro => {
    const matchEmpleado = filtros.empleado === "todos" || registro.empleado_id === filtros.empleado;
    const matchCentro = filtros.centro === "todos" || registro.centro_id === filtros.centro;
    const matchProfesion = filtros.profesion === "todos" || registro.profesion === filtros.profesion;
    const matchFecha = (!filtros.fecha_inicio || registro.fecha >= filtros.fecha_inicio) &&
                       (!filtros.fecha_fin || registro.fecha <= filtros.fecha_fin);
    const matchBusqueda = !filtros.busqueda || 
      registro.empleado_nombre?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      registro.centro_nombre?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      registro.descripcion_trabajo?.toLowerCase().includes(filtros.busqueda.toLowerCase());
    
    return matchEmpleado && matchCentro && matchProfesion && matchFecha && matchBusqueda;
  });

  const exportarDatos = () => {
    const csvContent = [
      ['Empleado', 'Profesión', 'Centro', 'Ubicación', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Horas', 'Descripción'].join(','),
      ...registrosFiltrados.map(r => [
        r.empleado_nombre,
        r.profesion,
        r.centro_nombre,
        r.ubicacion || '',
        format(new Date(r.fecha), "dd/MM/yyyy"),
        r.hora_inicio,
        r.hora_fin,
        r.horas_trabajadas,
        r.descripcion_trabajo
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trabajos_realizados_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarMesCompleto = () => {
    const [anio, mes] = mesDescarga.split('-').map(Number);
    
    const registrosMes = registros.filter(r => {
      const fecha = new Date(r.fecha);
      return fecha.getFullYear() === anio && (fecha.getMonth() + 1) === mes;
    });

    if (registrosMes.length === 0) {
      alert('No hay trabajos realizados en ese mes');
      return;
    }

    // Crear CSV con enlaces a las fotos (no descargar las fotos)
    const csvContent = [
      ['Empleado', 'Profesión', 'Centro', 'Ubicación', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Horas', 'Descripción', 'Foto Antes (URL)', 'Foto Después (URL)'].join(','),
      ...registrosMes.map(r => [
        r.empleado_nombre,
        r.profesion,
        r.centro_nombre,
        r.ubicacion || '',
        format(new Date(r.fecha), "dd/MM/yyyy"),
        r.hora_inicio,
        r.hora_fin,
        r.horas_trabajadas,
        r.descripcion_trabajo,
        r.foto_antes || '',
        r.foto_despues || ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trabajos_${format(new Date(anio, mes - 1), "MMMM_yyyy", { locale: es })}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEliminar = (registro) => {
    if (confirm(`¿Estás seguro de eliminar el trabajo de ${registro.empleado_nombre} del ${format(new Date(registro.fecha), 'dd/MM/yyyy')}?`)) {
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

  const totalHoras = registrosFiltrados.reduce((sum, r) => sum + (r.horas_trabajadas || 0), 0);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] flex items-center gap-3">
              <ClipboardList className="w-10 h-10 text-[#24c4ba]" />
              Trabajos Realizados
            </h1>
            <p className="text-slate-600 mt-1">Panel completo de todos los trabajos registrados</p>
            <div className="flex gap-4 mt-2">
              <span className="text-sm font-medium text-slate-700">
                {registrosFiltrados.length} trabajos encontrados
              </span>
              <span className="text-sm font-medium text-[#24c4ba]">
                {totalHoras.toFixed(1)}h totales
              </span>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <Input
                type="month"
                value={mesDescarga}
                onChange={(e) => setMesDescarga(e.target.value)}
                className="w-40"
              />
              <Button
                onClick={exportarMesCompleto}
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Download className="w-5 h-5 mr-2" />
                Mes Completo
              </Button>
            </div>
            <Button
              onClick={exportarDatos}
              className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white px-6 py-6 rounded-xl shadow-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filtros Avanzados */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-sm text-slate-600 mb-2">Empleado</Label>
                <Select value={filtros.empleado} onValueChange={(value) => setFiltros({...filtros, empleado: value})}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Todos los empleados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los empleados</SelectItem>
                    {empleados.filter(e => e.role !== 'admin').map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-slate-600 mb-2">Centro / Ubicación</Label>
                <Select value={filtros.centro} onValueChange={(value) => setFiltros({...filtros, centro: value})}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Todos los centros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los centros</SelectItem>
                    {centros.map(centro => (
                      <SelectItem key={centro.id} value={centro.id}>{centro.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-slate-600 mb-2">Profesión</Label>
                <Select value={filtros.profesion} onValueChange={(value) => setFiltros({...filtros, profesion: value})}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Todas las profesiones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las profesiones</SelectItem>
                    {profesiones.map(prof => (
                      <SelectItem key={prof} value={prof}>{prof.charAt(0).toUpperCase() + prof.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-slate-600 mb-2">Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filtros.fecha_inicio}
                  onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
                  className="rounded-lg"
                />
              </div>

              <div>
                <Label className="text-sm text-slate-600 mb-2">Fecha Fin</Label>
                <Input
                  type="date"
                  value={filtros.fecha_fin}
                  onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
                  className="rounded-lg"
                />
              </div>

              <div>
                <Label className="text-sm text-slate-600 mb-2">Búsqueda Libre</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                    placeholder="Buscar..."
                    className="pl-10 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setFiltros({
                empleado: "todos",
                centro: "todos",
                profesion: "todos",
                fecha_inicio: "",
                fecha_fin: "",
                busqueda: ""
              })}
              className="w-full md:w-auto"
            >
              Limpiar Filtros
            </Button>
          </CardContent>
        </Card>

        {/* Tabla de Trabajos */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Empleado</TableHead>
                    <TableHead>Profesión</TableHead>
                    <TableHead>Centro</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba] mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : registrosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                        No se encontraron trabajos con los filtros aplicados
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrosFiltrados.map((registro) => {
                      const empleado = empleados.find(e => e.id === registro.empleado_id);
                      return (
                        <TableRow key={registro.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <Link to={createPageUrl("GestionEmpleados")} className="flex items-center gap-3 hover:text-[#24c4ba]">
                              <Avatar className="w-8 h-8 bg-gradient-to-br from-[#24c4ba] to-[#1ca89f]">
                                {empleado?.foto_perfil ? (
                                  <AvatarImage src={empleado.foto_perfil} />
                                ) : null}
                                <AvatarFallback className="bg-transparent text-white text-sm font-bold">
                                  {registro.empleado_nombre?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{registro.empleado_nombre}</span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {registro.profesion}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{registro.centro_nombre}</TableCell>
                          <TableCell className="text-sm text-slate-600">{registro.ubicacion || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{format(new Date(registro.fecha), "dd MMM yyyy", { locale: es })}</span>
                              <span className="text-xs text-slate-500">{registro.hora_inicio} - {registro.hora_fin}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-[#24c4ba] text-white">
                              {registro.horas_trabajadas?.toFixed(1)}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRegistroSeleccionado(registro)}
                                title="Ver detalles"
                                className="hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEnviarNotificacion(registro)}
                                className="hover:bg-purple-50 hover:text-purple-600"
                                title="Enviar notificación"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEliminar(registro)}
                                className="hover:bg-red-50 hover:text-red-600"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalles */}
      {registroSeleccionado && (
        <Dialog open={!!registroSeleccionado} onOpenChange={() => setRegistroSeleccionado(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del Trabajo Realizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Empleado</p>
                  <p className="font-semibold text-lg">{registroSeleccionado.empleado_nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Profesión</p>
                  <Badge variant="outline" className="capitalize text-base">
                    {registroSeleccionado.profesion}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Centro</p>
                  <p className="font-semibold">{registroSeleccionado.centro_nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Ubicación</p>
                  <p className="font-semibold">{registroSeleccionado.ubicacion || 'No especificada'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Fecha</p>
                  <p className="font-semibold">
                    {format(new Date(registroSeleccionado.fecha), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Horario</p>
                  <p className="font-semibold text-lg">
                    {registroSeleccionado.hora_inicio} - {registroSeleccionado.hora_fin}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Horas Trabajadas</p>
                  <Badge className="bg-[#24c4ba] text-white text-lg px-4 py-1">
                    {registroSeleccionado.horas_trabajadas?.toFixed(1)}h
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-slate-600 mb-2">Descripción del Trabajo</p>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-slate-900">{registroSeleccionado.descripcion_trabajo}</p>
                </div>
              </div>

              {(registroSeleccionado.foto_antes || registroSeleccionado.foto_despues) && (
                <div className="border-t pt-4">
                  <p className="text-sm text-slate-600 mb-3">Evidencias Fotográficas</p>
                  <div className="grid grid-cols-2 gap-4">
                    {registroSeleccionado.foto_antes && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Foto Antes</p>
                        <img 
                          src={registroSeleccionado.foto_antes} 
                          alt="Antes" 
                          className="w-full h-64 object-cover rounded-lg border-2 border-slate-200"
                        />
                      </div>
                    )}
                    {registroSeleccionado.foto_despues && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Foto Después</p>
                        <img 
                          src={registroSeleccionado.foto_despues} 
                          alt="Después" 
                          className="w-full h-64 object-cover rounded-lg border-2 border-slate-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Notificación */}
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
