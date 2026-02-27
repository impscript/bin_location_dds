import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Warehouse, Shield, Calculator, LogIn, Loader2, Eye, EyeOff, AlertCircle, ChevronDown, ChevronUp, User, Lock } from 'lucide-react';

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
    const { users, login, loginWithCredentials, loading } = useAuth();
    const [selectedUser, setSelectedUser] = useState(null);

    // Credential login state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState('');

    // Dev login toggle
    const [showDevLogin, setShowDevLogin] = useState(false);

    const handleCredentialLogin = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('กรุณากรอก Username และ Password');
            return;
        }
        setError('');
        setLoginLoading(true);
        try {
            await loginWithCredentials(username.trim(), password);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoginLoading(false);
        }
    };

    const handleDevLogin = () => {
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
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 mb-4 shadow-lg shadow-blue-500/10">
                        <Warehouse className="w-10 h-10 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">DDS Warehouse</h1>
                    <p className="text-gray-400 mt-1.5 text-sm">ระบบจัดการคลังสินค้า</p>
                </div>

                {/* Login Form */}
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6 shadow-2xl shadow-black/20">
                    <form onSubmit={handleCredentialLogin} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="w-4.5 h-4.5 text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                    placeholder="กรอก Employee ID"
                                    autoComplete="username"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="w-4.5 h-4.5 text-gray-500" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    placeholder="กรอกรหัสผ่าน"
                                    autoComplete="current-password"
                                    className="w-full pl-10 pr-12 py-3 bg-gray-800/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition"
                                >
                                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                                <AlertCircle className="w-4.5 h-4.5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loginLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    เข้าสู่ระบบ
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Dev Login Section */}
                <div className="mt-6">
                    <button
                        onClick={() => setShowDevLogin(!showDevLogin)}
                        className="w-full flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors py-2"
                    >
                        {showDevLogin ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Quick Login (Dev)
                    </button>

                    {showDevLogin && (
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-xs text-gray-500 mb-3">เลือกผู้ใช้งาน</p>
                            <div className="space-y-2">
                                {users.map((u) => {
                                    const config = ROLE_CONFIG[u.role] || ROLE_CONFIG.warehouse;
                                    const Icon = config.icon;
                                    const isSelected = selectedUser?.id === u.id;

                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => setSelectedUser(u)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left text-sm ${isSelected
                                                ? `${config.bgColor} ring-1 ring-offset-0`
                                                : `bg-gray-800/30 border-gray-700/30 ${config.hoverBg}`
                                                }`}
                                        >
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                                                <Icon className={`w-4 h-4 ${config.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-white font-medium text-sm">{u.display_name}</span>
                                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <div className={`w-4 h-4 rounded-full border-2 ${config.color.replace('text-', 'border-')} flex items-center justify-center`}>
                                                    <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {users.length > 0 && (
                                <button
                                    onClick={handleDevLogin}
                                    disabled={!selectedUser}
                                    className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${selectedUser
                                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                                        }`}
                                >
                                    <LogIn className="w-3.5 h-3.5" />
                                    เข้าสู่ระบบ (Dev)
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    DDS Bin Location System v2.0
                </p>
            </div>
        </div>
    );
}
