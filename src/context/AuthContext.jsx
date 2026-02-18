import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
