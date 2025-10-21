import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Plus, MapPin, Loader2 } from "lucide-react";

export default function ModalCentro({ centro, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: centro?.nombre || '',
    direccion: centro?.direccion || '',
    latitud: centro?.latitud || null,
    longitud: centro?.longitud || null,
    telefono: centro?.telefono || '',
    ubicaciones: centro?.ubicaciones || [],
    servicios: centro?.servicios || [],
    activo: centro?.activo !== false
  });
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [geocodificando, setGeocodificando] = useState(false);

  const serviciosDisponibles = [
    { value: "limpieza", label: "Limpieza" },
    { value: "conserjeria", label: "Conserjería" },
    { value: "jardineria", label: "Jardinería" },
    { value: "piscina_con_socorrista", label: "Piscina con Socorrista" },
    { value: "piscina_sin_socorrista", label: "Piscina sin Socorrista" },
    { value: "mantenimiento", label: "Mantenimiento" }
  ];

  const geocodificarDireccion = async (direccion) => {
    if (!direccion || direccion.length < 10) return;
    
    setGeocodificando(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`,
        {
          headers: {
            'User-Agent': 'ENM-Servicios-App'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setFormData({
          ...formData,
          direccion,
          latitud: parseFloat(data[0].lat),
          longitud: parseFloat(data[0].lon)
        });
      }
    } catch (error) {
      console.error('Error geocodificando:', error);
    } finally {
      setGeocodificando(false);
    }
  };

  const handleDireccionChange = (e) => {
    const nuevaDireccion = e.target.value;
    setFormData({...formData, direccion: nuevaDireccion});
    
    // Geocodificar automáticamente después de 1 segundo de dejar de escribir
    if (nuevaDireccion.length > 10) {
      const timer = setTimeout(() => {
        geocodificarDireccion(nuevaDireccion);
      }, 1000);
      return () => clearTimeout(timer);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Centro.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Centro.update(centro.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.latitud || !formData.longitud) {
      if (!confirm('⚠️ No has establecido coordenadas GPS. El sistema de control de distancia no funcionará. ¿Quieres continuar de todas formas?')) {
        return;
      }
    }
    
    if (centro) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const agregarUbicacion = () => {
    if (nuevaUbicacion.trim()) {
      setFormData({
        ...formData,
        ubicaciones: [...formData.ubicaciones, nuevaUbicacion.trim()]
      });
      setNuevaUbicacion('');
    }
  };

  const eliminarUbicacion = (index) => {
    setFormData({
      ...formData,
      ubicaciones: formData.ubicaciones.filter((_, i) => i !== index)
    });
  };

  const toggleServicio = (servicio) => {
    const servicios = formData.servicios.includes(servicio)
      ? formData.servicios.filter(s => s !== servicio)
      : [...formData.servicios, servicio];
    setFormData({...formData, servicios});
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{centro ? 'Editar Centro' : 'Nuevo Centro'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Centro *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                placeholder="Ej: Centro Deportivo Norte"
                required
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                Dirección Completa *
                {geocodificando && <Loader2 className="w-4 h-4 animate-spin text-[#24c4ba]" />}
              </Label>
              <Input
                value={formData.direccion}
                onChange={handleDireccionChange}
                placeholder="Calle completa, número, código postal, ciudad"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                💡 Las coordenadas GPS se obtendrán automáticamente al escribir la dirección
              </p>
            </div>

            {formData.latitud && formData.longitud && (
              <Alert className="border-green-200 bg-green-50">
                <MapPin className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 text-sm">
                  <strong>✅ Coordenadas GPS obtenidas:</strong>
                  <br />
                  Latitud: {formData.latitud.toFixed(6)} | Longitud: {formData.longitud.toFixed(6)}
                  <br />
                  <span className="text-xs">El sistema de control de distancia funcionará correctamente</span>
                </AlertDescription>
              </Alert>
            )}

            {(!formData.latitud || !formData.longitud) && formData.direccion && (
              <Alert className="border-amber-200 bg-amber-50">
                <MapPin className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-sm">
                  <strong>⚠️ Sin coordenadas GPS</strong>
                  <br />
                  <span className="text-xs">
                    Revisa que la dirección sea correcta y completa. Si no se obtienen automáticamente, puedes buscar las coordenadas en Google Maps.
                  </span>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitud (GPS)</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitud || ''}
                  onChange={(e) => setFormData({...formData, latitud: parseFloat(e.target.value) || null})}
                  placeholder="Ej: 40.4168"
                />
              </div>
              <div>
                <Label>Longitud (GPS)</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitud || ''}
                  onChange={(e) => setFormData({...formData, longitud: parseFloat(e.target.value) || null})}
                  placeholder="Ej: -3.7038"
                />
              </div>
            </div>

            <div>
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                placeholder="+34 600 000 000"
              />
            </div>

            <div>
              <Label className="mb-3 block">Servicios que se prestan en este centro</Label>
              <div className="grid grid-cols-2 gap-3">
                {serviciosDisponibles.map(servicio => (
                  <div key={servicio.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={servicio.value}
                      checked={formData.servicios.includes(servicio.value)}
                      onCheckedChange={() => toggleServicio(servicio.value)}
                    />
                    <label
                      htmlFor={servicio.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {servicio.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Ubicaciones Específicas</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={nuevaUbicacion}
                  onChange={(e) => setNuevaUbicacion(e.target.value)}
                  placeholder="Ej: Piscina exterior, Jardín principal..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarUbicacion())}
                />
                <Button type="button" onClick={agregarUbicacion} className="bg-teal-500">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.ubicaciones.map((ubi, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-2">
                    {ubi}
                    <button
                      type="button"
                      onClick={() => eliminarUbicacion(index)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-purple-700"
            >
              {centro ? 'Guardar Cambios' : 'Crear Centro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}