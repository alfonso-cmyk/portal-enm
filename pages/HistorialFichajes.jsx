import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clock, Download, Filter, Search, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function HistorialFichajes() {
  const [user, setUser] = useState(null);
  const [filtros, setFiltros] = useState({
    empleado: "todos",
    fecha_inicio: "",
    fecha_fin: "",
    busqueda: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: fichajes = [], isLoading } = useQuery({
    queryKey: ['fichajes-todos'],
    queryFn: () => base44.entities.Fichaje.list("-fecha", 500),
    initialData: [],
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const fichajesFiltrados = fichajes.filter(f => {
    const matchEmpleado = filtros.empleado === "todos" || f.empleado_id === filtros.empleado;
    const matchFecha = (!filtros.fecha_inicio || f.fecha >= filtros.fecha_inicio) &&
                       (!filtros.fecha_fin || f.fecha <= filtros.fecha_fin);
    const matchBusqueda = !filtros.busqueda || 
      f.empleado_nombre?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      f.centro_nombre?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      f.direccion?.toLowerCase().includes(filtros.busqueda.toLowerCase());
    
    return matchEmpleado && matchFecha && matchBusqueda;
  });

  // Agrupar fichajes por empleado y fecha
  const fichajesAgrupados = {};
  fichajesFiltrados.forEach(f => {
    const key = `${f.empleado_id}-${f.fecha}`;
    if (!fichajesAgrupados[key]) {
      fichajesAgrupados[key] = {
        empleado_id: f.empleado_id,
        empleado_nombre: f.empleado_nombre,
        fecha: f.fecha,
        centro_nombre: f.centro_nombre,
        ubicacion: f.ubicacion,
        entrada: null,
        salida: null
      };
    }
    
    if (f.tipo === 'entrada') {
      fichajesAgrupados[key].entrada = f;
    } else {
      fichajesAgrupados[key].salida = f;
    }
  });

  const fichajesParaMostrar = Object.values(fichajesAgrupados).sort((a, b) => 
    b.fecha.localeCompare(a.fecha)
  );

  const exportarDatos = () => {
    const csvContent = [
      ['Empleado', 'Fecha', 'Día Semana', 'Centro', 'Ubicación', 'Entrada', 'Ubicación Entrada', 'Salida', 'Ubicación Salida'].join(','),
      ...fichajesParaMostrar.map(f => [
        f.empleado_nombre,
        format(new Date(f.fecha), 'dd/MM/yyyy'),
        format(new Date(f.fecha), 'EEEE', { locale: es }),
        f.centro_nombre || '',
        f.ubicacion || '',
        f.entrada?.hora || 'Sin fichar',
        f.entrada?.direccion || '',
        f.salida?.hora || 'Sin fichar',
        f.salida?.direccion || ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_fichajes_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] flex items-center gap-3">
              <Clock className="w-10 h-10 text-[#24c4ba]" />
              Historial de Fichajes
            </h1>
            <p className="text-slate-600 mt-1">Registro completo de entradas y salidas</p>
            <p className="text-sm font-medium text-[#24c4ba] mt-2">
              {fichajesParaMostrar.length} registros encontrados
            </p>
          </div>
          <Button
            onClick={exportarDatos}
            className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white px-6 py-6 rounded-xl shadow-lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                fecha_inicio: "",
                fecha_fin: "",
                busqueda: ""
              })}
              className="mt-4"
            >
              Limpiar Filtros
            </Button>
          </CardContent>
        </Card>

        {/* Tabla de Fichajes */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Centro</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Ubicación Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Ubicación Salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba] mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : fichajesParaMostrar.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                        No se encontraron fichajes con los filtros aplicados
                      </TableCell>
                    </TableRow>
                  ) : (
                    fichajesParaMostrar.map((fichaje, idx) => {
                      const empleado = empleados.find(e => e.id === fichaje.empleado_id);
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 bg-gradient-to-br from-[#24c4ba] to-[#1ca89f]">
                                {empleado?.foto_perfil ? (
                                  <AvatarImage src={empleado.foto_perfil} />
                                ) : null}
                                <AvatarFallback className="bg-transparent text-white text-sm font-bold">
                                  {fichaje.empleado_nombre?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{fichaje.empleado_nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{format(new Date(fichaje.fecha), "dd MMM yyyy", { locale: es })}</span>
                              <span className="text-xs text-slate-500 capitalize">{format(new Date(fichaje.fecha), "EEEE", { locale: es })}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{fichaje.centro_nombre}</span>
                              {fichaje.ubicacion && (
                                <span className="text-xs text-slate-500">{fichaje.ubicacion}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {fichaje.entrada ? (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800">
                                  {fichaje.entrada.hora}
                                </Badge>
                                {fichaje.entrada.estado !== 'puntual' && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    {fichaje.entrada.estado}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-slate-500">Sin fichar</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {fichaje.entrada?.direccion ? (
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-[#24c4ba] flex-shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-600 line-clamp-2">
                                  {fichaje.entrada.direccion}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {fichaje.salida ? (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-800">
                                  {fichaje.salida.hora}
                                </Badge>
                                {fichaje.salida.estado !== 'puntual' && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    {fichaje.salida.estado}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-slate-500">Sin fichar</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {fichaje.salida?.direccion ? (
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-[#24c4ba] flex-shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-600 line-clamp-2">
                                  {fichaje.salida.direccion}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
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
    </div>
  );
}