import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Bell, Mail, Clock, CheckCircle, AlertCircle, Play, Settings, AlertTriangle, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ConfiguracionAvisos() {
  const [user, setUser] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const verificarFichajesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('verificarFichajes');
      return response.data;
    },
    onSuccess: (data) => {
      setResultado(data);
    },
    onError: (error) => {
      setResultado({
        error: true,
        mensaje: error.message || 'Error al verificar fichajes'
      });
    }
  });

  const handleVerificar = () => {
    setResultado(null);
    verificarFichajesMutation.mutate();
  };

  const abrirDashboardFunctions = () => {
    window.open('https://www.base44.com/dashboard?tab=code', '_blank');
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] flex items-center gap-3">
            <Bell className="w-10 h-10 text-[#24c4ba]" />
            Configuración de Avisos de Fichaje
          </h1>
          <p className="text-slate-600 mt-1">Gestiona los recordatorios automáticos por email</p>
        </div>

        <Card className="shadow-xl border-0 mb-6 border-2 border-red-500">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-6 h-6" />
              PASO 1: Obtener la URL de la función verificarFichajes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="bg-white border-2 border-blue-500 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 text-[#1a1a1a]">📍 Instrucciones paso a paso:</h3>
                <ol className="list-decimal ml-5 space-y-4 text-slate-700">
                  <li>
                    <strong>Abre el Dashboard de base44:</strong>
                    <Button
                      onClick={abrirDashboardFunctions}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir Dashboard → Code → Functions
                    </Button>
                  </li>
                  
                  <li>
                    <strong>Busca la función "verificarFichajes"</strong> en la lista de funciones
                  </li>
                  
                  <li>
                    <strong>Haz clic en "verificarFichajes"</strong> para abrirla
                  </li>
                  
                  <li>
                    <strong>Busca el campo "Endpoint URL"</strong> o "Function URL" en la parte superior
                    <div className="bg-slate-100 p-3 rounded mt-2 text-sm">
                      Debería verse algo así:<br/>
                      <code className="text-xs">https://base44-app-xxxxx-verificarfichajes.deno.dev</code>
                    </div>
                  </li>
                  
                  <li>
                    <strong>Copia esa URL completa</strong> (haz clic en el botón de copiar <Copy className="w-3 h-3 inline" /> si está disponible)
                  </li>
                </ol>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <strong>⚠️ ¿No ves la URL?</strong>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Asegúrate de que la función esté <strong>guardada y desplegada</strong></li>
                    <li>Puede que necesites hacer clic en un botón "Deploy" o "Save"</li>
                    <li>La URL aparece después de que la función se despliegue correctamente</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 mb-6">
          <CardHeader className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Verificación Manual (para probar)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <Alert className="border-blue-200 bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>¿Cómo funciona?</strong>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Verifica si los empleados han fichado a tiempo</li>
                    <li>Envía emails automáticos a quien no haya fichado</li>
                    <li>Zona horaria: España (Europe/Madrid)</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="font-bold text-lg text-[#1a1a1a] mb-4">Probar la función ahora</h3>
                <p className="text-slate-600 mb-4">
                  Haz clic aquí para ejecutar la función manualmente y ver si funciona:
                </p>
                <Button
                  onClick={handleVerificar}
                  disabled={verificarFichajesMutation.isPending}
                  className="bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] w-full md:w-auto"
                  size="lg"
                >
                  {verificarFichajesMutation.isPending ? (
                    <>
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Verificar Fichajes Ahora
                    </>
                  )}
                </Button>
              </div>

              {resultado && (
                <>
                  {resultado.error ? (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="text-red-900">
                        <strong>Error:</strong> {resultado.mensaje}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className={resultado.avisos_enviados > 0 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
                      {resultado.avisos_enviados > 0 ? (
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      <AlertDescription className={resultado.avisos_enviados > 0 ? "text-orange-900" : "text-green-900"}>
                        <strong>✅ Verificación completada</strong>
                        <div className="mt-2 space-y-1">
                          <p><strong>Fecha:</strong> {resultado.fecha}</p>
                          <p><strong>Hora:</strong> {resultado.hora} ({resultado.timezone})</p>
                          <p className="font-bold text-lg">
                            {resultado.avisos_enviados > 0 
                              ? `⚠️ ${resultado.avisos_enviados} aviso(s) enviado(s)` 
                              : '✅ Todos los empleados han fichado correctamente'}
                          </p>
                        </div>
                        {resultado.detalles && resultado.detalles.length > 0 && (
                          <div className="mt-4 p-3 bg-white rounded-lg border">
                            <p className="font-semibold mb-2">📧 Emails enviados:</p>
                            <ul className="list-disc ml-5 space-y-2">
                              {resultado.detalles.map((aviso, idx) => (
                                <li key={idx} className="text-sm">
                                  <strong>{aviso.empleado}</strong> - {aviso.tipo}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 mb-6 border-2 border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Settings className="w-6 h-6" />
              PASO 2: Configurar Cron-Job.org (Automatización)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>✅ Requisito:</strong> Ya debes tener la URL de la función del Paso 1
              </AlertDescription>
            </Alert>

            <div className="bg-white border-2 border-green-500 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4 text-[#1a1a1a]">⚙️ Configurar cron job:</h3>
              <ol className="list-decimal ml-5 space-y-3 text-slate-700">
                <li>
                  Ve a <a href="https://cron-job.org" target="_blank" rel="noopener" className="underline font-semibold text-blue-600">cron-job.org</a> y regístrate
                </li>
                <li>Haz clic en <strong>"Create cronjob"</strong></li>
                <li><strong>Title:</strong> Verificar Fichajes ENM</li>
                <li><strong>Address (URL):</strong> Pega la URL que copiaste del Paso 1</li>
                <li><strong>Schedule:</strong> Selecciona <strong>"Every hour"</strong> (cada hora)</li>
                <li>Haz clic en <strong>"Create cronjob"</strong></li>
              </ol>
            </div>

            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>✅ ¡Listo!</strong> Ahora el sistema enviará recordatorios automáticos cada hora.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}