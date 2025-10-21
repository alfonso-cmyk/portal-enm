import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Plus, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import FormularioSolicitudVacaciones from "../components/vacaciones/FormularioSolicitudVacaciones";
import ListaSolicitudesVacaciones from "../components/vacaciones/ListaSolicitudesVacaciones";
import CalendarioVacaciones from "../components/vacaciones/CalendarioVacaciones";

export default function MisVacaciones() {
  const [user, setUser] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  const { data: vacacionesInfo = [], isLoading: loadingVacaciones } = useQuery({
    queryKey: ['vacaciones-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const result = await base44.entities.Vacacion.filter({ 
        empleado_id: user.id,
        anio: new Date().getFullYear()
      });
      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    initialData: [],
  });

  const { data: solicitudes = [], isLoading: loadingSolicitudes } = useQuery({
    queryKey: ['mis-solicitudes-vacaciones', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const result = await base44.entities.SolicitudVacaciones.filter({ 
        empleado_id: user.id 
      }, "-created_date");
      return result;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    initialData: [],
  });

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba] mx-auto mb-4" />
          <p className="text-slate-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600">Error al cargar usuario</p>
        </div>
      </div>
    );
  }

  const vacacionActual = vacacionesInfo[0];
  const diasDisponibles = vacacionActual?.dias_pendientes || 0;
  const diasTotales = vacacionActual?.dias_totales || 0;
  const diasUsados = vacacionActual?.dias_usados || 0;
  const porcentajeUsado = diasTotales > 0 ? (diasUsados / diasTotales) * 100 : 0;

  const solicitudesAprobadas = solicitudes.filter(s => s.estado === 'aprobada');
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]">Mis Vacaciones</h1>
            <p className="text-slate-600 mt-1">Gestiona tus días de descanso</p>
          </div>
          {!mostrarFormulario && (
            <Button
              onClick={() => setMostrarFormulario(true)}
              disabled={diasDisponibles === 0}
              className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] hover:from-[#1ca89f] hover:to-[#149389] text-white px-6 py-6 rounded-xl shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Solicitar Vacaciones
            </Button>
          )}
        </div>

        {solicitudesPendientes > 0 && (
          <Card className="mb-6 border-2 border-[#d4af37] bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-[#d4af37]" />
              <div>
                <p className="font-bold text-[#1a1a1a]">
                  Tienes {solicitudesPendientes} solicitud{solicitudesPendientes !== 1 ? 'es' : ''} pendiente{solicitudesPendientes !== 1 ? 's' : ''} de aprobación
                </p>
                <p className="text-sm text-slate-600">El administrador revisará tu solicitud pronto</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-600 to-purple-700 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CalendarIcon className="w-7 h-7" />
              Mis Vacaciones {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingVacaciones ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                    <p className="text-purple-100 text-sm mb-2">Días Totales</p>
                    <p className="text-5xl font-bold">{diasTotales}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                    <p className="text-purple-100 text-sm mb-2">Días Usados</p>
                    <p className="text-5xl font-bold">{diasUsados}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                    <p className="text-purple-100 text-sm mb-2">Días Disponibles</p>
                    <p className="text-5xl font-bold text-[#d4af37]">{diasDisponibles}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progreso de uso</span>
                    <span>{porcentajeUsado.toFixed(0)}%</span>
                  </div>
                  <Progress value={porcentajeUsado} className="h-3 bg-white/20" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {mostrarFormulario && (
          <FormularioSolicitudVacaciones
            user={user}
            diasDisponibles={diasDisponibles}
            onClose={() => setMostrarFormulario(false)}
            solicitudesAprobadas={solicitudesAprobadas}
          />
        )}

        {!mostrarFormulario && !loadingSolicitudes && solicitudesAprobadas.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Calendario de Vacaciones Aprobadas</h2>
            <CalendarioVacaciones solicitudes={solicitudesAprobadas} />
          </div>
        )}

        {loadingSolicitudes ? (
          <Card className="shadow-xl border-0">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba] mx-auto mb-4" />
              <p className="text-slate-600">Cargando solicitudes...</p>
            </CardContent>
          </Card>
        ) : (
          <ListaSolicitudesVacaciones user={user} solicitudes={solicitudes} />
        )}
      </div>
    </div>
  );
}