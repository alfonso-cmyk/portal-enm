import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

export default function FiltroFechas({ fechaInicio, setFechaInicio, fechaFin, setFechaFin }) {
  return (
    <Card className="shadow-lg border-0 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-lg text-slate-900">Filtrar por Fechas</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-slate-600 mb-2">Desde</Label>
            <Input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-2">Hasta</Label>
            <Input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="rounded-lg"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}