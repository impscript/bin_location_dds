import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Download, FileText, CheckCircle, AlertTriangle, Search, Printer } from 'lucide-react';
import CopyBadge from '../../components/CopyBadge';
import { format } from 'date-fns';
import clsx from 'clsx';

const StockCountReport = () => {
    const { id } = useParams();
    const [countData, setCountData] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, variance, not_counted

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const { data: count, error: countErr } = await supabase
                    .from('stock_counts')
                    .select('*, created_by_user:users!stock_counts_created_by_fkey(display_name)')
                    .eq('id', id)
                    .single();
                if (countErr) throw countErr;
                setCountData(count);

                const { data: itemsData, error: itemsErr } = await supabase
                    .from('stock_count_items')
                    .select(`
                        *,
                        product:products(product_code, product_name, ns_code, ns_name, unit),
                        bin:bins(bin_code),
                        counter:users!stock_count_items_counted_by_fkey(display_name)
                    `)
                    .eq('stock_count_id', id)
                    .order('bin_id');
                if (itemsErr) throw itemsErr;
                setItems(itemsData || []);
            } catch (err) {
                console.error("Error fetching report:", err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchReport();
    }, [id]);

    // Filter & Search
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = !searchTerm ||
                item.product?.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.product?.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.product?.ns_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.product?.ns_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.bin?.bin_code?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFilter =
                filterType === 'all' ? true :
                    filterType === 'variance' ? (item.status === 'counted' && item.variance !== 0) :
                        filterType === 'not_counted' ? item.status !== 'counted' : true;

            return matchesSearch && matchesFilter;
        });
    }, [items, searchTerm, filterType]);

    // Stats
    const stats = useMemo(() => {
        const total = items.length;
        const counted = items.filter(i => i.status === 'counted').length;
        const withVariance = items.filter(i => i.status === 'counted' && i.variance !== 0).length;
        const notCounted = items.filter(i => i.status !== 'counted').length;
        const accuracy = counted > 0 ? (((counted - withVariance) / counted) * 100).toFixed(1) : '0.0';
        return { total, counted, withVariance, notCounted, accuracy };
    }, [items]);

    // Export CSV
    const handleExportCSV = () => {
        const headers = [
            'Product Code', 'NS Code', 'Product Name', 'NS Name', 'Bin',
            'Unit', 'System Qty', 'Counted Qty', 'Variance', 'Status',
            'Counted By', 'Counted At'
        ];

        const rows = filteredItems.map(item => [
            item.product?.product_code || '',
            item.product?.ns_code || '',
            item.product?.product_name || '',
            item.product?.ns_name || '',
            item.bin?.bin_code || '',
            item.product?.unit || '',
            item.system_qty,
            item.counted_qty ?? '',
            item.variance ?? '',
            item.status === 'counted' ? 'Counted' : 'Not Counted',
            item.counter?.display_name || '',
            item.counted_at ? format(new Date(item.counted_at), 'yyyy-MM-dd HH:mm') : ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row =>
                row.map(cell => {
                    const str = String(cell);
                    return str.includes(',') || str.includes('"')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                }).join(',')
            )
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `StockCount_${countData?.batch_name || 'Report'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

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

    const reportDate = format(new Date(), 'dd/MM/yyyy HH:mm');
    const countPeriod = `${countData.count_month}/${countData.count_year}`;
    const completedDate = countData.completed_at
        ? format(new Date(countData.completed_at), 'dd MMM yyyy HH:mm')
        : '-';

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* ═══════ PRINT-ONLY HEADER ═══════ */}
            <div className="hidden print:block mb-2" style={{ borderBottom: '2px solid #1e40af' }}>
                {/* Company header row */}
                <div className="flex justify-between items-start pb-2">
                    <div>
                        <h1 style={{ fontSize: '14pt', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                            DDS Warehouse
                        </h1>
                        <p style={{ fontSize: '7pt', color: '#64748b', margin: '1px 0 0 0' }}>
                            Inventory Management System
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11pt', fontWeight: 700, color: '#1e40af', margin: 0 }}>
                            STOCK COUNT REPORT
                        </p>
                        <p style={{ fontSize: '7pt', color: '#64748b', margin: '1px 0 0 0' }}>
                            Generated: {reportDate}
                        </p>
                    </div>
                </div>

                {/* Report info strip */}
                <div className="flex gap-6 py-2 mt-1" style={{ borderTop: '1px solid #e2e8f0', fontSize: '8pt', color: '#475569' }}>
                    <div><strong>Batch:</strong> {countData.batch_name}</div>
                    <div><strong>Period:</strong> {countPeriod}</div>
                    <div><strong>Status:</strong> {countData.status === 'completed' ? '✅ Completed' : '⏳ In Progress'}</div>
                    <div><strong>Created by:</strong> {countData.created_by_user?.display_name || 'Admin'}</div>
                    {countData.completed_at && (
                        <div><strong>Closed:</strong> {completedDate}</div>
                    )}
                </div>

                {/* Print summary boxes */}
                <div className="flex gap-2 py-2" style={{ borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 8px' }}>
                        <div style={{ fontSize: '6pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>Total Items</div>
                        <div style={{ fontSize: '12pt', fontWeight: 800, color: '#1e293b' }}>{stats.total}</div>
                    </div>
                    <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '3px', padding: '4px 8px' }}>
                        <div style={{ fontSize: '6pt', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>✓ Counted</div>
                        <div style={{ fontSize: '12pt', fontWeight: 800, color: '#15803d' }}>{stats.counted}</div>
                    </div>
                    <div style={{ flex: 1, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '3px', padding: '4px 8px' }}>
                        <div style={{ fontSize: '6pt', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>⚠ Variance</div>
                        <div style={{ fontSize: '12pt', fontWeight: 800, color: '#b45309' }}>{stats.withVariance}</div>
                    </div>
                    <div style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '3px', padding: '4px 8px' }}>
                        <div style={{ fontSize: '6pt', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>✗ Not Counted</div>
                        <div style={{ fontSize: '12pt', fontWeight: 800, color: '#b91c1c' }}>{stats.notCounted}</div>
                    </div>
                    <div style={{ flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '3px', padding: '4px 8px' }}>
                        <div style={{ fontSize: '6pt', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>Accuracy</div>
                        <div style={{ fontSize: '12pt', fontWeight: 800, color: '#1d4ed8' }}>{stats.accuracy}%</div>
                    </div>
                </div>
            </div>

            {/* ═══════ SCREEN-ONLY HEADER ═══════ */}
            <div className="print:hidden">
                <Link to={`/stock-count/${id}`} className="inline-flex items-center text-slate-500 hover:text-blue-600 transition mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Dashboard
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <FileText className="w-6 h-6 text-blue-600" />
                            {countData.batch_name} — Report
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                            <span>เดือน: {countPeriod}</span>
                            <span className="text-slate-300">|</span>
                            <span>สร้างโดย: {countData.created_by_user?.display_name || 'Admin'}</span>
                            <span className="text-slate-300">|</span>
                            <span className={clsx(
                                "px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
                                countData.status === 'completed'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-blue-50 text-blue-700 border-blue-100"
                            )}>
                                {countData.status.replace('_', ' ')}
                            </span>
                            {countData.completed_at && (
                                <>
                                    <span className="text-slate-300">|</span>
                                    <span>ปิดรอบ: {completedDate}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition shadow-sm flex items-center gap-2 active:scale-95 whitespace-nowrap"
                        >
                            <Printer className="w-5 h-5" />
                            Print / PDF
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition shadow-sm flex items-center gap-2 active:scale-95 whitespace-nowrap"
                        >
                            <Download className="w-5 h-5" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards (screen only) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:hidden">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 font-medium mb-1">รายการทั้งหมด</div>
                    <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-emerald-600 font-medium mb-1 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> นับแล้ว
                    </div>
                    <div className="text-2xl font-bold text-emerald-700">{stats.counted}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
                    <div className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> มี Variance
                    </div>
                    <div className="text-2xl font-bold text-amber-700">{stats.withVariance}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
                    <div className="text-xs text-red-600 font-medium mb-1">ไม่ได้นับ</div>
                    <div className="text-2xl font-bold text-red-700">{stats.notCounted}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="text-xs text-blue-600 font-medium mb-1">Accuracy</div>
                    <div className="text-2xl font-bold text-blue-700">{stats.accuracy}%</div>
                </div>
            </div>

            {/* Search & Filter (screen only) */}
            <div className="flex flex-col md:flex-row gap-3 print:hidden">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา Product Code, NS Code, ชื่อสินค้า, Bin..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    {[
                        { key: 'all', label: 'ทั้งหมด', count: stats.total },
                        { key: 'variance', label: 'Variance', count: stats.withVariance },
                        { key: 'not_counted', label: 'ไม่ได้นับ', count: stats.notCounted }
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilterType(f.key)}
                            className={clsx(
                                "px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap",
                                filterType === f.key
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Table header bar (screen only) */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center print:hidden">
                    <h3 className="font-bold text-slate-800 text-sm">
                        รายการ ({filteredItems.length} จาก {items.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                                <th className="px-4 py-3 font-medium">#</th>
                                <th className="px-4 py-3 font-medium">Product Code</th>
                                <th className="px-4 py-3 font-medium">Product Name</th>
                                <th className="px-4 py-3 font-medium">Bin</th>
                                <th className="px-4 py-3 font-medium text-right">System</th>
                                <th className="px-4 py-3 font-medium text-right">Counted</th>
                                <th className="px-4 py-3 font-medium text-right">Variance</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Counted By</th>
                                <th className="px-4 py-3 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-4 py-12 text-center text-slate-400">
                                        ไม่พบรายการ
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <CopyBadge text={item.product?.product_code} variant="slate" />
                                            {item.product?.ns_code && (
                                                <div className="mt-0.5">
                                                    <CopyBadge text={item.product.ns_code} variant="blue" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800 truncate max-w-[200px]">
                                                {item.product?.product_name || 'Unknown'}
                                            </div>
                                            {item.product?.ns_name && (
                                                <div className="text-xs text-blue-700 truncate max-w-[200px]">
                                                    {item.product.ns_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 font-medium">
                                            {item.bin?.bin_code || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {item.system_qty}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                                            {item.counted_qty ?? '-'}
                                        </td>
                                        <td className={clsx("px-4 py-3 text-right font-bold",
                                            item.variance > 0 ? "text-emerald-600" :
                                                item.variance < 0 ? "text-red-600" : "text-slate-400"
                                        )}>
                                            {item.status === 'counted'
                                                ? `${item.variance > 0 ? '+' : ''}${item.variance}`
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium",
                                                item.status === 'counted'
                                                    ? (item.variance !== 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")
                                                    : "bg-red-100 text-red-700"
                                            )}>
                                                {item.status === 'counted'
                                                    ? (item.variance !== 0 ? 'Variance' : 'OK')
                                                    : 'ไม่ได้นับ'
                                                }
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                                            {item.counter?.display_name || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                                            {item.counted_at
                                                ? format(new Date(item.counted_at), 'dd/MM/yy HH:mm')
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══════ PRINT-ONLY FOOTER ═══════ */}
            <div className="hidden print:block mt-6" style={{ borderTop: '2px solid #1e40af', paddingTop: '8px' }}>
                <div className="flex justify-between" style={{ fontSize: '7pt', color: '#64748b' }}>
                    <div>
                        <strong>DDS Warehouse</strong> — Stock Count Report: {countData.batch_name}
                    </div>
                    <div>
                        Period: {countPeriod} &nbsp;|&nbsp; Items: {stats.total} &nbsp;|&nbsp; Accuracy: {stats.accuracy}%
                    </div>
                    <div>
                        Generated: {reportDate}
                    </div>
                </div>
                <div className="flex justify-between mt-8" style={{ fontSize: '8pt', color: '#475569' }}>
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '4px', width: '180px', textAlign: 'center' }}>
                        ผู้จัดทำ / Prepared by
                    </div>
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '4px', width: '180px', textAlign: 'center' }}>
                        ผู้ตรวจสอบ / Checked by
                    </div>
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '4px', width: '180px', textAlign: 'center' }}>
                        ผู้อนุมัติ / Approved by
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockCountReport;
