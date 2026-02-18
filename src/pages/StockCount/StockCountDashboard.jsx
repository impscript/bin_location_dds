import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, ChevronRight, PieChart, FileText, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import clsx from 'clsx';

const StockCountDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [countData, setCountData] = useState(null);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDelete = async () => {
        setShowDeleteModal(false);
        setDeleting(true);
        try {
            const { error } = await supabase.rpc('delete_stock_count', { p_count_id: id });
            if (error) throw error;
            toast.success('ลบรอบนับสำเร็จ');
            navigate('/stock-count');
        } catch (err) {
            toast.error(err.message || 'ไม่สามารถลบได้');
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Count Details
                const { data: count, error: countErr } = await supabase
                    .from('stock_counts')
                    .select('*, created_by_user:users!stock_counts_created_by_fkey(display_name)')
                    .eq('id', id)
                    .single();
                if (countErr) throw countErr;
                setCountData(count);

                // Fetch Zones
                const { data: zonesData, error: zonesErr } = await supabase
                    .from('stock_count_zones')
                    .select('*, zone:zones(name, type)')
                    .eq('stock_count_id', id);

                if (zonesErr) throw zonesErr;

                // Sort zones by name for better UX
                const sortedZones = (zonesData || []).sort((a, b) =>
                    (a.zone?.name || '').localeCompare(b.zone?.name || '', undefined, { numeric: true })
                );
                setZones(sortedZones);

            } catch (err) {
                console.error("Error fetching stock count details:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!countData) {
        return <div className="text-center py-12 text-slate-500">Stock Count not found.</div>;
    }

    // Calculate total progress
    const totalItems = zones.reduce((sum, z) => sum + z.total_items, 0);
    const countedItems = zones.reduce((sum, z) => sum + z.counted_items, 0);
    const progressPercent = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <Link to="/stock-count" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to List
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            {countData.batch_name}
                            <span className={clsx(
                                "text-sm px-2.5 py-0.5 rounded-full font-medium border capitalize",
                                countData.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                    countData.status === 'in_progress' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                        "bg-slate-100 text-slate-700 border-slate-200"
                            )}>
                                {countData.status.replace('_', ' ')}
                            </span>
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Month: {countData.count_month}/{countData.count_year} • Created by {countData.created_by_user?.display_name || 'Admin'}
                            {countData.completed_at && (
                                <span> • ปิดรอบ: {format(new Date(countData.completed_at), 'dd MMM yyyy HH:mm')}</span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            to={`/stock-count/${id}/report`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            View Report
                        </Link>
                        {countData.status === 'in_progress' && (
                            <>
                                <Link
                                    to={`/stock-count/${id}/review`}
                                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition shadow-sm flex items-center gap-2"
                                >
                                    Review & Close
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={deleting}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 border",
                                        deleting
                                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 active:scale-95"
                                    )}
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                                            กำลังลบ...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            ลบ
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                                ยืนยันการลบรอบนับ?
                            </h3>
                            <p className="text-sm text-slate-500 text-center mb-1">
                                ข้อมูลการนับทั้งหมดในรอบนี้จะถูกลบถาวร
                            </p>
                            <p className="text-xs text-red-500 text-center mb-6 font-medium">
                                ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
                            </p>

                            <div className="bg-slate-50 rounded-lg p-3 mb-6 text-sm">
                                <div className="flex justify-between text-slate-600 mb-1">
                                    <span>รอบนับ</span>
                                    <span className="font-bold">{countData?.batch_name}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 mb-1">
                                    <span>จำนวนโซน</span>
                                    <span className="font-bold">{zones.length} zones</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>จำนวนรายการ</span>
                                    <span className="font-bold">{zones.reduce((sum, z) => sum + z.total_items, 0)} items</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition shadow-sm active:scale-95"
                                >
                                    🗑️ ยืนยันลบ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <PieChart className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800">Overall Progress</h3>
                </div>
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                                {progressPercent}%
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-semibold inline-block text-blue-600">
                                {countedItems} / {totalItems} Items
                            </span>
                        </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                        <div style={{ width: `${progressPercent}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"></div>
                    </div>
                </div>
            </div>

            {/* Zones Grid */}
            <h3 className="font-bold text-slate-800 text-lg">Zones</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {zones.map((zone) => {
                    const zoneProgress = zone.total_items > 0 ? Math.round((zone.counted_items / zone.total_items) * 100) : 0;
                    const isComplete = zoneProgress === 100;

                    return (
                        <Link
                            key={zone.id}
                            to={`/stock-count/${id}/zone/${zone.id}`}
                            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition">
                                        Zone {zone.zone?.name}
                                    </h4>
                                    <p className="text-sm text-slate-500">{zone.zone?.type || 'Standard'}</p>
                                </div>
                                {isComplete ? (
                                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                                ) : (
                                    <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" style={{ animationDuration: '3s' }}></div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Progress</span>
                                    <span className={clsx("font-medium", isComplete ? "text-emerald-600" : "text-blue-600")}>
                                        {zoneProgress}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                    <div
                                        className={clsx("h-1.5 rounded-full transition-all duration-500", isComplete ? "bg-emerald-500" : "bg-blue-500")}
                                        style={{ width: `${zoneProgress}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-slate-400 text-right pt-1">
                                    {zone.counted_items} / {zone.total_items} items
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
};

export default StockCountDashboard;
