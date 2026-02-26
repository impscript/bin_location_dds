import React, { useState, useEffect, useMemo } from 'react';
import CopyBadge from '../../components/CopyBadge';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Check, Save, AlertTriangle, Search, Filter, ScanLine, PackagePlus } from 'lucide-react';
import clsx from 'clsx';
import { useWarehouse } from '../../context/WarehouseContext';
import BarcodeScanner from '../../components/BarcodeScanner';
import AddProductModal from '../../components/AddProductModal';

const ZoneCountView = () => {
    const { id, zoneId } = useParams();
    const { user } = useAuth();
    const { updateCountItem } = useWarehouse();

    const [items, setItems] = useState([]);
    const [zoneInfo, setZoneInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, pending, counted, variance
    const [savingId, setSavingId] = useState(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Ref for search input
    const searchInputRef = React.useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Zone Info
                const { data: zoneData, error: zoneErr } = await supabase
                    .from('stock_count_zones')
                    .select('*, zone:zones(name)')
                    .eq('id', zoneId)
                    .single();
                if (zoneErr) throw zoneErr;
                setZoneInfo(zoneData);

                // Check if parent stock count is completed
                const { data: countData } = await supabase
                    .from('stock_counts')
                    .select('status')
                    .eq('id', zoneData.stock_count_id)
                    .single();
                setIsCompleted(countData?.status === 'completed');

                // Fetch Items
                const { data: itemsData, error: itemsErr } = await supabase
                    .from('stock_count_items')
                    .select(`
                        *,
                        bin:bins(bin_code, shelf, level),
                        product:products(product_code, product_name, ns_code, ns_name, unit)
                    `)
                    .eq('stock_count_zone_id', zoneId)
                    .order('bin_id'); // Order by bin usually

                // Sort by bin_code
                const sortedItems = (itemsData || []).sort((a, b) =>
                    (a.bin?.bin_code || '').localeCompare(b.bin?.bin_code || '', undefined, { numeric: true })
                );

                setItems(sortedItems);

            } catch (err) {
                console.error("Error fetching zone items:", err);
            } finally {
                setLoading(false);
            }
        };

        if (zoneId) fetchData();
    }, [zoneId]);

    const handleSave = async (item, newQty) => {
        if (isCompleted) return; // Guard: don't allow save on completed counts
        setSavingId(item.id);
        try {
            await updateCountItem(item.id, newQty, user.id);

            // Update local state
            setItems(prev => prev.map(i => {
                if (i.id === item.id) {
                    return {
                        ...i,
                        counted_qty: parseInt(newQty),
                        variance: parseInt(newQty) - i.system_qty,
                        status: 'counted'
                    };
                }
                return i;
            }));

        } catch (err) {
            console.error("Failed to save count:", err);
            alert("Failed to save count. Please try again.");
        } finally {
            setSavingId(null);
        }
    };

    const handleScanSuccess = (decodedText) => {
        setSearchTerm(decodedText);
        setIsScannerOpen(false);
    };

    // Group Items by Bin
    const groupedItems = useMemo(() => {
        const filtered = items.filter(item => {
            const matchesSearch =
                item.product?.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.product?.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.product?.ns_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.bin?.bin_code.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFilter =
                filterStatus === 'all' ? true :
                    filterStatus === 'variance' ? (item.status === 'counted' && item.variance !== 0) :
                        item.status === filterStatus;

            return matchesSearch && matchesFilter;
        });

        const groups = {};
        filtered.forEach(item => {
            const binCode = item.bin?.bin_code || 'Unknown';
            if (!groups[binCode]) {
                groups[binCode] = [];
            }
            groups[binCode].push(item);
        });
        return groups;
    }, [items, searchTerm, filterStatus]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-8">
            {/* Header - Sticky */}
            <div className="bg-white px-4 py-3 border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center justify-between mb-3">
                    <Link to={`/stock-count/${id}`} className="text-slate-500 hover:text-blue-600 flex items-center">
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Back
                    </Link>
                    <div className="font-bold text-slate-800">
                        Zone {zoneInfo?.zone?.name}
                    </div>
                    <div className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {items.filter(i => i.status === 'counted').length} / {items.length}
                    </div>
                </div>

                {/* Sub-header: Search & Filter */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Scan/Search NS Code, Bin..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition shadow-sm active:scale-95"
                    >
                        <ScanLine className="w-5 h-5" />
                    </button>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="pl-2 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        <option value="all">All Items</option>
                        <option value="pending">Pending</option>
                        <option value="counted">Counted</option>
                        <option value="variance">Variance</option>
                    </select>
                </div>
            </div>

            {/* Scanner Modal */}
            {isScannerOpen && (
                <BarcodeScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            {/* List Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {Object.keys(groupedItems).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
                        <PackagePlus className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-600">ไม่พบสินค้าในระบบสำหรับโซนนี้</p>
                        <p className="text-sm text-slate-400 mb-6 text-center max-w-xs">
                            หากคุณพบสินค้านอกเหนือจากรายการที่มีอยู่ สามารถเพิ่มเข้าใบตรวจนับได้ทันที
                        </p>

                        {!isCompleted && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl font-medium shadow-sm hover:bg-amber-700 active:scale-95 transition"
                            >
                                <PackagePlus className="w-5 h-5" />
                                + เพิ่มสินค้าที่พบหน้างาน (ไม่ได้อยู่ใน List)
                            </button>
                        )}
                    </div>
                ) : (
                    Object.entries(groupedItems).map(([binCode, binItems]) => (
                        <div key={binCode} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    📦 {binCode}
                                </h3>
                                <div className="text-xs text-slate-500">
                                    {binItems.length} items
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {binItems.map(item => (
                                    <StockItemRow
                                        key={item.id}
                                        item={item}
                                        onSave={handleSave}
                                        isSaving={savingId === item.id}
                                        readOnly={isCompleted}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Unexpected Item Modal */}
            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    // Minimal slight delay to allow modal close animation, then refresh data
                    setTimeout(() => {
                        const evt = new CustomEvent('refresh-zone-data');
                        window.dispatchEvent(evt); // We can trigger a refetch here or just lift fetchData
                        // Alternatively since we didn't extract fetchData, we just reload the page for simplicity and guaranteed consistency for now
                        window.location.reload();
                    }, 300);
                }}
                initialCode={searchTerm}
                isStockCountMode={true}
                stockCountIdentifiers={{
                    stockCountId: zoneInfo?.stock_count_id,
                    stockCountZoneId: zoneId
                }}
            />
        </div>
    );
};

// Extracted Component for Performance & Cleanliness
const StockItemRow = ({ item, onSave, isSaving, readOnly }) => {
    const [val, setVal] = useState(item.counted_qty !== null ? item.counted_qty.toString() : '');

    const isDirty = (val !== '') && (item.counted_qty === null || parseInt(val) !== item.counted_qty);
    const isCounted = item.status === 'counted' && !isDirty;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
            if (val !== '' && !readOnly) onSave(item, val);
        }
    };

    return (
        <div className={clsx("p-4 transition border-l-4",
            item.status === 'counted'
                ? (item.variance === 0 ? "border-l-emerald-500 bg-emerald-50/20" : "border-l-amber-500 bg-amber-50/20")
                : "border-l-transparent"
        )}>
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                        {item.product?.product_name || 'Unknown Product'}
                    </div>
                    {item.product?.ns_name && (
                        <div className="text-xs text-blue-700 mt-0.5 truncate">
                            {item.product.ns_name}
                        </div>
                    )}
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-1">
                        <CopyBadge text={item.product?.product_code} variant="slate" />
                        {item.product?.ns_code && (
                            <CopyBadge text={item.product.ns_code} variant="blue" />
                        )}
                        <span>
                            Sys: <span className="font-semibold text-slate-700">{item.system_qty}</span> {item.product?.unit}
                        </span>
                    </div>
                    {item.status === 'counted' && item.variance !== 0 && (
                        <div className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Diff: {item.variance > 0 ? '+' : ''}{item.variance}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {readOnly ? (
                        /* Read-only: show counted qty as static text */
                        <div className={clsx(
                            "w-20 text-center font-bold text-lg py-2 rounded-lg border",
                            item.status === 'counted' && item.variance === 0 ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                                item.status === 'counted' && item.variance !== 0 ? "border-amber-200 text-amber-700 bg-amber-50" :
                                    "border-slate-200 text-slate-400 bg-slate-50"
                        )}>
                            {item.counted_qty ?? '-'}
                        </div>
                    ) : (
                        /* Editable: input + save button */
                        <>
                            <div className="relative">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    value={val}
                                    onChange={(e) => setVal(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Qty"
                                    className={clsx(
                                        "w-20 text-center font-bold text-lg py-2 rounded-lg border focus:ring-2 outline-none transition",
                                        item.status === 'counted' && item.variance === 0 ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                                            item.status === 'counted' && item.variance !== 0 ? "border-amber-200 text-amber-700 bg-amber-50" :
                                                "border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-blue-500"
                                    )}
                                />
                            </div>
                            <button
                                onClick={() => onSave(item, val)}
                                disabled={!isDirty || isSaving || val === ''}
                                className={clsx(
                                    "p-3 rounded-lg transition shadow-sm",
                                    isDirty
                                        ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                                        : (isCounted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-300 cursor-not-allowed")
                                )}
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : isCounted && !isDirty ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ZoneCountView;
