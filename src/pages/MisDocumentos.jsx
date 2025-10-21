import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, Briefcase, Package, AlertCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SeccionNominas from "../components/documentos/SeccionNominas";
import SeccionContratos from "../components/documentos/SeccionContratos";
import SeccionVacaciones from "../components/documentos/SeccionVacaciones";
import SeccionUniformes from "../components/documentos/SeccionUniformes";
import SeccionMaterial from "../components/documentos/SeccionMaterial";
import FormularioSolicitud from "../components/documentos/FormularioSolicitud";

export default function MisDocumentos() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("nominas");

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: nominas = [] } = useQuery({
    queryKey: ['nominas', user?.id],
    queryFn: () => base44.entities.Nomina.filter({ empleado_id: user.id }, "-mes"),
    enabled: !!user,
    initialData: [],
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos', user?.id],
    queryFn: () => base44.entities.Contrato.filter({ empleado_id: user.id }, "-fecha_inicio"),
    enabled: !!user,
    initialData: [],
  });

  const { data: vacaciones = [] } = useQuery({
    queryKey: ['vacaciones', user?.id],
    queryFn: () => base44.entities.Vacacion.filter({ empleado_id: user.id }, "-anio"),
    enabled: !!user,
    initialData: [],
  });

  const { data: uniformes = [] } = useQuery({
    queryKey: ['uniformes', user?.id],
    queryFn: () => base44.entities.Uniforme.filter({ empleado_id: user.id }, "-fecha_entrega"),
    enabled: !!user,
    initialData: [],
  });

  const { data: materiales = [] } = useQuery({
    queryKey: ['materiales', user?.id],
    queryFn: () => base44.entities.Material.filter({ empleado_id: user.id }, "-fecha_entrega"),
    enabled: !!user,
    initialData: [],
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Mis Documentos</h1>
          <p className="text-slate-600 mt-1">Gestiona toda tu información laboral</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2 bg-white p-2 rounded-xl shadow-lg">
            <TabsTrigger 
              value="nominas" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-900 data-[state=active]:to-blue-800 data-[state=active]:text-white rounded-lg"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Nóminas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="contratos"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg"
            >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Contratos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="vacaciones"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white rounded-lg"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Vacaciones</span>
            </TabsTrigger>
            <TabsTrigger 
              value="uniformes"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white rounded-lg"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Uniformes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="material"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white rounded-lg"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Material</span>
            </TabsTrigger>
            <TabsTrigger 
              value="solicitudes"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-700 data-[state=active]:text-white rounded-lg"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Solicitudes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nominas">
            <SeccionNominas nominas={nominas} />
          </TabsContent>

          <TabsContent value="contratos">
            <SeccionContratos contratos={contratos} />
          </TabsContent>

          <TabsContent value="vacaciones">
            <SeccionVacaciones vacaciones={vacaciones} userId={user.id} />
          </TabsContent>

          <TabsContent value="uniformes">
            <SeccionUniformes uniformes={uniformes} />
          </TabsContent>

          <TabsContent value="material">
            <SeccionMaterial materiales={materiales} />
          </TabsContent>

          <TabsContent value="solicitudes">
            <FormularioSolicitud user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}