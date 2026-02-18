import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';
import { ArrowLeft, Package, Boxes, MapPin, Tag, Clock, ArrowUpRight, ArrowDownLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import CopyBadge from '../components/CopyBadge';

const ProductDetail = () => {
    const { productId } = useParams();
    const { getProductData, getProductHistory } = useWarehouse();
    const productData = getProductData(productId);
    const [history, setHistory] = React.useState([]);
    const [loadingHistory, setLoadingHistory] = React.useState(false);

    React.useEffect(() => {
        const fetchHistory = async () => {
            if (!productId) return;
            setLoadingHistory(true);
            try {
                const data = await getProductHistory(productId);
                setHistory(data || []);
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [productId, getProductHistory]);

    if (!productData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
                <Package className="w-16 h-16 mb-4 opacity-20" />
                <h2 className="text-xl font-bold text-slate-700">ไม่พบข้อมูลสินค้า</h2>
                <p className="mt-2 text-sm text-slate-400">รหัสสินค้า: {productId}</p>
                <Link to="/" className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    กลับหน้าหลัก
                </Link>
            </div>
        );
    }

    const { info, locations, totalQty } = productData;
    const isLowStock = totalQty < 10;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-3">
                <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ArrowLeft className="h-6 w-6 text-slate-600" />
                </Link>
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                        <Link to="/" className="hover:text-blue-600">Dashboard</Link>
                        <span>/</span>
                        <span className="text-slate-900">Product Detail</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 break-words line-clamp-2" title={info.nsName || info.name}>
                        {info.nsName || info.name}
                    </h1>
                </div>
            </div>

            {/* Product Overview Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Name & Legacy Name */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Product Name</h3>
                            <p className="text-xl font-medium text-slate-800">{info.nsName || info.name}</p>
                            {info.nsName && info.name && info.nsName !== info.name && (
                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5" />
                                    Legacy Name: <span className="font-mono">{info.name}</span>
                                </p>
                            )}
                        </div>

                        {/* Codes */}
                        <div className="flex flex-wrap gap-6">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">NS Code</h3>
                                <CopyBadge text={info.nsCode} variant="blue" size="md" className="text-base" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Legacy Code</h3>
                                <CopyBadge text={info.code} variant="slate" size="md" className="text-base" />
                            </div>
                            {info.nsSubGroup && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sub Group</h3>
                                    <CopyBadge text={info.nsSubGroup} variant="purple" size="md" className="text-sm" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stock Summary */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col justify-center items-center text-center">
                        <Boxes className="w-10 h-10 text-slate-400 mb-3" />
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Inventory</h3>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-4xl font-bold text-slate-900">{totalQty.toLocaleString()}</span>
                            <span className="text-lg font-medium text-slate-500">{info.unit}</span>
                        </div>
                        <span className={clsx(
                            "px-3 py-1 text-xs font-bold rounded-full border",
                            isLowStock
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        )}>
                            {isLowStock ? "Low Stock (< 10)" : "In Stock"}
                        </span>
                        <div className="mt-4 text-xs text-slate-400">
                            Stored in {locations.length} location{locations.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </div>

            {/* Locations Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-slate-500" />
                        Storage Locations
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Bin Location</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Zone</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {locations.map((loc, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/30 transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                                                {loc.binId.split(' ').pop()} {/* Show only last part like A1-1 */}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900">{loc.binId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                            Zone {loc.zone}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-lg font-bold text-slate-900">{loc.qty.toLocaleString()}</span>
                                        <span className="ml-1 text-xs text-slate-500">{info.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link
                                            to={`/bin/${encodeURIComponent(loc.binId)}`}
                                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                                        >
                                            View Bin
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-500" />
                        Transaction History
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date/Time</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Change</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loadingHistory ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                                            Loading history...
                                        </div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                history.map((log) => (
                                    <tr key={log.log_id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx(
                                                "px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
                                                log.action === 'move' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                    log.action === 'adjust' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                        log.action === 'import' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                                            "bg-slate-100 text-slate-700 border-slate-200"
                                            )}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex flex-col">
                                                {log.action === 'move' && (
                                                    <span className="flex items-center gap-1">
                                                        {log.bin_from} <ArrowUpRight className="w-3 h-3 text-slate-400" /> {log.bin_to}
                                                    </span>
                                                )}
                                                {log.action === 'adjust' && (
                                                    <span className="flex items-center gap-1">
                                                        {log.bin_from}
                                                    </span>
                                                )}
                                                {log.notes && <span className="text-xs text-slate-400 italic mt-0.5">{log.notes}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <span className={clsx(
                                                "font-bold",
                                                log.qty_change > 0 ? "text-emerald-600" : "text-red-600"
                                            )}>
                                                {log.qty_change > 0 ? '+' : ''}{log.qty_change}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {log.user_name || 'System'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
