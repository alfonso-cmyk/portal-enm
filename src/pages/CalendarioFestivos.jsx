
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const FESTIVOS_2025_COMPLETOS = [
  // Nacionales
  { nombre: "Año Nuevo", fecha: "2025-01-01", tipo: "nacional", ubicacion: "España" },
  { nombre: "Reyes", fecha: "2025-01-06", tipo: "nacional", ubicacion: "España" },
  { nombre: "Viernes Santo", fecha: "2025-04-18", tipo: "nacional", ubicacion: "España" },
  { nombre: "Fiesta del Trabajo", fecha: "2025-05-01", tipo: "nacional", ubicacion: "España" },
  { nombre: "Asunción de la Virgen", fecha: "2025-08-15", tipo: "nacional", ubicacion: "España" },
  { nombre: "Fiesta Nacional de España", fecha: "2025-10-12", tipo: "nacional", ubicacion: "España" },
  { nombre: "Todos los Santos", fecha: "2025-11-01", tipo: "nacional", ubicacion: "España" },
  { nombre: "Constitución Española", fecha: "2025-12-06", tipo: "nacional", ubicacion: "España" },
  { nombre: "Inmaculada Concepción", fecha: "2025-12-08", tipo: "nacional", ubicacion: "España" },
  { nombre: "Navidad", fecha: "2025-12-25", tipo: "nacional", ubicacion: "España" },

  // Comunidad de Madrid
  { nombre: "Jueves Santo", fecha: "2025-04-17", tipo: "comunidad", ubicacion: "Comunidad de Madrid" },
  { nombre: "Dos de Mayo", fecha: "2025-05-02", tipo: "comunidad", ubicacion: "Comunidad de Madrid" },
  { nombre: "Santiago Apóstol", fecha: "2025-07-25", tipo: "comunidad", ubicacion: "Comunidad de Madrid" },

  // Madrid ciudad
  { nombre: "San Isidro", fecha: "2025-05-15", tipo: "local", ubicacion: "Madrid" },

  // Móstoles
  { nombre: "Nuestra Señora de los Santos", fecha: "2025-03-24", tipo: "local", ubicacion: "Móstoles" },
  { nombre: "Festividad Local Móstoles", fecha: "2025-10-06", tipo: "local", ubicacion: "Móstoles" },

  // Rivas-Vaciamadrid
  { nombre: "San Isidro Labrador", fecha: "2025-05-15", tipo: "local", ubicacion: "Rivas-Vaciamadrid" },
  { nombre: "Fiesta Local Rivas", fecha: "2025-07-14", tipo: "local", ubicacion: "Rivas-Vaciamadrid" },

  // Alcalá de Henares
  { nombre: "Santos Niños Justo y Pastor", fecha: "2025-08-07", tipo: "local", ubicacion: "Alcalá de Henares" },
  { nombre: "Fiesta Local Alcalá", fecha: "2025-08-25", tipo: "local", ubicacion: "Alcalá de Henares" },

  // Meco
  { nombre: "San Sebastián", fecha: "2025-01-20", tipo: "local", ubicacion: "Meco" },
  { nombre: "Fiesta Local Meco", fecha: "2025-09-08", tipo: "local", ubicacion: "Meco" },
];

export default function CalendarioFestivos() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [festivoEditar, setFestivoEditar] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState(2025);
  const [filtroUbicacion, setFiltroUbicacion] = useState("todas");

  const [formData, setFormData] = useState({
    nombre: "",
    fecha: "",
    tipo: "nacional",
    ubicacion: "España",
    anio: 2025
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: festivos = [] } = useQuery({
    queryKey: ['festivos'],
    queryFn: () => base44.entities.Festivo.list(),
    initialData: [],
  });

  const createFestivoMutation = useMutation({
    mutationFn: (data) => base44.entities.Festivo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festivos'] });
      setModalAbierto(false);
      resetForm();
      alert('✅ Festivo creado correctamente');
    },
  });

  const updateFestivoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Festivo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festivos'] });
      setModalAbierto(false);
      setFestivoEditar(null);
      resetForm();
      alert('✅ Festivo actualizado correctamente');
    },
  });

  const deleteFestivoMutation = useMutation({
    mutationFn: (id) => base44.entities.Festivo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festivos'] });
      alert('✅ Festivo eliminado correctamente');
    },
  });

  const cargarFestivos2025Mutation = useMutation({
    mutationFn: async () => {
      const existentes = festivos.filter(f => f.anio === 2025);
      // Comprobar duplicados por fecha + nombre (más preciso)
      const festivosExistentesKey = existentes.map(f => `${f.fecha}-${f.nombre.toLowerCase()}`);
      
      const nuevos = FESTIVOS_2025_COMPLETOS.filter(f => {
        const key = `${f.fecha}-${f.nombre.toLowerCase()}`;
        return !festivosExistentesKey.includes(key);
      });

      for (const festivo of nuevos) {
        await base44.entities.Festivo.create({...festivo, anio: 2025});
      }
      
      return nuevos.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['festivos'] });
      if (count > 0) {
        alert(`✅ Se han cargado ${count} festivos nuevos de 2025`);
      } else {
        alert('ℹ️ No hay festivos nuevos para cargar. Todos ya están registrados.');
      }
    },
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      fecha: "",
      tipo: "nacional",
      ubicacion: "España",
      anio: 2025
    });
  };

  const handleNuevoFestivo = () => {
    setFestivoEditar(null);
    resetForm();
    setModalAbierto(true);
  };

  const handleEditarFestivo = (festivo) => {
    setFestivoEditar(festivo);
    setFormData({
      nombre: festivo.nombre,
      fecha: festivo.fecha,
      tipo: festivo.tipo,
      ubicacion: festivo.ubicacion,
      anio: festivo.anio
    });
    setModalAbierto(true);
  };

  const handleEliminarFestivo = (id) => {
    if (confirm('¿Estás seguro de eliminar este festivo?')) {
      deleteFestivoMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (festivoEditar) {
      updateFestivoMutation.mutate({ id: festivoEditar.id, data: formData });
    } else {
      createFestivoMutation.mutate(formData);
    }
  };

  const festivosFiltrados = festivos
    .filter(f => f.anio === filtroAnio)
    .filter(f => filtroUbicacion === "todas" || f.ubicacion === filtroUbicacion)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Siempre ordenados por fecha

  const ubicacionesDisponibles = [...new Set(festivos.map(f => f.ubicacion))].sort();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]">Calendario de Festivos</h1>
            <p className="text-slate-600 mt-1">Gestiona los días festivos por ubicación</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => cargarFestivos2025Mutation.mutate()}
              variant="outline"
              disabled={cargarFestivos2025Mutation.isPending}
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Actualizar Festivos 2025
            </Button>
            <Button
              onClick={handleNuevoFestivo}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Festivo
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <Label>Año:</Label>
                <Select value={String(filtroAnio)} onValueChange={(v) => setFiltroAnio(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ubicación:</Label>
                <Select value={filtroUbicacion} onValueChange={setFiltroUbicacion}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las ubicaciones</SelectItem>
                    {ubicacionesDisponibles.map(ub => (
                      <SelectItem key={ub} value={ub}>{ub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Badge variant="outline" className="ml-auto">
                {festivosFiltrados.length} festivos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Festivos {filtroAnio} {filtroUbicacion !== "todas" && `- ${filtroUbicacion}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Festivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {festivosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No hay festivos para este año/ubicación. Haz clic en "Actualizar Festivos 2025".
                    </TableCell>
                  </TableRow>
                ) : (
                  festivosFiltrados.map((festivo) => (
                    <TableRow key={festivo.id}>
                      <TableCell className="font-medium">
                        {format(parseISO(festivo.fecha), "dd MMMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>{festivo.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {festivo.tipo === 'nacional' ? '🇪🇸 Nacional' : 
                           festivo.tipo === 'comunidad' ? '🏛️ Comunidad' : '🏙️ Local'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{festivo.ubicacion}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditarFestivo(festivo)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEliminarFestivo(festivo.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {modalAbierto && (
          <Dialog open={true} onOpenChange={() => setModalAbierto(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {festivoEditar ? 'Editar Festivo' : 'Nuevo Festivo'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label>Fecha *</Label>
                    <Input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => {
                        const fecha = e.target.value;
                        const anio = new Date(fecha).getFullYear();
                        setFormData({...formData, fecha, anio});
                      }}
                      required
                    />
                  </div>

                  <div>
                    <Label>Tipo *</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">🇪🇸 Nacional</SelectItem>
                        <SelectItem value="comunidad">🏛️ Autonómico</SelectItem>
                        <SelectItem value="local">🏙️ Local</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Ubicación *</Label>
                    <Select value={formData.ubicacion} onValueChange={(value) => setFormData({...formData, ubicacion: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="España">España</SelectItem>
                        <SelectItem value="Comunidad de Madrid">Comunidad de Madrid</SelectItem>
                        <SelectItem value="Madrid">Madrid</SelectItem>
                        <SelectItem value="Móstoles">Móstoles</SelectItem>
                        <SelectItem value="Rivas-Vaciamadrid">Rivas-Vaciamadrid</SelectItem>
                        <SelectItem value="Alcalá de Henares">Alcalá de Henares</SelectItem>
                        <SelectItem value="Meco">Meco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setModalAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-indigo-700">
                    {festivoEditar ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
