import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Edit, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import CentroCard from "../components/centros/CentroCard";
import ModalCentro from "../components/centros/ModalCentro";

export default function GestionCentros() {
  const [user, setUser] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [centroEditar, setCentroEditar] = useState(null);
  const [filtroServicio, setFiltroServicio] = useState("todos");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: centros = [], isLoading } = useQuery({
    queryKey: ['centros'],
    queryFn: () => base44.entities.Centro.list(),
    initialData: [],
  });

  const deleteCentroMutation = useMutation({
    mutationFn: (id) => base44.entities.Centro.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros'] });
    },
  });

  const servicios = [
    { value: "limpieza", label: "Limpieza" },
    { value: "conserjeria", label: "Conserjería" },
    { value: "jardineria", label: "Jardinería" },
    { value: "piscina_con_socorrista", label: "Piscina con Socorrista" },
    { value: "piscina_sin_socorrista", label: "Piscina sin Socorrista" },
    { value: "mantenimiento", label: "Mantenimiento" }
  ];

  const centrosFiltrados = centros.filter(centro => {
    if (filtroServicio === "todos") return true;
    return centro.servicios?.includes(filtroServicio);
  });

  const handleNuevoCentro = () => {
    setCentroEditar(null);
    setModalAbierto(true);
  };

  const handleEditarCentro = (centro) => {
    setCentroEditar(centro);
    setModalAbierto(true);
  };

  const handleEliminarCentro = (id) => {
    if (confirm('¿Estás seguro de eliminar este centro?')) {
      deleteCentroMutation.mutate(id);
    }
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Gestión de Centros</h1>
            <p className="text-slate-600 mt-1">Administra los centros de trabajo</p>
          </div>
          <Button
            onClick={handleNuevoCentro}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-6 rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Centro
          </Button>
        </div>

        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtrar por Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-600 mb-2">Tipo de servicio</Label>
                <Select value={filtroServicio} onValueChange={setFiltroServicio}>
                  <SelectTrigger className="py-6 text-lg rounded-xl">
                    <SelectValue placeholder="Todos los servicios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los servicios</SelectItem>
                    {servicios.map(serv => (
                      <SelectItem key={serv.value} value={serv.value}>{serv.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filtroServicio !== "todos" && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setFiltroServicio("todos")}
                  >
                    Limpiar Filtro
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        ) : centrosFiltrados.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {filtroServicio === "todos" ? "No hay centros registrados" : "No hay centros con este servicio"}
              </h3>
              <p className="text-slate-600 mb-6">
                {filtroServicio === "todos" 
                  ? "Comienza creando tu primer centro de trabajo"
                  : "Intenta con otro filtro de servicio"
                }
              </p>
              {filtroServicio === "todos" ? (
                <Button
                  onClick={handleNuevoCentro}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Centro
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setFiltroServicio("todos")}
                >
                  Limpiar Filtro
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centrosFiltrados.map((centro) => (
              <CentroCard
                key={centro.id}
                centro={centro}
                onEditar={handleEditarCentro}
                onEliminar={handleEliminarCentro}
              />
            ))}
          </div>
        )}

        {modalAbierto && (
          <ModalCentro
            centro={centroEditar}
            onClose={() => setModalAbierto(false)}
          />
        )}
      </div>
    </div>
  );
}