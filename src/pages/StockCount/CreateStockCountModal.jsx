import React, { useState } from 'react';
import { useWarehouse } from '../../context/WarehouseContext';
import { useAuth } from '../../context/AuthContext';
import { X, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const CreateStockCountModal = ({ isOpen, onClose, onSuccess }) => {
    const { zones, startStockCount } = useWarehouse();
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedZones, setSelectedZones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Auto-generate name when month/year changes
    React.useEffect(() => {
        const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
        setName(`${monthName} ${year} Monthly Count`);
    }, [month, year]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || selectedZones.length === 0) {
            setError("Please fill in all fields and select at least one zone.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await startStockCount(name, month, year, selectedZones, user.id);
            onSuccess();
        } catch (err) {
            console.error("Failed to create stock count:", err);
            setError(err.message || "Failed to create stock count.");
        } finally {
            setLoading(false);
        }
    };

    const toggleZone = (zoneId) => {
        setSelectedZones(prev =>
            prev.includes(zoneId)
                ? prev.filter(id => id !== zoneId)
                : [...prev, zoneId]
        );
    };

    const handleSelectAll = () => {
        if (selectedZones.length === zones.length) {
            setSelectedZones([]);
        } else {
            setSelectedZones(zones.map(z => z.id));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">Start New Stock Count</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Batch Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Feb 2026 Monthly Count"
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-slate-700">Select Zones to Count</label>
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                {selectedZones.length === zones.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                            {[...zones]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((zone) => (
                                    <button
                                        key={zone.id}
                                        type="button"
                                        onClick={() => toggleZone(zone.id)}
                                        className={clsx(
                                            "px-3 py-2 rounded text-sm font-medium transition border flex items-center justify-between",
                                            selectedZones.includes(zone.id)
                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        Zone {zone.name}
                                        {selectedZones.includes(zone.id) && <Check className="w-3 h-3 ml-1" />}
                                    </button>
                                ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {selectedZones.length} zones selected
                        </p>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Count'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateStockCountModal;
