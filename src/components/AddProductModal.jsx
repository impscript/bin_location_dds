import React, { useState, useEffect } from 'react';
import { PackagePlus, X, Search, CheckCircle2, Box, MapPin, Hash, AlertTriangle, PackageOpen, Check } from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import clsx from 'clsx';

export default function AddProductModal({
    isOpen,
    onClose,
    initialBinId = '',
    initialCode = '',
    isStockCountMode = false,
    stockCountIdentifiers = null // { stockCountId, stockCountZoneId }
}) {
    const { user } = useAuth();
    const { addInventoryRecord, addUnexpectedCountItem, warehouseData } = useWarehouse();

    // Form State
    const [nsCode, setNsCode] = useState(initialCode);
    const [productCode, setProductCode] = useState('');
    const [productName, setProductName] = useState('');
    const [unit, setUnit] = useState('EA');
    const [nsSubGroup, setNsSubGroup] = useState('');
    const [binCode, setBinCode] = useState(initialBinId);
    const [qty, setQty] = useState(1);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingProduct, setExistingProduct] = useState(null);

    // Dropdown search states
    const [binSearchResults, setBinSearchResults] = useState([]);
    const [subGroupSearchResults, setSubGroupSearchResults] = useState([]);

    // Unique sub groups derived from warehouseData
    const uniqueSubGroups = React.useMemo(() => {
        const groups = new Set();
        warehouseData.forEach(bin => {
            bin.items.forEach(item => {
                if (item.nsSubGroup) groups.add(item.nsSubGroup);
            });
        });
        return Array.from(groups).sort();
    }, [warehouseData]);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setNsCode(initialCode);
            setProductCode('');
            setProductName('');
            setUnit('EA');
            setNsSubGroup('');
            setBinCode(initialBinId);
            setQty(1);
            setExistingProduct(null);
            setIsSubmitting(false);
            setBinSearchResults([]);
            setSubGroupSearchResults([]);
        }
    }, [isOpen, initialBinId, initialCode]);

    // Simple local search to see if product exists in warehouseData
    useEffect(() => {
        if (!nsCode || nsCode.length < 3) {
            setExistingProduct(null);
            return;
        }

        // Find in local data
        let found = null;
        for (const bin of warehouseData) {
            for (const item of bin.items) {
                if (item.nsCode?.toLowerCase() === nsCode.toLowerCase() || item.code?.toLowerCase() === nsCode.toLowerCase()) {
                    found = item;
                    break;
                }
            }
            if (found) break;
        }

        if (found && !existingProduct) {
            setExistingProduct(found);
            setProductName(found.name || found.nsName);
            setProductCode(found.code);
            setUnit(found.unit);
            setNsSubGroup(found.nsSubGroup);
            toast.info(`พบสินค้า '${found.name}' ในระบบแล้ว`, { id: 'found-prod-toast' });
        }
    }, [nsCode, warehouseData]);

    // Search for bins
    useEffect(() => {
        if (initialBinId || !binCode.trim()) {
            setBinSearchResults([]);
            return;
        }

        const query = binCode.toLowerCase();
        const exactMatch = warehouseData.find(b => b.id.toLowerCase() === query);
        if (exactMatch) {
            // Already selected exactly
            // setBinSearchResults([]); 
        }

        const matches = warehouseData
            .filter(b => b.id.toLowerCase().includes(query))
            .slice(0, 5);

        setBinSearchResults(matches);
    }, [binCode, warehouseData, initialBinId]);

    // Search for sub groups
    useEffect(() => {
        if (!nsSubGroup.trim()) {
            setSubGroupSearchResults([]);
            return;
        }

        const query = nsSubGroup.toLowerCase();
        const exactMatch = uniqueSubGroups.find(g => g.toLowerCase() === query);
        if (exactMatch) {
            // Already matched exactly
            // setSubGroupSearchResults([]);
        }

        const matches = uniqueSubGroups
            .filter(g => g.toLowerCase().includes(query))
            .slice(0, 5);

        setSubGroupSearchResults(matches);
    }, [nsSubGroup, uniqueSubGroups]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!nsCode && !productCode) return toast.error('ต้องระบุ NS Code หรือ Product Code');
        if (!productName) return toast.error('กรุณาระบุชื่อสินค้า');
        if (!binCode) return toast.error('กรุณาระบุ Bin (Location)');
        if (qty <= 0) return toast.error('จำนวนต้องมากกว่า 0');

        // Check if bin exists in local data
        const targetBin = warehouseData.find(b => b.id.toLowerCase() === binCode.toLowerCase());
        if (!targetBin) return toast.error(`ไม่พบข้อมูล Bin: ${binCode} ในระบบ`);

        const productData = {
            ns_code: nsCode || productCode,
            product_code: productCode || nsCode,
            product_name: productName,
            ns_name: productName,
            unit: unit || 'EA',
            ns_sub_group: nsSubGroup || null,
        };

        try {
            setIsSubmitting(true);

            if (isStockCountMode && stockCountIdentifiers) {
                await addUnexpectedCountItem(
                    stockCountIdentifiers.stockCountId,
                    stockCountIdentifiers.stockCountZoneId,
                    productData,
                    targetBin._binUuid,
                    qty,
                    user.id
                );
                toast.success(
                    <div className="flex flex-col">
                        <span className="font-bold">เพิ่มรายการเข้าใบตรวจนับสำเร็จ!</span>
                        <span className="text-sm opacity-90">{productName} ➔ {binCode} (Qty: {qty})</span>
                    </div>
                );
            } else {
                await addInventoryRecord(productData, targetBin._binUuid, qty, user.id);
                toast.success(
                    <div className="flex flex-col">
                        <span className="font-bold">เพิ่มสินค้าเข้าคลังสำเร็จ!</span>
                        <span className="text-sm opacity-90">{productName} ➔ {binCode} (Qty: {qty})</span>
                    </div>
                );
            }

            onClose();
        } catch (err) {
            console.error('Add product error:', err);
            toast.error(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียนสินค้า');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-white/20 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 delay-75">

                {/* Header Decoration */}
                <div className={clsx(
                    "relative h-32 overflow-hidden flex-shrink-0",
                    isStockCountMode
                        ? "bg-gradient-to-br from-amber-600 to-orange-700"
                        : "bg-gradient-to-br from-blue-600 to-indigo-700"
                )}>
                    {/* SVG Pattern */}
                    <svg className="absolute inset-0 w-full h-full opacity-20 Mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition backdrop-blur-md">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-4 left-6 flex items-center gap-4 text-white">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                            <PackagePlus className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight shadow-sm">
                                {isStockCountMode ? 'Add Unexpected Item' : 'Add New Item'}
                            </h2>
                            <p className="text-blue-100 text-sm font-medium">
                                {isStockCountMode
                                    ? 'เพิ่มสินค้าที่ไม่อยู่ในใบตรวจนับ ณ ปัจจุบัน'
                                    : 'เพิ่มสินค้าเข้าสต็อก หรือสร้างรายการใหม่'}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Mode Indicator */}
                    {existingProduct && (
                        <div className="flex items-start gap-3 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl animate-in slide-in-from-top-2">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm">ค้นพบ Master Data ในระบบ</p>
                                <p className="text-xs mt-0.5 opacity-90">ระบบจะดึงข้อมูลเดิมมาใช้ หากแก้ไขจะเป็นการอัปเดต Master Data</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Search className="w-4 h-4 text-slate-400" /> NS Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={nsCode}
                                onChange={(e) => setNsCode(e.target.value)}
                                placeholder="เช่น 2CT-XX..."
                                className={clsx(
                                    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition shadow-sm uppercase font-mono text-sm",
                                    isStockCountMode ? "focus:ring-amber-500/30 focus:border-amber-500" : "focus:ring-blue-500/30 focus:border-blue-500"
                                )}
                            />
                        </div>

                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Hash className="w-4 h-4 text-slate-400" /> Legacy Code (ถ้ามี)
                            </label>
                            <input
                                type="text"
                                value={productCode}
                                onChange={(e) => setProductCode(e.target.value)}
                                placeholder="รหัสเดิม..."
                                className={clsx(
                                    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition shadow-sm font-mono text-sm uppercase",
                                    isStockCountMode ? "focus:ring-amber-500/30 focus:border-amber-500" : "focus:ring-blue-500/30 focus:border-blue-500"
                                )}
                            />
                        </div>

                        <div className="space-y-1.5 col-span-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Box className="w-4 h-4 text-slate-400" /> ชื่อสินค้า <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="แฟ้มสันกว้าง ตราช้าง..."
                                className={clsx(
                                    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition shadow-sm",
                                    isStockCountMode ? "focus:ring-amber-500/30 focus:border-amber-500" : "focus:ring-blue-500/30 focus:border-blue-500"
                                )}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">หน่วย (Unit)</label>
                            <input
                                type="text"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="EA, BOX, PC..."
                                className={clsx(
                                    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition shadow-sm uppercase",
                                    isStockCountMode ? "focus:ring-amber-500/30 focus:border-amber-500" : "focus:ring-blue-500/30 focus:border-blue-500"
                                )}
                            />
                        </div>

                        <div className="space-y-1.5 relative">
                            <label className="text-sm font-bold text-slate-700">Sub Group (Group)</label>
                            <input
                                type="text"
                                value={nsSubGroup}
                                onChange={(e) => setNsSubGroup(e.target.value)}
                                placeholder="Stationery..."
                                className={clsx(
                                    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition shadow-sm",
                                    isStockCountMode ? "focus:ring-amber-500/30 focus:border-amber-500" : "focus:ring-blue-500/30 focus:border-blue-500"
                                )}
                            />
                            {/* Sub Group Dropdown */}
                            {subGroupSearchResults.length > 0 && nsSubGroup.length > 0 && subGroupSearchResults[0].toLowerCase() !== nsSubGroup.toLowerCase() && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {subGroupSearchResults.map(group => (
                                        <button
                                            key={group}
                                            type="button"
                                            onClick={() => {
                                                setNsSubGroup(group);
                                                setSubGroupSearchResults([]);
                                            }}
                                            className={clsx(
                                                "w-full text-left px-4 py-2.5 transition border-b border-slate-50 last:border-0 font-medium text-slate-700",
                                                isStockCountMode ? "hover:bg-amber-50" : "hover:bg-blue-50"
                                            )}
                                        >
                                            {group}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5 relative">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-slate-400" /> จัดเก็บที่ (Bin) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={binCode}
                                onChange={(e) => setBinCode(e.target.value)}
                                disabled={!!initialBinId}
                                placeholder="เช่น OB_Non A1-1"
                                className={clsx(
                                    "w-full px-4 py-2.5 border rounded-xl font-mono transition shadow-sm",
                                    initialBinId
                                        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                        : isStockCountMode
                                            ? "bg-slate-50 border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                            : "bg-slate-50 border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                                )}
                            />
                            {/* Bin Code Dropdown */}
                            {!initialBinId && binSearchResults.length > 0 && binSearchResults[0].id.toLowerCase() !== binCode.toLowerCase() && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {binSearchResults.map(bin => (
                                        <button
                                            key={bin.id}
                                            type="button"
                                            onClick={() => {
                                                setBinCode(bin.id);
                                                setBinSearchResults([]);
                                            }}
                                            className={clsx(
                                                "w-full text-left px-4 py-3 transition border-b border-slate-50 last:border-0 flex justify-between items-center group",
                                                isStockCountMode ? "hover:bg-amber-50" : "hover:bg-blue-50"
                                            )}
                                        >
                                            <div>
                                                <span className={clsx(
                                                    "font-bold text-slate-700 transition",
                                                    isStockCountMode ? "group-hover:text-amber-700" : "group-hover:text-blue-700"
                                                )}>{bin.id}</span>
                                                <span className="text-xs text-slate-400 ml-2">Zone {bin.zone}</span>
                                            </div>
                                            {bin.isOccupied ? (
                                                <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">ไม่ว่าง</span>
                                            ) : (
                                                <span className="text-xs text-green-500 bg-green-50 px-2 py-0.5 rounded-full">ว่าง</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <PackageOpen className="w-4 h-4 text-slate-400" /> จำนวน (Qty) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={qty}
                                onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-sm font-mono text-lg text-emerald-700 font-bold"
                            />
                        </div>
                    </div>

                    {!initialBinId && (
                        <div className="text-xs text-amber-600 bg-amber-50 p-2.5 border border-amber-200 rounded-lg flex gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>หากป้อน Bin ผิด หรือไม่มีในระบบ จะไม่สามารถบันทึกได้ กรุณาตรวจสอบรหัส Bin ให้ถูกต้อง</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={clsx(
                            "w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm",
                            isSubmitting
                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                : isStockCountMode
                                    ? "bg-amber-600 text-white hover:bg-amber-700 active:scale-95"
                                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>กำลังบันทึกข้อมูล...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                <span>{isStockCountMode ? 'เพิ่มเข้ารายการนับสต็อก' : 'เพิ่มสินค้าเข้าคลัง'}</span>
                            </>
                        )}
                    </button>

                    {isStockCountMode && (
                        <p className="text-center text-xs text-slate-500 mt-3 font-medium">
                            * สินค้านี้จะถูกบันทึกลงใบตรวจนับ โดยมี System Qty เป็น 0 และรอการ Post ยอดเข้าคลังในภายหลัง
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
