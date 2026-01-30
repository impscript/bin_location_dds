import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';
import { ArrowLeft, Printer, CheckSquare, Square, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';

const ZoneDetail = () => {
    const { zoneId } = useParams();
    const navigate = useNavigate();
    const { warehouseData, getZoneData } = useWarehouse();
    const [printMode, setPrintMode] = useState(false);
    const [selectedBins, setSelectedBins] = useState(new Set());

    const zoneBins = useMemo(() => getZoneData(zoneId), [warehouseData, zoneId]);

    const shelves = useMemo(() => {
        const groups = {};
        zoneBins.forEach(bin => {
            if (!groups[bin.shelf]) groups[bin.shelf] = [];
            groups[bin.shelf].push(bin);
        });
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {});
    }, [zoneBins]);

    const toggleSelection = (binId) => {
        const newSet = new Set(selectedBins);
        if (newSet.has(binId)) newSet.delete(binId);
        else newSet.add(binId);
        setSelectedBins(newSet);
    };

    const handleSelectAll = () => {
        if (selectedBins.size === zoneBins.length) {
            setSelectedBins(new Set());
        } else {
            setSelectedBins(new Set(zoneBins.map(b => b.id)));
        }
    };

    const handlePrint = () => {
        const binsToPrint = Array.from(selectedBins);
        if (binsToPrint.length === 0) return;
        navigate(`/print?bins=${binsToPrint.join(',')}`);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition">
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Zone {zoneId}</h1>
                        <p className="text-slate-500 font-medium">Select a bin to view contents</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {!printMode ? (
                        <button
                            onClick={() => setPrintMode(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium w-full sm:w-auto justify-center shadow-sm"
                        >
                            <Printer className="h-4 w-4" />
                            Print QR Labels
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleSelectAll}
                                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
                            >
                                {selectedBins.size === zoneBins.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <button
                                onClick={() => setPrintMode(false)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium shadow-sm"
                                disabled={selectedBins.size === 0}
                            >
                                <Printer className="h-4 w-4" />
                                Print ({selectedBins.size})
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Shelves Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                {Object.entries(shelves).map(([shelfName, bins]) => (
                    <div key={shelfName} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <LayoutGrid className="h-5 w-5 text-slate-400" />
                            <h3 className="text-lg font-bold text-slate-700">
                                Shelf {shelfName}
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {bins.map(bin => {
                                const isSelected = selectedBins.has(bin.id);
                                // Design: White card with slight border. Blue accent if occupied?
                                // Mockup has blue corner tag.
                                const isOccupied = bin.isOccupied;

                                return (
                                    <div
                                        key={bin.id}
                                        onClick={() => {
                                            if (printMode) toggleSelection(bin.id);
                                        }}
                                        className={clsx(
                                            "relative p-4 rounded-lg border transition cursor-pointer select-none bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-blue-200 group",
                                            printMode && isSelected ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50" : "border-slate-200"
                                        )}
                                    >
                                        {!printMode ? (
                                            <Link to={`/bin/${encodeURIComponent(bin.id)}`} className="absolute inset-0 z-10" />
                                        ) : null}

                                        {/* Top Row: Bin ID and Sim Badge/Circle */}
                                        <div className="flex justify-between items-start mb-1 h-8"> {/* Fixed height for alignment */}
                                            <div className="font-bold text-slate-800 text-sm">{bin.id.replace('OB_Non ', '')}</div> {/* Simplifying display name per mockup? Mockup shows "OB_Non H1-1" though. Logic: Bin ID in mockup matches full ID. */}
                                        </div>

                                        {/* Middle: Sim Badge */}
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="text-xs text-slate-500 font-medium">
                                                {bin.id}
                                            </div>
                                            {bin.isSim && (
                                                <span className="bg-amber-100 text-amber-600 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide">Sim</span>
                                            )}
                                            {/* Blue corner dot if occupied */}
                                            {isOccupied && !bin.isSim && ( // Mockup only has dot on some? Actually looks like top right corner indicator.
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            )}
                                        </div>

                                        {/* Bottom: SKU Count */}
                                        <div className="flex justify-between items-end">
                                            <div className={clsx("text-sm font-semibold", isOccupied ? "text-slate-800" : "text-slate-400")}>
                                                {isOccupied ? `${bin.items.length} SKUs` : 'Empty'}
                                            </div>

                                            {printMode && (
                                                <div className="z-20">
                                                    {isSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-slate-300" />}
                                                </div>
                                            )}
                                        </div>

                                        {/* Decorative Blue Corner for Occupied Bins (Mockup Style) */}
                                        {isOccupied && (
                                            <div className="absolute -top-px -right-px w-3 h-3 bg-blue-500 rounded-bl-lg rounded-tr-md"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ZoneDetail;
