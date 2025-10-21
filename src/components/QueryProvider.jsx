import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configuración muy agresiva para caché y reducir peticiones
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos - datos frescos
      cacheTime: 30 * 60 * 1000, // 30 minutos - mantener en memoria
      refetchOnWindowFocus: false, // No refrescar al volver
      refetchOnMount: false, // No refrescar al montar
      refetchOnReconnect: false, // No refrescar al reconectar
      retry: 1, // Solo 1 reintento
    },
  },
});

export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}