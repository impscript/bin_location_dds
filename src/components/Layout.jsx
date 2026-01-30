import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Search, Package, Box } from 'lucide-react'; // Changed Icon
import { useWarehouse } from '../context/WarehouseContext';
import DataImportExport from './DataImportExport';

const Layout = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();
    const { searchItems } = useWarehouse();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
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

    const handleResultClick = (binId) => {
        setSearchTerm('');
        setShowResults(false);
        navigate(`/bin/${binId}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 print:bg-white">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">

                        {/* Left: Logo & Title */}
                        <div className="flex flex-shrink-0 items-center gap-3">
                            <Link to="/" className="flex items-center gap-3 group">
                                <div className="bg-blue-600 p-2 rounded-lg shadow-sm group-hover:bg-blue-700 transition">
                                    <Box className="h-6 w-6 text-white" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-xl text-slate-800 leading-tight">DDS Warehouse</span>
                                    <span className="text-xs text-slate-500 font-medium">Inventory Management</span>
                                </div>
                            </Link>
                        </div>

                        {/* Center: Search Bar */}
                        <div className="flex-1 max-w-2xl px-8" ref={searchRef}>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                </div>
                                <input
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition duration-200"
                                    placeholder="Search product code, name..."
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
                                                            onClick={() => handleResultClick(res.binId)}
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
                                                No items found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Status & Avatar */}
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition flex items-center gap-2"
                            >
                                Import/Export
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-medium text-slate-600">Online</span>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm ring-1 ring-slate-100">
                                A
                            </div>
                        </div>

                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:w-full print:max-w-none">
                <Outlet />
            </main>

            <DataImportExport isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
        </div>
    );
};

export default Layout;
