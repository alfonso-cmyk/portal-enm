import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Edit, Search, Info, AlertCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import EmpleadoCard from "../components/empleados/EmpleadoCard";
import ModalEmpleado from "../components/empleados/ModalEmpleado";
import GuiaInvitacion from "../components/empleados/GuiaInvitacion";
import ModalHorario from "../components/empleados/ModalHorario";

export default function GestionEmpleados() {
  const [user, setUser] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroProfesion, setFiltroProfesion] = useState("todos");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [empleadoEditar, setEmpleadoEditar] = useState(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [modalHorario, setModalHorario] = useState(false);
  const [empleadoHorario, setEmpleadoHorario] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: centros = [] } = useQuery({
    queryKey: ['centros'],
    queryFn: () => base44.entities.Centro.list(),
    initialData: [],
  });

  const { data: horarios = [] } = useQuery({
    queryKey: ['horarios'],
    queryFn: () => base44.entities.HorarioSemanal.list(),
    initialData: [],
  });

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }) => base44.entities.User.update(id, { activo: !activo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
    },
  });

  const profesiones = [
    { value: "limpieza", label: "Limpieza" },
    { value: "jardineria", label: "Jardinería" },
    { value: "piscinero", label: "Piscinero" },
    { value: "socorrista", label: "Socorrista" },
    { value: "mantenimiento", label: "Mantenimiento" },
    { value: "otro", label: "Otro" }
  ];

  const empleadosFiltrados = empleados.filter(emp => {
    const matchBusqueda = emp.full_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.profesion?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchProfesion = filtroProfesion === "todos" || emp.profesion === filtroProfesion;
    
    return matchBusqueda && matchProfesion;
  });

  const empleadosSinConfigurar = empleados.filter(emp =>
    emp.activo !== false && (!emp.profesion || !emp.centros_asignados || emp.centros_asignados.length === 0)
  );

  const empleadosActivos = empleados.filter(emp => emp.activo !== false);
  const empleadosInactivos = empleados.filter(emp => emp.activo === false);

  const getHorasSemanalesEmpleado = (empleadoId) => {
    const horariosEmpleado = horarios.filter(h => h.empleado_id === empleadoId && h.activo !== false);
    return horariosEmpleado.reduce((sum, h) => sum + (h.horas_dia || 0), 0);
  };

  const handleEditarEmpleado = (empleado) => {
    setEmpleadoEditar(empleado);
    setModalAbierto(true);
  };

  const handleToggleActivo = (empleado) => {
    const accion = empleado.activo === false ? 'activar' : 'desactivar';
    if (confirm(`¿Estás seguro de ${accion} a ${empleado.full_name}?`)) {
      toggleActivoMutation.mutate({ id: empleado.id, activo: empleado.activo });
    }
  };

  const handleVerHorario = (empleado) => {
    setEmpleadoHorario(empleado);
    setModalHorario(true);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
          <p className="text-slate-600">Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Gestión de Empleados</h1>
            <p className="text-slate-600 mt-1">Administra tu equipo de trabajo</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600 font-medium">✓ {empleadosActivos.length} Activos</span>
              {empleadosInactivos.length > 0 && (
                <span className="text-slate-500 font-medium">○ {empleadosInactivos.length} Inactivos</span>
              )}
            </div>
          </div>
          <Button
            onClick={() => setMostrarGuia(true)}
            className="bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white px-6 py-6 rounded-xl shadow-lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Invitar Nuevo Empleado
          </Button>
        </div>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Proceso de alta de empleados:</strong>
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>Invita al empleado desde el Dashboard → Usuarios (botón "Invitar Usuario")</li>
              <li>Asigna el rol: <strong>"Administrador"</strong> o <strong>"Usuario"</strong> (trabajador)</li>
              <li>El empleado recibirá un email con acceso a la plataforma</li>
              <li>Desde aquí, asigna su profesión, centros y datos adicionales</li>
            </ol>
          </AlertDescription>
        </Alert>

        {empleadosSinConfigurar.length > 0 && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>Atención:</strong> Tienes {empleadosSinConfigurar.length} empleado(s) sin configurar completamente.
              Haz clic en "Editar" para asignarles profesión y centros.
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-600 mb-2">Buscar empleado</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, email o profesión..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-12 py-6 text-lg rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm text-slate-600 mb-2">Filtrar por profesión</Label>
                <Select value={filtroProfesion} onValueChange={setFiltroProfesion}>
                  <SelectTrigger className="py-6 text-lg rounded-xl">
                    <SelectValue placeholder="Todas las profesiones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las profesiones</SelectItem>
                    {profesiones.map(prof => (
                      <SelectItem key={prof.value} value={prof.value}>{prof.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(busqueda || filtroProfesion !== "todos") && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroProfesion("todos");
                  }}
                >
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#24c4ba]" />
          </div>
        ) : empleadosFiltrados.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <UserPlus className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No hay empleados que coincidan con los filtros
              </h3>
              <p className="text-slate-600 mb-6">
                Intenta con otros criterios de búsqueda
              </p>
              <Button
                onClick={() => {
                  setBusqueda("");
                  setFiltroProfesion("todos");
                }}
                variant="outline"
              >
                Limpiar Filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empleadosFiltrados.map((empleado) => (
              <EmpleadoCard
                key={empleado.id}
                empleado={empleado}
                centros={centros}
                onEditar={handleEditarEmpleado}
                onToggleActivo={handleToggleActivo}
                onVerHorario={handleVerHorario}
                sinConfigurar={empleado.activo !== false && (!empleado.profesion || !empleado.centros_asignados || empleado.centros_asignados.length === 0)}
                horasSemanales={getHorasSemanalesEmpleado(empleado.id)}
              />
            ))}
          </div>
        )}

        {modalAbierto && (
          <ModalEmpleado
            empleado={empleadoEditar}
            centros={centros}
            onClose={() => setModalAbierto(false)}
          />
        )}

        {modalHorario && (
          <ModalHorario
            empleado={empleadoHorario}
            centros={centros}
            onClose={() => setModalHorario(false)}
          />
        )}

        {mostrarGuia && (
          <GuiaInvitacion onClose={() => setMostrarGuia(false)} />
        )}
      </div>
    </div>
  );
}