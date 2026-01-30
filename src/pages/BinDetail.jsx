import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';
import { ArrowLeft, Package, User } from 'lucide-react';
import clsx from 'clsx';

const BinDetail = () => {
    const { binId } = useParams();
    const { getBinData } = useWarehouse();

    // Decoding if needed, though react-router usually handles standard URL encoding
    // Bin IDs have spaces? e.g. "OB_Non A1-1"
    const bin = getBinData(binId);

    if (!bin) {
        return <div className="p-10 text-center text-slate-500">Bin not found: {binId}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb / Header */}
            <div className="flex items-center gap-3">
                <Link to={`/zone/${bin.zone}`} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ArrowLeft className="h-6 w-6 text-slate-600" />
                </Link>
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                        <Link to="/" className="hover:text-blue-600">Dashboard</Link>
                        <span>/</span>
                        <Link to={`/zone/${bin.zone}`} className="hover:text-blue-600">Zone {bin.zone}</Link>
                        <span>/</span>
                        <span className="text-slate-900">Bin {bin.shelf}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        {bin.id}
                        {bin.isSim && (
                            <span className="bg-amber-100 text-amber-800 text-sm px-2 py-1 rounded-full font-medium">Simulation Data</span>
                        )}
                    </h1>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Inventory Items</h3>
                    <span className="text-sm text-slate-500">{bin.items.length} items found</span>
                </div>

                {bin.items.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/2">Product Information</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Codes</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Level</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {bin.items.map((item, idx) => {
                                    const isLowStock = item.qty < 10;
                                    return (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition group">
                                            {/* Product Information */}
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-sm font-bold text-slate-800 line-clamp-2" title={item.nsName || item.name}>
                                                        {item.nsName || item.name}
                                                    </div>
                                                    {item.nsName && item.name && item.nsName !== item.name && (
                                                        <div className="text-xs text-slate-500 line-clamp-1" title={item.name}>
                                                            <span className="font-medium text-slate-400 mr-1">Legacy:</span>
                                                            {item.name}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {item.nsSubGroup && (
                                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-purple-200">
                                                                {item.nsSubGroup}
                                                            </span>
                                                        )}
                                                        {item.isDummy && (
                                                            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">
                                                                Simulated
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Codes */}
                                            <td className="px-6 py-4 whitespace-nowrap align-top">
                                                <div className="flex flex-col gap-1.5">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">NS Code</p>
                                                        <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                            {item.nsCode || '-'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Legacy</p>
                                                        <span className="font-mono text-xs text-slate-500 pl-1">
                                                            {item.code}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Stock Level */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-bold text-slate-900 tracking-tight">
                                                            {item.qty.toLocaleString()}
                                                        </span>
                                                        <span className="text-sm font-medium text-slate-500">
                                                            {item.unit}
                                                        </span>
                                                    </div>
                                                    <span className={clsx(
                                                        "px-2.5 py-0.5 text-xs font-bold rounded-full border",
                                                        isLowStock
                                                            ? "bg-red-50 text-red-700 border-red-100"
                                                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    )}>
                                                        {isLowStock ? "Low Stock" : "In Stock"}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center text-slate-400">
                        <Package className="h-12 w-12 mb-3 opacity-20" />
                        <p>This bin is empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BinDetail;
