import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SeccionNominas({ nominas }) {
  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Mis Nóminas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {nominas.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600">No hay nóminas disponibles</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nominas.map((nomina) => (
              <div key={nomina.id} className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {format(new Date(nomina.mes + "-01"), "MMMM yyyy", { locale: es })}
                      </p>
                      {nomina.importe_neto && (
                        <p className="text-2xl font-bold text-teal-600">
                          {nomina.importe_neto.toFixed(2)}€
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {nomina.notas && (
                  <p className="text-sm text-slate-600 mb-3">{nomina.notas}</p>
                )}
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.open(nomina.archivo_url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}