import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import clsx from 'clsx';

const TYPE_COLORS = {
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
    stock_count: 'bg-purple-500',
    low_stock: 'bg-red-500',
};

const NotificationBell = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        // Subscribe to real-time
        const channel = supabase
            .channel('notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
            }, (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        setNotifications(data || []);
    };

    const markAsRead = async (id) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const markAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const handleClick = (n) => {
        markAsRead(n.id);
        if (n.link) {
            navigate(n.link);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">การแจ้งเตือน</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                <CheckCheck className="w-3 h-3" />
                                อ่านทั้งหมด
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto max-h-72">
                        {notifications.length === 0 ? (
                            <div className="text-center py-8 text-sm text-slate-500">ไม่มีการแจ้งเตือน</div>
                        ) : (
                            notifications.map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={clsx(
                                        "w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition border-b border-slate-100 dark:border-slate-700 last:border-0",
                                        !n.is_read && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                >
                                    <div className={clsx("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", !n.is_read ? TYPE_COLORS[n.type] : "bg-transparent")} />
                                    <div className="flex-1 min-w-0">
                                        <p className={clsx("text-sm", !n.is_read ? "font-semibold text-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {format(new Date(n.created_at), 'dd/MM HH:mm')}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
