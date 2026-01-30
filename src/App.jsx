import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ZoneDetail from './pages/ZoneDetail';
import BinDetail from './pages/BinDetail';
import PrintPage from './pages/PrintPage';
import { WarehouseProvider } from './context/WarehouseContext';

import { Toaster } from 'sonner';

function App() {
    return (
        <WarehouseProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="zone/:zoneId" element={<ZoneDetail />} />
                        <Route path="bin/:binId" element={<BinDetail />} />
                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                    <Route path="/print" element={<PrintPage />} />
                </Routes>
            </Router>
            <Toaster position="top-right" richColors />
        </WarehouseProvider>
    );
}

export default App;
