import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, TrendingUp, TrendingDown, DollarSign, AlertCircle, Download, Loader2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function ResumenFinanciero() {
  const [user, setUser] = useState(null);
  const [filtros, setFiltros] = useState({
    anio: new Date().getFullYear(),
    mes: "anual"
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: ingresos = [] } = useQuery({
    queryKey: ['ingresos'],
    queryFn: () => base44.entities.Ingreso.list(),
    initialData: [],
  });

  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list(),
    initialData: [],
  });

  const { data: gastosEmpleados = [] } = useQuery({
    queryKey: ['gastos-empleados'],
    queryFn: () => base44.entities.GastoEmpleado.list(),
    initialData: [],
  });

  const { data: impuestos = [] } = useQuery({
    queryKey: ['impuestos'],
    queryFn: () => base44.entities.ImpuestoPagado.list(),
    initialData: [],
  });

  const queryClient = useQueryClient();
  const calcularImpuestosMutation = useMutation({
    mutationFn: async (anio) => {
      const response = await base44.functions.invoke('calcularImpuestosAutomaticos', { anio });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impuestos'] });
      alert('✅ Impuestos actualizados automáticamente');
    },
    onError: (error) => {
      console.error("Error al calcular impuestos:", error);
      alert('❌ Error al calcular impuestos. Consulta la consola para más detalles.');
    }
  });

  // Filtrar por año y mes
  const ingresosFiltrados = ingresos.filter(i => {
    const matchAnio = i.anio === filtros.anio;
    const matchMes = filtros.mes === "anual" || i.mes === parseInt(filtros.mes);
    return matchAnio && matchMes;
  });

  const gastosFiltrados = gastos.filter(g => {
    const matchAnio = g.anio === filtros.anio;
    const matchMes = filtros.mes === "anual" || g.mes === parseInt(filtros.mes);
    return matchAnio && matchMes;
  });

  const gastosEmpleadosFiltrados = gastosEmpleados.filter(g => {
    const matchAnio = g.anio === filtros.anio;
    const matchMes = filtros.mes === "anual" || g.mes === parseInt(filtros.mes);
    return matchAnio && matchMes;
  });

  // Cálculos generales
  const totalIngresos = ingresosFiltrados.reduce((sum, i) => sum + (i.total || 0), 0);
  const baseIngresos = ingresosFiltrados.reduce((sum, i) => sum + (i.importe_sin_iva || 0), 0);
  const ivaDevengado = ingresosFiltrados.reduce((sum, i) => sum + (i.iva_importe || 0), 0);

  const totalGastos = gastosFiltrados.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalGastosEmpleados = gastosEmpleadosFiltrados.filter(g => g.estado === "reembolsado").reduce((sum, g) => sum + (g.importe || 0), 0);
  const gastosTotales = totalGastos + totalGastosEmpleados;

  const ivaSoportado = gastosFiltrados.reduce((sum, g) => sum + (g.iva_importe || 0), 0);
  const ivaAPagar = ivaDevengado - ivaSoportado;

  const resultadoNeto = totalIngresos - gastosTotales;

  // 📊 CÁLCULO PRECISO DE IMPUESTOS DE NÓMINAS
  const nominas = gastosFiltrados.filter(g => g.categoria === 'nomina');
  
  let totalSalarioBruto = 0;
  let totalCotizacionEmpresa = 0;
  let totalCotizacionTrabajador = 0;
  let totalRetencionesIRPF = 0;
  let totalNetoEmpleados = 0;
  let totalCosteEmpresaNominas = 0;

  nominas.forEach(nomina => {
    const neto = nomina.neto_empleado || 0;
    const coste_empresa = nomina.coste_empresa || 0;
    
    // Calcular el salario bruto a partir del coste empresa
    const salarioBruto = coste_empresa / 1.31;
    const cotizacionEmpresa = salarioBruto * 0.31;
    const cotizacionTrabajador = salarioBruto * 0.0635;
    const irpf = salarioBruto - cotizacionTrabajador - neto;
    
    totalSalarioBruto += salarioBruto;
    totalCotizacionEmpresa += cotizacionEmpresa;
    totalCotizacionTrabajador += cotizacionTrabajador;
    totalRetencionesIRPF += irpf;
    totalNetoEmpleados += neto;
    totalCosteEmpresaNominas += coste_empresa;
  });

  // Impuestos y cotizaciones QUE PAGA LA EMPRESA
  const impuestosCalculados = {
    iva_303: ivaAPagar > 0 ? ivaAPagar : 0,
    seguridad_social: totalCotizacionEmpresa,
    autonomos: gastosFiltrados.filter(g => g.categoria === 'autonomos_reta').reduce((sum, g) => sum + g.total, 0),
    otros: gastosFiltrados.filter(g => 
      ['iva_303', 'alquiler_115', 'pago_fraccionado_130', 'impuesto_sociedades_202', 'mutua', 'seguridad_social'].includes(g.categoria)
    ).reduce((sum, g) => sum + g.total, 0)
  };

  const totalImpuestos = Object.values(impuestosCalculados).reduce((sum, val) => sum + val, 0);

  // IRPF retenido
  const retencionesGestionadas = {
    irpf_111: totalRetencionesIRPF,
  };

  // Datos para gráfico mensual
  const datosMensuales = Array.from({length: 12}, (_, i) => {
    const mes = i + 1;
    const ingresosM = ingresos.filter(ing => ing.anio === filtros.anio && ing.mes === mes).reduce((sum, i) => sum + i.total, 0);
    const gastosM = gastos.filter(g => g.anio === filtros.anio && g.mes === mes).reduce((sum, g) => sum + g.total, 0);
    const gastosEmpM = gastosEmpleados.filter(g => g.anio === filtros.anio && g.mes === mes && g.estado === "reembolsado").reduce((sum, g) => sum + g.importe, 0);
    
    return {
      mes: format(new Date(2000, i, 1), 'MMM', { locale: es }),
      ingresos: ingresosM,
      gastos: gastosM + gastosEmpM,
      beneficio: ingresosM - (gastosM + gastosEmpM)
    };
  });

  // Organizar impuestos por mes de presentación
  const impuestosPorMes = {
    'Enero': impuestos.filter(i => 
      (i.trimestre === 'Q4' && i.anio === filtros.anio - 1) || 
      (i.tipo_impuesto === 'iva_303' && i.trimestre === 'anual' && i.anio === filtros.anio - 1) ||
      (['irpf_190', 'alquiler_180', 'iva_390'].includes(i.tipo_impuesto) && i.anio === filtros.anio - 1)
    ),
    'Febrero': impuestos.filter(i => i.tipo_impuesto === 'otros' && i.nombre_impuesto?.includes('347') && i.anio === filtros.anio),
    'Abril': impuestos.filter(i => (i.trimestre === 'Q1' && i.anio === filtros.anio) || (i.tipo_impuesto === 'pago_fraccionado_130' && i.nombre_impuesto?.includes('Abril'))),
    'Julio': [
      ...impuestos.filter(i => i.trimestre === 'Q2' && i.anio === filtros.anio),
      ...impuestos.filter(i => i.tipo_impuesto === 'impuesto_sociedades_202' && i.trimestre === 'anual' && i.anio === filtros.anio - 1)
    ],
    'Octubre': impuestos.filter(i => (i.trimestre === 'Q3' && i.anio === filtros.anio) || (i.tipo_impuesto === 'pago_fraccionado_130' && i.nombre_impuesto?.includes('Octubre'))),
    'Diciembre': impuestos.filter(i => 
      i.tipo_impuesto === 'pago_fraccionado_130' && 
      i.nombre_impuesto?.includes('Diciembre') && 
      i.anio === filtros.anio
    ),
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
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]">Resumen Financiero</h1>
            <p className="text-slate-600 mt-1">Análisis completo de ingresos, gastos e impuestos</p>
          </div>
          <Button
            onClick={() => calcularImpuestosMutation.mutate(filtros.anio)}
            disabled={calcularImpuestosMutation.isPending}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700"
          >
            {calcularImpuestosMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                🔄 Actualizar Impuestos {filtros.anio}
              </>
            )}
          </Button>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-0 mb-8">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Año</Label>
                <Select value={String(filtros.anio)} onValueChange={(v) => setFiltros({...filtros, anio: parseInt(v)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Período</Label>
                <Select value={filtros.mes} onValueChange={(v) => setFiltros({...filtros, mes: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anual">Anual</SelectItem>
                    {Array.from({length: 12}, (_, i) => (
                      <SelectItem key={i+1} value={String(i+1)}>
                        {format(new Date(2000, i, 1), 'MMMM', { locale: es })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Principal */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-xs text-slate-600">Ingresos</p>
                  <p className="text-2xl font-bold text-green-600">{totalIngresos.toFixed(2)}€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-xs text-slate-600">Gastos Totales</p>
                  <p className="text-2xl font-bold text-red-600">{gastosTotales.toFixed(2)}€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-xs text-slate-600">Resultado Neto</p>
                  <p className={`text-2xl font-bold ${resultadoNeto >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {resultadoNeto.toFixed(2)}€
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-xs text-slate-600">Impuestos</p>
                  <p className="text-2xl font-bold text-purple-600">{totalImpuestos.toFixed(2)}€</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desglose de Impuestos y Cotizaciones */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-xl">
            <CardTitle>📊 Impuestos y Cotizaciones de la Empresa</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {nominas.length > 0 && (
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>💡 Cálculo automático:</strong> Basado en {nominas.length} nómina(s).
                  <div className="mt-2 text-xs">
                    <div>• Salario bruto total: <strong>{totalSalarioBruto.toFixed(2)}€</strong></div>
                    <div>• Cotización empresa (31%): <strong>{totalCotizacionEmpresa.toFixed(2)}€</strong></div>
                    <div>• Cotización trabajador (6.35%): <strong>{totalCotizacionTrabajador.toFixed(2)}€</strong></div>
                    <div>• Retenciones IRPF: <strong>{totalRetencionesIRPF.toFixed(2)}€</strong></div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-lg mb-4 text-slate-900">IVA</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">IVA Devengado (ventas)</span>
                    <Badge className="bg-green-100 text-green-800">+{ivaDevengado.toFixed(2)}€</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">IVA Soportado (gastos)</span>
                    <Badge className="bg-red-100 text-red-800">-{ivaSoportado.toFixed(2)}€</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-100 rounded-lg border-2 border-purple-300">
                    <span className="font-bold text-slate-900">📊 Modelo 303 (IVA a pagar)</span>
                    <Badge className="bg-purple-600 text-white text-base">
                      {impuestosCalculados.iva_303.toFixed(2)}€
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4 text-slate-900">Seguridad Social</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">Salario Bruto Total</span>
                    <Badge className="bg-slate-200 text-slate-800">{totalSalarioBruto.toFixed(2)}€</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">Neto Empleados</span>
                    <Badge className="bg-blue-100 text-blue-800">{totalNetoEmpleados.toFixed(2)}€</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg border-2 border-orange-300">
                    <span className="font-bold text-slate-900">🏥 Cotización Empresa (31%)</span>
                    <Badge className="bg-orange-600 text-white text-base">
                      {impuestosCalculados.seguridad_social.toFixed(2)}€
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4 text-slate-900">Autónomos y Otros</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">👤 RETA (Autónomos)</span>
                    <Badge className="bg-slate-200 text-slate-800">{impuestosCalculados.autonomos.toFixed(2)}€</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">📋 Otros impuestos</span>
                    <Badge className="bg-slate-200 text-slate-800">{impuestosCalculados.otros.toFixed(2)}€</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-300">
                <h3 className="font-bold text-xl mb-4 text-purple-900">💰 Total Impuestos a Pagar</h3>
                <p className="text-4xl font-bold text-purple-700">{totalImpuestos.toFixed(2)}€</p>
                <p className="text-sm text-purple-600 mt-2">
                  IVA + Cotización empresa (31%) + RETA + Otros
                </p>
              </div>
            </div>

            {/* Retenciones Gestionadas */}
            {nominas.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>📋 Retenciones Gestionadas (no son gasto de la empresa):</strong>
                    <div className="mt-3 bg-white p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900">💼 Modelo 111 (IRPF retenido a empleados)</span>
                          <p className="text-xs text-slate-600 mt-1">Este dinero ya estaba descontado del salario del trabajador. La empresa solo lo ingresa a Hacienda.</p>
                        </div>
                        <Badge className="bg-amber-600 text-white text-lg">
                          {retencionesGestionadas.irpf_111.toFixed(2)}€
                        </Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendario de Impuestos */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              📅 Calendario Fiscal {filtros.anio}
              <Badge className="bg-white/20 text-white ml-auto">Actualizado automáticamente</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {Object.entries(impuestosPorMes).map(([mes, impuestosMes]) => {
              if (impuestosMes.length === 0) return null;
              
              const totalEstimado = impuestosMes.filter(i => !i.es_real).reduce((sum, i) => sum + (i.importe_estimado || 0), 0);
              const totalReal = impuestosMes.filter(i => i.es_real).reduce((sum, i) => sum + (i.importe_real || 0), 0);
              
              return (
                <div key={mes} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900">{mes}</h3>
                    <div className="flex gap-4 text-sm">
                      {totalEstimado > 0 && (
                        <span className="text-blue-600 font-semibold">
                          Estimado: {totalEstimado.toFixed(2)}€
                        </span>
                      )}
                      {totalReal > 0 && (
                        <span className="text-green-600 font-bold">
                          Real: {totalReal.toFixed(2)}€
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {impuestosMes.map(impuesto => (
                      <div 
                        key={impuesto.id}
                        className={`p-4 rounded-lg border-2 ${
                          impuesto.es_real 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-900">{impuesto.nombre_impuesto}</p>
                              <Badge className={impuesto.es_real ? 'bg-green-600' : 'bg-blue-600'}>
                                {impuesto.es_real ? '✓ Real' : '~ Estimado'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600 mb-2">{impuesto.notas}</p>
                            <div className="flex items-center gap-4">
                              {!impuesto.es_real && (
                                <span className="text-blue-700 font-bold text-lg">
                                  {(impuesto.importe_estimado || 0).toFixed(2)}€
                                </span>
                              )}
                              {impuesto.es_real && (
                                <>
                                  <span className="text-green-700 font-bold text-lg">
                                    {(impuesto.importe_real || 0).toFixed(2)}€
                                  </span>
                                  {impuesto.importe_estimado && (
                                    <span className="text-xs text-slate-500">
                                      (estimado: {impuesto.importe_estimado.toFixed(2)}€)
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          
                          <Link to={createPageUrl("ResumenImpuestos")}>
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Gráfico Anual */}
        {filtros.mes === "anual" && (
          <Card className="shadow-lg border-0 mb-8">
            <CardHeader>
              <CardTitle>Evolución Anual {filtros.anio}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={datosMensuales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                  <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
                  <Bar dataKey="beneficio" fill="#3b82f6" name="Beneficio" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Desglose de Gastos */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Desglose de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-700">💰 Nóminas ({nominas.length})</span>
                <span className="font-bold text-slate-900">{totalCosteEmpresaNominas.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-700">📦 Gastos Empresa</span>
                <span className="font-bold text-slate-900">{(totalGastos - totalCosteEmpresaNominas).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-700">👥 Reembolsos Empleados</span>
                <span className="font-bold text-slate-900">{totalGastosEmpleados.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-100 to-red-200 rounded-lg border-2 border-red-300">
                <span className="font-bold text-slate-900">TOTAL GASTOS</span>
                <span className="text-2xl font-bold text-red-700">{gastosTotales.toFixed(2)}€</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}