import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Warehouse, Shield, Calculator, LogIn, Loader2 } from 'lucide-react';

const ROLE_CONFIG = {
    admin: {
        icon: Shield,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/30',
        hoverBg: 'hover:bg-red-500/20',
        label: 'ผู้ดูแลระบบ',
        desc: 'เข้าถึงทุกฟีเจอร์ จัดการระบบ',
    },
    wh_admin: {
        icon: Shield,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/30',
        hoverBg: 'hover:bg-amber-500/20',
        label: 'หัวหน้าคลัง',
        desc: 'สร้างรอบนับ, จัดการ Stock Count',
    },
    warehouse: {
        icon: Warehouse,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10 border-green-500/30',
        hoverBg: 'hover:bg-green-500/20',
        label: 'คลังสินค้า',
        desc: 'นับ Stock, ย้าย Location, CRUD',
    },
    accounting: {
        icon: Calculator,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10 border-blue-500/30',
        hoverBg: 'hover:bg-blue-500/20',
        label: 'บัญชี',
        desc: 'ดูรายงาน, Export ข้อมูล',
    },
};

export default function LoginPage() {
    const { users, login, loading } = useAuth();
    const [selectedUser, setSelectedUser] = useState(null);

    const handleLogin = () => {
        if (selectedUser) {
            login(selectedUser);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 mb-4">
                        <Warehouse className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">DDS Warehouse</h1>
                    <p className="text-gray-400 mt-1">ระบบจัดการคลังสินค้า</p>
                </div>

                {/* User Selection */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                    <p className="text-sm text-gray-400 mb-4">เลือกผู้ใช้งาน</p>

                    <div className="space-y-3">
                        {users.map((u) => {
                            const config = ROLE_CONFIG[u.role] || ROLE_CONFIG.warehouse;
                            const Icon = config.icon;
                            const isSelected = selectedUser?.id === u.id;

                            return (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUser(u)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${isSelected
                                        ? `${config.bgColor} ring-2 ring-offset-0 ring-${u.role === 'admin' ? 'red' : u.role === 'wh_admin' ? 'amber' : u.role === 'warehouse' ? 'green' : 'blue'}-500/50`
                                        : `bg-gray-800/50 border-gray-700/50 ${config.hoverBg}`
                                        }`}
                                >
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                                        <Icon className={`w-5 h-5 ${config.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium">{u.display_name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-0.5">{config.desc}</p>
                                    </div>
                                    {isSelected && (
                                        <div className={`w-5 h-5 rounded-full border-2 ${config.color.replace('text-', 'border-')} flex items-center justify-center`}>
                                            <div className={`w-2.5 h-2.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {users.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">ไม่พบผู้ใช้งาน</p>
                            <p className="text-sm text-gray-600 mt-1">กรุณาตรวจสอบการเชื่อมต่อ Supabase</p>
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        onClick={handleLogin}
                        disabled={!selectedUser}
                        className={`w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${selectedUser
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <LogIn className="w-4 h-4" />
                        เข้าสู่ระบบ
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    DDS Bin Location System v2.0
                </p>
            </div>
        </div>
    );
}
