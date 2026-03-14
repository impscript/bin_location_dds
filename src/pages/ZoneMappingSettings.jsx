import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, MapPin, Search } from 'lucide-react';

const MATCH_TYPE_LABELS = {
    prefix_letter: { label: 'Prefix → ดึงตัวอักษร', desc: 'ตัด prefix ออก แล้วใช้ตัวอักษรแรก เป็น zone เช่น OB_Non → A,B,...', color: 'bg-blue-100 text-blue-700' },
    prefix_group: { label: 'Prefix → กลุ่ม', desc: 'bin ที่ขึ้นต้นด้วย prefix นี้ → ไป zone เดียวกัน', color: 'bg-green-100 text-green-700' },
    exact: { label: 'ตรงทั้งหมด (1:1)', desc: 'ชื่อ bin ตรงทั้งหมด → ไป zone นี้', color: 'bg-amber-100 text-amber-700' },
};

export default function ZoneMappingSettings() {
    const navigate = useNavigate();
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ bin_prefix: '', zone_name: '', match_type: 'exact', priority: 80 });
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');

    const fetchMappings = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('zone_mappings')
            .select('*')
            .order('priority', { ascending: false });
        if (error) {
            toast.error('โหลดข้อมูลล้มเหลว: ' + error.message);
        } else {
            setMappings(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchMappings(); }, [fetchMappings]);

    const handleSave = async () => {
        if (!form.bin_prefix.trim() || !form.zone_name.trim()) {
            toast.error('กรุณากรอก Bin Prefix และ Zone Name');
            return;
        }

        if (editingId) {
            const { error } = await supabase
                .from('zone_mappings')
                .update({
                    bin_prefix: form.bin_prefix.trim(),
                    zone_name: form.zone_name.trim(),
                    match_type: form.match_type,
                    priority: parseInt(form.priority) || 0,
                })
                .eq('id', editingId);
            if (error) {
                toast.error('บันทึกล้มเหลว: ' + error.message);
                return;
            }
            toast.success('แก้ไขสำเร็จ');
        } else {
            const { error } = await supabase
                .from('zone_mappings')
                .insert({
                    bin_prefix: form.bin_prefix.trim(),
                    zone_name: form.zone_name.trim(),
                    match_type: form.match_type,
                    priority: parseInt(form.priority) || 0,
                });
            if (error) {
                toast.error('เพิ่มล้มเหลว: ' + error.message);
                return;
            }
            toast.success('เพิ่มสำเร็จ');
        }

        setEditingId(null);
        setIsAdding(false);
        setForm({ bin_prefix: '', zone_name: '', match_type: 'exact', priority: 80 });
        fetchMappings();
    };

    const handleDelete = async (id) => {
        if (!confirm('ยืนยันลบ mapping นี้?')) return;
        const { error } = await supabase.from('zone_mappings').delete().eq('id', id);
        if (error) {
            toast.error('ลบล้มเหลว: ' + error.message);
            return;
        }
        toast.success('ลบสำเร็จ');
        fetchMappings();
    };

    const handleEdit = (mapping) => {
        setEditingId(mapping.id);
        setIsAdding(false);
        setForm({
            bin_prefix: mapping.bin_prefix,
            zone_name: mapping.zone_name,
            match_type: mapping.match_type,
            priority: mapping.priority,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setForm({ bin_prefix: '', zone_name: '', match_type: 'exact', priority: 80 });
    };

    const filteredMappings = mappings.filter(m =>
        m.bin_prefix.toLowerCase().includes(search.toLowerCase()) ||
        m.zone_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/settings')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
                    <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Zone Mapping</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">กำหนดว่า Bin แต่ละตัว ควรอยู่ Zone ไหน เมื่อ Import CSV</p>
                </div>
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); setForm({ bin_prefix: '', zone_name: '', match_type: 'exact', priority: 80 }); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition text-sm font-medium shadow-sm"
                >
                    <Plus className="h-4 w-4" /> เพิ่ม Mapping
                </button>
            </div>

            {/* Match Type Legend */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">ประเภทการจับคู่</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(MATCH_TYPE_LABELS).map(([key, val]) => (
                        <div key={key} className="flex items-start gap-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${val.color}`}>{val.label}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{val.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-5 space-y-4">
                    <h3 className="font-semibold text-slate-800 dark:text-white">
                        {editingId ? '✏️ แก้ไข Mapping' : '➕ เพิ่ม Mapping ใหม่'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Bin Prefix</label>
                            <input
                                type="text"
                                value={form.bin_prefix}
                                onChange={(e) => setForm({ ...form, bin_prefix: e.target.value })}
                                placeholder="เช่น OB_Non, E-Com, OB_Cutsize"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Zone Name</label>
                            <input
                                type="text"
                                value={form.zone_name}
                                onChange={(e) => setForm({ ...form, zone_name: e.target.value })}
                                placeholder="เช่น A, DEMO, E-Com"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {form.match_type === 'prefix_letter' && (
                                <p className="text-xs text-blue-500 mt-1">* สำหรับ prefix_letter จะใช้ตัวอักษรแรกหลัง prefix แทน</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">ประเภท</label>
                            <select
                                value={form.match_type}
                                onChange={(e) => setForm({ ...form, match_type: e.target.value })}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {Object.entries(MATCH_TYPE_LABELS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Priority (สูง=จับคู่ก่อน)</label>
                            <input
                                type="number"
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={handleCancel} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-1">
                            <X className="h-4 w-4" /> ยกเลิก
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1 font-medium">
                            <Save className="h-4 w-4" /> บันทึก
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหา prefix หรือ zone..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Mapping Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>
                ) : filteredMappings.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">ไม่พบข้อมูล</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Bin Prefix</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">→ Zone</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">ประเภท</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Priority</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-24">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredMappings.map((m) => {
                                    const typeInfo = MATCH_TYPE_LABELS[m.match_type] || MATCH_TYPE_LABELS.exact;
                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="px-4 py-3">
                                                <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-sm font-mono text-slate-800 dark:text-slate-200">
                                                    {m.bin_prefix}
                                                </code>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                                                    <span className="font-medium text-slate-800 dark:text-white">
                                                        {m.match_type === 'prefix_letter' ? 'อัตโนมัติ (A-Z)' : m.zone_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-slate-600 dark:text-slate-300">{m.priority}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                {mappings.length} mapping rules · เมื่อ Import CSV ระบบจะจับคู่ bin code กับ rules ตามลำดับ priority
            </p>
        </div>
    );
}
