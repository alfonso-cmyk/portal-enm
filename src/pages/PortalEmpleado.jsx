
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ClipboardList,
  History,
  FileText,
  Calendar,
  Bell,
  User,
  Clock,
  CheckCircle,
  Briefcase,
  Camera,
  Upload, // Added Upload icon
  Loader2, // Added Loader2 icon for loading states
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input"; // Added Input component
import { Button } from "@/components/ui/button"; // Added Button component
import { Label } from "@/components/ui/label"; // Added Label component
import { format } from 'date-fns'; // Added for date formatting

const opciones = [
  {
    title: "Registrar Trabajo",
    description: "Registra tu jornada diaria",
    icon: ClipboardList,
    url: "RegistrarTrabajo",
    color: "from-[#24c4ba] to-[#1ca89f]",
  },
  {
    title: "Mi Historial",
    description: "Consulta tus trabajos registrados",
    icon: History,
    url: "HistorialEmpleado",
    color: "from-[#24c4ba] to-[#1ca89f]",
  },
  {
    title: "Mis Documentos",
    description: "Nóminas, contratos y más",
    icon: FileText,
    url: "MisDocumentos",
    color: "from-purple-600 to-purple-700",
  },
  {
    title: "Mis Vacaciones",
    description: "Solicita y gestiona vacaciones",
    icon: Calendar,
    url: "MisVacaciones",
    color: "from-blue-600 to-blue-700",
  },
  {
    title: "Notificaciones",
    description: "Ver respuestas y avisos",
    icon: Bell,
    url: "NotificacionesEmpleado",
    color: "from-[#d4af37] to-[#c9a332]",
  },
];

export default function PortalEmpleado() {
  const [user, setUser] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(false); // New state for profile editing
  const [uploadingDNI, setUploadingDNI] = useState({ frontal: false, trasero: false }); // New state for DNI upload, now an object
  const [perfilData, setPerfilData] = useState({ // New state for editable profile data
    full_name: '',
    telefono: '', // New field
    fecha_nacimiento: '', // New field
    numero_cuenta: '',
    dni_frontal_url: '', // New field
    dni_trasero_url: '' // New field
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      // Initialize perfilData with existing user data
      setPerfilData({
        full_name: userData.full_name || '',
        telefono: userData.telefono || '', // Initialize new field
        fecha_nacimiento: userData.fecha_nacimiento || '', // Initialize new field
        numero_cuenta: userData.numero_cuenta || '',
        dni_frontal_url: userData.dni_frontal_url || '', // Initialize new field
        dni_trasero_url: userData.dni_trasero_url || '' // Initialize new field
      });
    };
    loadUser();
  }, []);

  const { data: registrosHoy = [] } = useQuery({
    queryKey: ['registros-hoy', user?.id],
    queryFn: () => base44.entities.RegistroTrabajo.filter({
      empleado_id: user.id,
      fecha: new Date().toISOString().split('T')[0]
    }),
    enabled: !!user,
    initialData: [],
  });

  const { data: vacacionesInfo = [] } = useQuery({
    queryKey: ['vacaciones-info', user?.id],
    queryFn: () => base44.entities.Vacacion.filter({
      empleado_id: user.id,
      anio: new Date().getFullYear()
    }),
    enabled: !!user,
    initialData: [],
  });

  const { data: horarios = [] } = useQuery({
    queryKey: ['horarios-empleado', user?.id],
    queryFn: () => base44.entities.HorarioSemanal.filter({ empleado_id: user.id }),
    enabled: !!user,
    initialData: [],
  });

  const vacacionActual = vacacionesInfo[0];
  const horasHoy = registrosHoy.reduce((sum, r) => sum + (r.horas_trabajadas || 0), 0);
  const horasSemanalesProgramadas = horarios
    .filter(h => h.activo !== false)
    .reduce((sum, h) => sum + (h.horas_dia || 0), 0);

  const handleSubirFoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingFoto(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        await base44.auth.updateMe({ foto_perfil: result.file_url });
        setUser({...user, foto_perfil: result.file_url});
        alert('✅ Foto de perfil actualizada'); // Added success alert
      } catch (error) {
        alert('Error al subir la foto');
        console.error('Error uploading profile picture:', error);
      } finally {
        setUploadingFoto(false);
      }
    }
  };

  const handleSubirDNI = async (e, tipo) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingDNI({...uploadingDNI, [tipo]: true});
      try {
        const campo = tipo === 'frontal' ? 'dni_frontal_url' : 'dni_trasero_url';
        const result = await base44.integrations.Core.UploadFile({ file });
        await base44.auth.updateMe({ [campo]: result.file_url });
        setUser({...user, [campo]: result.file_url});
        setPerfilData({...perfilData, [campo]: result.file_url}); // Update perfilData as well
        alert(`✅ DNI ${tipo} subido correctamente`); // Added success alert
      } catch (error) {
        alert(`Error al subir el DNI ${tipo}`);
        console.error('Error uploading DNI:', error);
      } finally {
        setUploadingDNI({...uploadingDNI, [tipo]: false});
      }
    }
  };

  const handleGuardarPerfil = async () => {
    try {
      await base44.auth.updateMe({
        full_name: perfilData.full_name,
        telefono: perfilData.telefono, // Save new field
        fecha_nacimiento: perfilData.fecha_nacimiento, // Save new field
        numero_cuenta: perfilData.numero_cuenta
      });
      setUser({
        ...user,
        full_name: perfilData.full_name,
        telefono: perfilData.telefono, // Update user state
        fecha_nacimiento: perfilData.fecha_nacimiento, // Update user state
        numero_cuenta: perfilData.numero_cuenta
      });
      setEditandoPerfil(false);
      alert('Perfil actualizado correctamente');
    } catch (error) {
      alert('Error al actualizar el perfil');
      console.error('Error updating profile:', error);
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1a1a1a] mb-2">
            ¡Bienvenido, {user.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-slate-600 text-lg">Tu portal de empleado</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-90">Horas Hoy</p>
                    <p className="text-3xl font-bold">{horasHoy.toFixed(1)}h</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-[#d4af37] to-[#c9a332] p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-90">Horas Semanales</p>
                    <p className="text-3xl font-bold">{horasSemanalesProgramadas.toFixed(0)}h</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-90">Vacaciones Disponibles</p>
                    <p className="text-3xl font-bold">{vacacionActual?.dias_pendientes || 0}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-8 h-8" />
                  <div>
                    <p className="text-sm opacity-90">Registros Hoy</p>
                    <p className="text-3xl font-bold">{registrosHoy.length}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {opciones.map((opcion, index) => (
            <motion.div
              key={opcion.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 5) }}
              whileHover={{ scale: 1.03 }}
            >
              <Link to={createPageUrl(opcion.url)}>
                <Card className="shadow-xl border-0 h-full hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group">
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-r ${opcion.color} p-8 text-white relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                      <opcion.icon className="w-16 h-16 mb-4 relative z-10" />
                      <h3 className="text-2xl font-bold mb-2 relative z-10">{opcion.title}</h3>
                      <p className="text-sm opacity-90 relative z-10">{opcion.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8"
        >
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Avatar className="w-20 h-20 bg-gradient-to-br from-[#24c4ba] to-[#1ca89f]">
                    {user.foto_perfil ? (
                      <AvatarImage src={user.foto_perfil} />
                    ) : null}
                    <AvatarFallback className="bg-transparent text-white text-2xl font-bold">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSubirFoto}
                    className="hidden"
                    id="foto-perfil-empleado"
                    disabled={uploadingFoto} // Disable input while uploading
                  />
                  <label
                    htmlFor="foto-perfil-empleado"
                    className={`absolute bottom-0 right-0 bg-[#24c4ba] text-white p-2 rounded-full cursor-pointer hover:bg-[#1ca89f] transition-colors shadow-lg ${uploadingFoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingFoto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </label>
                </div>
                <div className="flex-1">
                  {editandoPerfil ? (
                    <div className="space-y-3">
                      <Input
                        value={perfilData.full_name}
                        onChange={(e) => setPerfilData({...perfilData, full_name: e.target.value})}
                        placeholder="Nombre completo"
                        className="font-bold text-xl"
                      />
                      <Input
                        value={perfilData.telefono}
                        onChange={(e) => setPerfilData({...perfilData, telefono: e.target.value})}
                        placeholder="Teléfono (+34 XXX XXX XXX)"
                      />
                      <Input
                        type="date"
                        value={perfilData.fecha_nacimiento}
                        onChange={(e) => setPerfilData({...perfilData, fecha_nacimiento: e.target.value})}
                        placeholder="Fecha de nacimiento"
                      />
                      <Input
                        value={perfilData.numero_cuenta}
                        onChange={(e) => setPerfilData({...perfilData, numero_cuenta: e.target.value})}
                        placeholder="Número de cuenta (IBAN)"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleGuardarPerfil}
                          className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f]"
                          disabled={uploadingFoto || uploadingDNI.frontal || uploadingDNI.trasero} // Disable while any upload is in progress
                        >
                          Guardar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditandoPerfil(false);
                            // Reset perfilData to original user data if cancelled
                            setPerfilData({
                              full_name: user.full_name || '',
                              telefono: user.telefono || '',
                              fecha_nacimiento: user.fecha_nacimiento || '',
                              numero_cuenta: user.numero_cuenta || '',
                              dni_frontal_url: user.dni_frontal_url || '',
                              dni_trasero_url: user.dni_trasero_url || ''
                            });
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-xl text-[#1a1a1a]">{user.full_name}</h3>
                      <p className="text-slate-600">{user.profesion || 'Empleado'}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                      {user.telefono && (
                        <p className="text-sm text-slate-600 mt-1">
                          <strong>Teléfono:</strong> {user.telefono}
                        </p>
                      )}
                      {user.fecha_nacimiento && (
                        <p className="text-sm text-slate-600">
                          <strong>Fecha de nacimiento:</strong> {format(new Date(user.fecha_nacimiento), 'dd/MM/yyyy')}
                        </p>
                      )}
                      {user.numero_cuenta && (
                        <p className="text-sm text-slate-600">
                          <strong>Cuenta:</strong> {user.numero_cuenta}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditandoPerfil(true)}
                        className="mt-2"
                      >
                        Editar Perfil
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Documentos de Identidad (DNI)
                </Label>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* DNI Frontal */}
                  <div>
                    <Label className="text-sm text-slate-600 mb-2 block">DNI Frontal</Label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleSubirDNI(e, 'frontal')}
                      className="hidden"
                      id="dni-frontal"
                    />
                    {user.dni_frontal_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(user.dni_frontal_url, '_blank')}
                        className="w-full mb-2"
                        disabled={uploadingDNI.frontal}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ver DNI Frontal
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => !uploadingDNI.frontal && document.getElementById('dni-frontal').click()}
                      disabled={uploadingDNI.frontal}
                    >
                      {uploadingDNI.frontal ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {user.dni_frontal_url ? 'Actualizar DNI Frontal' : 'Subir DNI Frontal'}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* DNI Trasero */}
                  <div>
                    <Label className="text-sm text-slate-600 mb-2 block">DNI Trasero</Label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleSubirDNI(e, 'trasero')}
                      className="hidden"
                      id="dni-trasero"
                    />
                    {user.dni_trasero_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(user.dni_trasero_url, '_blank')}
                        className="w-full mb-2"
                        disabled={uploadingDNI.trasero}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ver DNI Trasero
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => !uploadingDNI.trasero && document.getElementById('dni-trasero').click()}
                      disabled={uploadingDNI.trasero}
                    >
                      {uploadingDNI.trasero ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {user.dni_trasero_url ? 'Actualizar DNI Trasero' : 'Subir DNI Trasero'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
