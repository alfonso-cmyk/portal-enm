import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FormularioRegistro({ registroData, setRegistroData, centrosUsuario, user }) {
  const centroSeleccionado = centrosUsuario.find(c => c.id === registroData.centro_id);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label className="text-slate-700 font-medium">Nombre</Label>
          <Input
            value={user?.full_name || ''}
            disabled
            className="mt-2 bg-slate-50 rounded-lg"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Profesión</Label>
          <Input
            value={user?.profesion || ''}
            disabled
            className="mt-2 bg-slate-50 rounded-lg"
          />
        </div>
      </div>

      <div>
        <Label className="text-slate-700 font-medium">Centro de Trabajo *</Label>
        <Select
          value={registroData.centro_id}
          onValueChange={(value) => setRegistroData({...registroData, centro_id: value, ubicacion: ''})}
        >
          <SelectTrigger className="mt-2 rounded-lg">
            <SelectValue placeholder="Selecciona un centro" />
          </SelectTrigger>
          <SelectContent>
            {centrosUsuario.map(centro => (
              <SelectItem key={centro.id} value={centro.id}>
                {centro.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {centroSeleccionado && (
        <>
          <div>
            <Label className="text-slate-700 font-medium">Dirección</Label>
            <Input
              value={centroSeleccionado.direccion}
              disabled
              className="mt-2 bg-slate-50 rounded-lg"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-medium">Ubicación Específica *</Label>
            <Select
              value={registroData.ubicacion}
              onValueChange={(value) => setRegistroData({...registroData, ubicacion: value})}
            >
              <SelectTrigger className="mt-2 rounded-lg">
                <SelectValue placeholder="Selecciona una ubicación" />
              </SelectTrigger>
              <SelectContent>
                {centroSeleccionado.ubicaciones?.map((ubi, index) => (
                  <SelectItem key={index} value={ubi}>
                    {ubi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div>
        <Label className="text-slate-700 font-medium">Descripción del Trabajo *</Label>
        <Textarea
          value={registroData.descripcion_trabajo}
          onChange={(e) => setRegistroData({...registroData, descripcion_trabajo: e.target.value})}
          placeholder="Describe el trabajo realizado..."
          className="mt-2 rounded-lg h-24"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <Label className="text-slate-700 font-medium">Fecha *</Label>
          <Input
            type="date"
            value={registroData.fecha}
            onChange={(e) => setRegistroData({...registroData, fecha: e.target.value})}
            className="mt-2 rounded-lg"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Hora Inicio *</Label>
          <Input
            type="time"
            value={registroData.hora_inicio}
            onChange={(e) => setRegistroData({...registroData, hora_inicio: e.target.value})}
            className="mt-2 rounded-lg"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Hora Fin *</Label>
          <Input
            type="time"
            value={registroData.hora_fin}
            onChange={(e) => setRegistroData({...registroData, hora_fin: e.target.value})}
            className="mt-2 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}