import React from "react";
import { base44 } from "@/api/base44Client";
import { Briefcase, Users, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function Landing() {
  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  const handleSignup = () => {
    // Redirigir a la página de signup de Base44
    window.location.href = window.location.origin + '/signup';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#24c4ba] via-[#1ca89f] to-[#149389]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-screen">
          {/* Logo y título */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Briefcase className="w-16 h-16 text-[#24c4ba]" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              ENM Servicios
            </h1>
            <p className="text-2xl text-white/90 font-medium">
              Portal de Empleado
            </p>
          </motion.div>

          {/* Card principal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md"
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-[#1a1a1a] text-center mb-2">
                  Bienvenido
                </h2>
                <p className="text-slate-600 text-center mb-8">
                  Accede a tu portal de empleado
                </p>

                <div className="space-y-4">
                  <Button
                    onClick={handleLogin}
                    className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-[#24c4ba] to-[#1ca89f] hover:from-[#1ca89f] hover:to-[#149389] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Iniciar Sesión
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-500">o</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSignup}
                    variant="outline"
                    className="w-full py-6 text-lg font-semibold border-2 border-[#24c4ba] text-[#24c4ba] hover:bg-[#24c4ba] hover:text-white rounded-xl transition-all duration-200"
                  >
                    Crear Nueva Cuenta
                    <Users className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Características */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid md:grid-cols-3 gap-6 mt-16 w-full max-w-4xl"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-[#24c4ba]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Fichaje Digital</h3>
              <p className="text-white/80 text-sm">
                Registra tu entrada y salida de forma rápida y sencilla
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-[#24c4ba]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Registro de Trabajos</h3>
              <p className="text-white/80 text-sm">
                Documenta tus actividades diarias con fotos y ubicación
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-[#24c4ba]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Gestión Personal</h3>
              <p className="text-white/80 text-sm">
                Accede a tus documentos, vacaciones y más
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-white/70 text-sm">
              © 2025 ENM Servicios - Sistema de Gestión de Empleados
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}