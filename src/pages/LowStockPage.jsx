import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Download, Search, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import clsx from 'clsx';

const LowStockPage = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [threshold, setThreshold] = useState(0);

    useEffect(() => {
        fetchLowStock();
    }, [threshold]);

    const fetchLowStock = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory')
            .select('*, product:products(product_code, product_name, ns_code, unit), bin:bins(bin_code, zone:zones(name))')
            .lte('qty', threshold)
            .order('qty', { ascending: true });

        if (!error) setItems(data || []);
        setLoading(false);
    };

    const filteredItems = search
        ? items.filter(i =>
            i.product?.product_code?.toLowerCase().includes(search.toLowerCase()) ||
            i.product?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
            i.bin?.bin_code?.toLowerCase().includes(search.toLowerCase())
        )
        : items;

    const handleExport = () => {
        const csvRows = [
            ['product_code', 'product_name', 'ns_code', 'bin_code', 'zone', 'qty', 'unit'],
            ...filteredItems.map(i => [
                i.product?.product_code, i.product?.product_name, i.product?.ns_code || '',
                i.bin?.bin_code, i.bin?.zone?.name || '', i.qty, i.product?.unit || 'EA'
            ])
        ];
        const csv = csvRows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `low_stock_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Export ${filteredItems.length} รายการ`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Low Stock Alert</h1>
                        <p className="text-sm text-slate-500">{filteredItems.length} รายการ</p>
                    </div>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหา..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" />
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2">
                    <span className="text-sm text-slate-500">Qty ≤</span>
                    <input type="number" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 0)}
                        className="w-16 text-sm text-center bg-transparent outline-none font-medium" min="0" />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredItems.map(item => (
                        <Link key={item.id} to={`/product/${item.product_id}`}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition block">
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                item.qty === 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                            )}>
                                {item.qty === 0 ?
                                    <AlertTriangle className="w-5 h-5 text-red-500" /> :
                                    <Package className="w-5 h-5 text-amber-500" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-white">{item.product?.product_code}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.product?.product_name}</p>
                                <p className="text-xs text-slate-400">{item.bin?.bin_code} · {item.bin?.zone?.name}</p>
                            </div>
                            <div className={clsx("text-lg font-bold", item.qty === 0 ? "text-red-600" : "text-amber-600")}>
                                {item.qty}
                            </div>
                        </Link>
                    ))}
                    {filteredItems.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Package className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                            <p className="font-medium">ไม่มีสินค้าสต็อกต่ำ 🎉</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LowStockPage;
