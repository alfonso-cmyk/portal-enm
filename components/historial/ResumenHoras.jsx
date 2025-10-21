import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp } from "lucide-react";

export default function ResumenHoras({ totalHoras, registros }) {
  return (
    <>
      <Card className="shadow-lg border-0 bg-gradient-to-br from-teal-500 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm mb-1">Horas Totales</p>
              <p className="text-4xl font-bold">{totalHoras.toFixed(1)}h</p>
            </div>
            <Clock className="w-12 h-12 text-teal-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-900 to-blue-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm mb-1">Registros</p>
              <p className="text-4xl font-bold">{registros.length}</p>
            </div>
            <Calendar className="w-12 h-12 text-blue-300" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-600 to-purple-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm mb-1">Promedio/Día</p>
              <p className="text-4xl font-bold">
                {(totalHoras / (registros.length || 1)).toFixed(1)}h
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-300" />
          </div>
        </CardContent>
      </Card>
    </>
  );
}