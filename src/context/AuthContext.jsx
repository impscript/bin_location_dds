import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import md5 from 'js-md5';

const AuthContext = createContext(null);

// Role permissions matrix
const PERMISSIONS = {
    admin: {
        canCreateStockCount: true,
        canCountStock: true,
        canCRUDProducts: true,
        canMoveLocation: true,
        canImport: true,
        canExport: true,
        canManageUsers: true,
        canViewReports: true,
        canDelete: true,
    },
    wh_admin: {
        canCreateStockCount: true,
        canCountStock: true,
        canCRUDProducts: true,
        canMoveLocation: true,
        canImport: true,
        canExport: true,
        canManageUsers: false,
        canViewReports: true,
        canDelete: true,
    },
    warehouse: {
        canCreateStockCount: false,
        canCountStock: true,
        canCRUDProducts: true,
        canMoveLocation: true,
        canImport: false,
        canExport: false,
        canManageUsers: false,
        canViewReports: true,
        canDelete: false,
    },
    accounting: {
        canCreateStockCount: false,
        canCountStock: false,
        canCRUDProducts: false,
        canMoveLocation: false,
        canImport: false,
        canExport: true,
        canManageUsers: false,
        canViewReports: true,
        canDelete: false,
    },
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load users list and check saved session
    useEffect(() => {
        async function init() {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('is_active', true)
                    .order('role');

                if (error) throw error;
                setUsers(data || []);

                // Check for saved session
                const savedUserId = localStorage.getItem('dds_user_id');
                if (savedUserId && data) {
                    const savedUser = data.find(u => u.id === savedUserId);
                    if (savedUser) {
                        setUser(savedUser);
                    }
                }
            } catch (err) {
                console.error('Failed to load users:', err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    const login = (selectedUser) => {
        setUser(selectedUser);
        localStorage.setItem('dds_user_id', selectedUser.id);
    };

    const loginWithCredentials = async (username, password) => {
        const passwordMd5 = md5(password);

        const proxyIdmsUrl = `/api-idms/authentication/?account=${encodeURIComponent(username)}&password=${encodeURIComponent(passwordMd5)}&Service=0000&AgentId=SystemMango&AgentCode=Np4kfRh5`;
        const directIdmsUrl = `https://mobiledev.advanceagro.net/ws/api/idms/authentication/?account=${encodeURIComponent(username)}&password=${encodeURIComponent(passwordMd5)}&Service=0000&AgentId=SystemMango&AgentCode=Np4kfRh5`;

        let data = null;

        // Strategy 1: Local Proxy (Vercel rewrite in production, Vite proxy in development)
        try {
            console.log('Trying local proxy IDMS call...');
            const res = await fetch(proxyIdmsUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            data = await res.json();
        } catch (proxyLocalErr) {
            console.warn('Local proxy IDMS call failed, trying direct browser call...', proxyLocalErr.message);

            // Strategy 2: Direct browser call (works when user is on corporate network/bypassing CORS)
            try {
                const res = await fetch(directIdmsUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                });
                data = await res.json();
            } catch (directErr) {
                console.warn('Direct IDMS call failed, trying Edge Function proxy...', directErr.message);

                // Strategy 3: Edge Function proxy (fallback for other hosting setups)
                try {
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    const res = await fetch(`${supabaseUrl}/functions/v1/idms-auth`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ account: username, password_md5: passwordMd5 }),
                    });
                    data = await res.json();
                } catch (proxyErr) {
                    console.error('All authentication strategies failed:', proxyErr.message);
                    throw new Error('ไม่สามารถเชื่อมต่อระบบยืนยันตัวตนได้');
                }
            }
        }

        if (!data || data.Result !== 'OK') {
            const msg = data?.Result?.replace('Error : ', '') || 'Authentication failed';
            throw new Error(msg);
        }

        const empId = data.EmpId;

        // Look up user in DB by emp_id
        const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('emp_id', empId)
            .eq('is_active', true)
            .single();

        if (dbError || !dbUser) {
            throw new Error('บัญชีของคุณยังไม่ได้ลงทะเบียนในระบบ กรุณาติดต่อ Admin');
        }

        setUser(dbUser);
        localStorage.setItem('dds_user_id', dbUser.id);
        return dbUser;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('dds_user_id');
    };

    const permissions = user ? PERMISSIONS[user.role] || {} : {};

    const hasPermission = (permission) => {
        return permissions[permission] === true;
    };

    return (
        <AuthContext.Provider value={{
            user,
            users,
            loading,
            login,
            loginWithCredentials,
            logout,
            permissions,
            hasPermission,
            isLoggedIn: !!user,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
