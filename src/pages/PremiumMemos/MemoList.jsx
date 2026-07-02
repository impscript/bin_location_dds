import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
    Plus, Upload, Printer, Search, Calendar, RefreshCw, Trash2, CheckCircle2,
    XCircle, FileSpreadsheet, Eye, ChevronLeft, ChevronRight, Edit3, Save, EyeOff, Loader2
} from 'lucide-react';
import ImportMemoModal from './ImportMemoModal';
import AddMemoModal from './AddMemoModal';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const STATUS_CONFIGS = {
    all: { label: 'ทั้งหมด', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    pending: { label: 'รอดำเนินการ', color: 'bg-amber-50 text-amber-700 border-amber-200/50' },
    printed: { label: 'พิมพ์แล้ว', color: 'bg-blue-50 text-blue-700 border-blue-200/50' },
    shipped: { label: 'ส่งของแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/50' },
    cancelled: { label: 'ยกเลิก', color: 'bg-rose-50 text-rose-700 border-rose-200/50' },
};

const MemoList = () => {
    const { user, users, hasPermission } = useAuth();
    const navigate = useNavigate();

    const getDisplayName = (userId) => {
        if (!userId) return '';
        const u = users.find(x => x.id === userId);
        return u ? u.display_name : 'ผู้ใช้ทั่วไป/ปิดใช้งานแล้ว';
    };

    // State for modals
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // List and filtering state
    const [memos, setMemos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [totalCount, setTotalCount] = useState(0);

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Inline edit state
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        customer_code: '',
        customer_name: '',
        shipping_address: '',
        item_name: '',
        qty: 1
    });

    const fetchMemos = async () => {
        setLoading(true);
        try {
            let countQuery = supabase
                .from('premium_memos')
                .select('id', { count: 'exact', head: true });

            let query = supabase
                .from('premium_memos')
                .select('*');

            // Apply Filters
            if (searchTerm.trim()) {
                const searchPattern = `%${searchTerm.trim()}%`;
                const filterStr = `if_number.ilike.${searchPattern},customer_name.ilike.${searchPattern},item_name.ilike.${searchPattern}`;
                query = query.or(filterStr);
                countQuery = countQuery.or(filterStr);
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
                countQuery = countQuery.eq('status', statusFilter);
            }

            if (startDate) {
                query = query.gte('etd_date', startDate);
                countQuery = countQuery.gte('etd_date', startDate);
            }

            if (endDate) {
                query = query.lte('etd_date', endDate);
                countQuery = countQuery.lte('etd_date', endDate);
            }

            // Get total count
            const { count, error: countErr } = await countQuery;
            if (countErr) throw countErr;
            setTotalCount(count || 0);

            // Fetch Paginated rows
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await query
                .order('etd_date', { ascending: false })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setMemos(data || []);
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Failed to fetch premium memos:', err);
            toast.error('ไม่สามารถโหลดข้อมูลของแถมได้: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchMemos();
    }, [statusFilter, startDate, endDate]);

    useEffect(() => {
        fetchMemos();
    }, [page]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchMemos();
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    // Selection handlers
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
            const allIds = memos.map(m => m.id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    // Bulk actions
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
                .from('premium_memos')
                .update(updateData)
                .in('id', idsToUpdate);

            if (error) throw error;

            toast.success(`อัปเดตสถานะเป็น "${STATUS_CONFIGS[newStatus].label}" สำเร็จ ${idsToUpdate.length} รายการ!`);
            fetchMemos();
        } catch (err) {
            console.error('Bulk update failed:', err);
            toast.error('อัปเดตสถานะไม่สำเร็จ: ' + err.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`คุณแน่ใจว่าต้องการลบรายการของแถมที่เลือกจำนวน ${selectedIds.size} รายการหรือไม่?`)) return;

        const idsToDelete = Array.from(selectedIds);
        try {
            const { error } = await supabase
                .from('premium_memos')
                .delete()
                .in('id', idsToDelete);

            if (error) throw error;

            toast.success(`ลบรายการของแถมสำเร็จ ${idsToDelete.length} รายการแล้ว`);
            fetchMemos();
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
        navigate(`/premium-memos/print?ids=${idsParam}`);
    };

    const handleSinglePrint = (id) => {
        navigate(`/premium-memos/print?ids=${id}`);
    };

    // Inline edit handlers
    const startInlineEdit = (memo) => {
        setEditingId(memo.id);
        setEditForm({
            customer_code: memo.customer_code || '',
            customer_name: memo.customer_name,
            shipping_address: memo.shipping_address || '',
            item_name: memo.item_name,
            qty: memo.qty
        });
    };

    const saveInlineEdit = async (id) => {
        try {
            const { error } = await supabase
                .from('premium_memos')
                .update({
                    customer_code: editForm.customer_code.trim() || null,
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
            fetchMemos();
        } catch (err) {
            console.error('Failed to save edit:', err);
            toast.error('แก้ไขไม่สำเร็จ: ' + err.message);
        }
    };

    const handleDeleteSingle = async (id) => {
        if (!window.confirm('คุณแน่ใจว่าต้องการลบรายการของแถมชิ้นนี้หรือไม่?')) return;
        try {
            const { error } = await supabase
                .from('premium_memos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('ลบรายการสำเร็จ!');
            fetchMemos();
        } catch (err) {
            console.error('Failed to delete memo:', err);
            toast.error('ลบไม่สำเร็จ: ' + err.message);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                        <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                        เมนูจัดการของแถม (Premium Memos)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">อัปโหลดไฟล์ จัดการข้อมูล และพิมพ์ใบจัดของแถมสำหรับส่งมอบลูกค้า</p>
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
                            เพิ่มข้อมูลแมนนวล
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
                            placeholder="ค้นหาด้วย เลขเอกสาร (IF), ชื่อลูกค้า, ชื่อของแถม..."
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
                                title="วันที่ ETD เริ่มต้น"
                            />
                            <span className="text-slate-300">|</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-0 p-0 text-xs focus:ring-0 font-medium"
                                title="วันที่ ETD สิ้นสุด"
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
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-250">
                    <span className="text-sm font-semibold text-blue-800">
                        เลือกทั้งหมด {selectedIds.size} รายการ
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handlePrintSelected}
                            className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            พิมพ์เอกสารชุด ({selectedIds.size})
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

            {/* Memos Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-4 text-center w-12">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={memos.length > 0 && selectedIds.size === memos.length}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                    />
                                </th>
                                <th className="px-4 py-4 text-left w-28">วันที่ส่ง (ETD)</th>
                                <th className="px-4 py-4 text-left w-36">เลขเอกสาร (IF)</th>
                                <th className="px-4 py-4 text-left min-w-[200px]">ลูกค้า</th>
                                <th className="px-4 py-4 text-left min-w-[180px]">ชื่อของแถม</th>
                                <th className="px-4 py-4 text-center w-20">จำนวน</th>
                                <th className="px-4 py-4 text-center w-28">สถานะ</th>
                                <th className="px-4 py-4 text-center w-36">การทำงาน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                                        <span className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูล...</span>
                                    </td>
                                </tr>
                            ) : memos.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-medium">
                                        ไม่พบข้อมูลของแถมที่ตรงตามที่กรองไว้
                                    </td>
                                </tr>
                            ) : (
                                memos.map((memo) => {
                                    const isEditing = editingId === memo.id;
                                    const statusConfig = STATUS_CONFIGS[memo.status] || STATUS_CONFIGS.pending;
                                    const isSelected = selectedIds.has(memo.id);

                                    return (
                                        <tr
                                            key={memo.id}
                                            className={clsx(
                                                "hover:bg-slate-50/50 transition border-b border-slate-100 last:border-0",
                                                isSelected && "bg-blue-50/15"
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(memo.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                                />
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3 text-slate-600 font-medium text-xs font-mono">
                                                {memo.etd_date}
                                            </td>

                                            {/* IF Number */}
                                            <td className="px-4 py-3 text-slate-800 font-bold font-mono text-xs">
                                                {memo.if_number}
                                            </td>

                                            {/* Customer */}
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <div className="space-y-1 max-w-md">
                                                        <input
                                                            type="text"
                                                            value={editForm.customer_code}
                                                            placeholder="รหัสลูกค้า (ถ้ามี)"
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, customer_code: e.target.value }))}
                                                            className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editForm.customer_name}
                                                            placeholder="ชื่อลูกค้า *"
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, customer_name: e.target.value }))}
                                                            className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                                        />
                                                        <textarea
                                                            value={editForm.shipping_address}
                                                            placeholder="ที่อยู่จัดส่ง"
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, shipping_address: e.target.value }))}
                                                            className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none resize-none"
                                                            rows={2}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                            {memo.customer_code && (
                                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                                                    {memo.customer_code}
                                                                </span>
                                                            )}
                                                            <span className="truncate max-w-[280px]">{memo.customer_name}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 truncate max-w-[320px] leading-relaxed" title={memo.shipping_address}>
                                                            {memo.shipping_address || 'ไม่มีข้อมูลที่อยู่'}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Item Name */}
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.item_name}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, item_name: e.target.value }))}
                                                        className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-slate-700 block truncate max-w-[240px]" title={memo.item_name}>
                                                        {memo.item_name}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Qty */}
                                            <td className="px-4 py-3 text-center">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.qty}
                                                        min="1"
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 0 }))}
                                                        className="w-16 px-1.5 py-1 border border-slate-200 rounded text-xs text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-slate-800">{memo.qty}</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase inline-block",
                                                        statusConfig.color
                                                    )}>
                                                        {statusConfig.label}
                                                    </span>
                                                    {memo.status === 'printed' && memo.printed_by && (
                                                        <span className="text-[10px] text-slate-400 block max-w-[120px] truncate" title={`ผู้พิมพ์: ${getDisplayName(memo.printed_by)}`}>
                                                            โดย: {getDisplayName(memo.printed_by)}
                                                        </span>
                                                    )}
                                                    {memo.status === 'shipped' && memo.shipped_by && (
                                                        <span className="text-[10px] text-slate-400 block max-w-[120px] truncate" title={`ผู้ส่ง: ${getDisplayName(memo.shipped_by)}`}>
                                                            โดย: {getDisplayName(memo.shipped_by)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => saveInlineEdit(memo.id)}
                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                                title="บันทึก"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg transition"
                                                                title="ยกเลิก"
                                                            >
                                                                <EyeOff className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleSinglePrint(memo.id)}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                title="พิมพ์ชุด 3 ส่วน"
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                            {hasPermission('canCRUDProducts') && (
                                                                <>
                                                                    <button
                                                                        onClick={() => startInlineEdit(memo)}
                                                                        className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                                                                        title="แก้ไข"
                                                                    >
                                                                        <Edit3 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteSingle(memo.id)}
                                                                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                                                        title="ลบ"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
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
            <ImportMemoModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={fetchMemos}
            />
            <AddMemoModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={fetchMemos}
            />
        </div>
    );
};

export default MemoList;
