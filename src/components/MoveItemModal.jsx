import { useState, useEffect } from 'react';
import { ArrowRight, Box, AlertCircle, Search, MapPin, Check, X } from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function MoveItemModal({ isOpen, onClose, item, currentBinId }) {
    const { user } = useAuth();
    const { moveItem, warehouseData } = useWarehouse();
    const [qty, setQty] = useState(1);
    const [targetBinQuery, setTargetBinQuery] = useState('');
    const [targetBin, setTargetBin] = useState(null);
    const [reason, setReason] = useState('Stock Transfer');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setQty(1);
            setTargetBinQuery('');
            setTargetBin(null);
            setReason('Stock Transfer');
            setSearchResults([]);
        }
    }, [isOpen]);

    // Search for bins in local warehouseData
    useEffect(() => {
        if (!targetBinQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const query = targetBinQuery.toLowerCase();
        // Determine search strategy: exact match preferred, but partial allowed for suggestions
        // We search in warehouseData where `id` is the bin code

        // Safety check warehouseData structure
        if (!warehouseData) return;

        const exactMatch = warehouseData.find(b => b.id.toLowerCase() === query);
        if (exactMatch) {
            setTargetBin(exactMatch);
            setSearchResults([]); // Hide suggestions if exact match found (or show it as selected?)
            // Actually, let's show suggestions until user clicks or confirms
        }

        const matches = warehouseData
            .filter(b => b.id.toLowerCase().includes(query))
            .slice(0, 5);

        setSearchResults(matches);
    }, [targetBinQuery, warehouseData]);

    const handleSelectBin = (bin) => {
        setTargetBin(bin);
        setTargetBinQuery(bin.id);
        setSearchResults([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Final validation
        if (!targetBin) {
            // Try to find exact match if user typed it but didn't click
            const exactMatch = warehouseData.find(b => b.id.toLowerCase() === targetBinQuery.toLowerCase());
            if (exactMatch) {
                setTargetBin(exactMatch);
            } else {
                return toast.error('กรุณาเลือก Bin ปลายทางที่ถูกต้อง');
            }
        }

        const finalTargetBin = targetBin || warehouseData.find(b => b.id.toLowerCase() === targetBinQuery.toLowerCase());

        if (!finalTargetBin) return toast.error('ไม่พบ Bin ปลายทาง');
        if (qty <= 0 || qty > item.qty) return toast.error('จำนวนไม่ถูกต้อง');
        if (finalTargetBin.id === currentBinId) return toast.error('Bin ปลายทางต้องไม่ซ้ำกับ Bin ต้นทาง');

        // We need _binUuid for RPC
        if (!finalTargetBin._binUuid) {
            // Should not happen if data loaded correctly
            return toast.error('ข้อมูล Bin ปลายทางไม่สมบูรณ์ (Missing UUID)');
        }

        // We need source bin UUID too... item has _binUuid?
        // Wait, item._binUuid is accessible?
        // In WarehouseContext: _binUuid: bin.id (on bin object). 
        // Inv item has: bin: bin.bin_code.
        // It does NOT have source bin UUID directly on item object in legacy legacyData map.
        // Wait, let's check WarehouseContext again.

        // Line 71: _binUuid: bin.id (UUID) -> This is on the BIN object.
        // Line 72: items: ... map ...

        // So `item` prop passed here is from `bin.items`.
        // It has `_inventoryId` and `_productId`.
        // But it does NOT have `_sourceBinUuid`.
        // However, we have `currentBinId` prop passed to this modal (which is likely the Bin Code).
        // We can find the source bin in warehouseData to get its UUID.

        const sourceBin = warehouseData.find(b => b.id === currentBinId);
        if (!sourceBin || !sourceBin._binUuid) return toast.error('ข้อมูล Bin ต้นทางไม่สมบูรณ์');

        try {
            setIsSubmitting(true);
            await moveItem(
                item._productId, // product_id
                sourceBin._binUuid, // from_bin_id
                finalTargetBin._binUuid, // to_bin_id
                qty,
                user.id,
                reason
            );
            toast.success('ย้ายสินค้าสำเร็จ');
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'เกิดข้อผิดพลาดในการย้ายสินค้า');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-white/20 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Box className="w-5 h-5 text-blue-600" />
                            ย้ายสินค้า (Move Location)
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
                    {/* Source & Qty Info */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">จาก Bin</p>
                            <p className="text-lg font-bold text-slate-800">{currentBinId}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">จำนวนที่มี</p>
                            <p className="text-lg font-bold text-blue-600">{item.qty} {item.unit}</p>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        {/* Target Bin */}
                        <div className="relative">
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">ย้ายไป Bin (ปลายทาง)</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={targetBinQuery}
                                    onChange={(e) => {
                                        setTargetBinQuery(e.target.value);
                                        setTargetBin(null); // Reset selection on type
                                    }}
                                    placeholder="ค้นหา Bin ปลายทาง..."
                                    className={`w-full pl-10 pr-4 py-2.5 bg-white border ${targetBin ? 'border-green-500 ring-1 ring-green-500/20' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm`}
                                    autoFocus
                                />
                                {targetBin && (
                                    <div className="absolute right-3 top-3 text-green-500">
                                        <Check className="w-5 h-5" />
                                    </div>
                                )}
                            </div>

                            {/* Suggestions Dropdown */}
                            {!targetBin && searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {searchResults.map(bin => (
                                        <button
                                            key={bin.id}
                                            type="button"
                                            onClick={() => handleSelectBin(bin)}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-slate-50 last:border-0 flex justify-between items-center group"
                                        >
                                            <div>
                                                <span className="font-bold text-slate-700 group-hover:text-blue-700">{bin.id}</span>
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

                        {/* Quantity */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">จำนวนที่ย้าย</label>
                            <input
                                type="number"
                                min="1"
                                max={item.qty}
                                value={qty}
                                onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm font-mono text-lg"
                            />
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">เหตุผล / หมายเหตุ</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm appearance-none"
                            >
                                <option value="Stock Transfer">Stock Transfer (ย้ายปกติ)</option>
                                <option value="Consolidate">Consolidate (รวมของ)</option>
                                <option value="Replenish">Replenish (เติมของหน้าร้าน)</option>
                                <option value="Wrong Placement">Wrong Placement (วางผิดที่)</option>
                                <option value="Other">Other (อื่นๆ)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 leading-relaxed">
                            การย้ายสินค้าจะถูกบันทึกในระบบทันที และ Stock จะถูกตัดจาก Bin ต้นทางไป Bin ปลายทางอัตโนมัติ
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !targetBinQuery || qty <= 0}
                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                กำลังดำเนินการ...
                            </>
                        ) : (
                            <>
                                ยืนยันการย้าย
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
