import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Search, FileUp, ChevronLeft, ChevronRight, Barcode, AlertCircle, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { useWarehouse } from '../context/WarehouseContext';

export default function BarcodeManagement() {
    const navigate = useNavigate();
    const { refreshData } = useWarehouse();
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ prod_code: '', barcode: '' });
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [importing, setImporting] = useState(false);
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const limit = 20;

    const fetchMappings = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('barcode_mappings')
                .select('*', { count: 'exact' });

            if (search.trim()) {
                const s = search.trim();
                query = query.or(`prod_code.ilike.%${s}%,barcode.ilike.%${s}%`);
            }

            const from = page * limit;
            const to = from + limit - 1;

            const { data, count, error } = await query
                .range(from, to)
                .order('prod_code', { ascending: true });

            if (error) throw error;

            setMappings(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            toast.error('โหลดข้อมูลล้มเหลว: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMappings();
        }, 300); // Debounce search input
        return () => clearTimeout(timer);
    }, [search, page, fetchMappings]);

    // Reset to page 0 when search query changes
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(0);
    };

    const handleSave = async () => {
        if (!form.prod_code.trim() || !form.barcode.trim()) {
            toast.error('กรุณากรอก Legacy Code (PRODCODE) และ Barcode');
            return;
        }

        const prodCode = form.prod_code.trim();
        const barcode = form.barcode.trim();

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('barcode_mappings')
                    .update({
                        prod_code: prodCode,
                        barcode: barcode,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingId);
                
                if (error) throw error;
                toast.success('แก้ไขสำเร็จ');
            } else {
                const { error } = await supabase
                    .from('barcode_mappings')
                    .insert({
                        prod_code: prodCode,
                        barcode: barcode
                    });
                
                if (error) {
                    if (error.code === '23505') {
                        throw new Error('รหัส Legacy Code นี้มี Barcode mapping อยู่แล้ว');
                    }
                    throw error;
                }
                toast.success('เพิ่มสำเร็จ');
            }

            setEditingId(null);
            setIsAdding(false);
            setForm({ prod_code: '', barcode: '' });
            fetchMappings();
            refreshData(); // update context data
        } catch (err) {
            toast.error('บันทึกล้มเหลว: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('ยืนยันลบ Barcode mapping นี้?')) return;
        try {
            const { error } = await supabase.from('barcode_mappings').delete().eq('id', id);
            if (error) throw error;
            toast.success('ลบสำเร็จ');
            
            // Adjust page if deleting last item on the page
            if (mappings.length === 1 && page > 0) {
                setPage(page - 1);
            } else {
                fetchMappings();
            }
            refreshData();
        } catch (err) {
            toast.error('ลบล้มเหลว: ' + err.message);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm('🚨 คำเตือน! คุณต้องการลบข้อมูล Barcode mapping ทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('barcode_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
            if (error) throw error;
            toast.success('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
            setPage(0);
            fetchMappings();
            refreshData();
        } catch (err) {
            toast.error('ลบข้อมูลล้มเหลว: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (mapping) => {
        setEditingId(mapping.id);
        setIsAdding(false);
        setForm({
            prod_code: mapping.prod_code,
            barcode: mapping.barcode,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setForm({ prod_code: '', barcode: '' });
    };

    // Client-side CSV Import
    const handleCSVImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setImporting(true);
        toast.info('กำลังอ่านและเตรียมอัปโหลดไฟล์...');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data;
                
                // Validate headers
                const firstRow = rows[0] || {};
                const prodCodeKey = Object.keys(firstRow).find(k => k.toUpperCase().trim() === 'PRODCODE');
                const barcodeKey = Object.keys(firstRow).find(k => k.toUpperCase().trim() === 'BARCODE');

                if (!prodCodeKey || !barcodeKey) {
                    toast.error('ไฟล์ CSV ต้องมีหัวคอลัมน์เป็น PRODCODE และ BARCODE');
                    setImporting(false);
                    return;
                }

                // Deduplicate and prepare records
                const uniqueRecordsMap = new Map();
                rows.forEach(row => {
                    const prod_code = (row[prodCodeKey] || '').trim();
                    const barcode = (row[barcodeKey] || '').trim();
                    if (prod_code && barcode) {
                        uniqueRecordsMap.set(prod_code, barcode);
                    }
                });

                const records = Array.from(uniqueRecordsMap.entries()).map(([prod_code, barcode]) => ({
                    prod_code,
                    barcode
                }));

                if (records.length === 0) {
                    toast.error('ไม่พบข้อมูลสำหรับนำเข้าในไฟล์ CSV');
                    setImporting(false);
                    return;
                }

                toast.info(`กำลังนำเข้าข้อมูลจำนวน ${records.length} รายการ...`);

                // Insert/Upsert in batches
                const batchSize = 500;
                let successCount = 0;
                let failedCount = 0;

                try {
                    for (let i = 0; i < records.length; i += batchSize) {
                        const batch = records.slice(i, i + batchSize);
                        const { error } = await supabase
                            .from('barcode_mappings')
                            .upsert(batch, { onConflict: 'prod_code' });

                        if (error) {
                            console.error('Batch error:', error);
                            failedCount += batch.length;
                        } else {
                            successCount += batch.length;
                        }
                    }

                    if (successCount > 0) {
                        toast.success(`นำเข้าสำเร็จ ${successCount} รายการ!`);
                        if (failedCount > 0) {
                            toast.warning(`ล้มเหลว ${failedCount} รายการ`);
                        }
                        setPage(0);
                        fetchMappings();
                        refreshData();
                    } else {
                        toast.error('นำเข้าข้อมูลล้มเหลวทั้งหมด กรุณาตรวจสอบสิทธิ์ของตาราง barcode_mappings');
                    }
                } catch (err) {
                    toast.error('ข้อผิดพลาดระหว่างนำเข้า: ' + err.message);
                } finally {
                    setImporting(false);
                    event.target.value = ''; // Reset file input
                }
            },
            error: (err) => {
                toast.error('ไม่สามารถอ่านไฟล์ CSV ได้: ' + err.message);
                setImporting(false);
            }
        });
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/settings')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Barcode className="h-6 w-6 text-blue-600" />
                                จัดการข้อมูล Barcode
                            </h1>
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                                Inactive (Legacy)
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            ระบบได้ปรับปรุงให้ Barcode รวมอยู่ใน Master Data สินค้าโดยตรงแล้ว (หน้านี้เก็บไว้สำหรับข้อมูลสำรองเดิม)
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                        <p className="font-bold">โครงสร้าง Master Data ใหม่ (3 รหัส):</p>
                        <p className="mt-0.5">ปัจจุบันสินค้าทุกตัวใช้ <strong>NS Code</strong> เป็นรหัสหลัก และมี <strong>Product Code</strong> กับ <strong>Barcode</strong> บันทึกอยู่ใน Master Data โดยตรงเวลา Import/แก้ไขสินค้า โดยไม่ต้องทำ Mapping แยกอีกต่อไป</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => { setIsAdding(true); setEditingId(null); setForm({ prod_code: '', barcode: '' }); }}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition text-sm font-semibold shadow-sm"
                    >
                        <Plus className="h-4 w-4" /> เพิ่มรหัส Barcode
                    </button>

                    <label className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition text-sm font-semibold shadow-sm cursor-pointer">
                        <FileUp className="h-4 w-4" />
                        <span>นำเข้า CSV</span>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVImport}
                            disabled={importing}
                            className="hidden"
                        />
                    </label>

                    {mappings.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl flex items-center gap-2 transition text-sm font-semibold"
                        >
                            <Trash2 className="h-4 w-4" /> ล้างข้อมูลทั้งหมด
                        </button>
                    )}
                </div>
            </div>

            {/* Instruction banner */}
            <div className="bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800 dark:text-slate-300 space-y-1">
                    <p className="font-semibold">คำแนะนำการนำเข้าด้วย CSV:</p>
                    <p>
                        ไฟล์ CSV จะต้องมีหัวข้อ (Header) เป็นคอลัมน์ <code className="bg-blue-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">PRODCODE</code> และ <code className="bg-blue-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">BARCODE</code> เท่านั้น ระบบจะทำการอัปเดตข้อมูลของ PRODCODE เดิมที่มีอยู่ หรือเพิ่มรายการใหม่หากไม่มีในระบบ
                    </p>
                </div>
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-base">
                        {editingId ? '✏️ แก้ไขข้อมูล Barcode' : '➕ เพิ่ม Barcode Mapping ใหม่'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Legacy Code (PRODCODE)</label>
                            <input
                                type="text"
                                value={form.prod_code}
                                onChange={(e) => setForm({ ...form, prod_code: e.target.value })}
                                placeholder="เช่น C01623300"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Barcode Number</label>
                            <input
                                type="text"
                                value={form.barcode}
                                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                placeholder="เช่น 4977766666695"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1">
                            <X className="h-4 w-4" /> ยกเลิก
                        </button>
                        <button onClick={handleSave} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-1 font-semibold shadow-sm">
                            <Save className="h-4 w-4" /> บันทึกข้อมูล
                        </button>
                    </div>
                </div>
            )}

            {/* Search and Table */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="ค้นหาด้วย Legacy Code หรือ Barcode..."
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    {loading && mappings.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                            <span>กำลังโหลดข้อมูล...</span>
                        </div>
                    ) : mappings.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                            ไม่พบข้อมูล Barcode mappings ในระบบ
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                        <th className="text-left px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Legacy Code (PRODCODE)</th>
                                        <th className="text-left px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Barcode</th>
                                        <th className="text-center px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs w-28">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {mappings.map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="px-6 py-4 font-mono text-slate-800 dark:text-slate-200 font-semibold">
                                                {m.prod_code}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                                                {m.barcode}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(m)}
                                                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                                                        title="แก้ไข"
                                                    >
                                                        <Pencil className="h-4 w-4 text-blue-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(m.id)}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/20 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            แสดง {page * limit + 1} - {Math.min((page + 1) * limit, totalCount)} จากทั้งหมด {totalCount} รายการ
                        </span>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition text-slate-600 dark:text-slate-300"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                หน้า {page + 1} จาก {totalPages}
                            </span>
                            
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition text-slate-600 dark:text-slate-300"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
