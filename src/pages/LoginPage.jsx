import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Warehouse, LogIn, Loader2, Eye, EyeOff, AlertCircle, User, Lock } from 'lucide-react';

export default function LoginPage() {
    const { loginWithCredentials, loading } = useAuth();

    // Credential login state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState('');

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
            // Map technical errors to friendly Thai messages
            const msg = err.message || '';
            if (msg.includes('HandshakeFailure') || msg.includes('error sending request') || msg.includes('fetch')) {
                setError('ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง');
            } else if (msg.includes('not found') || msg.includes('ไม่พบ')) {
                setError('ไม่พบบัญชีผู้ใช้นี้ กรุณาตรวจสอบ Username อีกครั้ง');
            } else if (msg.includes('password') || msg.includes('รหัสผ่าน')) {
                setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
            } else if (msg.includes('ลงทะเบียน') || msg.includes('Admin')) {
                setError(msg);
            } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
                setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
            } else {
                setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            }
        } finally {
            setLoginLoading(false);
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
                            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Username (HRMS)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="w-4.5 h-4.5 text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                    placeholder="เช่น chatchawan_tu"
                                    autoComplete="username"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Password (HRMS)</label>
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



                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    DDS Bin Location System v2.0
                </p>
            </div>
        </div>
    );
}
