import React, { useState, useEffect, useMemo } from 'react';
import { useWarehouse } from '../../context/WarehouseContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Calendar, CheckCircle, Clock, AlertTriangle, ChevronRight, ClipboardList, BarChart3, TrendingUp, Package, History } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import CreateStockCountModal from './CreateStockCountModal';
import clsx from 'clsx';

const StockCountList = () => {
    const { getStockCounts } = useWarehouse();
    const { user, hasPermission } = useAuth();
    const [counts, setCounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchCounts = async () => {
        setLoading(true);
        try {
            const data = await getStockCounts();
            setCounts(data || []);
        } catch (err) {
            console.error("Failed to fetch stock counts:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCounts();
    }, [getStockCounts]);

    const handleCreateSuccess = () => {
        setIsCreateModalOpen(false);
        fetchCounts();
    };

    // Dashboard stats
    const stats = useMemo(() => {
        const total = counts.length;
        const active = counts.filter(c => c.status === 'in_progress').length;
        const completed = counts.filter(c => c.status === 'completed').length;
        return { total, active, completed, accuracy: null };
    }, [counts]);

    // Calculate accuracy from latest completed count
    const [accuracy, setAccuracy] = useState(null);
    useEffect(() => {
        const calc = async () => {
            const lastCompleted = counts.find(c => c.status === 'completed');
            if (!lastCompleted) return;
            const { data } = await supabase
                .from('stock_count_items')
                .select('status, variance')
                .eq('stock_count_id', lastCompleted.id);
            if (!data) return;
            const counted = data.filter(i => i.status === 'counted');
            const withVariance = counted.filter(i => i.variance !== 0).length;
            if (counted.length > 0) {
                setAccuracy(((counted.length - withVariance) / counted.length * 100).toFixed(1));
            }
        };
        if (counts.length > 0) calc();
    }, [counts]);

    // Separate into active and completed for display
    const activeCounts = useMemo(() => counts.filter(c => c.status === 'in_progress'), [counts]);
    const completedCounts = useMemo(() => counts.filter(c => c.status === 'completed'), [counts]);

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-blue-600" />
                        </div>
                        Stock Management
                    </h1>
                    <p className="text-slate-500 mt-1 ml-13">จัดการรอบนับสินค้า ตรวจสอบ Variance และรายงาน</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Package className="w-4.5 h-4.5 text-slate-600" />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">รอบนับทั้งหมด</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-4.5 h-4.5 text-blue-600" />
                        </div>
                        <span className="text-xs text-blue-600 font-medium">กำลังดำเนินการ</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-700">{stats.active}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                        </div>
                        <span className="text-xs text-emerald-600 font-medium">เสร็จสิ้น</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-700">{stats.completed}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4.5 h-4.5 text-white" />
                        </div>
                        <span className="text-xs text-blue-100 font-medium">Accuracy</span>
                    </div>
                    <div className="text-3xl font-bold">
                        {accuracy ? `${accuracy}%` : 'N/A'}
                    </div>
                    <div className="text-xs text-blue-200 mt-1">จากรอบนับล่าสุด</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                {hasPermission('canCreateStockCount') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition shadow-sm active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        สร้างรอบนับใหม่
                    </button>
                )}
                <Link
                    to="/stock-count/history"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition active:scale-95"
                >
                    <History className="w-5 h-5" />
                    📊 History
                </Link>
            </div>

            {/* Active Counts Section */}
            {activeCounts.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <h2 className="font-bold text-slate-800 text-lg">กำลังดำเนินการ</h2>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{activeCounts.length}</span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-1">
                        {activeCounts.map((count) => (
                            <StockCountCard key={count.id} count={count} />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Counts Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <h2 className="font-bold text-slate-800 text-lg">รอบนับที่เสร็จสิ้น</h2>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{completedCounts.length}</span>
                </div>
                {completedCounts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Calendar className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-slate-500">ยังไม่มีรอบนับที่เสร็จสิ้น</p>
                    </div>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-1">
                        {completedCounts.map((count) => (
                            <StockCountCard key={count.id} count={count} />
                        ))}
                    </div>
                )}
            </div>

            {/* Empty state when no counts at all */}
            {
                !loading && counts.length === 0 && (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">ยังไม่มีรอบนับ</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">สร้างรอบนับใหม่เพื่อเริ่มตรวจนับสินค้า</p>
                        {hasPermission('canCreateStockCount') && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-medium"
                            >
                                สร้างรอบนับแรก
                            </button>
                        )}
                    </div>
                )
            }

            {/* Loading */}
            {
                loading && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-slate-500">กำลังโหลด...</p>
                    </div>
                )
            }

            {
                isCreateModalOpen && (
                    <CreateStockCountModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onSuccess={handleCreateSuccess}
                    />
                )
            }
        </div >
    );
};

// Stock Count Card Component
const StockCountCard = ({ count }) => {
    const isCompleted = count.status === 'completed';
    const totalZones = count.stock_count_zones?.[0]?.count || count.stock_count_zones?.length || 0;

    return (
        <Link
            to={`/stock-count/${count.id}`}
            className={clsx(
                "bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition group",
                isCompleted ? "border-emerald-100 hover:border-emerald-200" : "border-blue-100 hover:border-blue-300"
            )}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-700 transition">
                            {count.batch_name}
                        </h3>
                        <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
                            isCompleted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                        )}>
                            {count.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {count.count_month}/{count.count_year}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span>{count.created_by_user?.display_name || 'Admin'}</span>
                        {isCompleted && count.completed_at && (
                            <>
                                <span className="text-slate-300">|</span>
                                <span className="text-emerald-600">
                                    ปิดรอบ: {format(new Date(count.completed_at), 'dd MMM yyyy')}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <div className="text-xs text-slate-500">{totalZones} Zones</div>
                        <div className="text-xs text-slate-400">
                            {format(new Date(count.created_at), 'dd MMM yyyy')}
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition" />
                </div>
            </div>
        </Link>
    );
};

export default StockCountList;
