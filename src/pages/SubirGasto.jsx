
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Upload, CheckCircle, DollarSign, Trash2, Eye } from "lucide-react"; // Added Eye import
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SubirGasto() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [formData, setFormData] = useState({
    concepto: "",
    importe: "",
    empresa_imputada: "ENM",
    estado_reembolso: "reembolsar", // Added estado_reembolso to formData
    fecha: new Date().toISOString().split('T')[0],
    archivo_justificante: "",
    notas: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      if (!userData.puede_subir_gastos) {
        navigate(createPageUrl("PortalEmpleado"));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: misGastos = [] } = useQuery({
    queryKey: ['mis-gastos', user?.id],
    queryFn: () => base44.entities.GastoEmpleado.filter({ empleado_id: user.id }, "-fecha"),
    enabled: !!user,
    initialData: [],
  });

  const createGastoMutation = useMutation({
    mutationFn: async (data) => {
      const fecha = new Date(data.fecha);

      return base44.entities.GastoEmpleado.create({
        empleado_id: user.id,
        empleado_nombre: user.full_name,
        concepto: data.concepto,
        importe: parseFloat(data.importe),
        empresa_imputada: data.empresa_imputada,
        estado_reembolso: data.estado_reembolso, // Directly use estado_reembolso from formData
        fecha: data.fecha,
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
        archivo_justificante: data.archivo_justificante,
        notas: data.notas
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-gastos'] });
      alert('Gasto registrado correctamente. Será revisado por administración.');
      resetForm();
    },
  });

  const deleteGastoMutation = useMutation({
    mutationFn: (id) => base44.entities.GastoEmpleado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-gastos'] });
      alert('✅ Gasto eliminado'); // Updated alert message
    },
  });

  const handleSubirArchivo = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingFile(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        setFormData({...formData, archivo_justificante: result.file_url});
        alert('Archivo subido correctamente');
      } catch (error) {
        alert('Error al subir el archivo');
      } finally {
        setUploadingFile(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      concepto: "",
      importe: "",
      empresa_imputada: "ENM",
      estado_reembolso: "reembolsar", // Reset with initial state for estado_reembolso
      fecha: new Date().toISOString().split('T')[0],
      archivo_justificante: "",
      notas: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.concepto.trim()) {
      alert('El concepto es obligatorio');
      return;
    }
    
    if (!formData.importe || parseFloat(formData.importe) <= 0) {
      alert('El importe debe ser mayor a 0');
      return;
    }
    
    if (!formData.archivo_justificante) {
      alert('Debes subir el ticket o justificante del gasto');
      return;
    }
    
    createGastoMutation.mutate(formData);
  };

  const handleEliminar = (gasto) => {
    // Solo permitir eliminar si está pendiente
    if (gasto.estado_reembolso !== "reembolsar") {
      alert('⚠️ No puedes eliminar un gasto ya procesado por administración');
      return;
    }

    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      deleteGastoMutation.mutate(gasto.id);
    }
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("PortalEmpleado"))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Registrar Gasto</h1>
            <p className="text-slate-600 mt-1">Sube tus gastos para reembolso</p>
          </div>
        </div>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Instrucciones:</strong>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Sube gastos relacionados con tu trabajo (gasolina, dietas, materiales, etc.)</li>
              <li>Es <strong>obligatorio</strong> subir el ticket o justificante</li>
              <li>Administración revisará y aprobará el reembolso</li>
            </ul>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-xl border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl">
              <CardTitle className="text-xl">Información del Gasto</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Concepto del Gasto *</Label>
                <Input
                  value={formData.concepto}
                  onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                  placeholder="Ej: Gasolina furgoneta, Comida trabajo, Herramientas..."
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Importe (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.importe}
                    onChange={(e) => setFormData({...formData, importe: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label>Fecha del Gasto *</Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Empresa a Imputar *</Label>
                <Select 
                  value={formData.empresa_imputada} 
                  onValueChange={(value) => setFormData({...formData, empresa_imputada: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENM">ENM Servicios</SelectItem>
                    <SelectItem value="Liten Lemon">Liten Lemon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New Select for Estado del Reembolso */}
              <div>
                <Label htmlFor="estado">Estado del Reembolso *</Label>
                <Select 
                  value={formData.estado_reembolso} 
                  onValueChange={(value) => setFormData({...formData, estado_reembolso: value})}
                >
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reembolsar">💰 Reembolsar (pendiente)</SelectItem>
                    <SelectItem value="reembolsado">✅ Reembolsado (pagado)</SelectItem>
                    <SelectItem value="no_reembolsar">❌ No hay que reembolsar</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Indica si este gasto debe ser reembolsado por la empresa
                </p>
              </div>

              <div>
                <Label>Ticket / Justificante * (Foto o PDF)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleSubirArchivo}
                    disabled={uploadingFile}
                  />
                  {formData.archivo_justificante && (
                    <a href={formData.archivo_justificante} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="sm">
                        Ver
                      </Button>
                    </a>
                  )}
                </div>
                {uploadingFile && <p className="text-sm text-slate-500 mt-1">Subiendo archivo...</p>}
                {!formData.archivo_justificante && (
                  <p className="text-sm text-red-600 mt-1">⚠️ El justificante es obligatorio</p>
                )}
              </div>

              <div>
                <Label>Notas adicionales (opcional)</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  placeholder="Añade cualquier comentario sobre este gasto..."
                  className="h-24"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={createGastoMutation.isPending || uploadingFile || !formData.archivo_justificante}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg"
          >
            {createGastoMutation.isPending ? (
              <>
                <Upload className="w-5 h-5 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Registrar Gasto
              </>
            )}
          </Button>
        </form>

        {/* Historial de gastos */}
        {misGastos.length > 0 && (
          <Card className="shadow-xl border-0 mt-8">
            <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-xl">
              <CardTitle>Mis Gastos Registrados ({misGastos.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {misGastos.slice(0, 10).map((gasto) => (
                  <div key={gasto.id} className="border-2 border-slate-200 rounded-lg p-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900">{gasto.concepto}</h3>
                        <p className="text-sm text-slate-600">
                          {new Date(gasto.fecha).toLocaleDateString('es-ES')} • {gasto.empresa_imputada}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-600">{gasto.importe.toFixed(2)}€</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            gasto.estado_reembolso === 'reembolsar' ? 'bg-yellow-100 text-yellow-800' :
                            gasto.estado_reembolso === 'reembolsado' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {gasto.estado_reembolso === 'reembolsar' ? '💰 Pendiente reembolso' : 
                             gasto.estado_reembolso === 'reembolsado' ? '✅ Reembolsado' : '❌ No reembolsar'}
                          </span>
                        </div>
                        {/* Action buttons group based on the new logic */}
                        <div className="flex gap-1">
                            {gasto.archivo_justificante && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(gasto.archivo_justificante, '_blank')}
                                title="Ver justificante"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="w-5 h-5" />
                              </Button>
                            )}
                            {gasto.estado_reembolso === "reembolsar" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEliminar(gasto)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Eliminar (solo si está pendiente)"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            )}
                            {gasto.estado_reembolso !== "reembolsar" && (
                              <span className="text-xs text-slate-500 px-2 py-1 flex items-center justify-center">
                                Ya procesado
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                    {gasto.notas && (
                      <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">{gasto.notas}</p>
                    )}
                    {/* The old "Ver Justificante" button is now replaced by the Eye icon */}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

