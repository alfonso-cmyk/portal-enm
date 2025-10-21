import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import RegistrarTrabajo from "./RegistrarTrabajo";

import HistorialEmpleado from "./HistorialEmpleado";

import GestionEmpleados from "./GestionEmpleados";

import GestionCentros from "./GestionCentros";

import Reportes from "./Reportes";

import MisDocumentos from "./MisDocumentos";

import GestionDocumentos from "./GestionDocumentos";

import PortalEmpleado from "./PortalEmpleado";

import MisVacaciones from "./MisVacaciones";

import NotificacionesEmpleado from "./NotificacionesEmpleado";

import NotificacionesAdmin from "./NotificacionesAdmin";

import PanelFichajes from "./PanelFichajes";

import Fichar from "./Fichar";

import TrabajosRealizados from "./TrabajosRealizados";

import ConfiguracionAvisos from "./ConfiguracionAvisos";

import HistorialFichajes from "./HistorialFichajes";

import Landing from "./Landing";

import FinanzasDashboard from "./FinanzasDashboard";

import GestionIngresos from "./GestionIngresos";

import GestionGastos from "./GestionGastos";

import GestionGastosEmpleados from "./GestionGastosEmpleados";

import ResumenFinanciero from "./ResumenFinanciero";

import SubirGasto from "./SubirGasto";

import GestionProveedores from "./GestionProveedores";

import ResumenImpuestos from "./ResumenImpuestos";

import CalendarioFestivos from "./CalendarioFestivos";

import CalendarioLaboral from "./CalendarioLaboral";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    RegistrarTrabajo: RegistrarTrabajo,
    
    HistorialEmpleado: HistorialEmpleado,
    
    GestionEmpleados: GestionEmpleados,
    
    GestionCentros: GestionCentros,
    
    Reportes: Reportes,
    
    MisDocumentos: MisDocumentos,
    
    GestionDocumentos: GestionDocumentos,
    
    PortalEmpleado: PortalEmpleado,
    
    MisVacaciones: MisVacaciones,
    
    NotificacionesEmpleado: NotificacionesEmpleado,
    
    NotificacionesAdmin: NotificacionesAdmin,
    
    PanelFichajes: PanelFichajes,
    
    Fichar: Fichar,
    
    TrabajosRealizados: TrabajosRealizados,
    
    ConfiguracionAvisos: ConfiguracionAvisos,
    
    HistorialFichajes: HistorialFichajes,
    
    Landing: Landing,
    
    FinanzasDashboard: FinanzasDashboard,
    
    GestionIngresos: GestionIngresos,
    
    GestionGastos: GestionGastos,
    
    GestionGastosEmpleados: GestionGastosEmpleados,
    
    ResumenFinanciero: ResumenFinanciero,
    
    SubirGasto: SubirGasto,
    
    GestionProveedores: GestionProveedores,
    
    ResumenImpuestos: ResumenImpuestos,
    
    CalendarioFestivos: CalendarioFestivos,
    
    CalendarioLaboral: CalendarioLaboral,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/RegistrarTrabajo" element={<RegistrarTrabajo />} />
                
                <Route path="/HistorialEmpleado" element={<HistorialEmpleado />} />
                
                <Route path="/GestionEmpleados" element={<GestionEmpleados />} />
                
                <Route path="/GestionCentros" element={<GestionCentros />} />
                
                <Route path="/Reportes" element={<Reportes />} />
                
                <Route path="/MisDocumentos" element={<MisDocumentos />} />
                
                <Route path="/GestionDocumentos" element={<GestionDocumentos />} />
                
                <Route path="/PortalEmpleado" element={<PortalEmpleado />} />
                
                <Route path="/MisVacaciones" element={<MisVacaciones />} />
                
                <Route path="/NotificacionesEmpleado" element={<NotificacionesEmpleado />} />
                
                <Route path="/NotificacionesAdmin" element={<NotificacionesAdmin />} />
                
                <Route path="/PanelFichajes" element={<PanelFichajes />} />
                
                <Route path="/Fichar" element={<Fichar />} />
                
                <Route path="/TrabajosRealizados" element={<TrabajosRealizados />} />
                
                <Route path="/ConfiguracionAvisos" element={<ConfiguracionAvisos />} />
                
                <Route path="/HistorialFichajes" element={<HistorialFichajes />} />
                
                <Route path="/Landing" element={<Landing />} />
                
                <Route path="/FinanzasDashboard" element={<FinanzasDashboard />} />
                
                <Route path="/GestionIngresos" element={<GestionIngresos />} />
                
                <Route path="/GestionGastos" element={<GestionGastos />} />
                
                <Route path="/GestionGastosEmpleados" element={<GestionGastosEmpleados />} />
                
                <Route path="/ResumenFinanciero" element={<ResumenFinanciero />} />
                
                <Route path="/SubirGasto" element={<SubirGasto />} />
                
                <Route path="/GestionProveedores" element={<GestionProveedores />} />
                
                <Route path="/ResumenImpuestos" element={<ResumenImpuestos />} />
                
                <Route path="/CalendarioFestivos" element={<CalendarioFestivos />} />
                
                <Route path="/CalendarioLaboral" element={<CalendarioLaboral />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}