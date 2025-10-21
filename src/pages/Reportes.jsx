import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

import FiltroReportes from "../components/reportes/FiltroReportes";
import GraficoHoras from "../components/reportes/GraficoHoras";
import TablaResumen from "../components/reportes/TablaResumen";

export default function Reportes() {
  const [user, setUser] = useState(null);
  const [tipoReporte, setTipoReporte] = useState("mensual");
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [fechaFin, setFechaFin] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: registros = [] } = useQuery({
    queryKey: ['registros'],
    queryFn: () => base44.entities.RegistroTrabajo.list("-fecha"),
    initialData: [],
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const registrosFiltrados = registros.filter(r => 
    r.fecha >= fechaInicio && r.fecha <= fechaFin
  );

  const generarPDF = () => {
    alert("Funcionalidad de exportar PDF en desarrollo");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Reportes</h1>
            <p className="text-slate-600 mt-1">Análisis y estadísticas detalladas</p>
          </div>
          <Button
            onClick={generarPDF}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-6 rounded-xl shadow-lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar PDF
          </Button>
        </div>

        <FiltroReportes
          tipoReporte={tipoReporte}
          setTipoReporte={setTipoReporte}
          fechaInicio={fechaInicio}
          setFechaInicio={setFechaInicio}
          fechaFin={fechaFin}
          setFechaFin={setFechaFin}
        />

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <GraficoHoras registros={registrosFiltrados} />
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Resumen del Período
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-slate-600">Total de Registros</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {registrosFiltrados.length}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-slate-600">Horas Totales</span>
                  <span className="text-2xl font-bold text-teal-600">
                    {registrosFiltrados.reduce((sum, r) => sum + (r.horas_trabajadas || 0), 0).toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Promedio por Día</span>
                  <span className="text-2xl font-bold text-blue-900">
                    {(registrosFiltrados.reduce((sum, r) => sum + (r.horas_trabajadas || 0), 0) / 
                      (registrosFiltrados.length || 1)).toFixed(1)}h
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <TablaResumen registros={registrosFiltrados} empleados={empleados} />
      </div>
    </div>
  );
}