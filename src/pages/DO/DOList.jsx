import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
    Plus, Upload, Printer, Search, Calendar, RefreshCw, Trash2, CheckCircle2,
    XCircle, FileSpreadsheet, ChevronLeft, ChevronRight, Edit3, Save, EyeOff, Loader2, Truck
} from 'lucide-react';
import ImportDOModal from './ImportDOModal';
import AddDOModal from './AddDOModal';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const STATUS_CONFIGS = {
    all: { label: 'ทั้งหมด', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    pending: { label: 'รอดำเนินการ', color: 'bg-amber-50 text-amber-700 border-amber-200/50' },
    printed: { label: 'พิมพ์แล้ว', color: 'bg-blue-50 text-blue-700 border-blue-200/50' },
    shipped: { label: 'ส่งของแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/50' },
    cancelled: { label: 'ยกเลิก', color: 'bg-rose-50 text-rose-700 border-rose-200/50' },
};

const DOList = () => {
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();

    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedIds, setSelectedIds] = useState(new Set());

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        document_number: '',
        customer_name: '',
        shipping_address: '',
        item_name: '',
        qty: 1
    });

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let countQuery = supabase
                .from('delivery_orders')
                .select('id', { count: 'exact', head: true });

            let query = supabase
                .from('delivery_orders')
                .select('*');

            if (searchTerm.trim()) {
                const searchPattern = `%${searchTerm.trim()}%`;
                const filterStr = `document_number.ilike.${searchPattern},customer_name.ilike.${searchPattern},item_name.ilike.${searchPattern},reference_no.ilike.${searchPattern}`;
                query = query.or(filterStr);
                countQuery = countQuery.or(filterStr);
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
                countQuery = countQuery.eq('status', statusFilter);
            }

            if (startDate) {
                query = query.gte('document_date', startDate);
                countQuery = countQuery.gte('document_date', startDate);
            }

            if (endDate) {
                query = query.lte('document_date', endDate);
                countQuery = countQuery.lte('document_date', endDate);
            }

            const { count, error: countErr } = await countQuery;
            if (countErr) throw countErr;
            setTotalCount(count || 0);

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await query
                .order('document_date', { ascending: false })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            
            // Group by document_number for display
            const grouped = {};
            (data || []).forEach(item => {
                if (!grouped[item.document_number]) {
                    grouped[item.document_number] = {
                        ...item,
                        items: [],
                        allIds: []
                    };
                }
                grouped[item.document_number].items.push(item);
                grouped[item.document_number].allIds.push(item.id);
                // Update total qty
                grouped[item.document_number].totalQty = grouped[item.document_number].items.reduce((sum, i) => sum + i.qty, 0);
            });
            
            setOrders(Object.values(grouped));
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Failed to fetch delivery orders:', err);
            toast.error('ไม่สามารถโหลดข้อมูลใบส่งสินค้า: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchOrders();
    }, [statusFilter, startDate, endDate]);

    useEffect(() => {
        fetchOrders();
    }, [page]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchOrders();
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const handleSelectRow = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = orders.map(m => m.id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (selectedIds.size === 0) return;

        const idsToUpdate = Array.from(selectedIds);
        const updateData = {
            status: newStatus,
            updated_at: new Date().toISOString(),
        };

        if (newStatus === 'shipped') {
            updateData.shipped_at = new Date().toISOString();
            updateData.shipped_by = user?.id || null;
        } else if (newStatus === 'printed') {
            updateData.printed_at = new Date().toISOString();
            updateData.printed_by = user?.id || null;
        }

        try {
            const { error } = await supabase
                .from('delivery_orders')
                .update(updateData)
                .in('id', idsToUpdate);

            if (error) throw error;

            toast.success(`อัปเดตสถานะเป็น "${STATUS_CONFIGS[newStatus].label}" สำเร็จ ${idsToUpdate.length} รายการ!`);
            fetchOrders();
        } catch (err) {
            console.error('Bulk update failed:', err);
            toast.error('อัปเดตสถานะไม่สำเร็จ: ' + err.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`คุณแน่ใจว่าต้องการลบใบส่งสินค้าที่เลือกจำนวน ${selectedIds.size} รายการหรือไม่?`)) return;

        const idsToDelete = Array.from(selectedIds);
        try {
            const { error } = await supabase
                .from('delivery_orders')
                .delete()
                .in('id', idsToDelete);

            if (error) throw error;

            toast.success(`ลบใบส่งสินค้าสำเร็จ ${idsToDelete.length} รายการแล้ว`);
            fetchOrders();
        } catch (err) {
            console.error('Bulk delete failed:', err);
            toast.error('ลบรายการไม่สำเร็จ: ' + err.message);
        }
    };

    const handlePrintSelected = () => {
        if (selectedIds.size === 0) {
            toast.error('กรุณาเลือกรายการที่ต้องการพิมพ์อย่างน้อย 1 รายการ');
            return;
        }
        const idsParam = Array.from(selectedIds).join(',');
        navigate(`/do/print?ids=${idsParam}`);
    };

    const handleSinglePrint = (id) => {
        navigate(`/do/print?ids=${id}`);
    };

    const startInlineEdit = (order) => {
        setEditingId(order.id);
        setEditForm({
            document_number: order.document_number || '',
            customer_name: order.customer_name,
            shipping_address: order.shipping_address || '',
            item_name: order.item_name,
            qty: order.qty
        });
    };

    const saveInlineEdit = async (id) => {
        try {
            const { error } = await supabase
                .from('delivery_orders')
                .update({
                    document_number: editForm.document_number.trim(),
                    customer_name: editForm.customer_name.trim(),
                    shipping_address: editForm.shipping_address.trim(),
                    item_name: editForm.item_name.trim(),
                    qty: editForm.qty,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            toast.success('แก้ไขข้อมูลสำเร็จ!');
            setEditingId(null);
            fetchOrders();
        } catch (err) {
            console.error('Failed to save edit:', err);
            toast.error('แก้ไขไม่สำเร็จ: ' + err.message);
        }
    };

    const handleDeleteSingle = async (id) => {
        if (!window.confirm('คุณแน่ใจว่าต้องการลบใบส่งสินค้านี้หรือไม่?')) return;
        try {
            const { error } = await supabase
                .from('delivery_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('ลบรายการสำเร็จ!');
            fetchOrders();
        } catch (err) {
            console.error('Failed to delete order:', err);
            toast.error('ลบไม่สำเร็จ: ' + err.message);
        }
    };

    const formatDateThai = (dateStr) => {
        if (!dateStr) return '';
        try {
            const [y, m, d] = dateStr.split('-');
            return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${(parseInt(y) + 543)}`;
        } catch (e) {
            return dateStr;
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                        <Truck className="w-6 h-6 text-blue-600" />
                        เมนูจัดการใบส่งสินค้า (Delivery Order)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">อัปโหลดไฟล์ จัดการข้อมูล และพิมพ์ใบส่งสินค้าสำหรับส่งมอบลูกค้า</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {hasPermission('canImport') && (
                        <button
                            onClick={() => setIsImportOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-semibold rounded-xl transition"
                        >
                            <Upload className="w-4 h-4 text-slate-500" />
                            นำเข้า Excel/CSV
                        </button>
                    )}
                    {hasPermission('canCRUDProducts') && (
                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            เพิ่มข้อมูล
                        </button>
                    )}
                </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="ค้นหาด้วย เลขที่ใบส่งสินค้า, ชื่อลูกค้า, รายการสินค้า, เลขที่อ้างอิง..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 focus:bg-white transition"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-0 p-0 text-xs focus:ring-0 font-medium"
                                title="วันที่เริ่มต้น"
                            />
                            <span className="text-slate-300">|</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-0 p-0 text-xs focus:ring-0 font-medium"
                                title="วันที่สิ้นสุด"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
                        >
                            กรองข้อมูล
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                            title="รีเซ็ตค่ากรอง"
                        >
                            <RefreshCw className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </form>

                {/* Status Tab Filters */}
                <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2">
                    {Object.entries(STATUS_CONFIGS).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg border text-xs font-semibold transition",
                                statusFilter === key
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                            )}
                        >
                            {config.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <span className="text-sm font-semibold text-blue-800">
                        เลือกทั้งหมด {selectedIds.size} รายการ
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handlePrintSelected}
                            className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            พิมพ์ใบส่งสินค้า ({selectedIds.size})
                        </button>
                        {hasPermission('canCRUDProducts') && (
                            <>
                                <button
                                    onClick={() => handleBulkStatusChange('shipped')}
                                    className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    ทำส่งแล้ว
                                </button>
                                <button
                                    onClick={() => handleBulkStatusChange('cancelled')}
                                    className="flex items-center gap-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    ยกเลิกรายการ
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-1 px-3.5 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    ลบ
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-4 text-center w-12">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={orders.length > 0 && selectedIds.size === orders.length}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                    />
                                </th>
                                <th className="px-4 py-4 text-left w-32">วันที่</th>
                                <th className="px-4 py-4 text-left w-36">เลขที่ใบส่งสินค้า</th>
                                <th className="px-4 py-4 text-left w-24">เลขที่ PO</th>
                                <th className="px-4 py-4 text-left min-w-[200px]">ลูกค้า</th>
                                <th className="px-4 py-4 text-left min-w-[140px]">รายการสินค้า</th>
                                <th className="px-4 py-4 text-center w-20">จำนวน</th>
                                <th className="px-4 py-4 text-center w-24">หน่วย</th>
                                <th className="px-4 py-4 text-center w-28">สถานะ</th>
                                <th className="px-4 py-4 text-center w-36">การทำงาน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                                        <span className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูล...</span>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center text-slate-500 font-medium">
                                        ไม่พบข้อมูลใบส่งสินค้าที่ตรงตามที่กรองไว้
                                    </td>
                                </tr>
                            ) : (
                                orders.map((orderGroup) => {
                                    const isEditing = editingId === orderGroup.id;
                                    const statusConfig = STATUS_CONFIGS[orderGroup.status] || STATUS_CONFIGS.pending;
                                    const isSelected = orderGroup.allIds.some(id => selectedIds.has(id));
                                    const itemsCount = orderGroup.items.length;

                                    return (
                                        <tr
                                            key={orderGroup.id}
                                            className={clsx(
                                                "hover:bg-slate-50/50 transition border-b border-slate-100 last:border-0",
                                                isSelected && "bg-blue-50/15"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        // Toggle all items in this group
                                                        const next = new Set(selectedIds);
                                                        if (isSelected) {
                                                            orderGroup.allIds.forEach(id => next.delete(id));
                                                        } else {
                                                            orderGroup.allIds.forEach(id => next.add(id));
                                                        }
                                                        setSelectedIds(next);
                                                    }}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                                />
                                            </td>

                                            <td className="px-4 py-3 text-slate-600 font-medium text-xs font-mono">
                                                {formatDateThai(orderGroup.document_date)}
                                            </td>

                                            <td className="px-4 py-3 text-slate-800 font-bold font-mono text-xs">
                                                {orderGroup.document_number}
                                            </td>

                                            <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                                                {orderGroup.purchase_order_no || '-'}
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="space-y-0.5">
                                                    <div className="font-semibold text-slate-800 truncate max-w-[280px]">
                                                        {orderGroup.customer_name}
                                                    </div>
                                                    <p className="text-xs text-slate-400 truncate max-w-[320px] leading-relaxed" title={orderGroup.shipping_address}>
                                                        {orderGroup.shipping_address || 'ไม่มีข้อมูลสถานที่ส่ง'}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="text-xs text-blue-600 font-semibold mb-1">
                                                    {itemsCount} รายการ
                                                </div>
                                                {orderGroup.items.slice(0, 2).map((item, idx) => (
                                                    <div key={idx} className="text-xs text-slate-600 truncate max-w-[200px]">
                                                        • {item.item_name}
                                                    </div>
                                                ))}
                                                {itemsCount > 2 && (
                                                    <div className="text-xs text-slate-400">+ {itemsCount - 2} อื่นๆ</div>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                <span className="font-bold text-slate-800">{orderGroup.totalQty}</span>
                                            </td>

                                            <td className="px-4 py-3 text-center text-slate-500 text-xs">
                                                {orderGroup.items[0]?.unit || '-'}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                <span className={clsx(
                                                    "px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase inline-block",
                                                    statusConfig.color
                                                )}>
                                                    {statusConfig.label}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            const idsParam = orderGroup.allIds.join(',');
                                                            navigate(`/do/print?ids=${idsParam}`);
                                                        }}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="พิมพ์ใบส่งสินค้า"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    {hasPermission('canCRUDProducts') && (
                                                        <button
                                                            onClick={() => {
                                                                if (!window.confirm(`คุณแน่ใจว่าต้องการลบใบส่งสินค้า ${orderGroup.document_number} (${itemsCount} รายการ)?`)) return;
                                                                handleBulkDelete();
                                                            }}
                                                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {!loading && totalCount > pageSize && (
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">
                            แสดง {Math.min((page - 1) * pageSize + 1, totalCount)} ถึง {Math.min(page * pageSize, totalCount)} จาก {totalCount} รายการ
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-700 px-3">
                                หน้า {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ImportDOModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={fetchOrders}
            />
            <AddDOModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={fetchOrders}
            />
        </div>
    );
};

export default DOList;