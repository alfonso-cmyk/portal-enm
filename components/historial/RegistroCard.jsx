
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Clock, Eye, Image as ImageIcon, HardDrive } from "lucide-react"; // Added HardDrive
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function RegistroCard({ registro }) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const estadoColors = {
    pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
    aprobado: "bg-green-100 text-green-800 border-green-200",
    modificado: "bg-blue-100 text-blue-800 border-blue-200"
  };

  // New utility function for formatting bytes
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; // Added GB, TB for completeness
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate total space for photos, defaulting to 0 if sizes are not provided
  const espacioTotal = (registro.foto_antes_size || 0) + (registro.foto_despues_size || 0);

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {registro.centro_nombre}
                </h3>
                <p className="text-slate-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {registro.ubicacion}
                </p>
              </div>
              <Badge className={`${estadoColors[registro.estado]} border`}>
                {registro.estado}
              </Badge>
            </div>

            <p className="text-slate-700 mb-4 line-clamp-2">
              {registro.descripcion_trabajo}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(registro.fecha), "dd MMM yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-600">
                <Clock className="w-4 h-4" />
                <span>{registro.horas_trabajadas?.toFixed(1)}h trabajadas</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
              <span>{registro.hora_inicio} - {registro.hora_fin}</span>
            </div>

            {/* Display total file space if greater than 0 */}
            {espacioTotal > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">
                <HardDrive className="w-3 h-3" />
                <span>Archivos: {formatBytes(espacioTotal)}</span>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full rounded-lg"
              onClick={() => setModalAbierto(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalles
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Centro</p>
                <p className="font-semibold">{registro.centro_nombre}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Ubicación</p>
                <p className="font-semibold">{registro.ubicacion}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Fecha</p>
                <p className="font-semibold">
                  {format(new Date(registro.fecha), "dd MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Horario</p>
                <p className="font-semibold">
                  {registro.hora_inicio} - {registro.hora_fin} ({registro.horas_trabajadas?.toFixed(1)}h)
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-2">Descripción</p>
              <p className="bg-slate-50 p-4 rounded-lg">{registro.descripcion_trabajo}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {registro.foto_antes && (
                <div>
                  <p className="text-sm text-slate-600 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Foto Antes
                    {registro.foto_antes_size && ( // Conditionally display badge for size
                      <Badge variant="outline" className="text-xs">
                        {formatBytes(registro.foto_antes_size)}
                      </Badge>
                    )}
                  </p>
                  <img
                    src={registro.foto_antes}
                    alt="Antes"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}
              {registro.foto_despues && (
                <div>
                  <p className="text-sm text-slate-600 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Foto Después
                    {registro.foto_despues_size && ( // Conditionally display badge for size
                      <Badge variant="outline" className="text-xs">
                        {formatBytes(registro.foto_despues_size)}
                      </Badge>
                    )}
                  </p>
                  <img
                    src={registro.foto_despues}
                    alt="Después"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
