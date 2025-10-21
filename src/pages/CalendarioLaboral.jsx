
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

export default function CalendarioLaboral() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: centrosUsuario = [] } = useQuery({
    queryKey: ['centros-usuario', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const centrosIds = user.centros_asignados || [];
      if (centrosIds.length === 0) return [];
      const centros = await base44.entities.Centro.list();
      return centros.filter(c => centrosIds.includes(c.id));
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: festivos = [] } = useQuery({
    queryKey: ['festivos'],
    queryFn: () => base44.entities.Festivo.list(),
    initialData: [],
  });

  // Lógica mejorada: 1 ubicación → local específica, múltiples → solo Rivas
  const ubicacionesEmpleado = useMemo(() => {
    const ubicaciones = new Set();
    ubicaciones.add('España'); // Siempre nacionales
    ubicaciones.add('Comunidad de Madrid'); // Siempre autonómicos

    if (centrosUsuario.length === 0) {
      // Sin centros asignados, usar Rivas por defecto
      ubicaciones.add('Rivas-Vaciamadrid');
      return Array.from(ubicaciones);
    }

    if (centrosUsuario.length === 1) {
      // UNA sola ubicación → mostrar festivos locales específicos
      const centro = centrosUsuario[0];
      const direccion = centro.direccion?.toLowerCase() || '';
      
      if (direccion.includes('móstoles') || direccion.includes('mostoles')) {
        ubicaciones.add('Móstoles');
      } else if (direccion.includes('rivas')) {
        ubicaciones.add('Rivas-Vaciamadrid');
      } else if (direccion.includes('alcalá') || direccion.includes('alcala')) {
        ubicaciones.add('Alcalá de Henares');
      } else if (direccion.includes('meco')) {
        ubicaciones.add('Meco');
      } else if (direccion.includes('madrid') && !direccion.includes('móstoles') && !direccion.includes('rivas') && !direccion.includes('alcalá') && !direccion.includes('meco')) {
        ubicaciones.add('Madrid');
      } else {
        // Si no se identifica, usar Rivas como referencia
        ubicaciones.add('Rivas-Vaciamadrid');
      }
    } else {
      // MÚLTIPLES ubicaciones → solo Rivas como referencia general
      ubicaciones.add('Rivas-Vaciamadrid');
    }

    return Array.from(ubicaciones);
  }, [centrosUsuario]);

  const festivosAplicables = useMemo(() => {
    return festivos
      .filter(f => ubicacionesEmpleado.includes(f.ubicacion))
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Ordenados por fecha
  }, [festivos, ubicacionesEmpleado]);

  const festivoDelDia = festivosAplicables.find(f => 
    isSameDay(parseISO(f.fecha), selectedDate)
  );

  const festivosPorMes = festivosAplicables.reduce((acc, f) => {
    const mes = format(parseISO(f.fecha), 'MMMM yyyy', { locale: es });
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(f);
    return acc;
  }, {});

  const isHoliday = (date) => {
    return festivosAplicables.some(f => isSameDay(parseISO(f.fecha), date));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Calendario Laboral</h1>
          <p className="text-slate-600">Días festivos según tus centros de trabajo</p>
        </div>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>ℹ️ Festivos aplicables:</strong> Se muestran los días festivos de: {ubicacionesEmpleado.join(', ')}.
            <br />
            <strong>Total: {festivosAplicables.length} festivos</strong>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Calendario {selectedDate.getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={es}
                className="rounded-lg border"
                modifiers={{
                  holiday: (date) => isHoliday(date)
                }}
                modifiersStyles={{
                  holiday: {
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 'bold'
                  }
                }}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            {festivoDelDia && (
              <Card className="shadow-lg border-0 border-l-4 border-l-yellow-500">
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="text-lg">
                    🎉 {format(selectedDate, "d 'de' MMMM", { locale: es })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{festivoDelDia.nombre}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {festivoDelDia.tipo === 'nacional' && (
                      <Badge className="bg-blue-100 text-blue-800">🇪🇸 Nacional</Badge>
                    )}
                    {festivoDelDia.tipo === 'comunidad' && (
                      <Badge className="bg-green-100 text-green-800">🏛️ Autonómico</Badge>
                    )}
                    {festivoDelDia.tipo === 'local' && (
                      <Badge className="bg-purple-100 text-purple-800">🏙️ Local</Badge>
                    )}
                    <Badge variant="outline">{festivoDelDia.ubicacion}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl">
                <CardTitle>Festivos del Año</CardTitle>
              </CardHeader>
              <CardContent className="p-6 max-h-96 overflow-y-auto">
                {festivosAplicables.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No hay festivos cargados para tus ubicaciones.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(festivosPorMes)
                      .sort(([mesA], [mesB]) => {
                        // Find a festivo for each month to get a date for sorting
                        const dateA = parseISO(festivosAplicables.find(f => format(parseISO(f.fecha), 'MMMM yyyy', { locale: es }) === mesA).fecha);
                        const dateB = parseISO(festivosAplicables.find(f => format(parseISO(f.fecha), 'MMMM yyyy', { locale: es }) === mesB).fecha);
                        return dateA.getTime() - dateB.getTime(); // Use getTime() for reliable date comparison
                      })
                      .map(([mes, festivosDelMes]) => (
                        <div key={mes}>
                          <h3 className="font-bold text-slate-900 mb-2 capitalize">{mes}</h3>
                          <div className="space-y-2">
                            {festivosDelMes
                              .sort((a, b) => parseISO(a.fecha).getTime() - parseISO(b.fecha).getTime()) // Use getTime() for reliable date comparison
                              .map((festivo) => (
                                <div key={festivo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                  <div>
                                    <p className="font-medium text-slate-900">{festivo.nombre}</p>
                                    <p className="text-sm text-slate-600">
                                      {format(parseISO(festivo.fecha), "EEEE, d 'de' MMMM", { locale: es })}
                                    </p>
                                  </div>
                                  {festivo.tipo === 'nacional' && (
                                    <Badge variant="outline" className="text-xs">🇪🇸</Badge>
                                  )}
                                  {festivo.tipo === 'comunidad' && (
                                    <Badge variant="outline" className="text-xs">🏛️</Badge>
                                  )}
                                  {festivo.tipo === 'local' && (
                                    <Badge variant="outline" className="text-xs">🏙️</Badge>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
