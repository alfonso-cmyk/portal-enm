import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Phone, Edit, Trash2, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

const servicioColors = {
  limpieza: "bg-blue-100 text-blue-800",
  conserjeria: "bg-green-100 text-green-800",
  jardineria: "bg-emerald-100 text-emerald-800",
  piscina_con_socorrista: "bg-cyan-100 text-cyan-800",
  piscina_sin_socorrista: "bg-sky-100 text-sky-800",
  mantenimiento: "bg-amber-100 text-amber-800"
};

const servicioLabels = {
  limpieza: "Limpieza",
  conserjeria: "Conserjería",
  jardineria: "Jardinería",
  piscina_con_socorrista: "Piscina con Socorrista",
  piscina_sin_socorrista: "Piscina sin Socorrista",
  mantenimiento: "Mantenimiento"
};

export default function CentroCard({ centro, onEditar, onEliminar }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">{centro.nombre}</h3>
                {centro.activo ? (
                  <Badge className="bg-green-100 text-green-800 mt-1">Activo</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-800 mt-1">Inactivo</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditar(centro)}
                className="text-slate-600 hover:text-blue-900"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEliminar(centro.id)}
                className="text-slate-600 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{centro.direccion}</span>
            </div>

            {centro.telefono && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4" />
                <span>{centro.telefono}</span>
              </div>
            )}

            {centro.servicios && centro.servicios.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-600">Servicios:</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {centro.servicios.map((servicio, index) => (
                    <Badge 
                      key={index} 
                      className={`${servicioColors[servicio]} border-0 text-xs`}
                    >
                      {servicioLabels[servicio]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {centro.ubicaciones && centro.ubicaciones.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-slate-600 mb-2">Ubicaciones:</p>
                <div className="flex flex-wrap gap-2">
                  {centro.ubicaciones.map((ubi, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {ubi}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}