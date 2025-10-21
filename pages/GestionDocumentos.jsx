import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import GestionNominas from "../components/admin-documentos/GestionNominas";
import GestionContratos from "../components/admin-documentos/GestionContratos";
import GestionVacaciones from "../components/admin-documentos/GestionVacaciones";
import GestionUniformes from "../components/admin-documentos/GestionUniformes";
import GestionMaterial from "../components/admin-documentos/GestionMaterial";
import GestionSolicitudes from "../components/admin-documentos/GestionSolicitudes";
import ConfiguracionEmail from "../components/admin-documentos/ConfiguracionEmail";

export default function GestionDocumentos() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("nominas");
  const [mostrarConfig, setMostrarConfig] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

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
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Gestión de Documentos</h1>
            <p className="text-slate-600 mt-1">Administra nóminas, contratos y más</p>
          </div>
          <Button
            onClick={() => setMostrarConfig(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-2 bg-white p-2 rounded-xl shadow-lg">
            <TabsTrigger value="nominas" className="rounded-lg">Nóminas</TabsTrigger>
            <TabsTrigger value="contratos" className="rounded-lg">Contratos</TabsTrigger>
            <TabsTrigger value="vacaciones" className="rounded-lg">Vacaciones</TabsTrigger>
            <TabsTrigger value="uniformes" className="rounded-lg">Uniformes</TabsTrigger>
            <TabsTrigger value="material" className="rounded-lg">Material</TabsTrigger>
            <TabsTrigger value="solicitudes" className="rounded-lg">Solicitudes</TabsTrigger>
          </TabsList>

          <TabsContent value="nominas">
            <GestionNominas empleados={empleados} />
          </TabsContent>

          <TabsContent value="contratos">
            <GestionContratos empleados={empleados} />
          </TabsContent>

          <TabsContent value="vacaciones">
            <GestionVacaciones empleados={empleados} />
          </TabsContent>

          <TabsContent value="uniformes">
            <GestionUniformes empleados={empleados} />
          </TabsContent>

          <TabsContent value="material">
            <GestionMaterial empleados={empleados} />
          </TabsContent>

          <TabsContent value="solicitudes">
            <GestionSolicitudes />
          </TabsContent>
        </Tabs>

        {mostrarConfig && (
          <ConfiguracionEmail onClose={() => setMostrarConfig(false)} />
        )}
      </div>
    </div>
  );
}