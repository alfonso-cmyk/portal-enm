import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const tipoColors = {
  indefinido: "bg-green-100 text-green-800",
  temporal: "bg-blue-100 text-blue-800",
  practicas: "bg-purple-100 text-purple-800",
  formacion: "bg-amber-100 text-amber-800",
  otro: "bg-slate-100 text-slate-800"
};

export default function SeccionContratos({ contratos }) {
  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-6 h-6" />
          Mis Contratos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {contratos.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">No hay contratos disponibles</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contratos.map((contrato) => (
              <div key={contrato.id} className="border-2 border-slate-200 rounded-xl p-6 hover:border-teal-500 hover:shadow-lg transition-all duration-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-slate-900">
                          Contrato {contrato.tipo_contrato}
                        </h3>
                        <Badge className={tipoColors[contrato.tipo_contrato]}>
                          {contrato.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Inicio: {format(new Date(contrato.fecha_inicio), "dd MMM yyyy", { locale: es })}
                        </p>
                        {contrato.fecha_fin && (
                          <p className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Fin: {format(new Date(contrato.fecha_fin), "dd MMM yyyy", { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    className="bg-teal-600 hover:bg-teal-700 w-full md:w-auto"
                    onClick={() => window.open(contrato.archivo_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}