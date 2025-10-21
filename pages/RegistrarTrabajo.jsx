
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MapPin, Camera, CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import FormularioRegistro from "../components/registro/FormularioRegistro";
import PreviewFotos from "../components/registro/PreviewFotos";

export default function RegistrarTrabajo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [registroData, setRegistroData] = useState({
    centro_id: "",
    ubicacion: "",
    descripcion_trabajo: "",
    foto_antes: null,
    foto_despues: null,
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: new Date().toTimeString().slice(0, 5),
    hora_fin: "",
  });
  const [uploading, setUploading] = useState(false);
  const [ubicacionActual, setUbicacionActual] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();

    // Solicitar geolocalización de forma opcional
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUbicacionActual({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude
          });
        },
        () => {
          // No hacer nada si el usuario rechaza - la ubicación es opcional
          setUbicacionActual(null);
        }
      );
    }
  }, []);

  const { data: centros = [] } = useQuery({
    queryKey: ['centros'],
    queryFn: () => base44.entities.Centro.list(),
    initialData: [],
  });

  const centrosUsuario = centros.filter(c => 
    user?.centros_asignados?.includes(c.id)
  );

  const createRegistroMutation = useMutation({
    mutationFn: async (data) => {
      setUploading(true);
      
      let fotoAntesUrl = null;
      let fotoAntesSize = 0;
      let fotoDespuesUrl = null;
      let fotoDespuesSize = 0;

      if (data.foto_antes) {
        fotoAntesSize = data.foto_antes.size;
        const resultAntes = await base44.integrations.Core.UploadFile({ file: data.foto_antes });
        fotoAntesUrl = resultAntes.file_url;
      }

      if (data.foto_despues) {
        fotoDespuesSize = data.foto_despues.size;
        const resultDespues = await base44.integrations.Core.UploadFile({ file: data.foto_despues });
        fotoDespuesUrl = resultDespues.file_url;
      }

      const centroSeleccionado = centros.find(c => c.id === data.centro_id);
      
      const horaInicio = new Date(`2000-01-01T${data.hora_inicio}`);
      const horaFin = new Date(`2000-01-01T${data.hora_fin}`);
      const horasTrabajadas = (horaFin - horaInicio) / (1000 * 60 * 60);

      return base44.entities.RegistroTrabajo.create({
        empleado_id: user.id,
        empleado_nombre: user.full_name,
        profesion: user.profesion,
        centro_id: data.centro_id,
        centro_nombre: centroSeleccionado?.nombre || "",
        ubicacion: data.ubicacion,
        descripcion_trabajo: data.descripcion_trabajo,
        foto_antes: fotoAntesUrl,
        foto_antes_size: fotoAntesSize,
        foto_despues: fotoDespuesUrl,
        foto_despues_size: fotoDespuesSize,
        fecha: data.fecha,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        horas_trabajadas: horasTrabajadas,
        latitud: ubicacionActual?.latitud,
        longitud: ubicacionActual?.longitud,
        estado: "pendiente"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros'] });
      navigate(createPageUrl("HistorialEmpleado"));
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!registroData.foto_despues) {
      alert("La foto del después es obligatoria");
      return;
    }

    if (!registroData.hora_fin) {
      alert("Debes ingresar la hora de finalización");
      return;
    }

    createRegistroMutation.mutate(registroData);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    );
  }

  if (user.activo === false) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Card className="max-w-md shadow-xl border-2 border-red-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Cuenta Inactiva</h2>
            <p className="text-slate-600 mb-4">
              Tu cuenta de empleado ha sido desactivada. No puedes registrar trabajos en este momento.
            </p>
            <p className="text-sm text-slate-500">
              Por favor, contacta con el administrador para más información.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("HistorialEmpleado"))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Registrar Trabajo</h1>
            <p className="text-slate-600 mt-1">Completa los detalles de tu jornada</p>
          </div>
        </div>

        {ubicacionActual && (
          <Card className="mb-6 bg-gradient-to-r from-teal-50 to-teal-100 border-teal-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Ubicación detectada</p>
                <p className="text-sm text-slate-600">
                  {ubicacionActual.latitud.toFixed(6)}, {ubicacionActual.longitud.toFixed(6)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="shadow-xl border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-t-xl">
              <CardTitle className="text-xl">Información del Trabajo</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <FormularioRegistro
                registroData={registroData}
                setRegistroData={setRegistroData}
                centrosUsuario={centrosUsuario}
                user={user}
              />
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Camera className="w-5 h-5" />
                Evidencias Fotográficas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <PreviewFotos
                registroData={registroData}
                setRegistroData={setRegistroData}
              />
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={uploading || createRegistroMutation.isPending}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {uploading || createRegistroMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Guardando registro...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Guardar Registro
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
