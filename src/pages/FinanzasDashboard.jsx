import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Users as UsersIcon, 
  FileText,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function FinanzasDashboard() {
  const [user, setUser] = useState(null);
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();

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

  const ingresosMesActual = ingresos.filter(i => i.mes === mesActual && i.anio === anioActual);
  const gastosMesActual = gastos.filter(g => g.mes === mesActual && g.anio === anioActual);
  const gastosEmpleadosMes = gastosEmpleados.filter(g => g.mes === mesActual && g.anio === anioActual);

  const totalIngresos = ingresosMesActual.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalGastos = gastosMesActual.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalGastosEmpleados = gastosEmpleadosMes.reduce((sum, g) => sum + (g.importe || 0), 0);
  const gastosTotales = totalGastos + totalGastosEmpleados;
  const resultadoNeto = totalIngresos - gastosTotales;

  const ivaDevengado = ingresosMesActual.reduce((sum, i) => sum + (i.iva_importe || 0), 0);
  const ivaSoportado = gastosMesActual.reduce((sum, g) => sum + (g.iva_importe || 0), 0);
  const ivaAPagar = ivaDevengado - ivaSoportado;

  // Separar contadores: gastos de empresa vs gastos de empleados
  const gastosEmpresaPendientes = gastos.filter(g => 
    g.estado === 'pendiente' || g.estado === 'reembolsar'
  ).length;
  
  const gastosEmpleadosPendientes = gastosEmpleados.filter(g => 
    g.estado === 'pendiente'
  ).length;

  const totalPagosPendientes = gastosEmpresaPendientes + gastosEmpleadosPendientes;

  const opciones = [
    {
      title: "Ingresos",
      description: "Gestionar facturas y clientes",
      url: "GestionIngresos",
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      valor: `${totalIngresos.toFixed(2)}€`
    },
    {
      title: "Gastos",
      description: "Controlar gastos de empresa",
      url: "GestionGastos",
      icon: TrendingDown,
      color: "from-red-500 to-red-600",
      valor: `${totalGastos.toFixed(2)}€`,
      badge: gastosEmpresaPendientes > 0 ? `${gastosEmpresaPendientes} pendientes` : null
    },
    {
      title: "Gastos de Empleados",
      description: "Reembolsos y dietas",
      url: "GestionGastosEmpleados",
      icon: UsersIcon,
      color: "from-orange-500 to-orange-600",
      valor: `${totalGastosEmpleados.toFixed(2)}€`,
      badge: gastosEmpleadosPendientes > 0 ? `${gastosEmpleadosPendientes} pendientes` : null
    },
    {
      title: "Resumen Financiero",
      description: "Análisis y proyecciones",
      url: "ResumenFinanciero",
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      valor: `${resultadoNeto.toFixed(2)}€`
    }
  ];

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a1a] mb-2">Acceso Restringido</h2>
          <p className="text-sm md:text-base text-slate-600">Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-[#1a1a1a] mb-2">Gestión Financiera</h1>
          <p className="text-sm md:text-base text-slate-600">Control completo de ingresos, gastos y proyecciones</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
                <Badge className="bg-green-100 text-green-800 text-xs">Mes actual</Badge>
              </div>
              <p className="text-xs md:text-sm text-slate-600 mb-1">Ingresos Totales</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">{totalIngresos.toFixed(2)}€</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                <Badge className="bg-red-100 text-red-800 text-xs">Mes actual</Badge>
              </div>
              <p className="text-xs md:text-sm text-slate-600 mb-1">Gastos Totales</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600">{gastosTotales.toFixed(2)}€</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                {resultadoNeto >= 0 ? (
                  <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 md:w-10 md:h-10 text-orange-600" />
                )}
                <Badge className={resultadoNeto >= 0 ? "bg-blue-100 text-blue-800 text-xs" : "bg-orange-100 text-orange-800 text-xs"}>
                  Resultado
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-slate-600 mb-1">Neto del Mes</p>
              <p className={`text-2xl md:text-3xl font-bold ${resultadoNeto >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {resultadoNeto.toFixed(2)}€
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
                <Badge className={ivaAPagar >= 0 ? "bg-purple-100 text-purple-800 text-xs" : "bg-green-100 text-green-800 text-xs"}>
                  IVA
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-slate-600 mb-1">{ivaAPagar >= 0 ? 'IVA a Pagar' : 'IVA a Devolver'}</p>
              <p className={`text-2xl md:text-3xl font-bold ${ivaAPagar >= 0 ? 'text-purple-600' : 'text-green-600'}`}>
                {Math.abs(ivaAPagar).toFixed(2)}€
              </p>
            </CardContent>
          </Card>
        </div>

        {totalPagosPendientes > 0 && (
          <Card className="mb-6 md:mb-8 border-orange-200 bg-orange-50 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-orange-900 text-sm md:text-base mb-1">Pagos Pendientes</h3>
                  <div className="text-xs md:text-sm text-orange-800 space-y-1">
                    {gastosEmpresaPendientes > 0 && (
                      <p>• <strong>{gastosEmpresaPendientes}</strong> gasto(s) de empresa pendiente(s) en <Link to={createPageUrl("GestionGastos")} className="underline font-semibold">Gastos</Link></p>
                    )}
                    {gastosEmpleadosPendientes > 0 && (
                      <p>• <strong>{gastosEmpleadosPendientes}</strong> gasto(s) de empleados pendiente(s) en <Link to={createPageUrl("GestionGastosEmpleados")} className="underline font-semibold">Gastos de Empleados</Link></p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {opciones.map((opcion, index) => (
            <Link key={index} to={createPageUrl(opcion.url)} className="block">
              <Card className="shadow-xl border-0 hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-r ${opcion.color} p-6 md:p-8 text-white relative overflow-hidden`}>
                    <div className="flex items-start justify-between mb-4">
                      <opcion.icon className="w-12 h-12 md:w-16 md:h-16" />
                      {opcion.badge && (
                        <Badge className="bg-white/20 text-white text-xs">
                          {opcion.badge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2">{opcion.title}</h3>
                    <p className="text-sm md:text-base opacity-90 mb-3">{opcion.description}</p>
                    <p className="text-2xl md:text-3xl font-bold">{opcion.valor}</p>
                    <ArrowRight className="absolute bottom-4 right-4 w-6 h-6 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}