
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Copy, Download, Filter, UserPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function GestionIngresos() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalCliente, setModalCliente] = useState(false);
  const [modalCSV, setModalCSV] = useState(false);
  const [ingresoEditar, setIngresoEditar] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState([]);
  const [filtros, setFiltros] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    cliente: "todos",
    estado_pago: "todos"
  });

  const [formData, setFormData] = useState({
    cliente_id: "",
    concepto: "",
    importe_sin_iva: "",
    iva_porcentaje: 21,
    aplicar_iva: true,
    fecha: new Date().toISOString().split('T')[0],
    numero_factura: "",
    recurrente: false,
    fecha_finalizacion: "",
    metodo_pago: "transferencia",
    estado_pago: "pendiente",
    notas: ""
  });

  const [clienteData, setClienteData] = useState({
    nombre: "",
    empresa: "",
    cif_nif: "",
    direccion: "",
    telefono: "",
    email: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: ingresos = [] } = useQuery({
    queryKey: ['ingresos'],
    queryFn: () => base44.entities.Ingreso.list("-fecha"),
    initialData: [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    initialData: [],
  });

  const createIngresoMutation = useMutation({
    mutationFn: async (data) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);
      const fecha = new Date(data.fecha);
      
      const ivaPorcentajeCalculado = data.aplicar_iva ? data.iva_porcentaje : 0;
      const ivaImporte = (parseFloat(data.importe_sin_iva) * ivaPorcentajeCalculado) / 100;
      const total = parseFloat(data.importe_sin_iva) + ivaImporte;
      
      let numeroFacturaToUse = data.numero_factura;
      if (!numeroFacturaToUse) {
        const ingresosAnio = ingresos.filter(i => i.anio === fecha.getFullYear());
        const highestNumForYear = ingresosAnio.reduce((max, i) => {
          // Safely parse number part, defaulting to 0 if format is unexpected
          const numPart = i.numero_factura && i.numero_factura.includes('-') 
                         ? parseInt(i.numero_factura.split('-')[1], 10) 
                         : 0;
          return numPart > max ? numPart : max;
        }, 0);
        numeroFacturaToUse = `${fecha.getFullYear()}-${String(highestNumForYear + 1).padStart(3, '0')}`;
      }

      return base44.entities.Ingreso.create({
        cliente_id: data.cliente_id,
        cliente_nombre: cliente.nombre,
        concepto: data.concepto,
        importe_sin_iva: parseFloat(data.importe_sin_iva),
        iva_porcentaje: ivaPorcentajeCalculado,
        iva_importe: ivaImporte,
        total: total,
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
        fecha: data.fecha,
        numero_factura: numeroFacturaToUse,
        recurrente: data.recurrente,
        fecha_finalizacion: data.fecha_finalizacion || null,
        metodo_pago: data.metodo_pago,
        estado_pago: data.estado_pago,
        notas: data.notas || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
      setModalAbierto(false);
      resetForm();
      alert('✅ Ingreso creado correctamente');
    },
  });

  const updateIngresoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);
      const fecha = new Date(data.fecha);
      
      const ivaPorcentajeCalculado = data.aplicar_iva ? data.iva_porcentaje : 0;
      const ivaImporte = (parseFloat(data.importe_sin_iva) * ivaPorcentajeCalculado) / 100;
      const total = parseFloat(data.importe_sin_iva) + ivaImporte;

      return base44.entities.Ingreso.update(id, {
        cliente_id: data.cliente_id,
        cliente_nombre: cliente.nombre,
        concepto: data.concepto,
        importe_sin_iva: parseFloat(data.importe_sin_iva),
        iva_porcentaje: ivaPorcentajeCalculado,
        iva_importe: ivaImporte,
        total: total,
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
        fecha: data.fecha,
        numero_factura: data.numero_factura, // Use the provided numero_factura directly
        recurrente: data.recurrente,
        fecha_finalizacion: data.fecha_finalizacion || null,
        metodo_pago: data.metodo_pago,
        estado_pago: data.estado_pago,
        notas: data.notas || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
      setModalAbierto(false);
      setIngresoEditar(null);
      resetForm();
      alert('✅ Ingreso actualizado correctamente');
    },
  });

  const updateMetodoPagoMutation = useMutation({
    mutationFn: async ({ id, metodo_pago }) => {
      return base44.entities.Ingreso.update(id, { metodo_pago });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
    },
  });

  const updateEstadoPagoMutation = useMutation({
    mutationFn: async ({ id, estado_pago }) => {
      return base44.entities.Ingreso.update(id, { estado_pago });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
    },
  });

  const deleteIngresoMutation = useMutation({
    mutationFn: (id) => base44.entities.Ingreso.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
    },
  });

  const createClienteMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setModalCliente(false);
      setClienteData({ nombre: "", empresa: "", cif_nif: "", direccion: "", telefono: "", email: "" });
    },
  });

  const duplicarRecurrentesMutation = useMutation({
    mutationFn: async () => {
      const mesSiguiente = filtros.mes === 12 ? 1 : filtros.mes + 1;
      const anioSiguiente = filtros.mes === 12 ? filtros.anio + 1 : filtros.anio;

      const recurrentesParaDuplicar = ingresos.filter(i => 
        i.recurrente && 
        (!i.fecha_finalizacion || new Date(i.fecha_finalizacion) >= new Date(anioSiguiente, mesSiguiente - 1, 1))
      );

      const promesas = recurrentesParaDuplicar.map(ing => {
        const nuevaFecha = new Date(anioSiguiente, mesSiguiente - 1, new Date(ing.fecha).getDate());
        // Generate a new unique invoice number for the duplicated recurrent income
        const numeroFactura = `${anioSiguiente}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`; 

        return base44.entities.Ingreso.create({
          cliente_id: ing.cliente_id,
          cliente_nombre: ing.cliente_nombre,
          concepto: ing.concepto,
          importe_sin_iva: ing.importe_sin_iva,
          iva_porcentaje: ing.iva_porcentaje,
          iva_importe: ing.iva_importe,
          total: ing.total,
          mes: mesSiguiente,
          anio: anioSiguiente,
          fecha: nuevaFecha.toISOString().split('T')[0],
          numero_factura: numeroFactura,
          recurrente: true,
          fecha_finalizacion: ing.fecha_finalizacion || null,
          metodo_pago: ing.metodo_pago,
          estado_pago: "pendiente",
          notas: ing.notas || null
        });
      });

      return Promise.all(promesas);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
      alert('Ingresos recurrentes duplicados correctamente');
    },
  });

  const importarCSVMutation = useMutation({
    mutationFn: async (ingresosData) => {
      const resultados = [];
      
      for (const ingresoData of ingresosData) {
        try {
          let clienteId;
          const clienteExistente = clientes.find(c => c.nombre.toLowerCase() === ingresoData.cliente_nombre.toLowerCase());
          
          if (clienteExistente) {
            clienteId = clienteExistente.id;
          } else {
            const nuevoCliente = await base44.entities.Cliente.create({
              nombre: ingresoData.cliente_nombre,
              activo: true
            });
            clienteId = nuevoCliente.id;
            await queryClient.invalidateQueries({ queryKey: ['clientes'] });
          }

          const fecha = new Date(ingresoData.fecha);

          const aplicarIvaCSV = (ingresoData.iva_porcentaje === undefined || ingresoData.iva_porcentaje === null || ingresoData.iva_porcentaje > 0);
          const ivaPorcentajeCalculado = aplicarIvaCSV ? (ingresoData.iva_porcentaje || 21) : 0;
          const ivaImporte = (parseFloat(ingresoData.importe_sin_iva) * ivaPorcentajeCalculado) / 100;
          const total = parseFloat(ingresoData.importe_sin_iva) + ivaImporte;

          let numeroFacturaToUse = ingresoData.numero_factura; // Read from CSV data first
          if (!numeroFacturaToUse) {
              // If not provided in CSV, generate a new random one
              numeroFacturaToUse = `${fecha.getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
          }

          await base44.entities.Ingreso.create({
            cliente_id: clienteId,
            cliente_nombre: ingresoData.cliente_nombre,
            concepto: ingresoData.concepto,
            importe_sin_iva: parseFloat(ingresoData.importe_sin_iva),
            iva_porcentaje: ivaPorcentajeCalculado,
            iva_importe: ivaImporte,
            total: total,
            mes: fecha.getMonth() + 1,
            anio: fecha.getFullYear(),
            fecha: ingresoData.fecha,
            numero_factura: numeroFacturaToUse,
            recurrente: ingresoData.recurrente,
            metodo_pago: ingresoData.metodo_pago || 'transferencia',
            estado_pago: ingresoData.estado_pago || 'pendiente',
            fecha_finalizacion: ingresoData.fecha_finalizacion || null,
            notas: ingresoData.notas || null
          });

          resultados.push({ concepto: ingresoData.concepto, accion: 'creado' });
        } catch (error) {
          console.error("Error al importar:", error);
          resultados.push({ concepto: ingresoData.concepto, accion: 'error' });
        }
      }
      
      return resultados;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setModalCSV(false);
      setVistaPrevia([]);
      alert('✅ Importación completada');
    },
  });

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      concepto: "",
      importe_sin_iva: "",
      iva_porcentaje: 21,
      aplicar_iva: true,
      fecha: new Date().toISOString().split('T')[0],
      numero_factura: "", // Reset numero_factura
      recurrente: false,
      fecha_finalizacion: "",
      metodo_pago: "transferencia",
      estado_pago: "pendiente",
      notas: ""
    });
  };

  const handleEditarIngreso = (ingreso) => {
    setIngresoEditar(ingreso);
    setFormData({
      cliente_id: ingreso.cliente_id,
      concepto: ingreso.concepto,
      importe_sin_iva: ingreso.importe_sin_iva,
      iva_porcentaje: ingreso.iva_porcentaje,
      aplicar_iva: ingreso.iva_porcentaje !== 0,
      fecha: ingreso.fecha,
      numero_factura: ingreso.numero_factura || "", // Populate numero_factura
      recurrente: ingreso.recurrente || false,
      fecha_finalizacion: ingreso.fecha_finalizacion || "",
      metodo_pago: ingreso.metodo_pago || "transferencia",
      estado_pago: ingreso.estado_pago || "pendiente",
      notas: ingreso.notas || ""
    });
    setModalAbierto(true);
  };

  const handleEliminarIngreso = (id) => {
    if (confirm('¿Estás seguro de eliminar este ingreso?')) {
      deleteIngresoMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ingresoEditar) {
      updateIngresoMutation.mutate({ id: ingresoEditar.id, data: formData });
    } else {
      createIngresoMutation.mutate(formData);
    }
  };

  const handleSubmitCliente = (e) => {
    e.preventDefault();
    createClienteMutation.mutate(clienteData);
  };

  const handleDuplicarRecurrentes = () => {
    if (confirm('¿Estás seguro de duplicar los ingresos recurrentes para el próximo mes?')) {
      duplicarRecurrentesMutation.mutate();
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const ingresosData = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const ingreso = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header) {
            case 'cliente_nombre':
            case 'cliente':
              ingreso.cliente_nombre = value;
              break;
            case 'concepto':
              ingreso.concepto = value;
              break;
            case 'importe_sin_iva':
            case 'importe':
            case 'base':
              ingreso.importe_sin_iva = parseFloat(value) || 0;
              break;
            case 'iva_porcentaje':
            case 'iva':
              ingreso.iva_porcentaje = parseInt(value) || 21;
              break;
            case 'fecha':
              ingreso.fecha = value;
              break;
            case 'numero_factura': // Handle numero_factura from CSV
              ingreso.numero_factura = value;
              break;
            case 'metodo_pago':
              ingreso.metodo_pago = value || 'transferencia';
              break;
            case 'estado_pago':
              ingreso.estado_pago = value || 'pendiente';
              break;
            case 'recurrente':
              ingreso.recurrente = value.toLowerCase() === 'true' || value === '1';
              break;
            case 'fecha_finalizacion':
              ingreso.fecha_finalizacion = value;
              break;
            case 'notas':
              ingreso.notas = value;
              break;
          }
        });

        if (ingreso.cliente_nombre && ingreso.concepto && ingreso.importe_sin_iva > 0 && ingreso.fecha) {
          ingresosData.push(ingreso);
        }
      }
      
      setVistaPrevia(ingresosData);
    };

    reader.readAsText(file);
  };

  const exportarPlantillaCSV = () => {
    const plantilla = [
      ['cliente_nombre', 'concepto', 'importe_sin_iva', 'iva_porcentaje', 'fecha', 'numero_factura', 'metodo_pago', 'estado_pago', 'recurrente', 'fecha_finalizacion', 'notas'].join(','),
      ['Cliente Ejemplo S.L.', 'Mantenimiento mensual', '1000', '21', '2025-01-15', '2025-001', 'transferencia', 'pendiente', 'true', '2025-12-31', 'Servicio recurrente'].join(',')
    ].join('\n');

    const blob = new Blob([plantilla], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_ingresos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ingresosFiltrados = ingresos.filter(i => {
    const matchMes = i.mes === filtros.mes;
    const matchAnio = i.anio === filtros.anio;
    const matchCliente = filtros.cliente === "todos" || i.cliente_id === filtros.cliente;
    const matchEstadoPago = filtros.estado_pago === "todos" || (i.estado_pago || 'pendiente') === filtros.estado_pago;
    return matchMes && matchAnio && matchCliente && matchEstadoPago;
  });

  const totalIngresos = ingresosFiltrados.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalIva = ingresosFiltrados.reduce((sum, i) => sum + (i.iva_importe || 0), 0);
  const ingresosRecurrentes = ingresosFiltrados.filter(i => i.recurrente).length;
  const ingresosPendientes = ingresos.filter(i => (i.estado_pago || 'pendiente') === 'pendiente').length;

  const exportarCSV = () => {
    const csvContent = [
      ['Nº Factura', 'Cliente', 'Concepto', 'Fecha', 'Base', 'IVA', 'Total', 'Método Pago', 'Estado', 'Recurrente'].join(','),
      ...ingresosFiltrados.map(i => [
        i.numero_factura,
        i.cliente_nombre,
        i.concepto,
        format(new Date(i.fecha), 'dd/MM/yyyy'),
        (i.importe_sin_iva || 0).toFixed(2),
        (i.iva_importe || 0).toFixed(2),
        (i.total || 0).toFixed(2),
        i.metodo_pago || 'transferencia',
        i.estado_pago || 'pendiente',
        i.recurrente ? 'Sí' : 'No'
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ingresos_${filtros.mes}_${filtros.anio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-[#1a1a1a]">Gestión de Ingresos</h1>
            <p className="text-slate-600 mt-1 text-sm md:text-base">Facturas y clientes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={exportarPlantillaCSV}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Plantilla CSV
            </Button>
            <Button
              onClick={() => setModalCSV(true)}
              variant="outline"
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
            <Button
              onClick={() => { setModalAbierto(true); setIngresoEditar(null); resetForm(); }}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white flex-1 sm:flex-none"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Ingreso
            </Button>
            <Button
              onClick={() => setModalCliente(true)}
              variant="outline"
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
            <Button
              onClick={handleDuplicarRecurrentes}
              variant="outline"
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicar Mes
            </Button>
            <Button
              onClick={exportarCSV}
              variant="outline"
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {ingresosPendientes > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertDescription className="text-orange-900">
              <strong>⚠️ Tienes {ingresosPendientes} facturas pendientes de cobro</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Filtros */}
        <Card className="shadow-lg border-0 mb-6 md:mb-8">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl p-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Filter className="w-4 h-4 md:w-5 md:h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div>
                <Label className="text-xs md:text-sm">Mes</Label>
                <Select value={String(filtros.mes)} onValueChange={(v) => setFiltros({...filtros, mes: parseInt(v)})}>
                  <SelectTrigger className="text-sm md:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 12}, (_, i) => (
                      <SelectItem key={i+1} value={String(i+1)}>
                        {format(new Date(2025, i, 1), 'MMMM', { locale: es })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs md:text-sm">Año</Label>
                <Select value={String(filtros.anio)} onValueChange={(v) => setFiltros({...filtros, anio: parseInt(v)})}>
                  <SelectTrigger className="text-sm md:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs md:text-sm">Cliente</Label>
                <Select value={filtros.cliente} onValueChange={(v) => setFiltros({...filtros, cliente: v})}>
                  <SelectTrigger className="text-sm md:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los clientes</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs md:text-sm">Estado</Label>
                <Select value={filtros.estado_pago} onValueChange={(v) => setFiltros({...filtros, estado_pago: v})}>
                  <SelectTrigger className="text-sm md:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="retraso">Retraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Ingresos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-3 md:p-6">
              <p className="text-xs text-slate-600 mb-1">Ingresos</p>
              <p className="text-lg md:text-2xl font-bold text-green-600">{ingresosFiltrados.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-3 md:p-6">
              <p className="text-xs text-slate-600 mb-1">Total</p>
              <p className="text-lg md:text-2xl font-bold text-[#1a1a1a]">{totalIngresos.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-3 md:p-6">
              <p className="text-xs text-slate-600 mb-1">IVA</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600">{totalIva.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-3 md:p-6">
              <p className="text-xs text-slate-600 mb-1">Recurrentes</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600">{ingresosRecurrentes}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de ingresos */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-xl p-4">
            <CardTitle className="text-base md:text-lg">Listado de Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs md:text-sm whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="text-xs md:text-sm whitespace-nowrap">Nº Factura</TableHead>
                    <TableHead className="text-xs md:text-sm whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="text-xs md:text-sm whitespace-nowrap hidden sm:table-cell">Concepto</TableHead>
                    <TableHead className="text-xs md:text-sm text-right whitespace-nowrap">Neto</TableHead>
                    <TableHead className="text-xs md:text-sm text-right whitespace-nowrap">IVA</TableHead>
                    <TableHead className="text-xs md:text-sm text-right whitespace-nowrap">Total</TableHead>
                    <TableHead className="text-xs md:text-sm text-center whitespace-nowrap">Método</TableHead>
                    <TableHead className="text-xs md:text-sm text-center whitespace-nowrap">Estado</TableHead>
                    <TableHead className="text-xs md:text-sm text-center whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingresosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-slate-500 text-sm">
                        No hay ingresos registrados para este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    ingresosFiltrados.map((ingreso) => (
                      <TableRow key={ingreso.id} className="hover:bg-slate-50">
                        <TableCell className="text-xs md:text-sm whitespace-nowrap">
                          {format(new Date(ingreso.fecha), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm font-mono whitespace-nowrap">{ingreso.numero_factura}</TableCell>
                        <TableCell className="text-xs md:text-sm whitespace-nowrap">{ingreso.cliente_nombre}</TableCell>
                        <TableCell className="text-xs md:text-sm hidden sm:table-cell">{ingreso.concepto}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right font-semibold text-slate-700 whitespace-nowrap">
                          {(ingreso.importe_sin_iva || 0).toFixed(2)}€
                        </TableCell>
                        <TableCell className="text-xs md:text-sm text-right text-purple-600 whitespace-nowrap">
                          {(ingreso.iva_importe || 0).toFixed(2)}€
                        </TableCell>
                        <TableCell className="text-xs md:text-sm text-right font-bold text-green-600 whitespace-nowrap">
                          {(ingreso.total || 0).toFixed(2)}€
                        </TableCell>
                        <TableCell className="text-center">
                          <Select 
                            value={ingreso.metodo_pago || 'transferencia'}
                            onValueChange={(value) => updateMetodoPagoMutation.mutate({ id: ingreso.id, metodo_pago: value })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transferencia">Transferencia</SelectItem>
                              <SelectItem value="bizum">Bizum</SelectItem>
                              <SelectItem value="pago_tarjeta">Pago Tarjeta</SelectItem>
                              <SelectItem value="efectivo">Efectivo</SelectItem>
                              <SelectItem value="remesa">Remesa</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Select 
                            value={ingreso.estado_pago || 'pendiente'}
                            onValueChange={(value) => updateEstadoPagoMutation.mutate({ id: ingreso.id, estado_pago: value })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                              <SelectItem value="pagado">✅ Pagado</SelectItem>
                              <SelectItem value="retraso">⚠️ Retraso</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditarIngreso(ingreso)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEliminarIngreso(ingreso.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
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

        {/* Modal Ingreso */}
        {modalAbierto && (
          <Dialog open={true} onOpenChange={() => setModalAbierto(false)}>
            <DialogContent className="max-w-xs sm:max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{ingresoEditar ? 'Editar Ingreso' : 'Nuevo Ingreso'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Cliente *</Label>
                      <Select value={formData.cliente_id} onValueChange={(value) => setFormData({...formData, cliente_id: value})} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Fecha *</Label>
                      <Input
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Numero de Factura field */}
                  <div>
                    <Label>Número de Factura</Label>
                    <Input
                      value={formData.numero_factura}
                      onChange={(e) => setFormData({...formData, numero_factura: e.target.value})}
                      placeholder="Ej: 2025-001 (se genera automáticamente si se deja vacío)"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Se genera automáticamente si se deja vacío
                    </p>
                  </div>

                  <div>
                    <Label>Concepto *</Label>
                    <Input
                      value={formData.concepto}
                      onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                      placeholder="Ej: Mantenimiento mensual"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="aplicar-iva"
                      checked={formData.aplicar_iva}
                      onChange={(e) => setFormData({
                        ...formData, 
                        aplicar_iva: e.target.checked,
                        iva_porcentaje: e.target.checked ? 21 : 0
                      })}
                      className="w-5 h-5 text-[#24c4ba] rounded focus:ring-[#24c4ba]"
                    />
                    <Label htmlFor="aplicar-iva" className="cursor-pointer font-medium">
                      Aplicar IVA a esta factura
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Importe sin IVA (Neto) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.importe_sin_iva}
                        onChange={(e) => setFormData({...formData, importe_sin_iva: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <Label>IVA %</Label>
                      <Select
                        value={String(formData.iva_porcentaje)}
                        onValueChange={(value) => setFormData({...formData, iva_porcentaje: parseInt(value)})}
                        disabled={!formData.aplicar_iva}
                      >
                        <SelectTrigger className={!formData.aplicar_iva ? 'bg-slate-100' : ''}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0% (Sin IVA)</SelectItem>
                          <SelectItem value="4">4% (Superreducido)</SelectItem>
                          <SelectItem value="10">10% (Reducido)</SelectItem>
                          <SelectItem value="21">21% (General)</SelectItem>
                        </SelectContent>
                      </Select>
                      {!formData.aplicar_iva && (
                        <p className="text-xs text-slate-500 mt-1">IVA desactivado</p>
                      )}
                    </div>

                    <div>
                      <Label>Total (con IVA)</Label>
                      <div className="relative">
                        <Input
                          value={formData.importe_sin_iva ? (parseFloat(formData.importe_sin_iva) * (1 + (formData.aplicar_iva ? formData.iva_porcentaje : 0) / 100)).toFixed(2) : '0.00'}
                          disabled
                          className="bg-gradient-to-r from-green-50 to-green-100 font-bold text-green-700 border-green-200"
                        />
                      </div>
                      {!formData.aplicar_iva && (
                        <p className="text-xs text-green-600 mt-1">= Neto (sin IVA)</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Método de Pago</Label>
                      <Select value={formData.metodo_pago} onValueChange={(value) => setFormData({...formData, metodo_pago: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona método de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="bizum">Bizum</SelectItem>
                          <SelectItem value="pago_tarjeta">Pago Tarjeta</SelectItem>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="remesa">Remesa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Estado de Pago</Label>
                      <Select value={formData.estado_pago} onValueChange={(value) => setFormData({...formData, estado_pago: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                          <SelectItem value="pagado">✅ Pagado</SelectItem>
                          <SelectItem value="retraso">⚠️ Retraso en el Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.recurrente}
                      onCheckedChange={(checked) => setFormData({...formData, recurrente: checked})}
                      id="recurrente-checkbox"
                    />
                    <Label htmlFor="recurrente-checkbox">Ingreso recurrente (se duplicará automáticamente cada mes)</Label>
                  </div>

                  {formData.recurrente && (
                    <div>
                      <Label>Fecha de finalización (opcional)</Label>
                      <Input
                        type="date"
                        value={formData.fecha_finalizacion}
                        onChange={(e) => setFormData({...formData, fecha_finalizacion: e.target.value})}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Notas</Label>
                    <Input
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>

                <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setModalAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-green-600 to-green-700">
                    {ingresoEditar ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal CSV */}
        {modalCSV && (
          <Dialog open={true} onOpenChange={() => { setModalCSV(false); setVistaPrevia([]); }}>
            <DialogContent className="max-w-xs sm:max-w-md md:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Ingresos desde CSV</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>📋 Formato del CSV:</strong>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Columnas requeridas: <code>cliente_nombre</code>, <code>concepto</code>, <code>importe_sin_iva</code>, <code>iva_porcentaje</code>, <code>fecha</code></li>
                      <li>Opcionales: <code>numero_factura</code>, <code>metodo_pago</code>, <code>estado_pago</code>, <code>recurrente</code>, <code>fecha_finalizacion</code>, <code>notas</code></li>
                      <li>Las fechas deben estar en formato YYYY-MM-DD</li>
                      <li>Descarga la plantilla para un ejemplo completo</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="csv-file-input">Seleccionar archivo CSV</Label>
                  <Input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="mt-2"
                  />
                </div>

                {vistaPrevia.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Vista Previa ({vistaPrevia.length} ingresos)</h3>
                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Cliente</TableHead>
                            <TableHead className="text-xs">Concepto</TableHead>
                            <TableHead className="text-xs text-right">Base</TableHead>
                            <TableHead className="text-xs text-right">IVA%</TableHead>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Nº Factura</TableHead>
                            <TableHead className="text-xs text-center">Método</TableHead>
                            <TableHead className="text-xs text-center">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vistaPrevia.map((ing, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-xs">{ing.cliente_nombre}</TableCell>
                              <TableCell className="text-xs">{ing.concepto}</TableCell>
                              <TableCell className="text-xs text-right">{(ing.importe_sin_iva || 0).toFixed(2)}€</TableCell>
                              <TableCell className="text-xs text-right">{ing.iva_porcentaje || 21}%</TableCell>
                              <TableCell className="text-xs">{format(new Date(ing.fecha), 'dd/MM/yyyy', { locale: es })}</TableCell>
                              <TableCell className="text-xs">{ing.numero_factura || 'Auto'}</TableCell>
                              <TableCell className="text-xs text-center">{ing.metodo_pago || 'transf.'}</TableCell>
                              <TableCell className="text-xs text-center">{ing.estado_pago || 'pendiente'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setModalCSV(false); setVistaPrevia([]); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => importarCSVMutation.mutate(vistaPrevia)}
                  disabled={vistaPrevia.length === 0}
                  className="bg-gradient-to-r from-green-600 to-green-700"
                >
                  Importar {vistaPrevia.length} ingresos
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Cliente */}
        {modalCliente && (
          <Dialog open={true} onOpenChange={() => setModalCliente(false)}>
            <DialogContent className="max-w-xs sm:max-w-md md:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitCliente}>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={clienteData.nombre}
                      onChange={(e) => setClienteData({...clienteData, nombre: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label>Empresa</Label>
                    <Input
                      value={clienteData.empresa}
                      onChange={(e) => setClienteData({...clienteData, empresa: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label>CIF/NIF</Label>
                    <Input
                      value={clienteData.cif_nif}
                      onChange={(e) => setClienteData({...clienteData, cif_nif: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label>Dirección</Label>
                    <Input
                      value={clienteData.direccion}
                      onChange={(e) => setClienteData({...clienteData, direccion: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        value={clienteData.telefono}
                        onChange={(e) => setClienteData({...clienteData, telefono: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={clienteData.email}
                        onChange={(e) => setClienteData({...clienteData, email: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setModalCliente(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f]">
                    Crear Cliente
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
