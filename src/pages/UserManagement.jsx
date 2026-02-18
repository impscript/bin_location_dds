import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, X, Check, UserPlus, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import clsx from 'clsx';

const ROLE_CONFIG = {
    admin: { label: 'ผู้ดูแลระบบ', color: 'bg-red-100 text-red-700', icon: ShieldAlert },
    wh_admin: { label: 'หัวหน้าคลัง', color: 'bg-amber-100 text-amber-700', icon: ShieldCheck },
    warehouse: { label: 'คลังสินค้า', color: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
    accounting: { label: 'บัญชี', color: 'bg-blue-100 text-blue-700', icon: Shield },
};

const UserManagement = () => {
    const { hasPermission } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ username: '', display_name: '', role: 'warehouse' });
    const [saving, setSaving] = useState(false);

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('role')
            .order('display_name');
        if (!error) setUsers(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const openAdd = () => {
        setEditingUser(null);
        setForm({ username: '', display_name: '', role: 'warehouse' });
        setModalOpen(true);
    };

    const openEdit = (u) => {
        setEditingUser(u);
        setForm({ username: u.username, display_name: u.display_name, role: u.role });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.username.trim() || !form.display_name.trim()) {
            toast.error('กรุณากรอกข้อมูลให้ครบ');
            return;
        }
        setSaving(true);
        try {
            if (editingUser) {
                const { error } = await supabase
                    .from('users')
                    .update({ username: form.username.trim(), display_name: form.display_name.trim(), role: form.role })
                    .eq('id', editingUser.id);
                if (error) throw error;
                toast.success('อัพเดทผู้ใช้สำเร็จ');
            } else {
                const { error } = await supabase
                    .from('users')
                    .insert({ username: form.username.trim(), display_name: form.display_name.trim(), role: form.role });
                if (error) throw error;
                toast.success('เพิ่มผู้ใช้สำเร็จ');
            }
            setModalOpen(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (u) => {
        const { error } = await supabase
            .from('users')
            .update({ is_active: !u.is_active })
            .eq('id', u.id);
        if (error) {
            toast.error('เกิดข้อผิดพลาด');
        } else {
            toast.success(u.is_active ? 'ปิดใช้งานผู้ใช้แล้ว' : 'เปิดใช้งานผู้ใช้แล้ว');
            fetchUsers();
        }
    };

    if (!hasPermission('canManageUsers')) {
        return (
            <div className="text-center py-20">
                <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-700">ไม่มีสิทธิ์เข้าถึง</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้</h1>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                    <UserPlus className="w-4 h-4" />
                    เพิ่มผู้ใช้
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map(u => {
                        const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.warehouse;
                        const Icon = cfg.icon;
                        return (
                            <div key={u.id} className={clsx(
                                "bg-white rounded-2xl border p-4 flex items-center gap-4 transition",
                                u.is_active ? "border-slate-200" : "border-red-200 bg-red-50/30 opacity-60"
                            )}>
                                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                                    u.role === 'admin' ? 'bg-red-500' : u.role === 'wh_admin' ? 'bg-amber-500' : u.role === 'warehouse' ? 'bg-emerald-500' : 'bg-blue-500'
                                )}>
                                    {u.display_name?.[0] || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-800">{u.display_name}</h3>
                                        {!u.is_active && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">ปิดใช้งาน</span>}
                                    </div>
                                    <p className="text-sm text-slate-500">@{u.username}</p>
                                    <span className={clsx("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1", cfg.color)}>
                                        <Icon className="w-3 h-3" />
                                        {cfg.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(u)} className="p-2 hover:bg-slate-100 rounded-lg transition" title="แก้ไข">
                                        <Edit2 className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <button onClick={() => toggleActive(u)} className="p-2 hover:bg-slate-100 rounded-lg transition" title={u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                                        {u.is_active ?
                                            <Trash2 className="w-4 h-4 text-red-400" /> :
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        }
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">{editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Username</label>
                                <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="username" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">ชื่อที่แสดง</label>
                                <input type="text" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="ชื่อ-นามสกุล" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">บทบาท</label>
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                                        <button key={role} onClick={() => setForm(p => ({ ...p, role }))}
                                            className={clsx("px-3 py-2 rounded-xl text-sm font-medium border-2 transition",
                                                form.role === role ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            )}>
                                            {cfg.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSave} disabled={saving}
                            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                            {saving ? 'กำลังบันทึก...' : editingUser ? 'อัพเดท' : 'เพิ่มผู้ใช้'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
