import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import {
    ArrowLeft, Package, ArrowRight, RefreshCw, PlusCircle, Search,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X
} from 'lucide-react';
import clsx from 'clsx';
import MoveItemModal from '../components/MoveItemModal';
import AdjustStockModal from '../components/AdjustStockModal';
import AddProductModal from '../components/AddProductModal';
import CopyBadge from '../components/CopyBadge';

const BinDetail = () => {
    const { binId } = useParams();
    const { getBinData } = useWarehouse();
    const { hasPermission } = useAuth();

    const [selectedItem, setSelectedItem] = useState(null);
    const [isMoveOpen, setIsMoveOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Pagination & Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [stockFilter, setStockFilter] = useState('all'); // all, in_stock, low_stock, out_of_stock
    const [jumpPage, setJumpPage] = useState('');

    const bin = getBinData(binId);

    // Reset page when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, stockFilter, pageSize]);

    // Filter items
    const filteredItems = useMemo(() => {
        if (!bin?.items) return [];
        const query = searchTerm.trim().toLowerCase();

        return bin.items.filter(item => {
            // Search match across all fields including 3 master codes
            const matchesSearch = !query || (
                (item.nsCode && item.nsCode.toLowerCase().includes(query)) ||
                (item.code && item.code.toLowerCase().includes(query)) ||
                (item.barcode && item.barcode.toLowerCase().includes(query)) ||
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.nsName && item.nsName.toLowerCase().includes(query)) ||
                (item.nsSubGroup && item.nsSubGroup.toLowerCase().includes(query)) ||
                (item.lotNo && item.lotNo.toLowerCase().includes(query))
            );

            // Stock filter
            const matchesStock =
                stockFilter === 'all' ? true :
                stockFilter === 'in_stock' ? item.qty >= 10 :
                stockFilter === 'low_stock' ? item.qty > 0 && item.qty < 10 :
                stockFilter === 'out_of_stock' ? item.qty === 0 : true;

            return matchesSearch && matchesStock;
        });
    }, [bin?.items, searchTerm, stockFilter]);

    // Pagination calculations
    const totalItems = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedItems = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, safePage, pageSize]);

    // Total quantity in bin
    const totalQty = useMemo(() => {
        return (bin?.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    }, [bin?.items]);

    if (!bin) {
        return <div className="p-10 text-center text-slate-500">Bin not found: {binId}</div>;
    }

    const handleMove = (item) => {
        setSelectedItem(item);
        setIsMoveOpen(true);
    };

    const handleAdjust = (item) => {
        setSelectedItem(item);
        setIsAdjustOpen(true);
    };

    const handlePageChange = (newPage) => {
        const p = Math.min(Math.max(1, newPage), totalPages);
        setCurrentPage(p);
        window.scrollTo({ top: 180, behavior: 'smooth' });
    };

    const handleJumpSubmit = (e) => {
        e.preventDefault();
        const p = parseInt(jumpPage, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
            handlePageChange(p);
            setJumpPage('');
        }
    };

    const canMove = hasPermission('canMoveLocation');
    const canAdjust = hasPermission('canCRUDProducts');

    // Page window helper (e.g. 1 ... 4 5 6 ... 83)
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            let start = Math.max(2, safePage - 2);
            let end = Math.min(totalPages - 1, safePage + 2);

            if (safePage <= 4) {
                end = 5;
            } else if (safePage >= totalPages - 3) {
                start = totalPages - 4;
            }

            if (start > 2) pages.push('...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb / Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link to={`/zone/${bin.zone}`} className="p-2 hover:bg-slate-100 rounded-full transition">
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                            <Link to="/" className="hover:text-blue-600">Dashboard</Link>
                            <span>/</span>
                            <Link to={`/zone/${bin.zone}`} className="hover:text-blue-600">Zone {bin.zone}</Link>
                            <span>/</span>
                            <span className="text-slate-900 font-medium">Bin {bin.shelf}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            {bin.id}
                            {bin.isSim && (
                                <span className="bg-amber-100 text-amber-800 text-sm px-2 py-1 rounded-full font-medium">Simulation Data</span>
                            )}
                        </h1>
                    </div>
                </div>

                {/* Quick Stats Badges */}
                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm self-start sm:self-auto">
                    <div className="text-center px-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Items</p>
                        <p className="text-lg font-bold text-slate-800">{(bin.items.length).toLocaleString()}</p>
                    </div>
                    <div className="h-7 w-px bg-slate-200" />
                    <div className="text-center px-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Qty</p>
                        <p className="text-lg font-bold text-blue-600">{totalQty.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Main Inventory Card */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
                {/* Header & Controls Toolbar */}
                <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Inventory Items</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                แสดง {totalItems > 0 ? ((safePage - 1) * pageSize + 1).toLocaleString() : 0} – {Math.min(safePage * pageSize, totalItems).toLocaleString()} จากทั้งหมด {totalItems.toLocaleString()} รายการ
                                {searchTerm && ` (กรองจาก ${bin.items.length.toLocaleString()} รายการ)`}
                            </p>
                        </div>
                        {canAdjust && (
                            <button
                                onClick={() => setIsAddOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow-md active:scale-95"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add Item to Bin
                            </button>
                        )}
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col md:flex-row gap-3 pt-2">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="ค้นหา NS Code, Product Code, Barcode, ชื่อสินค้า, SubGroup, Lot..."
                                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Stock Filter Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { key: 'all', label: 'ทั้งหมด' },
                                { key: 'in_stock', label: 'In Stock' },
                                { key: 'low_stock', label: 'Low Stock (<10)' },
                                { key: 'out_of_stock', label: 'Out of Stock' },
                            ].map(filter => (
                                <button
                                    key={filter.key}
                                    onClick={() => setStockFilter(filter.key)}
                                    className={clsx(
                                        "px-3 py-2 text-xs font-semibold rounded-xl transition border",
                                        stockFilter === filter.key
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}

                            {/* Page Size Select */}
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                            >
                                <option value={50}>50 / หน้า</option>
                                <option value={100}>100 / หน้า</option>
                                <option value={200}>200 / หน้า</option>
                                <option value={500}>500 / หน้า</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table or Empty State */}
                {paginatedItems.length > 0 ? (
                    <div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-5/12">Product Information</th>
                                        <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Codes (3 Master Codes)</th>
                                        <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Stock Level</th>
                                        {(canMove || canAdjust) && (
                                            <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {paginatedItems.map((item, idx) => {
                                        const isLowStock = item.qty < 10;
                                        return (
                                            <tr key={idx} className="hover:bg-blue-50/40 transition group">
                                                {/* Product Information */}
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex flex-col gap-1">
                                                        <Link
                                                            to={`/product/${item._productId}`}
                                                            className="text-sm font-bold text-slate-800 hover:text-blue-600 hover:underline line-clamp-2 transition-colors"
                                                            title={item.nsName || item.name}
                                                        >
                                                            {item.nsName || item.name}
                                                        </Link>
                                                        {item.nsName && item.name && item.nsName !== item.name && (
                                                            <div className="text-xs text-slate-500 line-clamp-1" title={item.name}>
                                                                <span className="font-medium text-slate-400 mr-1">Legacy:</span>
                                                                {item.name}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {item.nsSubGroup && (
                                                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-purple-200">
                                                                    {item.nsSubGroup}
                                                                </span>
                                                            )}
                                                            {item.lotNo && (
                                                                <CopyBadge text={item.lotNo} variant="indigo" size="sm" label="Lot" />
                                                            )}
                                                            {item.isDummy && (
                                                                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">
                                                                    Simulated
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Codes */}
                                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div>
                                                            <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-0.5">NS Code</p>
                                                            <CopyBadge text={item.nsCode || item.code} variant="blue" size="md" />
                                                        </div>
                                                        {item.code && item.code !== item.nsCode && (
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Legacy Code</p>
                                                                <CopyBadge text={item.code} variant="slate" size="md" />
                                                            </div>
                                                        )}
                                                        {item.barcode && (
                                                            <div>
                                                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider mb-0.5">Barcode</p>
                                                                <CopyBadge text={item.barcode} variant="indigo" size="md" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Stock Level */}
                                                <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl font-bold text-slate-900 tracking-tight">
                                                                {item.qty.toLocaleString()}
                                                            </span>
                                                            <span className="text-sm font-medium text-slate-500">
                                                                {item.unit}
                                                            </span>
                                                        </div>
                                                        <span className={clsx(
                                                            "px-2.5 py-0.5 text-xs font-bold rounded-full border",
                                                            isLowStock
                                                                ? "bg-red-50 text-red-700 border-red-100"
                                                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        )}>
                                                            {isLowStock ? "Low Stock" : "In Stock"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                {(canMove || canAdjust) && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                                        <div className="flex flex-col gap-2 items-end">
                                                            {canMove && (
                                                                <button
                                                                    onClick={() => handleMove(item)}
                                                                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition border border-blue-100"
                                                                >
                                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                                    Move
                                                                </button>
                                                            )}
                                                            {canAdjust && (
                                                                <button
                                                                    onClick={() => handleAdjust(item)}
                                                                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition border border-slate-200"
                                                                >
                                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                                    Adjust
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col md:flex-row items-center justify-between gap-4">
                                {/* Page Information */}
                                <div className="text-xs text-slate-500 font-medium text-center md:text-left">
                                    หน้า <span className="font-bold text-slate-800">{safePage}</span> จาก <span className="font-bold text-slate-800">{totalPages.toLocaleString()}</span> (แสดง {pageSize} รายการ/หน้า)
                                </div>

                                {/* Page Buttons & Navigation */}
                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                    {/* First Page */}
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={safePage === 1}
                                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="หน้าแรก"
                                    >
                                        <ChevronsLeft className="w-4 h-4" />
                                    </button>

                                    {/* Prev Page */}
                                    <button
                                        onClick={() => handlePageChange(safePage - 1)}
                                        disabled={safePage === 1}
                                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="หน้าก่อนหน้า"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    {/* Page Number Chips */}
                                    <div className="flex items-center gap-1">
                                        {getPageNumbers().map((p, pIdx) => {
                                            if (p === '...') {
                                                return (
                                                    <span key={`ellipsis-${pIdx}`} className="px-2 py-1 text-slate-400 text-xs font-bold">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            const isActive = p === safePage;
                                            return (
                                                <button
                                                    key={`page-${p}`}
                                                    onClick={() => handlePageChange(p)}
                                                    className={clsx(
                                                        "min-w-[34px] h-[34px] px-2 rounded-lg text-xs font-bold transition",
                                                        isActive
                                                            ? "bg-blue-600 text-white shadow-sm"
                                                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Next Page */}
                                    <button
                                        onClick={() => handlePageChange(safePage + 1)}
                                        disabled={safePage === totalPages}
                                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="หน้าถัดไป"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>

                                    {/* Last Page */}
                                    <button
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={safePage === totalPages}
                                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="หน้าสุดท้าย"
                                    >
                                        <ChevronsRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Jump to Page Input Form */}
                                <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-400">ไปหน้า:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpPage}
                                        onChange={(e) => setJumpPage(e.target.value)}
                                        placeholder={safePage.toString()}
                                        className="w-14 px-2 py-1.5 text-center text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-800"
                                    />
                                    <button
                                        type="submit"
                                        className="px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition"
                                    >
                                        ไป
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center text-slate-400">
                        <Package className="h-12 w-12 mb-3 opacity-20" />
                        <p>{searchTerm || stockFilter !== 'all' ? 'ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขค้นหา' : 'This bin is empty.'}</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <MoveItemModal
                isOpen={isMoveOpen}
                onClose={() => setIsMoveOpen(false)}
                item={selectedItem}
                currentBinId={binId}
            />
            <AdjustStockModal
                isOpen={isAdjustOpen}
                onClose={() => setIsAdjustOpen(false)}
                item={selectedItem}
                currentBinId={binId}
            />
            <AddProductModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                initialBinId={binId}
            />
        </div>
    );
};

export default BinDetail;
