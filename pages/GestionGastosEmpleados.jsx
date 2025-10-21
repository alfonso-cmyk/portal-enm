import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Eye, Trash2, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function GestionGastosEmpleados() {
  const [user, setUser] = useState(null);
  const [selectedGasto, setSelectedGasto] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroEmpleado, setFiltroEmpleado] = useState("todos");
  const [notasRechazo, setNotasRechazo] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: gastosEmpleados = [], isLoading } = useQuery({
    queryKey: ['gastos-empleados-admin'],
    queryFn: async () => {
      const gastos = await base44.entities.GastoEmpleado.list("-fecha");
      console.log('📦 Gastos de empleados cargados:', gastos);
      return gastos;
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
    initialData: [],
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10 * 60 * 1000,
    initialData: [],
  });

  // Mutation para aprobar gasto
  const aprobarGastoMutation = useMutation({
    mutationFn: async (gastoEmpleado) => {
      console.log('✅ Aprobando gasto:', gastoEmpleado);
      const fecha = new Date(gastoEmpleado.fecha);
      
      const gastoGeneral = await base44.entities.Gasto.create({
        concepto: `${gastoEmpleado.concepto} (Empleado: ${gastoEmpleado.empleado_nombre})`,
        categoria: "gasto_empleado",
        importe_sin_iva: parseFloat(gastoEmpleado.importe),
        iva_porcentaje: 0,
        iva_importe: 0,
        total: parseFloat(gastoEmpleado.importe),
        pagado_por: gastoEmpleado.empresa_imputada,
        imputado_a: gastoEmpleado.empresa_imputada,
        estado: "pendiente",
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
        fecha: gastoEmpleado.fecha,
        recurrente: false,
        archivo_justificante: gastoEmpleado.archivo_justificante || "",
        notas: `Gasto aprobado de empleado. ID original: ${gastoEmpleado.id}. ${gastoEmpleado.notas || ''}`.trim(),
        origen_gasto_empleado: gastoEmpleado.id
      });

      await base44.entities.GastoEmpleado.update(gastoEmpleado.id, {
        estado_reembolso: "reembolsar",
        notas: `${gastoEmpleado.notas || ''}\n[APROBADO - Ref: ${gastoGeneral.id}]`.trim()
      });

      return { gastoGeneral, gastoEmpleado };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos-empleados-admin'] });
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      alert('✅ Gasto aprobado y añadido a gastos generales');
      setSelectedGasto(null);
    },
    onError: (error) => {
      console.error('❌ Error al aprobar gasto:', error);
      alert('❌ Error al aprobar el gasto: ' + (error.message || 'Error desconocido'));
    }
  });

  const rechazarGastoMutation = useMutation({
    mutationFn: async ({ id, notas }) => {
      return base44.entities.GastoEmpleado.update(id, {
        estado_reembolso: "no_reembolsar",
        notas: `${notas}\n[RECHAZADO]`.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos-empleados-admin'] });
      alert('✅ Gasto rechazado');
      setSelectedGasto(null);
      setNotasRechazo("");
    },
  });

  const updateEstadoMutation = useMutation({
    mutationFn: async ({ id, nuevoEstado }) => {
      return base44.entities.GastoEmpleado.update(id, {
        estado_reembolso: nuevoEstado
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos-empleados-admin'] });
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
    },
  });

  const deleteGastoMutation = useMutation({
    mutationFn: (id) => base44.entities.GastoEmpleado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos-empleados-admin'] });
      alert('✅ Gasto eliminado');
    },
  });

  const handleAprobar = (gasto) => {
    if (confirm(`¿Aprobar el gasto de ${gasto.empleado_nombre} por ${parseFloat(gasto.importe).toFixed(2)}€?`)) {
      aprobarGastoMutation.mutate(gasto);
    }
  };

  const handleRechazar = (gasto) => {
    setSelectedGasto(gasto);
  };

  const handleConfirmarRechazo = () => {
    if (!notasRechazo.trim()) {
      alert('Por favor, añade un motivo del rechazo');
      return;
    }
    rechazarGastoMutation.mutate({
      id: selectedGasto.id,
      notas: `Motivo rechazo: ${notasRechazo}`
    });
  };

  const handleEliminar = (id) => {
    if (confirm('⚠️ ¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.')) {
      deleteGastoMutation.mutate(id);
    }
  };

  console.log('📊 Estado actual:', {
    totalGastos: gastosEmpleados.length,
    filtroEstado,
    filtroEmpleado,
    isLoading
  });

  const gastosFiltrados = gastosEmpleados.filter(g => {
    const matchEstado = filtroEstado === "todos" || g.estado_reembolso === filtroEstado;
    const matchEmpleado = filtroEmpleado === "todos" || g.empleado_id === filtroEmpleado;
    return matchEstado && matchEmpleado;
  });

  const gastosPendientes = gastosEmpleados.filter(g => g.estado_reembolso === "reembolsar").length;
  const gastosReembolsados = gastosEmpleados.filter(g => g.estado_reembolso === "reembolsado").length;
  const gastosRechazados = gastosEmpleados.filter(g => g.estado_reembolso === "no_reembolsar").length;

  const estadoColors = {
    reembolsar: "bg-orange-100 text-orange-800",
    reembolsado: "bg-green-100 text-green-800",
    no_reembolsar: "bg-red-100 text-red-800"
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
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]">Gastos de Empleados</h1>
          <p className="text-slate-600 mt-1">Gestiona los gastos subidos por los empleados</p>
        </div>

        {/* Resumen */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-orange-600">{gastosPendientes}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Reembolsados</p>
              <p className="text-3xl font-bold text-green-600">{gastosReembolsados}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Rechazados</p>
              <p className="text-3xl font-bold text-red-600">{gastosRechazados}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Estado</Label>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="reembolsar">Pendientes</SelectItem>
                    <SelectItem value="reembolsado">Reembolsados</SelectItem>
                    <SelectItem value="no_reembolsar">No reembolsar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Empleado</Label>
                <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {empleados.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Empleado</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Imputado a</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : gastosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        {gastosEmpleados.length === 0 ? 'No hay gastos de empleados' : 'No hay gastos que coincidan con los filtros'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    gastosFiltrados.map((gasto) => (
                      <TableRow key={gasto.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{gasto.empleado_nombre}</TableCell>
                        <TableCell>
                          <div>{gasto.concepto}</div>
                          {gasto.notas && (
                            <div className="text-xs text-slate-500 mt-1">{gasto.notas}</div>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(gasto.fecha), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-bold text-purple-600">
                          {parseFloat(gasto.importe).toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          <Badge className={gasto.empresa_imputada === "ENM" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                            {gasto.empresa_imputada}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={gasto.estado_reembolso}
                            onValueChange={(nuevoEstado) => {
                              if (nuevoEstado === gasto.estado_reembolso) return;
                              
                              if (nuevoEstado === "reembolsar" && gasto.estado_reembolso !== "reembolsar") {
                                handleAprobar(gasto);
                              } else {
                                updateEstadoMutation.mutate({ id: gasto.id, nuevoEstado });
                              }
                            }}
                            disabled={updateEstadoMutation.isPending}
                          >
                            <SelectTrigger className={`h-8 w-40 ${estadoColors[gasto.estado_reembolso]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="reembolsar">⏳ Pendiente</SelectItem>
                              <SelectItem value="reembolsado">✅ Reembolsado</SelectItem>
                              <SelectItem value="no_reembolsar">❌ No reembolsar</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {gasto.estado_reembolso === "reembolsar" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAprobar(gasto)}
                                  className="text-green-600"
                                  title="Aprobar y añadir a gastos generales"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRechazar(gasto)}
                                  className="text-red-600"
                                  title="Rechazar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {gasto.archivo_justificante && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(gasto.archivo_justificante, '_blank')}
                                title="Ver justificante"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminar(gasto.id)}
                              className="text-red-600"
                              title="Eliminar definitivamente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de rechazo */}
        {selectedGasto && (
          <Dialog open={true} onOpenChange={() => { setSelectedGasto(null); setNotasRechazo(""); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rechazar Gasto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Motivo del rechazo</Label>
                  <Textarea
                    value={notasRechazo}
                    onChange={(e) => setNotasRechazo(e.target.value)}
                    placeholder="Explica por qué se rechaza este gasto..."
                    className="mt-2 h-32"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setSelectedGasto(null); setNotasRechazo(""); }}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmarRechazo}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={rechazarGastoMutation.isPending}
                  >
                    Confirmar Rechazo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}