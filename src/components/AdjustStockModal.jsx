import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, X, Check } from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function AdjustStockModal({ isOpen, onClose, item, currentBinId }) {
    const { user } = useAuth();
    const { adjustStock, warehouseData } = useWarehouse();
    const [newQty, setNewQty] = useState(0);
    const [reason, setReason] = useState('Found Item');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && item) {
            setNewQty(item.qty);
            setReason('Found Item');
            setNotes('');
        }
    }, [isOpen, item]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const diff = newQty - item.qty;
        if (diff === 0) return toast.info('จำนวนเท่าเดิม ไม่มีการเปลี่ยนแปลง');
        if (newQty < 0) return toast.error('จำนวนห้ามน้อยกว่า 0');
        if (!reason) return toast.error('กรุณาระบุเหตุผล');

        const sourceBin = warehouseData.find(b => b.id === currentBinId);
        if (!sourceBin || !sourceBin._binUuid) return toast.error('ข้อมูล Bin ไม่สมบูรณ์');

        try {
            setIsSubmitting(true);
            await adjustStock(
                item._productId, // product_id
                sourceBin._binUuid, // bin_id
                newQty,
                user.id,
                `${reason}${notes ? `: ${notes}` : ''}`
            );
            toast.success(`ปรับปรุงยอดสำเร็จ (${diff > 0 ? '+' : ''}${diff})`);
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'เกิดข้อผิดพลาดในการปรับปรุงยอด');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !item) return null;

    const diff = newQty - item.qty;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-white/20 flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-amber-500" />
                            ปรับปรุงยอด (Adjust Stock)
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    {/* Current vs New */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">จำนวนปัจจุบัน</p>
                            <p className="text-2xl font-bold text-slate-700">{item.qty}</p>
                        </div>
                        <div className={`p-3 rounded-xl border text-center transition-colors ${diff !== 0
                            ? (diff > 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')
                            : 'bg-white border-slate-200'
                            }`}>
                            <p className={`text-xs uppercase tracking-wide mb-1 ${diff !== 0 ? (diff > 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-500'
                                }`}>จำนวนใหม่</p>
                            <div className="flex items-center justify-center gap-2">
                                <p className={`text-2xl font-bold ${diff !== 0 ? (diff > 0 ? 'text-green-700' : 'text-red-700') : 'text-slate-700'
                                    }`}>{newQty}</p>
                                {diff !== 0 && (
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${diff > 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                        }`}>
                                        {diff > 0 ? '+' : ''}{diff}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        {/* New Qty Input */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">ระบุจำนวนใหม่</label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setNewQty(prev => Math.max(0, prev - 1))}
                                    className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm text-xl font-bold transition"
                                >-</button>
                                <input
                                    type="number"
                                    min="0"
                                    value={newQty}
                                    onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
                                    className="flex-1 h-12 rounded-xl border border-slate-200 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setNewQty(prev => prev + 1)}
                                    className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm text-xl font-bold transition"
                                >+</button>
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">สาเหตุการปรับปรุง</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-sm appearance-none"
                            >
                                <option value="Found Item">Found Item (เจอของเกิน)</option>
                                <option value="Damaged">Damaged (ของชำรุด/พัง)</option>
                                <option value="Lost">Lost (หาไม่เจอ/หาย)</option>
                                <option value="Cycle Count">Cycle Count (นับสต๊อกรอบพิเศษ)</option>
                                <option value="Data Correction">Data Correction (แก้ไขข้อมูลผิด)</option>
                            </select>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">หมายเหตุเพิ่มเติม (Optional)</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="รายละเอียดเพิ่มเติม..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl flex gap-3 items-start border border-amber-100">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 leading-relaxed">
                            การปรับปรุงยอดจะส่งผลต่อ Stock กลาง ควรทำเมื่อมั่นใจว่ายอดจริงไม่ตรงกับในระบบเท่านั้น
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || diff === 0}
                        className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 hover:shadow-amber-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                ยืนยันการปรับปรุง
                                <Check className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
