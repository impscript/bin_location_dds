import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import clsx from 'clsx';

const StockCountHistory = () => {
    const [counts, setCounts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        // Get all completed counts with their items
        const { data, error } = await supabase
            .from('stock_counts')
            .select('*, items:stock_count_items(id, variance, counted_qty, system_qty, status)')
            .eq('status', 'completed')
            .order('completed_at', { ascending: false });

        if (!error) setCounts(data || []);
        setLoading(false);
    };

    const chartData = useMemo(() => {
        return counts.map(c => {
            const items = c.items || [];
            const countedItems = items.filter(i => i.status === 'counted');
            const totalCounted = countedItems.length;
            const withVariance = countedItems.filter(i => i.variance !== 0).length;
            const accuracy = totalCounted > 0 ? ((totalCounted - withVariance) / totalCounted * 100).toFixed(1) : 0;

            return {
                name: `${c.count_month}/${String(c.count_year).slice(-2)}`,
                batch: c.batch_name,
                total: items.length,
                counted: totalCounted,
                variance: withVariance,
                accuracy: parseFloat(accuracy),
                id: c.id,
                date: c.completed_at,
            };
        }).reverse();
    }, [counts]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link to="/stock-count" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Stock Count History</h1>
                    <p className="text-sm text-slate-500">{counts.length} รอบที่เสร็จสิ้น</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            ) : counts.length === 0 ? (
                <div className="text-center py-16">
                    <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">ยังไม่มีรอบนับที่เสร็จสิ้น</p>
                </div>
            ) : (
                <>
                    {/* Accuracy Trend Chart */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Accuracy Trend
                        </h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            name === 'accuracy' ? `${value}%` : value,
                                            name === 'accuracy' ? 'Accuracy' : name === 'variance' ? 'Variance Items' : 'Total'
                                        ]}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    />
                                    <Bar dataKey="accuracy" fill="#3b82f6" radius={[6, 6, 0, 0]} name="accuracy" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Variance Trend */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-amber-600" />
                            Variance Items
                        </h2>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    <Bar dataKey="variance" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Variance Items" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 text-left">รอบนับ</th>
                                        <th className="px-4 py-3 text-center">เดือน/ปี</th>
                                        <th className="px-4 py-3 text-center">Total</th>
                                        <th className="px-4 py-3 text-center">Variance</th>
                                        <th className="px-4 py-3 text-center">Accuracy</th>
                                        <th className="px-4 py-3 text-center">ปิดรอบ</th>
                                        <th className="px-4 py-3 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {chartData.map((row, i) => (
                                        <tr key={counts[counts.length - 1 - i]?.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{row.batch}</td>
                                            <td className="px-4 py-3 text-center">{row.name}</td>
                                            <td className="px-4 py-3 text-center">{row.total}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium",
                                                    row.variance > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                                )}>
                                                    {row.variance}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={clsx("font-semibold",
                                                    row.accuracy >= 95 ? "text-emerald-600" :
                                                        row.accuracy >= 85 ? "text-amber-600" : "text-red-600"
                                                )}>
                                                    {row.accuracy}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-500">
                                                {row.date ? format(new Date(row.date), 'dd/MM/yy') : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Link to={`/stock-count/${counts[counts.length - 1 - i]?.id}/report`}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                                    ดู Report
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StockCountHistory;
