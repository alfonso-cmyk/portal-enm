
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Copy, Download, Filter, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea import
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils"; // Added createPageUrl import

const CATEGORIAS = [
  { value: "nomina", label: "💰 Nómina", keywords: ["nomina", "salario", "sueldo"], sinIva: true },
  { value: "seguridad_social", label: "🏥 Seguridad Social", keywords: ["seguridad social", "ss", "cotizacion"], sinIva: true },
  { value: "iva_303", label: "📊 IVA (Modelo 303)", keywords: ["iva", "303", "trimestral"], sinIva: true },
  { value: "irpf_111", label: "💼 Retenciones IRPF (Modelo 111)", keywords: ["irpf", "111", "retencion"], sinIva: true },
  { value: "alquiler_115", label: "🏢 Retención Alquiler (Modelo 115)", keywords: ["alquiler", "115", "renta"], sinIva: true },
  { value: "pago_fraccionado_130", label: "📝 Pago Fraccionado IRPF (130/131)", keywords: ["130", "131", "autonomo"], sinIva: true },
  { value: "impuesto_sociedades_202", label: "🏦 Pago Fraccionado Sociedades (202)", keywords: ["202", "sociedades"], sinIva: true },
  { value: "autonomos_reta", label: "👤 Autónomos (RETA)", keywords: ["reta", "autonomo", "cuota"], sinIva: true },
  { value: "mutua", label: "⚕️ Mutua/Prevención", keywords: ["mutua", "prevencion", "riesgos"], sinIva: true },
  { value: "herramientas", label: "🔨 Herramientas", keywords: ["herramienta", "tool", "martillo"] },
  { value: "material", label: "📦 Material", keywords: ["material", "semilla", "tierra"] },
  { value: "combustible", label: "⛽ Combustible", keywords: ["gasolina", "diesel", "combustible"] },
  { value: "publicidad", label: "📢 Publicidad", keywords: ["publicidad", "marketing", "anuncio"] },
  { value: "hosting", label: "💻 Hosting/Software", keywords: ["hosting", "dominio", "software"] },
  { value: "asesoria", label: "📋 Asesoría", keywords: ["asesoria", "gestor", "abogado"] },
  { value: "alquiler", label: "🏠 Alquiler Local", keywords: ["alquiler local", "arrendamiento"] },
  { value: "suministros", label: "💡 Suministros", keywords: ["luz", "agua", "electricidad"] },
  { value: "transporte", label: "🚚 Transporte", keywords: ["transporte", "flete", "envio"] },
  { value: "formacion", label: "📚 Formación", keywords: ["curso", "formacion", "training"] },
  { value: "gasto_empleado", label: "👤 Gasto Empleado", keywords: [] }, // Added this category for employee expenses
  { value: "otro", label: "📌 Otro", keywords: [] }
];

const detectarCategoria = (concepto) => {
  if (!concepto) return "otro";

  const conceptoLower = concepto.toLowerCase();

  for (const cat of CATEGORIAS) {
    if (cat.keywords.some(keyword => conceptoLower.includes(keyword))) {
      return cat.value;
    }
  }

  return "otro";
};

// Assuming createPageUrl is defined in @/utils, keeping its structure for consistency.
// If createPageUrl is not available globally or from @/utils, uncomment and define it here:
/*
const createPageUrl = (pageName) => {
  if (pageName === "GestionGastosEmpleados") {
    return "/gestion-gastos-empleados";
  }
  return "#";
};
*/

export default function GestionGastos() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [gastoEditar, setGastoEditar] = useState(null);
  const [filtros, setFiltros] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    categoria: "todas",
    empresa: "todas", // This filter refers to 'imputado_a'
    estado: "todos"
  });

  const [formData, setFormData] = useState({
    concepto: "",
    categoria: "otro",
    importe_sin_iva: "",
    iva_porcentaje: 21,
    neto_empleado: "",
    coste_empresa: "",
    pagado_por: "ENM",
    imputado_a: "ENM",
    estado: "pendiente",
    fecha: new Date().toISOString().split('T')[0],
    recurrente: false,
    archivo_justificante: "",
    notas: ""
  });

  const [uploadingFile, setUploadingFile] = useState(false);
  const [modalCSV, setModalCSV] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin';

  // Query para gastos de empresa
  const { data: gastosEmpresa = [] } = useQuery({
    queryKey: ['gastos'], // This key refers to company expenses
    queryFn: () => base44.entities.Gasto.list("-fecha"),
    staleTime: 2 * 60 * 1000,
    initialData: [],
  });

  // Query para gastos de empleados (TODOS, no solo pendientes)
  const { data: allGastosEmpleados = [] } = useQuery({
    queryKey: ['gastos-empleados-todos'], // New query key
    queryFn: () => base44.entities.GastoEmpleado.list("-fecha"),
    // No 'enabled' prop here as per outline. The rendering is guarded by isAdmin.
    staleTime: 2 * 60 * 1000,
    initialData: [],
  });

  // Combinar ambos tipos de gastos
  const todosLosGastos = React.useMemo(() => {
    const gastosEmpresaMapped = gastosEmpresa.map(g => ({
      ...g,
      tipo_gasto: 'empresa',
      id_original: g.id // Store original ID for mutations
    }));

    const gastosEmpleadosMapped = allGastosEmpleados.map(g => ({
      id: `empleado-${g.id}`, // Create a unique ID for the combined list
      id_original: g.id,
      concepto: `${g.concepto} (Empleado: ${g.empleado_nombre})`, // Enhance concept for clarity
      categoria: 'gasto_empleado', // Fixed category for all employee expenses
      fecha: g.fecha,
      mes: new Date(g.fecha).getMonth() + 1, // Ensure mes/anio are correctly parsed
      anio: new Date(g.fecha).getFullYear(),
      importe_sin_iva: parseFloat(g.importe), // GastoEmpleado has 'importe' as total without tax breakdown
      iva_porcentaje: 0, // Assume employee expenses are pre-tax or IVA not tracked this way
      iva_importe: 0,
      total: parseFloat(g.importe),
      pagado_por: g.empresa_imputada, // Use empresa_imputada as payer
      imputado_a: g.empresa_imputada, // Use empresa_imputada as imputee
      estado: g.estado_reembolso === 'reembolsado' ? 'pagado' : 'pendiente', // Map reembolso state to general state
      estado_reembolso: g.estado_reembolso, // Keep original state for detail
      notas: g.notas,
      tipo_gasto: 'empleado',
      empleado_nombre: g.empleado_nombre,
      archivo_justificante: g.archivo_justificante, // Add justificante
      recurrente: false, // Employee expenses are not recurrent in this context
      neto_empleado: null, // Not applicable
      coste_empresa: null // Not applicable
    }));

    // Sort combined expenses by date (most recent first)
    return [...gastosEmpresaMapped, ...gastosEmpleadosMapped].sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [gastosEmpresa, allGastosEmpleados]); // Dependencies changed to combined lists

  // Contar gastos de empleados pendientes (para alerta)
  const gastosEmpleadosPendientes = allGastosEmpleados.filter(g => g.estado_reembolso === 'reembolsar'); // Derived from allGastosEmpleados

  const createGastoMutation = useMutation({
    mutationFn: async (data) => {
      const fecha = new Date(data.fecha);
      const categoriaInfo = CATEGORIAS.find(c => c.value === data.categoria);
      const esSinIva = categoriaInfo?.sinIva || false;
      
      let gastoData = {
        concepto: data.concepto,
        categoria: data.categoria,
        pagado_por: data.pagado_por,
        imputado_a: data.imputado_a,
        estado: data.estado,
        fecha: data.fecha,
        recurrente: data.recurrente,
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear()
      };

      // Añadir campos opcionales solo si tienen valor
      if (data.archivo_justificante) gastoData.archivo_justificante = data.archivo_justificante;
      if (data.notas) gastoData.notas = data.notas;

      if (data.categoria === 'nomina') {
        const netoEmpleado = parseFloat(data.neto_empleado);
        const costeEmpresa = parseFloat(data.coste_empresa);
        
        if (isNaN(netoEmpleado)) {
          throw new Error('El campo "Neto Empleado" debe ser un número válido.');
        }
        if (isNaN(costeEmpresa)) {
          throw new Error('El campo "Coste Empresa" debe ser un número válido.');
        }
        
        gastoData.neto_empleado = netoEmpleado;
        gastoData.coste_empresa = costeEmpresa;
        gastoData.importe_sin_iva = costeEmpresa; // Base for nomina is total cost for company
        gastoData.iva_porcentaje = 0;
        gastoData.iva_importe = 0;
        gastoData.total = costeEmpresa;
      } else if (esSinIva) {
        // Impuestos y SS: sin IVA
        const base = parseFloat(data.importe_sin_iva);
        if (isNaN(base)) {
          throw new Error('El campo "Importe Total" debe ser un número válido.');
        }
        
        gastoData.importe_sin_iva = base;
        gastoData.iva_porcentaje = 0;
        gastoData.iva_importe = 0;
        gastoData.total = base;
      } else {
        // Gastos normales: con IVA
        const base = parseFloat(data.importe_sin_iva);
        const ivaPorcentaje = parseInt(data.iva_porcentaje) || 0;
        
        if (isNaN(base)) {
          throw new Error('El campo "Importe sin IVA" debe ser un número válido.');
        }
        
        const ivaImporte = (base * ivaPorcentaje) / 100;
        gastoData.importe_sin_iva = base;
        gastoData.iva_porcentaje = ivaPorcentaje;
        gastoData.iva_importe = ivaImporte;
        gastoData.total = base + ivaImporte;
      }

      console.log('📤 Enviando gasto:', gastoData);
      return base44.entities.Gasto.create(gastoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setModalAbierto(false);
      resetForm();
      alert('✅ Gasto creado correctamente');
    },
    onError: (error) => {
      console.error('❌ Error al crear gasto:', error);
      alert('Error al crear el gasto: ' + (error.message || 'Error desconocido'));
    }
  });

  const updateGastoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const fecha = new Date(data.fecha);
      const categoriaInfo = CATEGORIAS.find(c => c.value === data.categoria);
      const esSinIva = categoriaInfo?.sinIva || false;
      
      let gastoData = {
        concepto: data.concepto,
        categoria: data.categoria,
        pagado_por: data.pagado_por,
        imputado_a: data.imputado_a,
        estado: data.estado,
        fecha: data.fecha,
        recurrente: data.recurrente,
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear()
      };

      // Añadir campos opcionales solo si tienen valor
      if (data.archivo_justificante) gastoData.archivo_justificante = data.archivo_justificante;
      if (data.notas) gastoData.notas = data.notas;

      if (data.categoria === 'nomina') {
        const netoEmpleado = parseFloat(data.neto_empleado);
        const costeEmpresa = parseFloat(data.coste_empresa);
        
        if (isNaN(netoEmpleado)) {
          throw new Error('El campo "Neto Empleado" debe ser un número válido.');
        }
        if (isNaN(costeEmpresa)) {
          throw new Error('El campo "Coste Empresa" debe ser un número válido.');
        }
        
        gastoData.neto_empleado = netoEmpleado;
        gastoData.coste_empresa = costeEmpresa;
        gastoData.importe_sin_iva = costeEmpresa;
        gastoData.iva_porcentaje = 0;
        gastoData.iva_importe = 0;
        gastoData.total = costeEmpresa;
      } else if (esSinIva) {
        const base = parseFloat(data.importe_sin_iva);
        if (isNaN(base)) {
          throw new Error('El campo "Importe Total" debe ser un número válido.');
        }
        
        gastoData.importe_sin_iva = base;
        gastoData.iva_porcentaje = 0;
        gastoData.iva_importe = 0;
        gastoData.total = base;
      } else {
        const base = parseFloat(data.importe_sin_iva);
        const ivaPorcentaje = parseInt(data.iva_porcentaje) || 0;
        
        if (isNaN(base)) {
          throw new Error('El campo "Importe sin IVA" debe ser un número válido.');
        }
        
        const ivaImporte = (base * ivaPorcentaje) / 100;
        gastoData.importe_sin_iva = base;
        gastoData.iva_porcentaje = ivaPorcentaje;
        gastoData.iva_importe = ivaImporte;
        gastoData.total = base + ivaImporte;
      }

      console.log('🔄 Actualizando gasto:', gastoData);
      return base44.entities.Gasto.update(id, gastoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setModalAbierto(false);
      setGastoEditar(null);
      resetForm();
      alert('✅ Gasto actualizado correctamente');
    },
    onError: (error) => {
      console.error('❌ Error al actualizar gasto:', error);
      alert('Error al actualizar el gasto: ' + (error.message || 'Error desconocido'));
    }
  });

  // Mutation para cambiar estado (solo pendiente/pagado) - now handles both Gasto and GastoEmpleado
  const updateGastoStatusMutation = useMutation({
    mutationFn: async ({ id, estado, tipo_gasto }) => { // Added tipo_gasto
      if (tipo_gasto === 'empresa') {
        return base44.entities.Gasto.update(id, { estado });
      } else { // tipo_gasto === 'empleado'
        const nuevoEstadoReembolso = estado === 'pagado' ? 'reembolsado' : 'reembolsar';
        return base44.entities.GastoEmpleado.update(id, { estado_reembolso: nuevoEstadoReembolso });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] }); // Invalidate company expenses
      queryClient.invalidateQueries({ queryKey: ['gastos-empleados-todos'] }); // Invalidate all employee expenses
      // No alert needed for inline update, as it's a quick action
    },
    onError: (error) => {
      console.error('❌ Error al actualizar el estado del gasto:', error);
      alert('Error al actualizar el estado del gasto: ' + (error.message || 'Error desconocido'));
    }
  });


  const deleteGastoMutation = useMutation({
    mutationFn: ({ id, tipo_gasto }) => { // Added tipo_gasto
      if (tipo_gasto === 'empresa') {
        return base44.entities.Gasto.delete(id);
      } else { // tipo_gasto === 'empleado'
        return base44.entities.GastoEmpleado.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-empleados-todos'] }); // Invalidate all employee expenses
      alert('✅ Gasto eliminado correctamente');
    },
    onError: (error) => {
      console.error('❌ Error al eliminar gasto:', error);
      alert('Error al eliminar el gasto: ' + (error.message || 'Error desconocido'));
    }
  });

  const duplicarRecurrentesMutation = useMutation({
    mutationFn: async () => {
      // This mutation specifically targets 'Gasto' entities (company expenses)
      const recurrentes = gastosEmpresa.filter(g => g.recurrente); // Use gastosEmpresa
      const mesActual = filtros.mes;
      const anioActual = filtros.anio;

      // Check if recurrent expenses for the current month and year already exist
      const existingRecurrentForCurrentPeriod = gastosEmpresa.filter(g => // Use gastosEmpresa
        g.recurrente && g.mes === mesActual && g.anio === anioActual
      );

      if (existingRecurrentForCurrentPeriod.length > 0) {
        alert('Ya existen gastos recurrentes duplicados para el mes y año actuales. No se duplicarán de nuevo.');
        return Promise.resolve([]); // Resolve with an empty array if already duplicated
      }

      const mesSiguiente = filtros.mes === 12 ? 1 : filtros.mes + 1;
      const anioSiguiente = filtros.mes === 12 ? filtros.anio + 1 : filtros.anio;

      const promesas = recurrentes.map(gasto => {
        // Use the original date's day if possible, otherwise default to 1st of the month
        const originalDate = new Date(gasto.fecha);
        const day = originalDate.getDate();
        const nuevaFecha = new Date(anioSiguiente, mesSiguiente - 1, day);

        return base44.entities.Gasto.create({
          concepto: gasto.concepto,
          categoria: gasto.categoria,
          importe_sin_iva: gasto.importe_sin_iva,
          iva_porcentaje: gasto.iva_porcentaje,
          iva_importe: gasto.iva_importe,
          total: gasto.total,
          neto_empleado: gasto.neto_empleado,
          coste_empresa: gasto.coste_empresa,
          pagado_por: gasto.pagado_por,
          imputado_a: gasto.imputado_a,
          estado: "pendiente", // New recurrent gastos are typically pending
          mes: mesSiguiente,
          anio: anioSiguiente,
          fecha: nuevaFecha.toISOString().split('T')[0],
          recurrente: true,
          notas: `Gasto recurrente duplicado desde ${format(originalDate, 'MM/yyyy')}. Original ID: ${gasto.id}. ${gasto.notas || ''}`.trim()
        });
      });

      return Promise.all(promesas);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      alert('✅ Gastos recurrentes duplicados correctamente para el siguiente período.');
    },
    onError: (error) => {
      console.error('❌ Error al duplicar gastos recurrentes:', error);
      alert('Error al duplicar los gastos recurrentes: ' + (error.message || 'Error desconocido'));
    }
  });

  const importarCSVMutation = useMutation({
    mutationFn: async (gastosData) => {
      const resultados = [];
      
      for (const gastoData of gastosData) {
        try {
          const fecha = new Date(gastoData.fecha);
          
          let gastoFinal = {
            concepto: gastoData.concepto,
            categoria: gastoData.categoria,
            pagado_por: gastoData.pagado_por,
            imputado_a: gastoData.imputado_a,
            estado: gastoData.estado, // Will be 'pendiente' or 'pagado'
            fecha: gastoData.fecha,
            recurrente: gastoData.recurrente,
            mes: fecha.getMonth() + 1,
            anio: fecha.getFullYear(),
            notas: gastoData.notas || ""
          };

          const categoriaInfo = CATEGORIAS.find(c => c.value === gastoData.categoria);
          const esSinIva = categoriaInfo?.sinIva || false;

          if (gastoData.categoria === 'nomina') {
            gastoFinal.neto_empleado = parseFloat(gastoData.neto_empleado);
            gastoFinal.coste_empresa = parseFloat(gastoData.coste_empresa);
            gastoFinal.importe_sin_iva = gastoFinal.coste_empresa;
            gastoFinal.iva_porcentaje = 0;
            gastoFinal.iva_importe = 0;
            gastoFinal.total = gastoFinal.coste_empresa;
          } else if (esSinIva) {
            const base = parseFloat(gastoData.importe_sin_iva);
            gastoFinal.importe_sin_iva = base;
            gastoFinal.iva_porcentaje = 0;
            gastoFinal.iva_importe = 0;
            gastoFinal.total = base;
          } else {
            const base = parseFloat(gastoData.importe_sin_iva);
            const ivaPorcentaje = parseInt(gastoData.iva_porcentaje) || 21;
            const ivaImporte = (base * ivaPorcentaje) / 100;
            gastoFinal.importe_sin_iva = base;
            gastoFinal.iva_porcentaje = ivaPorcentaje;
            gastoFinal.iva_importe = ivaImporte;
            gastoFinal.total = base + ivaImporte;
          }

          await base44.entities.Gasto.create(gastoFinal);
          resultados.push({ concepto: gastoData.concepto, accion: 'creado' });
        } catch (error) {
          resultados.push({ concepto: gastoData.concepto, accion: 'error', error: error.message });
        }
      }
      
      return resultados;
    },
    onSuccess: (resultados) => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setModalCSV(false);
      setVistaPrevia([]);
      
      const creados = resultados.filter(r => r.accion === 'creado').length;
      const errores = resultados.filter(r => r.accion === 'error').length;
      
      alert(`✅ Importación completada:\n- ${creados} gastos creados\n${errores > 0 ? `- ${errores} errores` : ''}`);
    },
  });

  const handleConceptoChange = (valor) => {
    const categoriaDetectada = detectarCategoria(valor);
    setFormData({
      ...formData,
      concepto: valor,
      categoria: categoriaDetectada
    });
  };

  const resetForm = () => {
    setFormData({
      concepto: "",
      categoria: "otro",
      importe_sin_iva: "",
      iva_porcentaje: 21,
      neto_empleado: "",
      coste_empresa: "",
      pagado_por: "ENM",
      imputado_a: "ENM",
      estado: "pendiente",
      fecha: new Date().toISOString().split('T')[0],
      recurrente: false,
      archivo_justificante: "",
      notas: ""
    });
  };

  const handleNuevoGasto = () => {
    setGastoEditar(null);
    resetForm();
    setModalAbierto(true);
  };

  const handleEditarGasto = (gasto) => {
    if (gasto.tipo_gasto === 'empleado') {
      // For employee expenses, redirect to the specific employee expenses management page
      window.location.href = createPageUrl("GestionGastosEmpleados");
      return;
    }
    
    setGastoEditar(gasto);
    setFormData({
      concepto: gasto.concepto || "",
      categoria: gasto.categoria || "otro",
      importe_sin_iva: gasto.importe_sin_iva !== undefined && gasto.importe_sin_iva !== null ? String(gasto.importe_sin_iva) : "",
      iva_porcentaje: gasto.iva_porcentaje !== undefined && gasto.iva_porcentaje !== null ? Number(gasto.iva_porcentaje) : 21,
      neto_empleado: gasto.neto_empleado !== undefined && gasto.neto_empleado !== null ? String(gasto.neto_empleado) : "",
      coste_empresa: gasto.coste_empresa !== undefined && gasto.coste_empresa !== null ? String(gasto.coste_empresa) : "",
      pagado_por: gasto.pagado_por || "ENM",
      imputado_a: gasto.imputado_a || "ENM",
      estado: gasto.estado || "pendiente",
      fecha: gasto.fecha || new Date().toISOString().split('T')[0],
      recurrente: gasto.recurrente || false,
      archivo_justificante: gasto.archivo_justificante || "",
      notas: gasto.notas || ""
    });
    setModalAbierto(true);
  };

  const handleEliminarGasto = (gasto) => { // Modified to accept the full gasto object
    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      deleteGastoMutation.mutate({ id: gasto.id_original, tipo_gasto: gasto.tipo_gasto }); // Pass original ID and type
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log('📝 Datos del formulario:', formData);

    // Validaciones
    if (!formData.concepto.trim()) {
      alert('❌ El concepto es obligatorio');
      return;
    }

    const categoriaInfo = CATEGORIAS.find(c => c.value === formData.categoria);
    const esSinIva = categoriaInfo?.sinIva || false;
    const esNomina = formData.categoria === 'nomina';

    if (esNomina) {
      const netoEmpleadoNum = parseFloat(formData.neto_empleado);
      if (isNaN(netoEmpleadoNum) || netoEmpleadoNum <= 0) {
        alert('❌ El neto del empleado es obligatorio y debe ser un número positivo para nóminas');
        return;
      }
      const costeEmpresaNum = parseFloat(formData.coste_empresa);
      if (isNaN(costeEmpresaNum) || costeEmpresaNum <= 0) {
        alert('❌ El coste empresa es obligatorio y debe ser un número positivo para nóminas');
        return;
      }
    } else {
      // For expenses without IVA and regular expenses, importe_sin_iva is the primary amount
      const importeSinIvaNum = parseFloat(formData.importe_sin_iva);
      if (isNaN(importeSinIvaNum) || importeSinIvaNum <= 0) {
        alert('❌ El importe es obligatorio y debe ser un número positivo');
        return;
      }
    }

    if (gastoEditar) {
      updateGastoMutation.mutate({ id: gastoEditar.id_original, data: formData }); // Use id_original for company expenses
    } else {
      createGastoMutation.mutate(formData);
    }
  };

  const handleSubirArchivo = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingFile(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        setFormData({...formData, archivo_justificante: result.file_url});
        alert('✅ Archivo subido correctamente');
      } catch (error) {
        alert('Error al subir el archivo');
      } finally {
        setUploadingFile(false);
      }
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
      const gastosData = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const gasto = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header) {
            case 'concepto':
              gasto.concepto = value;
              // Detect category based on concept if not explicitly provided or if concept is primary source
              if (!gasto.categoria) gasto.categoria = detectarCategoria(value); 
              break;
            case 'categoria':
              if (value) gasto.categoria = value;
              break;
            case 'importe_sin_iva':
            case 'importe':
            case 'base':
              gasto.importe_sin_iva = value;
              break;
            case 'iva_porcentaje':
            case 'iva':
              gasto.iva_porcentaje = parseInt(value) || 21;
              break;
            case 'neto_empleado':
              gasto.neto_empleado = value;
              break;
            case 'coste_empresa':
              gasto.coste_empresa = value;
              break;
            case 'pagado_por':
              gasto.pagado_por = value || 'ENM'; // Default to ENM if not specified
              break;
            case 'imputado_a':
              gasto.imputado_a = value || 'ENM'; // Default to ENM if not specified
              break;
            case 'estado':
              // Map old states if necessary, only allow 'pendiente' and 'pagado' for Gasto entity
              if (value.toLowerCase() === 'pagado') {
                gasto.estado = 'pagado';
              } else {
                gasto.estado = 'pendiente';
              }
              break;
            case 'fecha':
              gasto.fecha = value;
              break;
            case 'recurrente':
              gasto.recurrente = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'sí';
              break;
            case 'notas':
              gasto.notas = value;
              break;
          }
        });

        // Final checks and defaults before pushing
        if (gasto.concepto && gasto.fecha) {
          if (!gasto.categoria) gasto.categoria = detectarCategoria(gasto.concepto);
          if (!gasto.pagado_por) gasto.pagado_por = 'ENM';
          if (!gasto.imputado_a) gasto.imputado_a = 'ENM';
          if (!gasto.estado) gasto.estado = 'pendiente'; // Default to pendiente
          if (gasto.recurrente === undefined) gasto.recurrente = false;
          if (!gasto.iva_porcentaje) gasto.iva_porcentaje = 21;
          
          gastosData.push(gasto);
        }
      }

      setVistaPrevia(gastosData);
    };

    reader.readAsText(file);
  };

  const exportarPlantillaCSV = () => {
    const plantilla = [
      ['concepto', 'categoria', 'importe_sin_iva', 'iva_porcentaje', 'neto_empleado', 'coste_empresa', 'pagado_por', 'imputado_a', 'estado', 'fecha', 'recurrente', 'notas'].join(','),
      ['Gasolina furgoneta', 'combustible', '100', '21', '', '', 'ENM', 'ENM', 'pagado', '2025-01-15', 'false', ''].join(','),
      ['Nómina Enero Juan', 'nomina', '', '', '1200', '1600', 'ENM', 'ENM', 'pagado', '2025-01-31', 'true', 'Nómina mensual'].join(','),
      ['IVA 4T 2024', 'iva_303', '780', '0', '', '', 'ENM', 'ENM', 'pendiente', '2025-01-20', 'false', 'Modelo 303'].join(',')
    ].join('\n');

    const blob = new Blob([plantilla], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_gastos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const gastosFiltrados = todosLosGastos.filter(g => { // Changed 'gastos' to 'todosLosGastos'
    const matchMes = g.mes === filtros.mes;
    const matchAnio = g.anio === filtros.anio;
    const matchCategoria = filtros.categoria === "todas" || g.categoria === filtros.categoria;
    const matchEmpresa = filtros.empresa === "todas" || g.imputado_a === filtros.empresa; // 'empresa' filter maps to 'imputado_a'
    const matchEstado = filtros.estado === "todos" || g.estado === filtros.estado;
    return matchMes && matchAnio && matchCategoria && matchEmpresa && matchEstado;
  });

  const totalMes = gastosFiltrados.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalIvaMes = gastosFiltrados.reduce((sum, g) => sum + (g.iva_importe || 0), 0);
  const pendientesPago = gastosFiltrados.filter(g => g.estado === "pendiente").length;

  const categoriaSeleccionada = CATEGORIAS.find(c => c.value === formData.categoria);
  const esSinIva = categoriaSeleccionada?.sinIva || false;
  const esNomina = formData.categoria === 'nomina';

  const exportarCSV = () => {
    const csvContent = [
      ['Concepto', 'Categoría', 'Fecha', 'Base', 'IVA', 'Total', 'Neto Empleado', 'Coste Empresa', 'Pagado por', 'Imputado a', 'Estado', 'Recurrente', 'Notas', 'Archivo Justificante', 'Tipo de Gasto'].join(','), // Added 'Tipo de Gasto'
      ...gastosFiltrados.map(g => [
        g.concepto,
        CATEGORIAS.find(c => c.value === g.categoria)?.label || g.categoria,
        format(new Date(g.fecha), 'dd/MM/yyyy'),
        g.importe_sin_iva ? g.importe_sin_iva.toFixed(2) : '0.00',
        g.iva_importe ? g.iva_importe.toFixed(2) : '0.00',
        g.total ? g.total.toFixed(2) : '0.00',
        g.neto_empleado ? g.neto_empleado.toFixed(2) : '',
        g.coste_empresa ? g.coste_empresa.toFixed(2) : '',
        g.pagado_por,
        g.imputado_a,
        g.estado,
        g.recurrente ? 'Sí' : 'No',
        g.notas || '',
        g.archivo_justificante || '',
        g.tipo_gasto === 'empleado' ? 'Gasto Empleado' : 'Gasto Empresa' // Added this field
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gastos_${filtros.mes}_${filtros.anio}.csv`);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]">Gestión de Gastos</h1> {/* Updated title */}
            <p className="text-slate-600 mt-1">Control completo de gastos empresariales</p> {/* Updated description */}
          </div>
          <div className="flex gap-2 flex-wrap"> {/* Retained original buttons */}
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
              onClick={handleNuevoGasto}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white"
              size="sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Gasto de Empresa {/* Clarified button text */}
            </Button>
          </div>
        </div>

        {gastosEmpleadosPendientes.length > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50"> {/* Changed to Alert as per outline */}
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>⚠️ {gastosEmpleadosPendientes.length} gasto(s) de empleados pendiente(s) de aprobar.</strong>
              <div className="mt-2">
                <Button
                  onClick={() => window.location.href = createPageUrl("GestionGastosEmpleados")}
                  variant="outline"
                  size="sm"
                  className="border-orange-600 text-orange-900 hover:bg-orange-100"
                >
                  Ir a Gastos de Empleados
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Resumen - sin pendientes de reembolso */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Total Gastos</p>
              <p className="text-3xl font-bold text-red-600">{totalMes.toFixed(2)}€</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">IVA Soportado</p>
              <p className="text-3xl font-bold text-amber-600">{totalIvaMes.toFixed(2)}€</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Pendientes Pago</p>
              <p className="text-3xl font-bold text-orange-600">{pendientesPago}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-5 gap-4">
              <div>
                <Label>Mes</Label>
                <Select value={String(filtros.mes)} onValueChange={(value) => setFiltros({...filtros, mes: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {format(new Date(2000, i, 1), 'MMMM', { locale: es })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Año</Label>
                <Input
                  type="number"
                  value={filtros.anio}
                  onChange={(e) => setFiltros({...filtros, anio: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label>Categoría</Label>
                <Select value={filtros.categoria} onValueChange={(value) => setFiltros({...filtros, categoria: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Imputado a</Label>
                <Select value={filtros.empresa} onValueChange={(value) => setFiltros({...filtros, empresa: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="ENM">ENM</SelectItem>
                    <SelectItem value="Liten Lemon">Liten Lemon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado</Label>
                <Select value={filtros.estado} onValueChange={(value) => setFiltros({...filtros, estado: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2 md:col-span-5 mt-4"> {/* Retained these buttons from original */}
                <Button
                  onClick={() => duplicarRecurrentesMutation.mutate()}
                  variant="outline"
                  disabled={duplicarRecurrentesMutation.isPending}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar Recurrentes
                </Button>
                <Button onClick={exportarCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de gastos */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Concepto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Total</TableHead>
                    {/* Removed 'Pagado por' column as per outline */}
                    <TableHead>Imputado a</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500"> {/* Colspan adjusted */}
                        No hay gastos registrados para este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    gastosFiltrados.map((gasto) => (
                      <TableRow key={gasto.id} className="hover:bg-slate-50 transition-colors"> {/* key uses unique ID from combined list */}
                        <TableCell className="font-medium">
                          {gasto.concepto}
                          {gasto.categoria === 'nomina' && gasto.neto_empleado !== undefined && (
                            <div className="text-xs text-slate-500 mt-1">
                              Neto: {parseFloat(gasto.neto_empleado).toFixed(2)}€
                            </div>
                          )}
                          {gasto.tipo_gasto === 'empleado' && ( // Badge for employee expenses
                            <Badge variant="outline" className="mt-1 text-xs bg-purple-50 text-purple-700">
                              👤 Gasto Empleado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CATEGORIAS.find(c => c.value === gasto.categoria)?.label || gasto.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(gasto.fecha), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{gasto.importe_sin_iva ? parseFloat(gasto.importe_sin_iva).toFixed(2) : '0.00'}€</TableCell>
                        <TableCell>
                          {gasto.iva_importe > 0 ? `${parseFloat(gasto.iva_importe).toFixed(2)}€` : '-'}
                        </TableCell>
                        <TableCell className="font-bold text-red-600">{gasto.total ? parseFloat(gasto.total).toFixed(2) : '0.00'}€</TableCell>
                        {/* 'Pagado por' cell removed as per outline */}
                        <TableCell>
                          <Badge className={gasto.imputado_a === "ENM" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                            {gasto.imputado_a}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={gasto.estado}
                            onValueChange={(newEstado) => updateGastoStatusMutation.mutate({ 
                              id: gasto.id_original, // Use original ID for mutation
                              estado: newEstado,
                              tipo_gasto: gasto.tipo_gasto // Pass type of expense to mutation
                            })}
                            disabled={updateGastoStatusMutation.isPending}
                          >
                            <SelectTrigger className={`h-8 w-32 ${gasto.estado === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                              <SelectItem value="pagado">✅ Pagado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditarGasto(gasto)}
                              title={gasto.tipo_gasto === 'empleado' ? 'Ir a Gastos de Empleados' : 'Editar'} // Added title for clarity
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarGasto(gasto)} // Pass the full gasto object
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

        {/* Modal CSV */}
        {modalCSV && (
          <Dialog open={true} onOpenChange={() => { setModalCSV(false); setVistaPrevia([]); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Gastos desde CSV</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>📋 Formato del CSV:</strong>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Descarga la plantilla CSV para ver el formato exacto.</li>
                      <li>Columnas obligatorias: <code>concepto</code>, <code>fecha</code></li>
                      <li>La columna <code>categoria</code> se detecta automáticamente del concepto si no se especifica.</li>
                      <li><strong>Para gastos normales (con IVA):</strong> Rellena <code>importe_sin_iva</code> y <code>iva_porcentaje</code>.</li>
                      <li><strong>Para nóminas:</strong> Rellena <code>categoria='nomina'</code>, <code>neto_empleado</code> y <code>coste_empresa</code>.</li>
                      <li><strong>Para impuestos/seguridad social (sin IVA):</strong> Rellena <code>importe_sin_iva</code> con el importe total.</li>
                      <li><code>fecha</code> debe estar en formato YYYY-MM-DD (ej: 2025-01-15).</li>
                      <li><code>recurrente</code>: <code>true</code>, <code>false</code>, <code>1</code>, <code>0</code>, <code>sí</code>, <code>no</code>.</li>
                      <li><code>estado</code>: <code>pagado</code> o <code>pendiente</code>. Otros estados serán mapeados a <code>pendiente</code>.</li>
                      <li><code>pagado_por</code> / <code>imputado_a</code>: ENM, Liten Lemon, Otro (solo para pagado_por). Se recomienda usar estos si hay múltiples entidades.</li>
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
                    <h3 className="font-semibold mb-2">Vista Previa ({vistaPrevia.length} gastos)</h3>
                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Importe</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vistaPrevia.map((gasto, index) => {
                            const categoriaInfo = CATEGORIAS.find(c => c.value === gasto.categoria);
                            const esSinIva = categoriaInfo?.sinIva || false;
                            const esNomina = gasto.categoria === 'nomina';
                            
                            let importeMostrar = '0.00';
                            if (esNomina && gasto.coste_empresa) {
                              importeMostrar = parseFloat(gasto.coste_empresa).toFixed(2);
                            } else if (gasto.importe_sin_iva) {
                              const base = parseFloat(gasto.importe_sin_iva);
                              if (esSinIva) {
                                importeMostrar = base.toFixed(2);
                              } else {
                                const iva = (base * (parseInt(gasto.iva_porcentaje) || 21)) / 100;
                                importeMostrar = (base + iva).toFixed(2);
                              }
                            }

                            return (
                              <TableRow key={index}>
                                <TableCell>{gasto.concepto}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {CATEGORIAS.find(c => c.value === gasto.categoria)?.label || gasto.categoria}
                                  </Badge>
                                </TableCell>
                                <TableCell>{importeMostrar}€</TableCell>
                                <TableCell>{format(new Date(gasto.fecha), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    gasto.estado === "pagado" ? "bg-green-100 text-green-800" :
                                    "bg-orange-100 text-orange-800"
                                  }>
                                    {gasto.estado}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setModalCSV(false); setVistaPrevia([]); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => importarCSVMutation.mutate(vistaPrevia)}
                  disabled={vistaPrevia.length === 0 || importarCSVMutation.isPending}
                  className="bg-gradient-to-r from-red-600 to-red-700"
                >
                  {importarCSVMutation.isPending ? 'Importando...' : `Importar ${vistaPrevia.length} gastos`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal form */}
        {modalAbierto && (
          <Dialog open={true} onOpenChange={() => setModalAbierto(false)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{gastoEditar ? 'Editar Gasto de Empresa' : 'Nuevo Gasto de Empresa'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-600 mb-2">Concepto *</Label>
                    <Input
                      value={formData.concepto}
                      onChange={(e) => handleConceptoChange(e.target.value)}
                      placeholder="Ej: Gasolina furgoneta, Nómina Juan, IVA Q4..."
                      className="mt-2 rounded-lg"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">La categoría se detectará automáticamente</p>
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 mb-2">Categoría</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) => setFormData({...formData, categoria: value})}
                    >
                      <SelectTrigger className="mt-2 rounded-lg">
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
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

                  {esNomina ? (
                    <>
                      <Alert className="border-blue-200 bg-blue-50">
                        <AlertDescription className="text-blue-900 text-sm">
                          <strong>💰 Nómina:</strong> Introduce el neto que recibe el empleado y el coste total para la empresa (incluye SS).
                        </AlertDescription>
                      </Alert>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Neto Empleado *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.neto_empleado}
                            onChange={(e) => setFormData({...formData, neto_empleado: e.target.value})}
                            placeholder="1200.00"
                            required
                          />
                        </div>
                        <div>
                          <Label>Coste Empresa *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.coste_empresa}
                            onChange={(e) => setFormData({...formData, coste_empresa: e.target.value})}
                            placeholder="1600.00"
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : esSinIva ? (
                    <>
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertDescription className="text-amber-900 text-sm">
                          <strong>📊 {categoriaSeleccionada?.label}:</strong> Este tipo de gasto NO tiene IVA.
                        </AlertDescription>
                      </Alert>
                      <div>
                        <Label>Importe Total *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.importe_sin_iva}
                          onChange={(e) => setFormData({...formData, importe_sin_iva: e.target.value})}
                          placeholder="500.00"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Importe sin IVA *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.importe_sin_iva}
                          onChange={(e) => setFormData({...formData, importe_sin_iva: e.target.value})}
                          placeholder="100.00"
                          required
                        />
                      </div>
                      <div>
                        <Label>IVA %</Label>
                        <Input
                          type="number"
                          value={formData.iva_porcentaje}
                          onChange={(e) => setFormData({...formData, iva_porcentaje: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input
                          value={(
                            (parseFloat(formData.importe_sin_iva) || 0) * (1 + (parseInt(formData.iva_porcentaje) || 0) / 100)
                          ).toFixed(2)}
                          disabled
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Pagado por *</Label>
                      <Select value={formData.pagado_por} onValueChange={(value) => setFormData({...formData, pagado_por: value})} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ENM">ENM</SelectItem>
                          <SelectItem value="Liten Lemon">Liten Lemon</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Imputado a *</Label>
                      <Select value={formData.imputado_a} onValueChange={(value) => setFormData({...formData, imputado_a: value})} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ENM">ENM</SelectItem>
                          <SelectItem value="Liten Lemon">Liten Lemon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Estado del Pago</Label>
                    <Select value={formData.estado} onValueChange={(value) => setFormData({...formData, estado: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                        <SelectItem value="pagado">✅ Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="recurrente-checkbox"
                      checked={formData.recurrente}
                      onCheckedChange={(checked) => setFormData({...formData, recurrente: checked})}
                    />
                    <Label htmlFor="recurrente-checkbox">Gasto recurrente (se duplicará automáticamente cada mes)</Label>
                  </div>

                  <div>
                    <Label>Archivo justificante</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        onChange={handleSubirArchivo}
                        disabled={uploadingFile}
                      />
                      {formData.archivo_justificante && (
                        <a href={formData.archivo_justificante} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="outline" size="sm">
                            Ver archivo
                          </Button>
                        </a>
                      )}
                    </div>
                    {uploadingFile && <p className="text-sm text-slate-500 mt-1">Subiendo archivo...</p>}
                  </div>

                  <div>
                    <Label>Notas</Label>
                    <Textarea // Changed Input to Textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setModalAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-red-600 to-red-700"
                    disabled={createGastoMutation.isPending || updateGastoMutation.isPending}
                  >
                    {createGastoMutation.isPending || updateGastoMutation.isPending ? (
                      <>Guardando...</>
                    ) : (
                      <>{gastoEditar ? 'Actualizar' : 'Crear'}</>
                    )}
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
