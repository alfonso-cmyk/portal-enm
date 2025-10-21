import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ExternalLink, Eye, EyeOff, CheckCircle, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TIPOS_SERVICIO = [
  { value: "herramienta", label: "🔧 Herramienta", keywords: ["herramienta", "tool"] },
  { value: "servicio", label: "🛠️ Servicio", keywords: ["servicio", "service"] },
  { value: "freelance", label: "👤 Freelance", keywords: ["freelance", "autonomo"] },
  { value: "producto", label: "📦 Producto", keywords: ["producto", "product"] },
  { value: "software", label: "💻 Software", keywords: ["software", "app", "saas"] },
  { value: "suministro", label: "💡 Suministro", keywords: ["luz", "agua", "gas", "suministro"] },
  { value: "alquiler", label: "🏠 Alquiler", keywords: ["alquiler", "arrendamiento", "rent"] },
  { value: "formacion", label: "📚 Formación", keywords: ["formacion", "curso", "training"] },
  { value: "otro", label: "📌 Otro", keywords: [] }
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const detectarTipoServicio = (nombre) => {
  if (!nombre) return "servicio";
  const nombreLower = nombre.toLowerCase();
  
  for (const tipo of TIPOS_SERVICIO) {
    if (tipo.keywords.some(keyword => nombreLower.includes(keyword))) {
      return tipo.value;
    }
  }
  
  return "servicio";
};

export default function GestionProveedores() {
  const [user, setUser] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorEditar, setProveedorEditar] = useState(null);
  const [mostrarContrasenas, setMostrarContrasenas] = useState({});
  const [modalCSV, setModalCSV] = useState(false);
  const [archivoCSV, setArchivoCSV] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState([]);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    tipo_servicio: "servicio",
    url_facturas: "",
    metodo_acceso: "usuario_contrasena",
    google_email: "",
    usuario_acceso: "",
    contrasena_acceso: "",
    notas: "",
    frecuencia: "mensual",
    mes_anual: null,
    meses_descargados: [],
    activo: true
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => base44.entities.Proveedor.list(),
    initialData: [],
  });

  const createProveedorMutation = useMutation({
    mutationFn: (data) => base44.entities.Proveedor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      setModalAbierto(false);
      resetForm();
      alert('✅ Proveedor creado correctamente');
    },
  });

  const updateProveedorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Proveedor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      setModalAbierto(false);
      setProveedorEditar(null);
      resetForm();
      alert('✅ Proveedor actualizado correctamente');
    },
  });

  const deleteProveedorMutation = useMutation({
    mutationFn: (id) => base44.entities.Proveedor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      alert('✅ Proveedor eliminado correctamente');
    },
  });

  const toggleDescargaMutation = useMutation({
    mutationFn: async ({ proveedor, mes }) => {
      const mesesDescargados = proveedor.meses_descargados || [];
      const yaDescargado = mesesDescargados.includes(mes);
      
      const nuevosMeses = yaDescargado
        ? mesesDescargados.filter(m => m !== mes)
        : [...mesesDescargados, mes];

      return base44.entities.Proveedor.update(proveedor.id, {
        ...proveedor,
        meses_descargados: nuevosMeses
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
    },
  });

  const importarCSVMutation = useMutation({
    mutationFn: async (proveedoresData) => {
      const resultados = [];
      
      for (const proveedorData of proveedoresData) {
        try {
          // Buscar si existe por nombre
          const existente = proveedores.find(p => 
            p.nombre.toLowerCase() === proveedorData.nombre.toLowerCase()
          );

          if (existente) {
            // Actualizar existente
            await base44.entities.Proveedor.update(existente.id, proveedorData);
            resultados.push({ nombre: proveedorData.nombre, accion: 'actualizado' });
          } else {
            // Crear nuevo
            await base44.entities.Proveedor.create(proveedorData);
            resultados.push({ nombre: proveedorData.nombre, accion: 'creado' });
          }
        } catch (error) {
          resultados.push({ nombre: proveedorData.nombre, accion: 'error', error: error.message });
        }
      }
      
      return resultados;
    },
    onSuccess: (resultados) => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      setModalCSV(false);
      setArchivoCSV(null);
      setVistaPrevia([]);
      
      const creados = resultados.filter(r => r.accion === 'creado').length;
      const actualizados = resultados.filter(r => r.accion === 'actualizado').length;
      const errores = resultados.filter(r => r.accion === 'error').length;
      
      alert(`✅ Importación completada:\n- ${creados} proveedores creados\n- ${actualizados} proveedores actualizados\n${errores > 0 ? `- ${errores} errores` : ''}`);
    },
  });

  const handleNombreChange = (nombre) => {
    const tipoDetectado = detectarTipoServicio(nombre);
    setFormData({
      ...formData,
      nombre,
      tipo_servicio: tipoDetectado
    });
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      tipo_servicio: "servicio",
      url_facturas: "",
      metodo_acceso: "usuario_contrasena",
      google_email: "",
      usuario_acceso: "",
      contrasena_acceso: "",
      notas: "",
      frecuencia: "mensual",
      mes_anual: null,
      meses_descargados: [],
      activo: true
    });
  };

  const handleNuevoProveedor = () => {
    setProveedorEditar(null);
    resetForm();
    setModalAbierto(true);
  };

  const handleEditarProveedor = (proveedor) => {
    setProveedorEditar(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      tipo_servicio: proveedor.tipo_servicio,
      url_facturas: proveedor.url_facturas || "",
      metodo_acceso: proveedor.metodo_acceso || "usuario_contrasena",
      google_email: proveedor.google_email || "",
      usuario_acceso: proveedor.usuario_acceso || "",
      contrasena_acceso: proveedor.contrasena_acceso || "",
      notas: proveedor.notas || "",
      frecuencia: proveedor.frecuencia,
      mes_anual: proveedor.mes_anual || null,
      meses_descargados: proveedor.meses_descargados || [],
      activo: proveedor.activo !== false
    });
    setModalAbierto(true);
  };

  const handleEliminarProveedor = (id) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      deleteProveedorMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Limpiar campos no necesarios según el método de acceso
    const dataLimpia = {...formData};
    
    if (dataLimpia.metodo_acceso !== 'google_login') {
      dataLimpia.google_email = "";
    }
    
    if (dataLimpia.metodo_acceso !== 'usuario_contrasena') {
      dataLimpia.usuario_acceso = "";
      dataLimpia.contrasena_acceso = "";
    }
    
    if (proveedorEditar) {
      updateProveedorMutation.mutate({ id: proveedorEditar.id, data: dataLimpia });
    } else {
      createProveedorMutation.mutate(dataLimpia);
    }
  };

  const toggleMostrarContrasena = (proveedorId) => {
    setMostrarContrasenas({
      ...mostrarContrasenas,
      [proveedorId]: !mostrarContrasenas[proveedorId]
    });
  };

  const handleToggleDescarga = (proveedor, mes) => {
    toggleDescargaMutation.mutate({ proveedor, mes });
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Parsear CSV
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const proveedoresData = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const proveedor = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header) {
            case 'nombre':
              proveedor.nombre = value;
              proveedor.tipo_servicio = detectarTipoServicio(value);
              break;
            case 'tipo_servicio':
            case 'tipo':
              if (value) proveedor.tipo_servicio = value;
              break;
            case 'url_facturas':
            case 'url':
              proveedor.url_facturas = value;
              break;
            case 'metodo_acceso':
            case 'metodo':
              proveedor.metodo_acceso = value || 'usuario_contrasena';
              break;
            case 'google_email':
            case 'google':
              proveedor.google_email = value;
              break;
            case 'usuario_acceso':
            case 'usuario':
              proveedor.usuario_acceso = value;
              break;
            case 'contrasena_acceso':
            case 'contrasena':
            case 'password':
              proveedor.contrasena_acceso = value;
              break;
            case 'frecuencia':
              proveedor.frecuencia = value || 'mensual';
              break;
            case 'mes_anual':
            case 'mes':
              if (value) proveedor.mes_anual = parseInt(value);
              break;
            case 'notas':
              proveedor.notas = value;
              break;
            case 'activo':
              proveedor.activo = value.toLowerCase() !== 'false' && value !== '0';
              break;
          }
        });

        if (proveedor.nombre) {
          // Valores por defecto
          if (!proveedor.tipo_servicio) proveedor.tipo_servicio = detectarTipoServicio(proveedor.nombre);
          if (!proveedor.frecuencia) proveedor.frecuencia = 'mensual';
          if (!proveedor.metodo_acceso) proveedor.metodo_acceso = 'usuario_contrasena';
          if (proveedor.activo === undefined) proveedor.activo = true;
          proveedor.meses_descargados = [];
          
          proveedoresData.push(proveedor);
        }
      }

      setVistaPrevia(proveedoresData);
      setArchivoCSV(file);
    };

    reader.readAsText(file);
  };

  const handleImportarCSV = () => {
    if (vistaPrevia.length === 0) {
      alert('No hay datos válidos para importar');
      return;
    }
    
    if (confirm(`¿Confirmas importar ${vistaPrevia.length} proveedores? Los existentes se actualizarán.`)) {
      importarCSVMutation.mutate(vistaPrevia);
    }
  };

  const exportarPlantillaCSV = () => {
    const plantilla = [
      ['nombre', 'tipo_servicio', 'url_facturas', 'metodo_acceso', 'google_email', 'usuario_acceso', 'contrasena_acceso', 'frecuencia', 'mes_anual', 'notas', 'activo'].join(','),
      ['Amazon AWS', 'software', 'https://aws.amazon.com', 'google_login', 'admin@empresa.com', '', '', 'mensual', '', 'Hosting principal', 'true'].join(','),
      ['Google Workspace', 'software', 'https://admin.google.com', 'google_login', 'admin@empresa.com', '', '', 'mensual', '', '', 'true'].join(','),
      ['Iberdrola', 'suministro', 'Email', 'email', '', '', '', 'mensual', '', 'Recibo por email', 'true'].join(','),
      ['Seguro Anual', 'servicio', 'Correo postal', 'correo_postal', '', '', '', 'anual', '3', 'Llega en marzo', 'true'].join(',')
    ].join('\n');

    const blob = new Blob([plantilla], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_proveedores.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarProveedoresCSV = () => {
    const csv = [
      ['nombre', 'tipo_servicio', 'url_facturas', 'metodo_acceso', 'google_email', 'usuario_acceso', 'contrasena_acceso', 'frecuencia', 'mes_anual', 'notas', 'activo'].join(','),
      ...proveedores.map(p => [
        p.nombre,
        p.tipo_servicio,
        p.url_facturas || '',
        p.metodo_acceso || 'usuario_contrasena',
        p.google_email || '',
        p.usuario_acceso || '',
        p.contrasena_acceso || '',
        p.frecuencia,
        p.mes_anual || '',
        p.notas || '',
        p.activo ? 'true' : 'false'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `proveedores_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generar últimos 12 meses para los checkboxes
  const ultimosMeses = Array.from({ length: 12 }, (_, i) => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - i);
    return format(fecha, 'yyyy-MM');
  }).reverse();

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
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]">Gestión de Proveedores</h1>
            <p className="text-slate-600 mt-1">Control de proveedores y facturas</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={exportarPlantillaCSV}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Plantilla CSV
            </Button>
            <Button
              onClick={exportarProveedoresCSV}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button
              onClick={() => setModalCSV(true)}
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
            <Button
              onClick={handleNuevoProveedor}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Proveedor
            </Button>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Total Proveedores</p>
              <p className="text-3xl font-bold text-purple-600">{proveedores.length}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Mensuales</p>
              <p className="text-3xl font-bold text-blue-600">
                {proveedores.filter(p => p.frecuencia === 'mensual').length}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Anuales</p>
              <p className="text-3xl font-bold text-green-600">
                {proveedores.filter(p => p.frecuencia === 'anual').length}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Puntuales</p>
              <p className="text-3xl font-bold text-amber-600">
                {proveedores.filter(p => p.frecuencia === 'puntual').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de proveedores */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-xl">
            <CardTitle>Listado de Proveedores</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Frecuencia</TableHead>
                    <TableHead>Método Acceso</TableHead>
                    <TableHead>Credenciales</TableHead>
                    <TableHead>Facturas Descargadas</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proveedores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No hay proveedores registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    proveedores.map((proveedor) => (
                      <TableRow key={proveedor.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          {proveedor.nombre}
                          {proveedor.url_facturas && (
                            <a href={proveedor.url_facturas} target="_blank" rel="noopener noreferrer" 
                               className="ml-2 text-purple-600 hover:text-purple-700">
                              <ExternalLink className="w-3 h-3 inline" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {TIPOS_SERVICIO.find(t => t.value === proveedor.tipo_servicio)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            proveedor.frecuencia === "mensual" ? "bg-blue-100 text-blue-800" :
                            proveedor.frecuencia === "anual" ? "bg-green-100 text-green-800" :
                            "bg-amber-100 text-amber-800"
                          }>
                            {proveedor.frecuencia}
                            {proveedor.frecuencia === "anual" && proveedor.mes_anual && 
                              ` (${MESES[proveedor.mes_anual - 1]})`
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {proveedor.metodo_acceso === 'google_login' ? '🔐 Google' :
                             proveedor.metodo_acceso === 'usuario_contrasena' ? '👤 Usuario/Pass' :
                             proveedor.metodo_acceso === 'email' ? '📧 Email' :
                             proveedor.metodo_acceso === 'correo_postal' ? '✉️ Correo' :
                             '📌 Otro'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {proveedor.metodo_acceso === 'google_login' && proveedor.google_email ? (
                            <div className="text-xs">
                              <strong>Google:</strong> {proveedor.google_email}
                            </div>
                          ) : proveedor.metodo_acceso === 'usuario_contrasena' && proveedor.usuario_acceso ? (
                            <div className="space-y-1">
                              <p className="text-xs text-slate-600">
                                <strong>Usuario:</strong> {proveedor.usuario_acceso}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-600">
                                  <strong>Pass:</strong> {mostrarContrasenas[proveedor.id] 
                                    ? proveedor.contrasena_acceso 
                                    : '••••••••'}
                                </p>
                                <button
                                  onClick={() => toggleMostrarContrasena(proveedor.id)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  {mostrarContrasenas[proveedor.id] ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap max-w-xs">
                            {ultimosMeses.slice(-6).map(mes => {
                              const descargado = (proveedor.meses_descargados || []).includes(mes);
                              return (
                                <button
                                  key={mes}
                                  onClick={() => handleToggleDescarga(proveedor, mes)}
                                  className={`text-xs px-2 py-1 rounded ${
                                    descargado 
                                      ? 'bg-green-100 text-green-800 border border-green-300' 
                                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                                  } hover:opacity-80 transition-all`}
                                  title={`${format(new Date(mes), 'MMM yyyy', { locale: es })}: ${descargado ? 'Descargado' : 'Pendiente'}`}
                                >
                                  {format(new Date(mes), 'MMM', { locale: es })}
                                  {descargado && <CheckCircle className="w-3 h-3 inline ml-1" />}
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditarProveedor(proveedor)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarProveedor(proveedor.id)}
                              className="text-red-600"
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
            </div>
          </CardContent>
        </Card>

        {/* Modal Proveedor */}
        {modalAbierto && (
          <Dialog open={true} onOpenChange={() => setModalAbierto(false)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{proveedorEditar ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre del Proveedor *</Label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => handleNombreChange(e.target.value)}
                      placeholder="Ej: Amazon AWS, Google Workspace..."
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">El tipo se detectará automáticamente</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo de Servicio/Producto *</Label>
                      <Select value={formData.tipo_servicio} onValueChange={(value) => setFormData({...formData, tipo_servicio: value})} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_SERVICIO.map(tipo => (
                            <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Frecuencia *</Label>
                      <Select value={formData.frecuencia} onValueChange={(value) => setFormData({...formData, frecuencia: value})} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensual">Mensual</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                          <SelectItem value="puntual">Puntual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.frecuencia === 'anual' && (
                    <div>
                      <Label>Mes en que llega la factura</Label>
                      <Select 
                        value={formData.mes_anual ? String(formData.mes_anual) : ""} 
                        onValueChange={(value) => setFormData({...formData, mes_anual: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el mes" />
                        </SelectTrigger>
                        <SelectContent>
                          {MESES.map((mes, index) => (
                            <SelectItem key={index + 1} value={String(index + 1)}>{mes}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>URL de Acceso o Método de Recepción</Label>
                    <Input
                      value={formData.url_facturas}
                      onChange={(e) => setFormData({...formData, url_facturas: e.target.value})}
                      placeholder="https://... o Email, Correo postal, etc."
                    />
                  </div>

                  <div>
                    <Label>Método de Acceso *</Label>
                    <Select value={formData.metodo_acceso} onValueChange={(value) => setFormData({...formData, metodo_acceso: value})} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usuario_contrasena">👤 Usuario y Contraseña</SelectItem>
                        <SelectItem value="google_login">🔐 Login con Google</SelectItem>
                        <SelectItem value="email">📧 Llega por Email</SelectItem>
                        <SelectItem value="correo_postal">✉️ Correo Postal</SelectItem>
                        <SelectItem value="otro">📌 Otro método</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.metodo_acceso === 'google_login' && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertDescription className="text-blue-900">
                        <strong>🔐 Login con Google</strong>
                        <div className="mt-2">
                          <Label>Email de Google usado para acceder</Label>
                          <Input
                            type="email"
                            value={formData.google_email}
                            onChange={(e) => setFormData({...formData, google_email: e.target.value})}
                            placeholder="admin@empresa.com"
                            className="mt-2 bg-white"
                          />
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {formData.metodo_acceso === 'usuario_contrasena' && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Usuario de Acceso</Label>
                        <Input
                          value={formData.usuario_acceso}
                          onChange={(e) => setFormData({...formData, usuario_acceso: e.target.value})}
                        />
                      </div>

                      <div>
                        <Label>Contraseña de Acceso</Label>
                        <Input
                          type="password"
                          value={formData.contrasena_acceso}
                          onChange={(e) => setFormData({...formData, contrasena_acceso: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      placeholder="Anotaciones adicionales..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.activo}
                      onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
                      id="activo-checkbox"
                    />
                    <Label htmlFor="activo-checkbox">Proveedor activo</Label>
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setModalAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-purple-600 to-purple-700"
                    disabled={createProveedorMutation.isPending || updateProveedorMutation.isPending}
                  >
                    {proveedorEditar ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Importar CSV */}
        {modalCSV && (
          <Dialog open={true} onOpenChange={() => setModalCSV(false)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Proveedores desde CSV</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>📋 Formato del CSV:</strong>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Primera fila debe contener los encabezados (nombre, tipo_servicio, url_facturas, metodo_acceso, google_email, usuario_acceso, contrasena_acceso, frecuencia, mes_anual, notas, activo)</li>
                      <li>Los proveedores existentes se actualizarán, los nuevos se crearán</li>
                      <li>Descarga la plantilla para ver un ejemplo completo</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label>Seleccionar archivo CSV</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="mt-2"
                  />
                </div>

                {vistaPrevia.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Vista Previa ({vistaPrevia.length} proveedores)</h3>
                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Método Acceso</TableHead>
                            <TableHead>Frecuencia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vistaPrevia.map((p, index) => (
                            <TableRow key={index}>
                              <TableCell>{p.nombre}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {TIPOS_SERVICIO.find(t => t.value === p.tipo_servicio)?.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {p.metodo_acceso === 'google_login' ? '🔐 Google' :
                                 p.metodo_acceso === 'usuario_contrasena' ? '👤 Usuario/Pass' :
                                 p.metodo_acceso === 'email' ? '📧 Email' :
                                 p.metodo_acceso === 'correo_postal' ? '✉️ Correo' : '📌 Otro'}
                                {p.google_email && ` (${p.google_email})`}
                                {p.usuario_acceso && ` (${p.usuario_acceso})`}
                              </TableCell>
                              <TableCell>{p.frecuencia}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setModalCSV(false); setVistaPrevia([]); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImportarCSV}
                  disabled={vistaPrevia.length === 0 || importarCSVMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-purple-700"
                >
                  {importarCSVMutation.isPending ? 'Importando...' : `Importar ${vistaPrevia.length} proveedores`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}