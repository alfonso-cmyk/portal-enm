
import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCircle, Clock, XCircle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const estadoColors = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_revision: "bg-blue-100 text-blue-800",
  aprobada: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800"
};

const estadoIcons = {
  pendiente: Clock,
  en_revision: Clock,
  aprobada: CheckCircle,
  rechazada: XCircle
};

export default function FormularioSolicitud({ user }) {
  const queryClient = useQueryClient();
  const [conversacionAbierta, setConversacionAbierta] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [formData, setFormData] = useState({
    tipo_solicitud: '',
    asunto: '',
    descripcion: ''
  });

  const { data: solicitudes = [] } = useQuery({
    queryKey: ['solicitudes', user.id],
    queryFn: () => base44.entities.Solicitud.filter({ empleado_id: user.id }, "-created_date"),
    initialData: [],
  });

  const { data: mensajes = [] } = useQuery({
    queryKey: ['mensajes-solicitud', conversacionAbierta?.id],
    queryFn: () => conversacionAbierta
      ? base44.entities.MensajeSolicitud.filter({
          solicitud_id: conversacionAbierta.id,
          tipo_solicitud: 'general'
        }, "fecha")
      : Promise.resolve([]),
    enabled: !!conversacionAbierta,
    initialData: [],
  });

  const { data: config = [] } = useQuery({
    queryKey: ['configuracion'],
    queryFn: () => base44.entities.ConfiguracionApp.list(),
    initialData: [],
  });

  const emailAdmin = config.find(c => c.clave === 'email_administracion')?.valor || '';

  const createSolicitudMutation = useMutation({
    mutationFn: async (data) => {
      const solicitud = await base44.entities.Solicitud.create({
        ...data,
        empleado_id: user.id,
        empleado_nombre: user.full_name,
        estado: 'pendiente'
      });

      // Crear mensaje inicial
      await base44.entities.MensajeSolicitud.create({
        solicitud_id: solicitud.id,
        tipo_solicitud: 'general',
        remitente_id: user.id,
        remitente_nombre: user.full_name,
        es_admin: false,
        mensaje: `Solicitud: ${data.asunto}\n\n${data.descripcion}`,
        fecha: new Date().toISOString()
      });

      // ✅ SOLO NOTIFICACIÓN (campanita) - SIN EMAIL
      // Email sending logic removed as per instructions.

      return solicitud;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
      queryClient.invalidateQueries({ queryKey: ['solicitudes-pendientes'] }); // Added this invalidation
      setFormData({ tipo_solicitud: '', asunto: '', descripcion: '' });
      alert('✅ Solicitud enviada correctamente');
    },
  });

  const enviarMensajeMutation = useMutation({
    mutationFn: async (mensaje) => {
      return base44.entities.MensajeSolicitud.create({
        solicitud_id: conversacionAbierta.id,
        tipo_solicitud: 'general',
        remitente_id: user.id,
        remitente_nombre: user.full_name,
        es_admin: false,
        mensaje: mensaje,
        fecha: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensajes-solicitud', conversacionAbierta?.id] });
      setNuevoMensaje("");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createSolicitudMutation.mutate(formData);
  };

  const handleEnviarMensaje = () => {
    if (!nuevoMensaje.trim()) return;
    enviarMensajeMutation.mutate(nuevoMensaje);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <Send className="w-6 h-6" />
            Nueva Solicitud
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Tipo de Solicitud *</Label>
              <Select
                value={formData.tipo_solicitud}
                onValueChange={(value) => setFormData({...formData, tipo_solicitud: value})}
                required
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacaciones">Solicitud de Vacaciones</SelectItem>
                  <SelectItem value="cambio_horario">Cambio de Horario</SelectItem>
                  <SelectItem value="material">Solicitud de Material</SelectItem>
                  <SelectItem value="uniforme">Solicitud de Uniforme</SelectItem>
                  <SelectItem value="permiso">Permiso Especial</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asunto *</Label>
              <Input
                value={formData.asunto}
                onChange={(e) => setFormData({...formData, asunto: e.target.value})}
                placeholder="Breve descripción del asunto"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label>Descripción Detallada *</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                placeholder="Describe tu solicitud con el mayor detalle posible..."
                className="mt-2 h-32"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={createSolicitudMutation.isPending}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 py-6 text-lg"
            >
              {createSolicitudMutation.isPending ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-xl">
          <CardTitle>Mis Solicitudes</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {solicitudes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600">No has realizado ninguna solicitud todavía</p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudes.map((solicitud) => {
                const Icon = estadoIcons[solicitud.estado];
                return (
                  <div key={solicitud.id} className="border-2 border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-slate-900">{solicitud.asunto}</h3>
                          <Badge className={estadoColors[solicitud.estado]}>
                            <Icon className="w-3 h-3 mr-1" />
                            {solicitud.estado.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 capitalize mb-2">
                          {solicitud.tipo_solicitud.replace(/_/g, ' ')}
                        </p>
                        <p className="text-slate-700">{solicitud.descripcion}</p>

                        <p className="text-xs text-slate-500 mt-3">
                          Enviada el {format(new Date(solicitud.created_date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                        </p>

                        {solicitud.respuesta && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-sm font-semibold text-slate-900 mb-1">Última respuesta:</p>
                            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{solicitud.respuesta}</p>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConversacionAbierta(solicitud)}
                        className="flex items-center gap-2 ml-4"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de conversación */}
      {conversacionAbierta && (
        <Dialog open={true} onOpenChange={() => setConversacionAbierta(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Conversación - {conversacionAbierta.asunto}
                <Badge className={`ml-3 ${estadoColors[conversacionAbierta.estado]}`}>
                  {conversacionAbierta.estado.replace(/_/g, ' ')}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Mensajes */}
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {mensajes.map((mensaje) => (
                  <div
                    key={mensaje.id}
                    className={`flex ${mensaje.es_admin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg p-4 ${
                        mensaje.es_admin
                          ? 'bg-slate-100 text-slate-900'
                          : 'bg-[#24c4ba] text-white'
                      }`}
                    >
                      <p className="text-sm font-semibold mb-1">{mensaje.remitente_nombre}</p>
                      <p className="text-sm whitespace-pre-wrap">{mensaje.mensaje}</p>
                      <p className="text-xs mt-2 opacity-70">
                        {format(new Date(mensaje.fecha), "dd MMM HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input de nuevo mensaje */}
              <div className="flex gap-2 pt-4 border-t">
                <Textarea
                  placeholder="Escribe tu mensaje..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  className="flex-1"
                  rows={3}
                />
                <Button
                  onClick={handleEnviarMensaje}
                  disabled={!nuevoMensaje.trim() || enviarMensajeMutation.isPending}
                  className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
