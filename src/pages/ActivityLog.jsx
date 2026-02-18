import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Download, Search, User, Package, ArrowRight, MapPin, RotateCcw, FileUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import clsx from 'clsx';

const ACTION_CONFIG = {
    move: { label: 'ย้ายที่', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: ArrowRight },
    adjust: { label: 'ปรับยอด', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: RotateCcw },
    import: { label: 'Import', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: FileUp },
    count_adjust: { label: 'ปรับจากนับ', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Package },
};

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 30;
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [filterAction, page]);

    const fetchLogs = async () => {
        setLoading(true);
        let query = supabase
            .from('inventory_logs')
            .select('*, product:products(product_code, product_name), bin_from:bins!inventory_logs_bin_id_from_fkey(bin_code), bin_to:bins!inventory_logs_bin_id_to_fkey(bin_code), performer:users!inventory_logs_performed_by_fkey(display_name)')
            .order('created_at', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (filterAction !== 'all') {
            query = query.eq('action', filterAction);
        }

        const { data, error } = await query;
        if (!error) {
            setLogs(data || []);
            setHasMore((data || []).length === PAGE_SIZE);
        }
        setLoading(false);
    };

    const filteredLogs = search
        ? logs.filter(l =>
            l.product?.product_code?.toLowerCase().includes(search.toLowerCase()) ||
            l.product?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
            l.notes?.toLowerCase().includes(search.toLowerCase())
        )
        : logs;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link to="/settings" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Activity Log</h1>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหา Product Code, ชื่อ..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <select
                    value={filterAction}
                    onChange={e => { setFilterAction(e.target.value); setPage(0); }}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                    <option value="all">ทุกประเภท</option>
                    <option value="move">ย้ายที่</option>
                    <option value="adjust">ปรับยอด</option>
                    <option value="import">Import</option>
                    <option value="count_adjust">ปรับจากนับ</option>
                </select>
            </div>

            {/* Log List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredLogs.map(log => {
                        const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.adjust;
                        const Icon = cfg.icon;
                        return (
                            <div key={log.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", cfg.color)}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-slate-800 dark:text-white">
                                            {log.product?.product_code || '—'}
                                        </span>
                                        <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", cfg.color)}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {log.product?.product_name || ''}
                                        {log.bin_from?.bin_code && ` · จาก ${log.bin_from.bin_code}`}
                                        {log.bin_to?.bin_code && ` → ${log.bin_to.bin_code}`}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        <span>{log.qty_before} → {log.qty_after}</span>
                                        {log.performer?.display_name && <span>โดย {log.performer.display_name}</span>}
                                        <span>{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredLogs.length === 0 && (
                        <div className="text-center py-12 text-slate-500">ไม่พบข้อมูล</div>
                    )}

                    {/* Pagination */}
                    <div className="flex justify-center gap-3 pt-4">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40"
                        >
                            ← ก่อนหน้า
                        </button>
                        <span className="px-4 py-2 text-sm text-slate-500">หน้า {page + 1}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={!hasMore}
                            className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40"
                        >
                            ถัดไป →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLog;
