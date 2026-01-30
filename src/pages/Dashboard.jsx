import React from 'react';
import { useWarehouse } from '../context/WarehouseContext';
import { Link, useNavigate } from 'react-router-dom';
import { STANDARD_ZONES, SPECIAL_ZONES } from '../utils/constants';
import { LayoutGrid, CheckCircle2, Box, MapPin, Package } from 'lucide-react';
import clsx from 'clsx';

const Dashboard = () => {
    const { warehouseData: data, loading } = useWarehouse();
    const navigate = useNavigate();

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-xl text-slate-500 font-medium">Loading Warehouse Data...</div>
        </div>
    );

    // Calculate Stats
    const totalBins = data.length;
    const occupiedBins = data.filter(b => b.isOccupied).length;
    const occupancyRate = totalBins > 0 ? ((occupiedBins / totalBins) * 100).toFixed(0) : 0;
    const totalItems = data.reduce((acc, bin) => acc + bin.items.reduce((s, i) => s + i.qty, 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {/* Total Bins */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-5 relative overflow-hidden transition hover:shadow-md">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <LayoutGrid className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-slate-500 font-medium text-sm mb-1">Total Bins</p>
                        <h3 className="text-3xl font-bold text-slate-800">{totalBins.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Occupied Bins */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-5 relative overflow-hidden transition hover:shadow-md">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-slate-500 font-medium text-sm mb-1">Occupied Bins</p>
                        <h3 className="text-3xl font-bold text-slate-800">{occupiedBins.toLocaleString()}</h3>
                        <p className="text-xs font-semibold text-emerald-600 mt-1">{occupancyRate}% Utilization</p>
                    </div>
                </div>

                {/* Total Items */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-5 relative overflow-hidden transition hover:shadow-md">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Box className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-slate-500 font-medium text-sm mb-1">Total Items (Qty)</p>
                        <h3 className="text-3xl font-bold text-slate-800">{totalItems.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Standard Zones */}
            <div>
                <div className="flex items-center gap-2 mb-6 text-slate-700">
                    <MapPin className="h-5 w-5" />
                    <h2 className="text-xl font-bold">Standard Zones</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-6">
                    {(() => {
                        // Dynamic Zone Calculation
                        const currentZones = new Set(data.map(b => b.zone));
                        const specialZoneSet = new Set(SPECIAL_ZONES);

                        // Filter out special zones to get "Standard-like" zones from data
                        const dynamicStandardZones = [...currentZones].filter(z => !specialZoneSet.has(z));

                        // Merge with predefined Standard Zones to ensure basics are always there
                        const allStandardZones = Array.from(new Set([...STANDARD_ZONES, ...dynamicStandardZones]));

                        // Sort alphanumerically
                        allStandardZones.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                        return allStandardZones.map(zone => {
                            const zoneBins = data.filter(b => b.zone === zone);
                            const zoneTotal = zoneBins.length;
                            const zoneOccupied = zoneBins.filter(b => b.isOccupied).length;
                            const zoneRate = zoneTotal > 0 ? (zoneOccupied / zoneTotal) * 100 : 0;

                            let colorClass = "bg-emerald-500";
                            if (zoneRate > 80) colorClass = "bg-rose-500";
                            else if (zoneRate > 40) colorClass = "bg-blue-500";

                            return (
                                <Link key={zone} to={`/zone/${zone}`} className="block group">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:ring-2 hover:ring-blue-500 transition-all text-center relative overflow-hidden h-full flex flex-col justify-center">
                                        <h3 className="text-4xl font-bold text-slate-700 group-hover:text-blue-600 mb-4 transition">{zone}</h3>

                                        <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                                            <div className={clsx("h-full rounded-full transition-all duration-500", colorClass)} style={{ width: `${zoneRate}%` }}></div>
                                        </div>

                                        <p className="text-xs font-semibold text-slate-500">
                                            {zoneOccupied}/{zoneTotal} Bins Used
                                        </p>
                                    </div>
                                </Link>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Special Zones */}
            <div>
                <div className="flex items-center gap-2 mb-6 text-slate-700">
                    <Package className="h-5 w-5" />
                    <h2 className="text-xl font-bold">Special Areas & Bulk Storage</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {SPECIAL_ZONES.map(zone => {
                        const zoneBins = data.filter(b => b.zone === zone);
                        const zoneOccupied = zoneBins.filter(b => b.isOccupied).length;

                        return (
                            <Link key={zone} to={`/zone/${zone}`} className="block group">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-amber-400 hover:shadow-md hover:ring-2 hover:ring-amber-500 transition-all flex items-center justify-between h-full">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-700 group-hover:text-amber-600 transition">{zone}</h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {zoneBins.length > 0 ? 'Active Area' : 'No Data'}
                                        </p>
                                    </div>
                                    <div className={clsx("p-2 rounded-full", zoneOccupied > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400")}>
                                        <Package className="h-6 w-6" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
