# HRMS Login Component Template

นี่คือโค้ดสรุปสำหรับส่วนของ Login IDMS/HRMS รวมถึง **ระบบการแปลงรหัสผ่านเป็น MD5 และการเรียก Endpoint ของระบบ IDMS** ครับ

## 1. Dependencies ที่ต้องติดตั้งเพิ่ม
```bash
npm install lucide-react js-md5
```
- `js-md5` (สำหรับเข้ารหัสรหัสผ่านก่อนส่งไปที่ IDMS Endpoint)
- `lucide-react` (สำหรับไอคอน UI)
- `tailwindcss` (สำหรับความสวยงาม UI - Dark Theme)

## 2. โค้ด Component (`LoginForm.jsx`)

```jsx
import { useState } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, LogIn, Loader2 } from 'lucide-react';

export default function LoginForm({ onLogin, loading }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (!username.trim() || !password.trim()) {
            setError('กรุณากรอก Username และ Password');
            return;
        }
        
        setError('');
        
        try {
            await onLogin(username.trim(), password);
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
    };

    return (
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6 shadow-2xl shadow-black/20 w-full max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                            className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
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
                            className="w-full pl-10 pr-12 py-3 bg-gray-800/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
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
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                    {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเข้าสู่ระบบ...</>
                    ) : (
                        <><LogIn className="w-4 h-4" /> เข้าสู่ระบบ</>
                    )}
                </button>
            </form>
        </div>
    );
}
```

## 3. วิธีเชื่อมต่อ API ของ IDMS (พร้อมเข้ารหัส MD5)

นำโค้ดส่วนนี้ไปใช้งานที่หน้า **Page** หรือ **Context** ของโปรเจคใหม่ครับ:

```jsx
import { useState } from 'react';
import md5 from 'js-md5'; // Import ตัวเข้ารหัส MD5
import LoginForm from './components/LoginForm';

export default function LoginPage() {
    const [loginLoading, setLoginLoading] = useState(false);

    const handleLogin = async (username, password) => {
        setLoginLoading(true);
        try {
            // 1. เข้ารหัสรหัสผ่านที่ได้รับด้วย MD5
            const passwordMd5 = md5(password);

            // 2. กำหนด IDMS Endpoint URL ของ Advance Agro 
            // พร้อมแนบ AgentId และ AgentCode ที่ถูกต้อง
            const idmsUrl = `https://mobiledev.advanceagro.net/ws/api/idms/authentication/?account=${encodeURIComponent(username)}&password=${encodeURIComponent(passwordMd5)}&Service=0000&AgentId=SystemMango&AgentCode=Np4kfRh5`;

            // 3. ยิง Request เพื่อขอตรวจสอบข้อมูล
            const response = await fetch(idmsUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            
            const data = await response.json();

            // 4. เช็คผลลัพธ์ว่า Login สำเร็จหรือไม่
            if (!data || data.Result !== 'OK') {
                const msg = data?.Result?.replace('Error : ', '') || 'Authentication failed';
                throw new Error(msg);
            }

            // 5. เมื่อสำเร็จ จะได้ EmpId ออกมา (นำไปใช้เชื่อมกับฐานข้อมูลหรือทำ Session ต่อ)
            console.log("Login Success! EmpId:", data.EmpId);
            
            // Redirect ไปที่ Dashboard หรือเก็บ State ผู้ใช้งานที่นี่...

        } catch (error) {
            console.error('Login Error:', error);
            const msg = error.message;
            
            // แปลงสุ่มข้อความ Error ทางเทคนิคให้อ่านง่ายขึ้น (Optional)
            if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
                throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต (หรือปัญหา CORS)');
            } else {
                throw new Error(msg);
            }
        } finally {
            setLoginLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">System Login</h1>
                    <p className="text-gray-400 mt-1.5 text-sm">เข้าสู่ระบบด้วย HRMS Account</p>
                </div>

                <LoginForm onLogin={handleLogin} loading={loginLoading} />
            </div>
        </div>
    );
}
```

> **📌 ข้อควรระวัง (CORS Issues):**
> หากโปรเจคใหม่เรียก API Direct ไปยัง URL ของ `mobiledev.advanceagro.net` แล้วติดปัญหาเรื่อง CORS Blocked จาก Browser (กรณีไม่ได้ใช้ Corp Network ของบริษัท) คุณอาจจะต้องเตรียมการใช้ Proxy Server / Edge Function แบบในระบบ DDS มาช่วยจัดการแทนครับ
