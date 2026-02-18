import React, { useState, useEffect } from 'react';
import CopyBadge from '../../components/CopyBadge';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWarehouse } from '../../context/WarehouseContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, CheckCircle, AlertTriangle, AlertOctagon, Save, X } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

const StockCountReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getVariance, completeStockCount } = useWarehouse();

    const [varianceItems, setVarianceItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Check if already completed — redirect to report
                const { data: countData } = await supabase
                    .from('stock_counts')
                    .select('status')
                    .eq('id', id)
                    .single();

                if (countData?.status === 'completed') {
                    toast.info('รอบนับนี้ปิดแล้ว กำลังไปหน้ารายงาน...');
                    navigate(`/stock-count/${id}/report`, { replace: true });
                    return;
                }

                const data = await getVariance(id);
                setVarianceItems(data || []);
            } catch (err) {
                console.error("Error fetching variance:", err);
                toast.error("Failed to load variance report");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const handleComplete = async () => {
        setShowConfirmModal(false);
        setSubmitting(true);
        try {
            await completeStockCount(id, user.id);
            toast.success("✅ Stock count completed! Inventory updated successfully.");
            navigate('/stock-count');
        } catch (err) {
            console.error("Error completing count:", err);
            toast.error("Failed to complete stock count: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Stats
    const totalVariance = varianceItems.length;
    const pendingItems = varianceItems.filter(i => i.status !== 'counted').length;
    const validVariances = varianceItems.filter(i => i.status === 'counted' && i.variance !== 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <Link to={`/stock-count/${id}`} className="inline-flex items-center text-slate-500 hover:text-blue-600 transition mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Dashboard
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-slate-900">Review & Close Count</h1>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            disabled={submitting}
                            className={clsx(
                                "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white shadow-sm transition",
                                submitting ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                            )}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Confirm & Update Inventory
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                                ยืนยันการปิดรอบนับ?
                            </h3>
                            <p className="text-sm text-slate-500 text-center mb-1">
                                ระบบจะปรับปรุงยอดสต็อกทั้งหมดตามยอดที่นับได้
                            </p>
                            <p className="text-xs text-slate-400 text-center mb-6">
                                การดำเนินการนี้ไม่สามารถย้อนกลับได้
                            </p>

                            <div className="bg-slate-50 rounded-lg p-3 mb-6 text-sm">
                                <div className="flex justify-between text-slate-600 mb-1">
                                    <span>รายการทั้งหมด</span>
                                    <span className="font-bold">{totalVariance} items</span>
                                </div>
                                <div className="flex justify-between text-amber-600 mb-1">
                                    <span>รายการที่มี Variance</span>
                                    <span className="font-bold">{validVariances.length} items</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <span>ยังไม่ได้นับ</span>
                                    <span className="font-bold">{pendingItems} items</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleComplete}
                                    className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-sm active:scale-95"
                                >
                                    ✅ ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Total Discrepancies</div>
                    <div className="text-3xl font-bold text-slate-800">{totalVariance}</div>
                    <div className="text-xs text-slate-400 mt-2">Items needing attention</div>
                </div>
                <div className="bg-amber-50 p-5 rounded-xl shadow-sm border border-amber-100">
                    <div className="text-amber-600 text-sm font-medium mb-1 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Variance Found
                    </div>
                    <div className="text-3xl font-bold text-amber-700">{validVariances.length}</div>
                    <div className="text-xs text-amber-600/80 mt-2">Items where Count ≠ System</div>
                </div>
                <div className="bg-red-50 p-5 rounded-xl shadow-sm border border-red-100">
                    <div className="text-red-600 text-sm font-medium mb-1 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4" />
                        Not Counted
                    </div>
                    <div className="text-3xl font-bold text-red-700">{pendingItems}</div>
                    <div className="text-xs text-red-600/80 mt-2">Items pending count</div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-800">Variance Detail</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm">
                                <th className="px-6 py-3 font-medium">Product</th>
                                <th className="px-6 py-3 font-medium">Bin</th>
                                <th className="px-6 py-3 font-medium text-right">System Qty</th>
                                <th className="px-6 py-3 font-medium text-right">Counted Qty</th>
                                <th className="px-6 py-3 font-medium text-right">Variance</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {varianceItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                                        <p className="text-lg font-medium text-slate-700">Perfect Count!</p>
                                        <p className="text-sm">No variances found. You can close this count.</p>
                                    </td>
                                </tr>
                            ) : (
                                varianceItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <CopyBadge text={item.product_code} variant="slate" size="sm" />
                                                {item.ns_code && (
                                                    <CopyBadge text={item.ns_code} label="NS" variant="blue" size="sm" />
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">{item.product_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {item.bin_code}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600">
                                            {item.system_qty}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                                            {item.counted_qty ?? '-'}
                                        </td>
                                        <td className={clsx("px-6 py-4 text-right font-bold",
                                            item.variance > 0 ? "text-emerald-600" :
                                                item.variance < 0 ? "text-red-600" : "text-slate-400"
                                        )}>
                                            {item.variance > 0 ? '+' : ''}{item.variance}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx("px-2 py-1 rounded-full text-xs font-medium capitalize",
                                                item.status === 'counted' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {item.status === 'counted' ? 'Variance' : 'Not Counted'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StockCountReview;

