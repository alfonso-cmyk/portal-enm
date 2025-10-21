import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const estadoColors = {
  nuevo: "bg-green-100 text-green-800",
  bueno: "bg-blue-100 text-blue-800",
  desgastado: "bg-amber-100 text-amber-800",
  reemplazo_necesario: "bg-red-100 text-red-800"
};

export default function SeccionUniformes({ uniformes }) {
  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-6 h-6" />
          Mis Uniformes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {uniformes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">No hay uniformes registrados</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniformes.map((uniforme) => (
              <div key={uniforme.id} className="border-2 border-slate-200 rounded-xl p-4 hover:border-green-500 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{uniforme.tipo}</h3>
                    {uniforme.talla && (
                      <p className="text-sm text-slate-600">Talla: {uniforme.talla}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Cantidad:</span>
                    <span className="font-semibold">{uniforme.cantidad}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(uniforme.fecha_entrega), "dd MMM yyyy", { locale: es })}
                  </div>
                  <Badge className={`${estadoColors[uniforme.estado]} w-full justify-center`}>
                    {uniforme.estado.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}