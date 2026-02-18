import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ZoneDetail from './pages/ZoneDetail';
import BinDetail from './pages/BinDetail';
import PrintPage from './pages/PrintPage';
import LoginPage from './pages/LoginPage';
import ProductDetail from './pages/ProductDetail';

import ScanPage from './pages/ScanPage';
import SettingsPage from './pages/SettingsPage';
import UserManagement from './pages/UserManagement';
import ActivityLog from './pages/ActivityLog';
import LowStockPage from './pages/LowStockPage';
import StockCountList from './pages/StockCount/StockCountList';
import StockCountDashboard from './pages/StockCount/StockCountDashboard';
import ZoneCountView from './pages/StockCount/ZoneCountView';
import StockCountReview from './pages/StockCount/StockCountReview';
import StockCountReport from './pages/StockCount/StockCountReport';
import StockCountHistory from './pages/StockCount/StockCountHistory';
import { WarehouseProvider } from './context/WarehouseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import { Toaster } from 'sonner';

// Route guard: redirect to login if not authenticated
function RequireAuth({ children }) {
    const { isLoggedIn, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

// Redirect logged-in users away from login
function PublicOnly({ children }) {
    const { isLoggedIn, loading } = useAuth();

    if (loading) return null;
    if (isLoggedIn) return <Navigate to="/" replace />;

    return children;
}

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <WarehouseProvider>
                    <Router>
                        <Routes>
                            {/* Public route */}
                            <Route path="/login" element={
                                <PublicOnly>
                                    <LoginPage />
                                </PublicOnly>
                            } />

                            {/* Protected routes */}
                            <Route path="/" element={
                                <RequireAuth>
                                    <Layout />
                                </RequireAuth>
                            }>
                                <Route index element={<Dashboard />} />
                                <Route path="zone/:zoneId" element={<ZoneDetail />} />
                                <Route path="bin/:binId" element={<BinDetail />} />
                                <Route path="product/:productId" element={<ProductDetail />} />
                                <Route path="stock-count" element={<StockCountList />} />
                                <Route path="stock-count/history" element={<StockCountHistory />} />
                                <Route path="stock-count/:id" element={<StockCountDashboard />} />
                                <Route path="stock-count/:id/zone/:zoneId" element={<ZoneCountView />} />
                                <Route path="stock-count/:id/review" element={<StockCountReview />} />
                                <Route path="stock-count/:id/report" element={<StockCountReport />} />
                                <Route path="scan" element={<ScanPage />} />
                                <Route path="settings" element={<SettingsPage />} />
                                <Route path="settings/users" element={<UserManagement />} />
                                <Route path="activity-log" element={<ActivityLog />} />
                                <Route path="low-stock" element={<LowStockPage />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>

                            {/* Print page (protected) */}
                            <Route path="/print" element={
                                <RequireAuth>
                                    <PrintPage />
                                </RequireAuth>
                            } />
                        </Routes>
                    </Router>
                    <Toaster position="top-right" richColors />
                </WarehouseProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
