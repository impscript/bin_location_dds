import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Package, Box, LogOut, Home, ClipboardList, ScanLine, Settings, Shield, Warehouse, Calculator } from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import DataImportExport from './DataImportExport';
import NotificationBell from './NotificationBell';

const ROLE_COLORS = {
    admin: { bg: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/10 text-red-400', icon: Shield },
    wh_admin: { bg: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400', icon: Shield },
    warehouse: { bg: 'bg-green-500', text: 'text-green-400', badge: 'bg-green-500/10 text-green-400', icon: Warehouse },
    accounting: { bg: 'bg-blue-500', text: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400', icon: Calculator },
};

const Layout = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const searchRef = useRef(null);
    const userMenuRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { searchItems } = useWarehouse();
    const { user, logout, hasPermission } = useAuth();

    const roleConfig = ROLE_COLORS[user?.role] || ROLE_COLORS.warehouse;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (val.trim().length > 1) {
            const results = searchItems(val);
            setSearchResults(results.slice(0, 10));
            setShowResults(true);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }
    };

    const handleResultClick = (res) => {
        // Use onMouseDown to prevent onBlur from firing before click
        if (res && res.item && res.item._productId) {
            setSearchTerm('');
            setShowResults(false);
            navigate(`/product/${res.item._productId}`);
        }
    };

    const handleLogout = () => {
        setShowUserMenu(false);
        logout();
        navigate('/login');
    };

    // Bottom nav items
    const bottomNavItems = [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/stock-count', icon: ClipboardList, label: 'Stock' },
        { path: '/scan', icon: ScanLine, label: 'Scan' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 print:bg-white pb-16 md:pb-0">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 md:h-20 items-center">

                        {/* Left: Logo & Title */}
                        <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
                            <Link to="/" className="flex items-center gap-2 md:gap-3 group">
                                <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg shadow-sm group-hover:bg-blue-700 transition">
                                    <Box className="h-5 w-5 md:h-6 md:w-6 text-white" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-base md:text-xl text-slate-800 leading-tight">DDS Warehouse</span>
                                    <span className="text-[10px] md:text-xs text-slate-500 font-medium hidden sm:block">Inventory Management</span>
                                </div>
                            </Link>
                        </div>
                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1 mx-4">
                            {bottomNavItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Center: Search Bar (hidden on small mobile) */}
                        <div className="hidden sm:block flex-1 max-w-2xl px-4 md:px-8" ref={searchRef}>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                </div>
                                <input
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition duration-200"
                                    placeholder="ค้นหาสินค้า, รหัส, NS Code..."
                                    type="search"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={() => { if (searchTerm.length > 1) setShowResults(true); }}
                                />

                                {/* Search Results */}
                                {showResults && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-96 overflow-y-auto z-50">
                                        {searchResults.length > 0 ? (
                                            <ul className="py-2">
                                                {searchResults.map((res, index) => (
                                                    <li key={index}>
                                                        <button
                                                            onMouseDown={(e) => {
                                                                e.preventDefault(); // Prevent input blur
                                                                handleResultClick(res);
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 group"
                                                        >
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="font-semibold text-slate-800 text-sm">{res.item.code}</span>
                                                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md group-hover:bg-blue-100 transition">{res.binId}</span>
                                                            </div>
                                                            <div className="text-sm text-slate-500 truncate">{res.item.name}</div>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                                <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                                ไม่พบสินค้า
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Notifications + Import + User */}
                        <div className="flex items-center gap-3 md:gap-6">
                            <NotificationBell />
                            {hasPermission('canImport') && (
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="hidden md:flex text-sm font-medium text-slate-600 hover:text-blue-600 transition items-center gap-2"
                                >
                                    Import/Export
                                </button>
                            )}

                            {/* User Menu */}
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2 hover:opacity-80 transition"
                                >
                                    <div className={`h-9 w-9 md:h-10 md:w-10 rounded-full ${roleConfig.bg} flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm ring-1 ring-slate-100`}>
                                        {user?.display_name?.[0] || '?'}
                                    </div>
                                    <div className="hidden md:flex flex-col items-start">
                                        <span className="text-sm font-medium text-slate-700">{user?.display_name}</span>
                                        <span className={`text-[10px] font-medium ${roleConfig.text}`}>
                                            {user?.role === 'admin' ? 'Admin' : user?.role === 'wh_admin' ? 'WH Admin' : user?.role === 'warehouse' ? 'Warehouse' : 'Accounting'}
                                        </span>
                                    </div>
                                </button>

                                {/* Dropdown */}
                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <p className="text-sm font-medium text-slate-800">{user?.display_name}</p>
                                            <p className={`text-xs mt-0.5 ${roleConfig.text}`}>
                                                {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'wh_admin' ? 'หัวหน้าคลัง' : user?.role === 'warehouse' ? 'คลังสินค้า' : 'บัญชี'}
                                            </p>
                                        </div>
                                        <Link
                                            to="/stock-count"
                                            onClick={() => setShowUserMenu(false)}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                                        >
                                            <ClipboardList className="w-4 h-4 text-slate-400" />
                                            Stock Count
                                        </Link>
                                        <Link
                                            to="/scan"
                                            onClick={() => setShowUserMenu(false)}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 md:hidden"
                                        >
                                            <ScanLine className="w-4 h-4 text-slate-400" />
                                            Scan
                                        </Link>
                                        <Link
                                            to="/settings"
                                            onClick={() => setShowUserMenu(false)}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 md:hidden"
                                        >
                                            <Settings className="w-4 h-4 text-slate-400" />
                                            Settings
                                        </Link>
                                        <div className="border-t border-slate-100 my-1"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            ออกจากระบบ
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile search bar (shown below navbar on mobile) */}
            <div className="sm:hidden sticky top-16 z-40 bg-white border-b border-slate-200 px-4 py-2 print:hidden" ref={searchRef}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        placeholder="ค้นหาสินค้า..."
                        type="search"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={() => { if (searchTerm.length > 1) setShowResults(true); }}
                    />
                    {showResults && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto z-50">
                            {searchResults.length > 0 ? (
                                <ul className="py-1">
                                    {searchResults.map((res, index) => (
                                        <li key={index}>
                                            <button
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleResultClick(res);
                                                }}
                                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition text-sm text-slate-900"
                                            >
                                                <div className="font-medium text-slate-800">{res.item.code}</div>
                                                <div className="text-xs text-slate-500 truncate">{res.item.name} · {res.binId}</div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="px-4 py-6 text-center text-sm text-slate-500">ไม่พบสินค้า</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto py-4 md:py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:w-full print:max-w-none">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 print:hidden">
                <div className="flex items-center justify-around h-16 px-2">
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-lg transition-all min-w-[60px] ${active
                                    ? 'text-blue-600'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
                                <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <DataImportExport isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
        </div>
    );
};

export default Layout;
