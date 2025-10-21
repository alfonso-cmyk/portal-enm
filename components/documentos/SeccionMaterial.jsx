import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, Wrench } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const tipoIcons = {
  herramienta: Wrench,
  equipo_proteccion: Package,
  producto_limpieza: Package,
  otro: Package
};

const estadoColors = {
  nuevo: "bg-green-100 text-green-800",
  bueno: "bg-blue-100 text-blue-800",
  regular: "bg-amber-100 text-amber-800",
  mal_estado: "bg-red-100 text-red-800"
};

export default function SeccionMaterial({ materiales }) {
  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-6 h-6" />
          Mi Material
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {materiales.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">No hay material registrado</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {materiales.map((material) => {
              const Icon = tipoIcons[material.tipo] || Package;
              return (
                <div key={material.id} className="border-2 border-slate-200 rounded-xl p-5 hover:border-amber-500 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{material.descripcion}</h3>
                      <p className="text-sm text-slate-600 capitalize">
                        {material.tipo.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Cantidad:</span>
                      <span className="font-semibold">{material.cantidad}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(material.fecha_entrega), "dd MMM yyyy", { locale: es })}
                    </div>
                    <Badge className={`${estadoColors[material.estado]} w-full justify-center`}>
                      {material.estado.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}