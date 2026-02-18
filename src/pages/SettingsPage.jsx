import { useState } from 'react';
import { LogOut, FileDown, FileUp, Printer, BarChart3, ScrollText, ChevronRight, Users, Moon, Sun, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import ImportModal from '../components/ImportModal';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
    const { user, logout, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [importOpen, setImportOpen] = useState(false);
    const { darkMode, toggleDarkMode } = useTheme();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleExport = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('product:products(product_code, product_name, ns_code, ns_name, unit), bin:bins(bin_code), qty')
                .order('qty', { ascending: false });

            if (error) throw error;

            const csvRows = [
                ['product_code', 'product_name', 'ns_code', 'ns_name', 'bin_code', 'qty', 'unit'],
                ...data.map(r => [
                    r.product?.product_code || '',
                    r.product?.product_name || '',
                    r.product?.ns_code || '',
                    r.product?.ns_name || '',
                    r.bin?.bin_code || '',
                    r.qty,
                    r.product?.unit || 'EA'
                ])
            ];
            const csv = csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Export สำเร็จ! ${data.length} รายการ`);
        } catch (err) {
            toast.error('Export ล้มเหลว: ' + err.message);
        }
    };

    const ROLE_LABELS = {
        admin: { label: 'ผู้ดูแลระบบ', color: 'bg-red-500' },
        warehouse: { label: 'คลังสินค้า', color: 'bg-green-500' },
        accounting: { label: 'บัญชี', color: 'bg-blue-500' },
    };
    const roleInfo = ROLE_LABELS[user?.role] || ROLE_LABELS.warehouse;

    const menuSections = [
        {
            title: 'ข้อมูล',
            items: [
                hasPermission('canImport') && {
                    icon: FileUp, label: 'Import ข้อมูล', desc: 'นำเข้า CSV',
                    onClick: () => setImportOpen(true)
                },
                hasPermission('canExport') && {
                    icon: FileDown, label: 'Export ข้อมูล', desc: 'ส่งออก CSV ทั้งหมด',
                    onClick: handleExport
                },
                (hasPermission('canCRUDProducts') || hasPermission('canMoveLocation')) && {
                    icon: Printer, label: 'พิมพ์ QR Label', desc: 'สร้าง QR Code สำหรับ Bin',
                    onClick: () => navigate('/print')
                },
            ].filter(Boolean),
        },
        {
            title: 'รายงาน',
            items: [
                hasPermission('canViewReports') && {
                    icon: BarChart3, label: 'Stock Count History', desc: 'ดูประวัติและ trend การนับ',
                    onClick: () => navigate('/stock-count/history')
                },
                hasPermission('canViewReports') && {
                    icon: ScrollText, label: 'Activity Log', desc: 'ประวัติการเปลี่ยนแปลงทั้งหมด',
                    onClick: () => navigate('/activity-log')
                },
            ].filter(Boolean),
        },
        {
            title: 'ระบบ',
            items: [
                hasPermission('canManageUsers') && {
                    icon: Users, label: 'จัดการผู้ใช้', desc: 'เพิ่ม/แก้ไข/ปิดใช้งาน',
                    onClick: () => navigate('/settings/users')
                },
                {
                    icon: darkMode ? Sun : Moon,
                    label: darkMode ? 'Light Mode' : 'Dark Mode',
                    desc: darkMode ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด',
                    onClick: toggleDarkMode,
                    toggle: true,
                    isOn: darkMode,
                },
            ].filter(Boolean),
        },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>

            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${roleInfo.color} flex items-center justify-center text-white text-xl font-bold`}>
                        {user?.display_name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{user?.display_name}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">@{user?.username} · {roleInfo.label}</p>
                    </div>
                </div>
            </div>

            {/* Menu Sections */}
            {menuSections.map((section) => (
                section.items.length > 0 && (
                    <div key={section.title}>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.label}
                                        onClick={item.onClick}
                                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-4.5 h-4.5 text-slate-500 dark:text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 dark:text-white">{item.label}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                        </div>
                                        {item.toggle ? (
                                            <div className={`w-10 h-6 rounded-full transition ${item.isOn ? 'bg-blue-600' : 'bg-slate-300'} relative`}>
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${item.isOn ? 'left-5' : 'left-1'}`} />
                                            </div>
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )
            ))}

            {/* Logout */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left"
                >
                    <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <LogOut className="w-4.5 h-4.5 text-red-500" />
                    </div>
                    <p className="text-sm font-medium text-red-600">ออกจากระบบ</p>
                </button>
            </div>

            {/* Version */}
            <p className="text-center text-xs text-slate-400 pb-4">DDS Warehouse v3.0</p>

            {/* Import Modal */}
            <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
        </div>
    );
}
