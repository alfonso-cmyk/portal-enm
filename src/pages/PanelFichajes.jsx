import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clock, AlertCircle, CheckCircle, Circle, XCircle, Filter, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

const normalizeDay = (day) => {
  if (!day) return '';
  const normalized = day.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  
  // Mapear variaciones
  const dayMap = {
    'lunes': 'lunes',
    'martes': 'martes',
    'miercoles': 'miercoles',
    'miércoles': 'miercoles',
    'jueves': 'jueves',
    'viernes': 'viernes',
    'sabado': 'sabado',
    'sábado': 'sabado',
    'domingo': 'domingo',
    'monday': 'lunes',
    'tuesday': 'martes',
    'wednesday': 'miercoles',
    'thursday': 'jueves',
    'friday': 'viernes',
    'saturday': 'sabado',
    'sunday': 'domingo'
  };
  
  return dayMap[normalized] || normalized;
};

const estadoColors = {
  verde: "bg-green-500",
  naranja: "bg-orange-500",
  rojo: "bg-red-500",
  azul: "bg-blue-500"
};

const estadoIcons = {
  verde: CheckCircle,
  naranja: AlertCircle,
  rojo: XCircle,
  azul: Circle
};

const estadoTextos = {
  verde: "Fichado correctamente",
  naranja: "Fichaje con problemas",
  rojo: "Sin fichar (debería estar trabajando)",
  azul: "Fuera de horario"
};

export default function PanelFichajes() {
  const [user, setUser] = useState(null);
  const [filtroEmpleado, setFiltroEmpleado] = useState("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");
  const [horaActual, setHoraActual] = useState(new Date());

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();

    // Actualizar hora cada minuto
    const interval = setInterval(() => {
      setHoraActual(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 10 * 60 * 1000,
    initialData: [],
  });

  const { data: centros = [] } = useQuery({
    queryKey: ['centros'],
    queryFn: () => base44.entities.Centro.list(),
    staleTime: 10 * 60 * 1000,
    initialData: [],
  });

  const { data: horarios = [] } = useQuery({
    queryKey: ['horarios'],
    queryFn: () => base44.entities.HorarioSemanal.list(),
    staleTime: 5 * 60 * 1000,
    initialData: [],
  });

  const { data: fichajesHoy = [] } = useQuery({
    queryKey: ['fichajes-hoy'],
    queryFn: () => base44.entities.Fichaje.filter({
      fecha: new Date().toISOString().split('T')[0]
    }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    initialData: [],
  });

  // Calcular día actual normalizado
  const diaActualStr = format(horaActual, 'EEEE', { locale: es });
  const diaActualNormalizado = normalizeDay(diaActualStr);

  console.log('🔍 DEBUG Panel de Fichajes:', {
    diaActualStr,
    diaActualNormalizado,
    horaActual: format(horaActual, 'HH:mm'),
    totalHorarios: horarios.length,
    horariosActivos: horarios.filter(h => h.activo !== false).length
  });

  const getEstadoEmpleado = useMemo(() => {
    return (empleado) => {
      // Filtrar horarios de este empleado para hoy
      const horariosHoy = horarios.filter(h => {
        const diaHorarioNormalizado = normalizeDay(h.dia_semana);
        const match = h.empleado_id === empleado.id && 
                      diaHorarioNormalizado === diaActualNormalizado &&
                      h.activo !== false;
        
        if (h.empleado_id === empleado.id) {
          console.log(`👤 ${empleado.full_name}:`, {
            dia_horario: h.dia_semana,
            normalizado: diaHorarioNormalizado,
            match,
            activo: h.activo
          });
        }
        
        return match;
      });

      // Si no tiene horarios hoy, está fuera de horario
      if (horariosHoy.length === 0) {
        return {
          color: 'azul',
          mensaje: 'Sin horario hoy',
          fichajes: []
        };
      }

      // Obtener fichajes del empleado hoy
      const fichajesEmpleado = fichajesHoy.filter(f => f.empleado_id === empleado.id);
      const fichajeEntrada = fichajesEmpleado.find(f => f.tipo === 'entrada');
      const fichajeSalida = fichajesEmpleado.find(f => f.tipo === 'salida');

      // Verificar si debería estar trabajando ahora
      const horaActualStr = format(horaActual, 'HH:mm');
      const deberiaEstarTrabajando = horariosHoy.some(h => {
        return horaActualStr >= h.hora_inicio && horaActualStr <= h.hora_fin;
      });

      // Si debería estar trabajando pero no ha fichado entrada
      if (deberiaEstarTrabajando && !fichajeEntrada) {
        return {
          color: 'rojo',
          mensaje: 'Sin fichar entrada (debería estar trabajando)',
          fichajes: []
        };
      }

      // Calcular horas totales programadas hoy
      const horasTotalesProgramadas = horariosHoy.reduce((sum, h) => sum + (h.horas_dia || 0), 0);

      // Si hay fichaje de entrada y salida, analizar la jornada
      if (fichajeEntrada && fichajeSalida) {
        const [horaE, minE] = fichajeEntrada.hora.split(':').map(Number);
        const [horaS, minS] = fichajeSalida.hora.split(':').map(Number);
        const minutosEntrada = horaE * 60 + minE;
        const minutosSalida = horaS * 60 + minS;
        const minutosReales = minutosSalida - minutosEntrada;
        const horasReales = minutosReales / 60;

        // Detectar anomalías
        if (minutosReales <= 5) {
          return {
            color: 'rojo',
            mensaje: `ANÓMALO: Fichó entrada y salida casi al mismo tiempo (${minutosReales}min)`,
            fichajes: fichajesEmpleado
          };
        }

        if (horasReales < 0.5 && horasTotalesProgramadas > 2) {
          return {
            color: 'rojo',
            mensaje: `ANÓMALO: Solo trabajó ${minutosReales}min de ${horasTotalesProgramadas.toFixed(1)}h programadas`,
            fichajes: fichajesEmpleado
          };
        }

        if (horasReales < horasTotalesProgramadas * 0.25) {
          return {
            color: 'rojo',
            mensaje: `Jornada muy incompleta: ${horasReales.toFixed(1)}h de ${horasTotalesProgramadas.toFixed(1)}h`,
            fichajes: fichajesEmpleado
          };
        }

        let esProblematico = false;
        let mensajeProblema = '';

        if (horasReales < horasTotalesProgramadas * 0.8) {
          esProblematico = true;
          mensajeProblema = `Jornada incompleta: ${horasReales.toFixed(1)}h de ${horasTotalesProgramadas.toFixed(1)}h`;
        }

        if (fichajeEntrada.diferencia_minutos && fichajeEntrada.diferencia_minutos > 60) {
          esProblematico = true;
          const retrasoMin = Math.abs(fichajeEntrada.diferencia_minutos);
          mensajeProblema = mensajeProblema ? `${mensajeProblema} | Entrada ${retrasoMin}min tarde` : `Entrada ${retrasoMin}min tarde`;
        } else if (fichajeEntrada.estado === 'tarde' || fichajeEntrada.estado === 'muy_tarde') {
          esProblematico = true;
          const retrasoMin = Math.abs(fichajeEntrada.diferencia_minutos || 0);
          mensajeProblema = mensajeProblema ? `${mensajeProblema} | Entrada ${retrasoMin}min tarde` : `Entrada ${retrasoMin}min tarde`;
        }

        if (fichajeSalida.diferencia_minutos && fichajeSalida.diferencia_minutos < -60) {
          esProblematico = true;
          const anticipoMin = Math.abs(fichajeSalida.diferencia_minutos);
          mensajeProblema = mensajeProblema ? `${mensajeProblema} | Salida ${anticipoMin}min antes` : `Salida ${anticipoMin}min antes`;
        }

        if (esProblematico) {
          return {
            color: 'naranja',
            mensaje: mensajeProblema,
            fichajes: fichajesEmpleado
          };
        }

        return {
          color: 'verde',
          mensaje: 'Jornada completada correctamente',
          fichajes: fichajesEmpleado
        };
      }

      // Si fichó entrada pero no salida
      if (fichajeEntrada && !fichajeSalida) {
        const horarioTerminado = horariosHoy.every(h => horaActualStr > h.hora_fin);
        
        if (horarioTerminado) {
          return {
            color: 'naranja',
            mensaje: 'Falta fichar salida',
            fichajes: fichajesEmpleado
          };
        }

        if (fichajeEntrada.diferencia_minutos && fichajeEntrada.diferencia_minutos > 60) {
          return {
            color: 'naranja',
            mensaje: `En jornada - Entrada ${Math.abs(fichajeEntrada.diferencia_minutos)}min tarde`,
            fichajes: fichajesEmpleado
          };
        }

        if (fichajeEntrada.estado === 'tarde' || fichajeEntrada.estado === 'muy_tarde') {
          return {
            color: 'naranja',
            mensaje: `En jornada - Entrada ${Math.abs(fichajeEntrada.diferencia_minutos || 0)}min tarde`,
            fichajes: fichajesEmpleado
          };
        }

        return {
          color: 'verde',
          mensaje: 'Fichaje correcto - En jornada',
          fichajes: fichajesEmpleado
        };
      }

      // Aún no es su hora de entrada
      return {
        color: 'azul',
        mensaje: 'Pendiente de comenzar turno',
        fichajes: []
      };
    };
  }, [horarios, fichajesHoy, horaActual, diaActualNormalizado]);

  const empleadosActivos = useMemo(() => 
    empleados.filter(e => e.activo !== false && e.role !== 'admin')
  , [empleados]);
  
  const empleadosFiltrados = useMemo(() => {
    return empleadosActivos.filter(e => {
      const matchEmpleado = filtroEmpleado === "todos" || e.id === filtroEmpleado;
      
      let matchCentro = true;
      if (filtroCentro !== "todos") {
        const horariosCentro = horarios.filter(h => h.empleado_id === e.id && h.centro_id === filtroCentro);
        matchCentro = horariosCentro.length > 0;
      }
      
      return matchEmpleado && matchCentro;
    });
  }, [empleadosActivos, filtroEmpleado, filtroCentro, horarios]);

  const empleadosPorEstado = useMemo(() => {
    const estadosCalculados = empleadosFiltrados.map(e => ({ empleado: e, estado: getEstadoEmpleado(e) }));

    return {
      verde: estadosCalculados.filter(item => item.estado.color === 'verde').map(item => item.empleado),
      naranja: estadosCalculados.filter(item => item.estado.color === 'naranja').map(item => item.empleado),
      rojo: estadosCalculados.filter(item => item.estado.color === 'rojo').map(item => item.empleado),
      azul: estadosCalculados.filter(item => item.estado.color === 'azul').map(item => item.empleado),
    };
  }, [empleadosFiltrados, getEstadoEmpleado]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Acceso Restringido</h2>
          <p className="text-slate-600">Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-[#1a1a1a] flex items-center gap-2 md:gap-3 mb-2">
            <Clock className="w-8 h-8 md:w-10 md:h-10 text-[#24c4ba]" />
            <span>Panel de Fichajes</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">
            {format(horaActual, "EEEE, d 'de' MMMM 'de' yyyy - HH:mm", { locale: es })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            📅 Día detectado: <strong>{diaActualNormalizado}</strong>
          </p>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Calendar className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Información de horarios:</strong> Mostrando empleados con horario configurado para <strong>{diaActualStr}</strong>.
            Si no aparecen empleados, verifica que tengan horarios asignados para este día de la semana.
          </AlertDescription>
        </Alert>

        {/* Filtros */}
        <Card className="shadow-lg border-0 mb-6 md:mb-8">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Filter className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
              <h3 className="font-semibold text-base md:text-lg text-slate-900">Filtros</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label className="text-xs md:text-sm text-slate-600 mb-2">Empleado</Label>
                <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                  <SelectTrigger className="rounded-lg text-sm md:text-base">
                    <SelectValue placeholder="Todos los empleados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los empleados</SelectItem>
                    {empleadosActivos.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs md:text-sm text-slate-600 mb-2">Centro</Label>
                <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                  <SelectTrigger className="rounded-lg text-sm md:text-base">
                    <SelectValue placeholder="Todos los centros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los centros</SelectItem>
                    {centros.map(centro => (
                      <SelectItem key={centro.id} value={centro.id}>{centro.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen por estado */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          {Object.entries(empleadosPorEstado).map(([estado, emps]) => {
            const Icon = estadoIcons[estado];
            return (
              <Card key={estado} className="shadow-lg border-0">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3 mb-2">
                    <div className={`w-10 h-10 md:w-12 md:h-12 ${estadoColors[estado]} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 capitalize truncate">{estadoTextos[estado]}</p>
                      <p className="text-2xl md:text-3xl font-bold text-[#1a1a1a]">{emps.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Lista de empleados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {empleadosFiltrados.map((empleado) => {
            const estado = getEstadoEmpleado(empleado);
            const Icon = estadoIcons[estado.color];
            
            return (
              <Link key={empleado.id} to={createPageUrl("GestionEmpleados")}>
                <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-[#24c4ba] to-[#1ca89f]">
                          {empleado.foto_perfil ? (
                            <AvatarImage src={empleado.foto_perfil} />
                          ) : null}
                          <AvatarFallback className="bg-transparent text-white text-lg md:text-xl font-bold">
                            {empleado.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 ${estadoColors[estado.color]} rounded-full border-4 border-white flex items-center justify-center`}>
                          <Icon className="w-2 h-2 md:w-3 md:h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base md:text-lg text-[#1a1a1a] truncate">{empleado.full_name}</h3>
                        <p className="text-xs md:text-sm text-slate-600 truncate">{empleado.profesion}</p>
                        <Badge className={`mt-2 ${estadoColors[estado.color]} text-white border-0 text-xs`}>
                          {estado.mensaje}
                        </Badge>
                      </div>
                    </div>

                    {estado.fichajes.length > 0 && (
                      <div className="space-y-1 md:space-y-2 pt-3 md:pt-4 border-t">
                        {estado.fichajes.map((fichaje, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-slate-600 capitalize">{fichaje.tipo}:</span>
                            <span className="font-semibold text-[#1a1a1a]">{fichaje.hora}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {empleadosFiltrados.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <Clock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No hay empleados con horario hoy
              </h3>
              <p className="text-slate-600">
                No se encontraron empleados con horarios configurados para {diaActualStr}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}