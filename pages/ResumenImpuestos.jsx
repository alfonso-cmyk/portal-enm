import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Edit, Trash2, Plus, Calendar, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TIPOS_IMPUESTO = [
  { value: "iva_303", label: "📊 IVA (Modelo 303)" },
  { value: "irpf_111", label: "💼 Retenciones IRPF (Modelo 111)" },
  { value: "alquiler_115", label: "🏢 Retención Alquiler (Modelo 115)" },
  { value: "pago_fraccionado_130", label: "📝 Pago Fraccionado IRPF (130)" },
  { value: "impuesto_sociedades_202", label: "🏦 Sociedades (Modelo 202)" },
  { value: "seguridad_social", label: "🏥 Seguridad Social" },
  { value: "autonomos_reta", label: "👤 Autónomos (RETA)" },
  { value: "mutua", label: "⚕️ Mutua" },
  { value: "otros", label: "📌 Otros" }
];

export default function ResumenImpuestos() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [impuestoEditar, setImpuestoEditar] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    anio: new Date().getFullYear(),
    trimestre: "Q1",
    tipo_impuesto: "iva_303",
    nombre_impuesto: "",
    importe_estimado: "",
    importe_real: "",
    fecha_estimacion: new Date().toISOString().split('T')[0],
    fecha_pago_real: "",
    es_real: false,
    notas: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: impuestos = [] } = useQuery({
    queryKey: ['impuestos'],
    queryFn: () => base44.entities.ImpuestoPagado.list(),
    initialData: [],
  });

  const createImpuestoMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        importe_estimado: parseFloat(data.importe_estimado) || 0,
        importe_real: data.importe_real ? parseFloat(data.importe_real) : null,
      };
      return base44.entities.ImpuestoPagado.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impuestos'] });
      setModalAbierto(false);
      resetForm();
      alert('✅ Impuesto creado correctamente');
    },
  });

  const updateImpuestoMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const payload = {
        ...data,
        importe_estimado: parseFloat(data.importe_estimado) || 0,
        importe_real: data.importe_real ? parseFloat(data.importe_real) : null,
      };
      return base44.entities.ImpuestoPagado.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impuestos'] });
      setModalAbierto(false);
      setImpuestoEditar(null);
      resetForm();
      alert('✅ Impuesto actualizado correctamente');
    },
  });

  const deleteImpuestoMutation = useMutation({
    mutationFn: (id) => base44.entities.ImpuestoPagado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impuestos'] });
      alert('✅ Impuesto eliminado correctamente');
    },
  });

  const resetForm = () => {
    setFormData({
      anio: new Date().getFullYear(),
      trimestre: "Q1",
      tipo_impuesto: "iva_303",
      nombre_impuesto: "",
      importe_estimado: "",
      importe_real: "",
      fecha_estimacion: new Date().toISOString().split('T')[0],
      fecha_pago_real: "",
      es_real: false,
      notas: ""
    });
  };

  const handleNuevoImpuesto = () => {
    setImpuestoEditar(null);
    resetForm();
    setModalAbierto(true);
  };

  const handleEditarImpuesto = (impuesto) => {
    setImpuestoEditar(impuesto);
    setFormData({
      anio: impuesto.anio,
      trimestre: impuesto.trimestre,
      tipo_impuesto: impuesto.tipo_impuesto,
      nombre_impuesto: impuesto.nombre_impuesto,
      importe_estimado: impuesto.importe_estimado?.toString() || "",
      importe_real: impuesto.importe_real?.toString() || "",
      fecha_estimacion: impuesto.fecha_estimacion || new Date().toISOString().split('T')[0],
      fecha_pago_real: impuesto.fecha_pago_real || "",
      es_real: impuesto.es_real || false,
      notas: impuesto.notas || ""
    });
    setModalAbierto(true);
  };

  const handleEliminarImpuesto = (id) => {
    if (confirm('¿Estás seguro de eliminar este impuesto?')) {
      deleteImpuestoMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (impuestoEditar) {
      updateImpuestoMutation.mutate({ id: impuestoEditar.id, data: formData });
    } else {
      createImpuestoMutation.mutate(formData);
    }
  };

  const impuestosFiltrados = impuestos.filter(i => i.anio === filtroAnio);

  const impuestosPorTrimestre = {
    'Q1': impuestosFiltrados.filter(i => i.trimestre === 'Q1'),
    'Q2': impuestosFiltrados.filter(i => i.trimestre === 'Q2'),
    'Q3': impuestosFiltrados.filter(i => i.trimestre === 'Q3'),
    'Q4': impuestosFiltrados.filter(i => i.trimestre === 'Q4'),
    'anual': impuestosFiltrados.filter(i => i.trimestre === 'anual'),
  };

  const totalEstimado = impuestosFiltrados.filter(i => !i.es_real).reduce((sum, i) => sum + (i.importe_estimado || 0), 0);
  const totalReal = impuestosFiltrados.filter(i => i.es_real).reduce((sum, i) => sum + (i.importe_real || 0), 0);
  const totalGeneral = totalReal + totalEstimado;

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
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]">Resumen de Impuestos</h1>
            <p className="text-slate-600 mt-1">Gestiona todos los impuestos estimados y reales</p>
          </div>
          <Button
            onClick={handleNuevoImpuesto}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Impuesto
          </Button>
        </div>

        {/* Filtro de año y resumen */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl">
              <CardTitle>Filtrar por Año</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Select value={String(filtroAnio)} onValueChange={(v) => setFiltroAnio(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <h3 className="text-sm text-purple-700 mb-2">Total Impuestos {filtroAnio}</h3>
              <p className="text-4xl font-bold text-purple-900 mb-3">{totalGeneral.toFixed(2)}€</p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-semibold">Estimado: {totalEstimado.toFixed(2)}€</span>
                </div>
                <div>
                  <span className="text-green-600 font-bold">Real: {totalReal.toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla por trimestres */}
        {Object.entries(impuestosPorTrimestre).map(([trimestre, impuestosTrimestre]) => {
          if (impuestosTrimestre.length === 0) return null;

          const trimestreLabels = {
            'Q1': '1º Trimestre (Enero-Marzo)',
            'Q2': '2º Trimestre (Abril-Junio)',
            'Q3': '3º Trimestre (Julio-Septiembre)',
            'Q4': '4º Trimestre (Octubre-Diciembre)',
            'anual': 'Impuestos Anuales'
          };

          return (
            <Card key={trimestre} className="shadow-lg border-0 mb-6">
              <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-xl">
                <CardTitle>{trimestreLabels[trimestre]}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Impuesto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Estimado</TableHead>
                        <TableHead className="text-right">Real</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {impuestosTrimestre.map((impuesto) => (
                        <TableRow key={impuesto.id} className="hover:bg-slate-50">
                          <TableCell>
                            <div>
                              <p className="font-semibold text-slate-900">{impuesto.nombre_impuesto}</p>
                              {impuesto.notas && (
                                <p className="text-xs text-slate-500 mt-1">{impuesto.notas}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {TIPOS_IMPUESTO.find(t => t.value === impuesto.tipo_impuesto)?.label || impuesto.tipo_impuesto}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-blue-700 font-semibold">
                              {(impuesto.importe_estimado || 0).toFixed(2)}€
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {impuesto.importe_real ? (
                              <span className="text-green-700 font-bold">
                                {impuesto.importe_real.toFixed(2)}€
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {impuesto.es_real ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Real
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Estimado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditarImpuesto(impuesto)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEliminarImpuesto(impuesto.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Modal */}
        {modalAbierto && (
          <Dialog open={true} onOpenChange={() => setModalAbierto(false)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {impuestoEditar ? 'Editar Impuesto' : 'Nuevo Impuesto'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Año *</Label>
                      <Input
                        type="number"
                        value={formData.anio}
                        onChange={(e) => setFormData({...formData, anio: parseInt(e.target.value)})}
                        required
                      />
                    </div>

                    <div>
                      <Label>Trimestre *</Label>
                      <Select value={formData.trimestre} onValueChange={(value) => setFormData({...formData, trimestre: value})} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q1">Q1 (Ene-Mar)</SelectItem>
                          <SelectItem value="Q2">Q2 (Abr-Jun)</SelectItem>
                          <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                          <SelectItem value="Q4">Q4 (Oct-Dic)</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Tipo de Impuesto *</Label>
                    <Select value={formData.tipo_impuesto} onValueChange={(value) => setFormData({...formData, tipo_impuesto: value})} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_IMPUESTO.map(tipo => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Nombre del Impuesto *</Label>
                    <Input
                      value={formData.nombre_impuesto}
                      onChange={(e) => setFormData({...formData, nombre_impuesto: e.target.value})}
                      placeholder="Ej: IVA 1T 2025"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Importe Estimado *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.importe_estimado}
                        onChange={(e) => setFormData({...formData, importe_estimado: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label>Importe Real</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.importe_real}
                        onChange={(e) => setFormData({...formData, importe_real: e.target.value})}
                        placeholder="Dejar vacío si aún no se conoce"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha Estimación</Label>
                      <Input
                        type="date"
                        value={formData.fecha_estimacion}
                        onChange={(e) => setFormData({...formData, fecha_estimacion: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>Fecha Pago Real</Label>
                      <Input
                        type="date"
                        value={formData.fecha_pago_real}
                        onChange={(e) => setFormData({...formData, fecha_pago_real: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.es_real}
                      onCheckedChange={(checked) => setFormData({...formData, es_real: checked})}
                      id="es-real-checkbox"
                    />
                    <Label htmlFor="es-real-checkbox">Marcar como importe real (ya pagado)</Label>
                  </div>

                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      placeholder="Notas adicionales..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setModalAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700"
                    disabled={createImpuestoMutation.isPending || updateImpuestoMutation.isPending}
                  >
                    {impuestoEditar ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}