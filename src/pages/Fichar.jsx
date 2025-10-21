
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, MapPin, CheckCircle, AlertCircle, Calendar, RotateCcw, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";

const normalizeDay = (day) => {
  if (!day) return '';
  return day.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

// Función para calcular distancia entre dos puntos (fórmula de Haversine)
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distancia en metros
};

export default function Fichar() {
  const [user, setUser] = useState(null);
  const [ubicacionActual, setUbicacionActual] = useState(null);
  const [direccionActual, setDireccionActual] = useState(null);
  const [horaActual, setHoraActual] = useState(new Date());
  const [errorUbicacion, setErrorUbicacion] = useState(null);
  const [solicitandoUbicacion, setSolicitandoUbicacion] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();

    const interval = setInterval(() => {
      setHoraActual(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const solicitarUbicacion = () => {
    if (navigator.geolocation) {
      setSolicitandoUbicacion(true);
      setErrorUbicacion(null);
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude
          };
          setUbicacionActual(coords);
          setErrorUbicacion(null);
          setSolicitandoUbicacion(false);
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitud}&lon=${coords.longitud}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'ENM-Servicios-App'
                }
              }
            );
            const data = await response.json();
            if (data.display_name) {
              setDireccionActual(data.display_name);
            }
          } catch (error) {
            console.error('Error obteniendo dirección:', error);
          }
        },
        (error) => {
          setSolicitandoUbicacion(false);
          if (error.code === error.PERMISSION_DENIED) {
            setErrorUbicacion('⚠️ OBLIGATORIO: Debes permitir el acceso a tu ubicación para poder fichar. Ve a los ajustes de tu navegador y activa la ubicación.');
          } else {
            setErrorUbicacion('⚠️ No se pudo obtener tu ubicación. Por favor, asegúrate de tener el GPS activado e intenta de nuevo.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setErrorUbicacion('Tu dispositivo no soporta geolocalización.');
    }
  };

  useEffect(() => {
    solicitarUbicacion();
  }, []);

  const { data: horarios = [] } = useQuery({
    queryKey: ['horarios-empleado', user?.id],
    queryFn: () => base44.entities.HorarioSemanal.filter({ empleado_id: user.id }),
    enabled: !!user,
    initialData: [],
  });

  const { data: fichajesHoy = [] } = useQuery({
    queryKey: ['fichajes-hoy', user?.id],
    queryFn: () => base44.entities.Fichaje.filter({
      empleado_id: user.id,
      fecha: new Date().toISOString().split('T')[0]
    }),
    enabled: !!user,
    initialData: [],
  });

  const { data: centros = [] } = useQuery({
    queryKey: ['centros'],
    queryFn: () => base44.entities.Centro.list(),
    initialData: [],
  });

  const diaActualStr = format(horaActual, 'EEEE', { locale: es }).toLowerCase();
  const diaActualNormalizado = normalizeDay(diaActualStr);
  
  // Obtener horarios de hoy ordenados por hora
  const horariosHoy = horarios
    .filter(h => {
      const diaHorarioNormalizado = normalizeDay(h.dia_semana);
      return diaHorarioNormalizado === diaActualNormalizado && h.activo !== false;
    })
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  // Determine the relevant fichajes for the day
  // If multiple centers, fichajeEntrada is linked to the first schedule's center
  // and fichajeSalida is linked to the last schedule's center.
  // If single center, they are linked to that single center.
  const primerHorario = horariosHoy.length > 0 ? horariosHoy[0] : null;
  const ultimoHorario = horariosHoy.length > 0 ? horariosHoy[horariosHoy.length - 1] : null;

  const fichajeEntrada = fichajesHoy.find(f => f.tipo === 'entrada' && f.centro_id === primerHorario?.centro_id);
  const fichajeSalida = fichajesHoy.find(f => f.tipo === 'salida' && f.centro_id === ultimoHorario?.centro_id);

  const ficharMutation = useMutation({
    mutationFn: async ({ tipo, horario }) => {
      if (!ubicacionActual) {
        throw new Error('⚠️ UBICACIÓN OBLIGATORIA: Debes compartir tu ubicación para poder fichar');
      }

      const horaFichaje = format(horaActual, 'HH:mm');
      const horaProgramada = tipo === 'entrada' ? horario.hora_inicio : horario.hora_fin;
      
      const [horaP, minP] = horaProgramada.split(':').map(Number);
      const [horaF, minF] = horaFichaje.split(':').map(Number);
      const minutosProgra = horaP * 60 + minP;
      const minutosFichaje = horaF * 60 + minF;
      const diferencia = minutosFichaje - minutosProgra;

      let estado = 'puntual';
      if (diferencia > 2 && diferencia <= 15) estado = 'tarde';
      if (diferencia > 15) estado = 'muy_tarde';

      // Calcular distancia al centro de trabajo
      const centro = centros.find(c => c.id === horario.centro_id);
      let distanciaMetros = null;
      let fueraDeLimite = false;

      if (centro && centro.latitud && centro.longitud) {
        distanciaMetros = calcularDistancia(
          ubicacionActual.latitud,
          ubicacionActual.longitud,
          centro.latitud,
          centro.longitud
        );
        fueraDeLimite = distanciaMetros > 300;
      }

      // Si es entrada y llega tarde (más de 5 minutos), calcular nueva hora de salida para el ULTIMO horario
      let horaFinAjustada = ultimoHorario?.hora_fin;
      if (tipo === 'entrada' && diferencia > 5 && ultimoHorario) {
        const [horaFinH, horaFinM] = ultimoHorario.hora_fin.split(':').map(Number);
        const minutosFinOriginal = horaFinH * 60 + horaFinM;
        const nuevoMinutosFin = minutosFinOriginal + diferencia;
        const nuevaHoraFinH = Math.floor(nuevoMinutosFin / 60);
        const nuevaHoraFinM = nuevoMinutosFin % 60;
        horaFinAjustada = `${String(nuevaHoraFinH).padStart(2, '0')}:${String(nuevaHoraFinM).padStart(2, '0')}`;
      }

      const fichajeData = {
        empleado_id: user.id,
        empleado_nombre: user.full_name,
        fecha: new Date().toISOString().split('T')[0],
        tipo,
        hora: horaFichaje,
        hora_programada: horaProgramada,
        centro_id: horario.centro_id,
        centro_nombre: horario.centro_nombre,
        ubicacion: horario.ubicacion,
        latitud: ubicacionActual.latitud,
        longitud: ubicacionActual.longitud,
        direccion: direccionActual,
        estado,
        diferencia_minutos: diferencia,
        distancia_metros: distanciaMetros,
        fuera_de_limite: fueraDeLimite
      };

      // Guardar el fichaje
      const resultado = await base44.entities.Fichaje.create(fichajeData);

      // Si hay que ajustar el horario de salida del último horario, actualizarlo
      if (tipo === 'entrada' && diferencia > 5 && horaFinAjustada && ultimoHorario && horaFinAjustada !== ultimoHorario.hora_fin) {
        await base44.entities.HorarioSemanal.update(ultimoHorario.id, {
          ...ultimoHorario,
          hora_fin: horaFinAjustada,
          nota_ajuste: `Hora ajustada por llegar ${diferencia} minutos tarde`
        });
      }

      // Si está fuera del límite, enviar avisos
      if (fueraDeLimite) {
        try {
          // Aviso al empleado
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: '⚠️ Fichaje fuera de zona',
            body: `
              <h2>Hola ${user.full_name},</h2>
              <p>Has fichado tu ${tipo} a <strong>${Math.round(distanciaMetros)} metros</strong> del centro de trabajo.</p>
              <p><strong>Centro:</strong> ${horario.centro_nombre}</p>
              <p><strong>Hora:</strong> ${horaFichaje}</p>
              <p><strong>Tu ubicación:</strong> ${direccionActual || 'No disponible'}</p>
              <br>
              <p><em>Este aviso se ha enviado automáticamente porque estás a más de 300m del centro.</em></p>
            `
          });

          // Aviso a los administradores
          const admins = await base44.entities.User.filter({ role: 'admin' });
          for (const admin of admins) {
            await base44.integrations.Core.SendEmail({
              to: admin.email,
              subject: `⚠️ ${user.full_name} fichó fuera de zona`,
              body: `
                <h2>Fichaje fuera de límite</h2>
                <p><strong>Empleado:</strong> ${user.full_name}</p>
                <p><strong>Centro:</strong> ${horario.centro_nombre}</p>
                <p><strong>Distancia:</strong> ${Math.round(distanciaMetros)} metros (límite: 300m)</p>
                <p><strong>Tipo:</strong> ${tipo}</p>
                <p><strong>Hora:</strong> ${horaFichaje}</p>
                <p><strong>Ubicación:</strong> ${direccionActual || 'No disponible'}</p>
              `
            });
          }
        } catch (error) {
          console.error('Error enviando avisos de ubicación:', error);
        }
      }

      return { resultado, horaFinAjustada, fueraDeLimite, distanciaMetros };
    },
    onSuccess: ({ horaFinAjustada, fueraDeLimite, distanciaMetros }) => {
      queryClient.invalidateQueries({ queryKey: ['fichajes-hoy'] });
      queryClient.invalidateQueries({ queryKey: ['horarios-empleado'] });
      
      if (horaFinAjustada && horaFinAjustada !== ultimoHorario?.hora_fin) {
        alert(`⏰ Llegaste tarde, tu hora de salida se ha ajustado a: ${horaFinAjustada}`);
      }
      
      if (fueraDeLimite) {
        alert(`⚠️ AVISO: Has fichado a ${Math.round(distanciaMetros)}m del centro de trabajo (límite: 300m). Se ha enviado un aviso a los administradores.`);
      }
    },
    onError: (error) => {
      alert(error.message || 'Error al fichar');
    }
  });

  const eliminarFichajeSalidaMutation = useMutation({
    mutationFn: (fichajeId) => base44.entities.Fichaje.delete(fichajeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichajes-hoy'] });
    },
  });

  const handleReabrirTurno = () => {
    if (confirm('¿Eliminar el fichaje de salida para poder volver a fichar?')) {
      eliminarFichajeSalidaMutation.mutate(fichajeSalida.id);
    }
  };

  const handleFichar = (tipo, horario) => {
    if (!ubicacionActual) {
      alert('⚠️ UBICACIÓN OBLIGATORIA: Debes activar tu ubicación para poder fichar. Haz clic en "Activar Ubicación"');
      return;
    }
    ficharMutation.mutate({ tipo, horario });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba]" />
      </div>
    );
  }

  if (horariosHoy.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-0">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Sin horario hoy</h2>
              <p className="text-slate-600 mb-4">No tienes horario asignado para hoy. Disfruta tu día libre.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block"
          >
            <div className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white rounded-2xl p-8 shadow-2xl mb-6">
              <Clock className="w-16 h-16 mx-auto mb-4" />
              <p className="text-6xl font-bold mb-2">
                {format(horaActual, 'HH:mm:ss')}
              </p>
              <p className="text-xl opacity-90">
                {format(horaActual, "EEEE, d 'de' MMMM", { locale: es })}
              </p>
            </div>
          </motion.div>
        </div>

        {errorUbicacion && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>⚠️ Ubicación OBLIGATORIA:</strong> {errorUbicacion}
              <br />
              <Button 
                onClick={solicitarUbicacion}
                className="mt-3 bg-red-600 hover:bg-red-700"
                disabled={solicitandoUbicacion}
              >
                {solicitandoUbicacion ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Solicitando ubicación...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Activar Ubicación
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {ubicacionActual ? (
          <Card className="mb-6 bg-gradient-to-r from-teal-50 to-teal-100 border-teal-200">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#1a1a1a]">✅ Ubicación activada</p>
                <p className="text-sm text-slate-600 mt-1">
                  {direccionActual || `${ubicacionActual.latitud.toFixed(6)}, ${ubicacionActual.longitud.toFixed(6)}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>⚠️ OBLIGATORIO:</strong> Debes compartir tu ubicación para fichar.
              <br />
              <Button 
                onClick={solicitarUbicacion}
                className="mt-3 bg-red-600 hover:bg-red-700"
                disabled={solicitandoUbicacion}
              >
                {solicitandoUbicacion ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Solicitando ubicación...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Activar Ubicación
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {horariosHoy.length > 1 && primerHorario && ultimoHorario && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">
                      📍 Tienes {horariosHoy.length} centros hoy - Fichaje simplificado
                    </p>
                    <p className="text-sm text-blue-800">
                      • Solo debes fichar <strong>ENTRADA</strong> en: <span className="font-semibold">{primerHorario.centro_nombre}</span> a las {primerHorario.hora_inicio}
                      <br />
                      • Solo debes fichar <strong>SALIDA</strong> en: <span className="font-semibold">{ultimoHorario.centro_nombre}</span> a las {ultimoHorario.hora_fin}
                      <br />
                      • No necesitas fichar entre centros
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ENTRADA: Solo mostrar el primer horario o el único si es multi-centro o un solo centro */}
          {!fichajeEntrada && primerHorario && (
            <Card className="shadow-xl border-0 ring-2 ring-[#24c4ba]">
              <CardHeader className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white rounded-t-xl">
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">🟢 ENTRADA - {primerHorario.centro_nombre}</p>
                    {primerHorario.ubicacion && (
                      <p className="text-sm opacity-90 mt-1">{primerHorario.ubicacion}</p>
                    )}
                  </div>
                  <Badge className="bg-[#d4af37] text-[#1a1a1a] animate-pulse">
                    Fichar Entrada
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-1">Hora de Entrada</p>
                    <p className="text-5xl font-bold text-[#1a1a1a]">{primerHorario.hora_inicio}</p>
                  </div>
                </div>

                <Button
                  onClick={() => handleFichar('entrada', primerHorario)}
                  disabled={!!fichajeEntrada || ficharMutation.isPending || !ubicacionActual}
                  className="w-full py-8 text-xl font-semibold rounded-xl bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] hover:from-[#1ca89f] hover:to-[#149389]"
                >
                  <Clock className="w-6 h-6 mr-2" />
                  Fichar Entrada
                </Button>
              </CardContent>
            </Card>
          )}

          {/* SALIDA: Solo mostrar el último horario cuando ya fichó entrada */}
          {fichajeEntrada && !fichajeSalida && ultimoHorario && (
            <Card className="shadow-xl border-0 ring-2 ring-[#d4af37]">
              <CardHeader className="bg-gradient-to-r from-[#d4af37] to-[#c9a332] text-white rounded-t-xl">
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">🔴 SALIDA - {ultimoHorario.centro_nombre}</p>
                    {ultimoHorario.ubicacion && (
                      <p className="text-sm opacity-90 mt-1">{ultimoHorario.ubicacion}</p>
                    )}
                  </div>
                  <Badge className="bg-white text-[#d4af37] animate-pulse">
                    Fichar Salida
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {ultimoHorario.nota_ajuste && (
                  <Alert className="mb-4 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-900 text-sm">
                      {ultimoHorario.nota_ajuste}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-1">Hora de Salida</p>
                    <p className="text-5xl font-bold text-[#1a1a1a]">{ultimoHorario.hora_fin}</p>
                  </div>
                </div>

                <Button
                  onClick={() => handleFichar('salida', ultimoHorario)}
                  disabled={!!fichajeSalida || ficharMutation.isPending || !ubicacionActual}
                  className="w-full py-8 text-xl font-semibold rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c9a332] hover:from-[#c9a332] hover:to-[#b89829]"
                >
                  <Clock className="w-6 h-6 mr-2" />
                  Fichar Salida
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resumen cuando ya fichó todo */}
          {fichajeEntrada && fichajeSalida && (
            <Card className="shadow-xl border-0 bg-green-50">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-2xl font-bold text-green-900 mb-2">
                  ✅ Jornada Completada
                </h3>
                <div className="space-y-2">
                  <p className="text-green-800">
                    <strong>Entrada:</strong> {fichajeEntrada.hora} en {fichajeEntrada.centro_nombre}
                  </p>
                  <p className="text-green-800">
                    <strong>Salida:</strong> {fichajeSalida.hora} en {fichajeSalida.centro_nombre}
                  </p>
                </div>

                <Button
                  onClick={handleReabrirTurno}
                  variant="outline"
                  className="w-full mt-6 text-orange-600 border-orange-300 hover:bg-orange-50"
                  disabled={eliminarFichajeSalidaMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reabrir Turno (Eliminar Fichaje de Salida)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Alertas de problemas */}
          {fichajeEntrada && fichajeEntrada.estado !== 'puntual' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-orange-800">
                Fichaste con {Math.abs(fichajeEntrada.diferencia_minutos)} minutos de retraso
              </p>
            </div>
          )}

          {fichajeEntrada && fichajeEntrada.fuera_de_limite && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">
                ⚠️ Fichaste a {Math.round(fichajeEntrada.distancia_metros)}m del centro (límite: 300m)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
