import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function SeccionVacaciones({ vacaciones, userId }) {
  const vacacionActual = vacaciones.find(v => v.anio === new Date().getFullYear());
  const diasPendientes = vacacionActual?.dias_pendientes || 0;
  const diasTotales = vacacionActual?.dias_totales || 0;
  const diasUsados = vacacionActual?.dias_usados || 0;
  const porcentajeUsado = diasTotales > 0 ? (diasUsados / diasTotales) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-600 to-purple-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="w-7 h-7" />
            Mis Vacaciones {new Date().getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <p className="text-5xl font-bold text-yellow-300">{diasPendientes}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progreso de uso</span>
              <span>{porcentajeUsado.toFixed(0)}%</span>
            </div>
            <Progress value={porcentajeUsado} className="h-3 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {vacaciones.length > 1 && (
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Historial de Años Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {vacaciones
                .filter(v => v.anio < new Date().getFullYear())
                .sort((a, b) => b.anio - a.anio)
                .map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-bold text-slate-900">Año {v.anio}</p>
                      <p className="text-sm text-slate-600">
                        {v.dias_usados} de {v.dias_totales} días utilizados
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">
                        {v.dias_pendientes}
                      </p>
                      <p className="text-xs text-slate-500">días pendientes</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}