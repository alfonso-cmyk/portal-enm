import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Calendar, Clock, Image, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import FiltroFechas from "../components/historial/FiltroFechas";
import RegistroCard from "../components/historial/RegistroCard";
import ResumenHoras from "../components/historial/ResumenHoras";

export default function HistorialEmpleado() {
  const [user, setUser] = useState(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-empleado', user?.id],
    queryFn: () => base44.entities.RegistroTrabajo.filter({ empleado_id: user.id }, "-fecha"),
    enabled: !!user,
    initialData: [],
  });

  const registrosFiltrados = registros.filter(r => {
    const matchInicio = !fechaInicio || r.fecha >= fechaInicio;
    const matchFin = !fechaFin || r.fecha <= fechaFin;
    return matchInicio && matchFin;
  });

  const totalHoras = registrosFiltrados.reduce((sum, r) => sum + (r.horas_trabajadas || 0), 0);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (user.activo === false) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Card className="max-w-md shadow-xl border-2 border-red-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Cuenta Inactiva</h2>
            <p className="text-slate-600 mb-4">
              Tu cuenta de empleado ha sido desactivada. No puedes acceder a tu historial en este momento.
            </p>
            <p className="text-sm text-slate-500">
              Por favor, contacta con el administrador para más información.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Mi Historial</h1>
            <p className="text-slate-600 mt-1">Todos tus registros de trabajo</p>
          </div>
          <Link to={createPageUrl("RegistrarTrabajo")}>
            <Button className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-6 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Registro
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <ResumenHoras totalHoras={totalHoras} registros={registrosFiltrados} />
        </div>

        <FiltroFechas
          fechaInicio={fechaInicio}
          setFechaInicio={setFechaInicio}
          fechaFin={fechaFin}
          setFechaFin={setFechaFin}
        />

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <Card className="shadow-lg border-0">
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No hay registros
                </h3>
                <p className="text-slate-600 mb-6">
                  Comienza registrando tu primer trabajo del día
                </p>
                <Link to={createPageUrl("RegistrarTrabajo")}>
                  <Button className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primer Registro
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            registrosFiltrados.map((registro) => (
              <RegistroCard key={registro.id} registro={registro} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}