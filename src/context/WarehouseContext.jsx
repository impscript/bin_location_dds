import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const WarehouseContext = createContext();

export const useWarehouse = () => useContext(WarehouseContext);

export const WarehouseProvider = ({ children }) => {
    const [warehouseData, setWarehouseData] = useState([]); // Legacy format: array of bin objects
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all data from Supabase and transform to legacy format
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch zones
            const { data: zonesData, error: zonesErr } = await supabase
                .from('zones')
                .select('*')
                .order('sort_order');
            if (zonesErr) throw zonesErr;
            setZones(zonesData || []);

            // Fetch bins with zone info
            const { data: binsData, error: binsErr } = await supabase
                .from('bins')
                .select('*, zones(name, type)')
                .order('bin_code');
            if (binsErr) throw binsErr;

            // Fetch inventory with product info (paginated to bypass 1000-row limit)
            let inventoryData = [];
            let from = 0;
            const pageSize = 1000;
            while (true) {
                const { data: page, error: invErr } = await supabase
                    .from('inventory')
                    .select('*, products(product_code, product_name, unit, ns_code, ns_name, ns_sub_group)')
                    .range(from, from + pageSize - 1)
                    .order('bin_id');
                if (invErr) throw invErr;
                inventoryData = inventoryData.concat(page || []);
                if (!page || page.length < pageSize) break;
                from += pageSize;
            }

            // Group inventory by bin_id
            const inventoryByBin = {};
            (inventoryData || []).forEach(inv => {
                if (!inventoryByBin[inv.bin_id]) {
                    inventoryByBin[inv.bin_id] = [];
                }
                inventoryByBin[inv.bin_id].push(inv);
            });

            // Transform to legacy warehouse format (for backward compatibility)
            const legacyData = (binsData || []).map(bin => ({
                id: bin.bin_code,
                zone: bin.zones?.name || 'Unknown',
                shelf: bin.shelf,
                level: bin.level,
                isSim: false,
                isOccupied: (inventoryByBin[bin.id] || []).length > 0,
                _binUuid: bin.id, // Keep UUID reference for DB operations
                items: (inventoryByBin[bin.id] || []).map(inv => ({
                    code: inv.products?.product_code || 'N/A',
                    name: inv.products?.product_name || 'Unknown',
                    unit: inv.products?.unit || 'EA',
                    nsCode: inv.products?.ns_code || '',
                    nsName: inv.products?.ns_name || '',
                    nsSubGroup: inv.products?.ns_sub_group || '',
                    bin: bin.bin_code,
                    qty: inv.qty,
                    isDummy: false,
                    _inventoryId: inv.id,
                    _productId: inv.product_id,
                }))
            }));

            setWarehouseData(legacyData);
            console.log(`Loaded from Supabase: ${zonesData.length} zones, ${binsData.length} bins, ${inventoryData.length} items`);
        } catch (err) {
            console.error('Error fetching warehouse data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getZoneData = (zoneId) => {
        return warehouseData.filter(b => b.zone === zoneId);
    };

    const getBinData = (binId) => {
        return warehouseData.find(b => b.id === binId);
    };

    const searchItems = (query) => {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        const results = [];

        warehouseData.forEach(bin => {
            bin.items.forEach(item => {
                if (
                    item.code.toLowerCase().includes(lowerQuery) ||
                    item.name.toLowerCase().includes(lowerQuery) ||
                    (item.nsCode && item.nsCode.toLowerCase().includes(lowerQuery)) ||
                    (item.nsName && item.nsName.toLowerCase().includes(lowerQuery))
                ) {
                    results.push({ item, binId: bin.id, zone: bin.zone });
                }
            });
        });
        return results;
    };

    // Import data via CSV (legacy support — will be replaced by Supabase import later)
    const importData = async (newItems) => {
        // For now, keep legacy behavior; Supabase import will be implemented in Phase 3
        console.log('Import called with', newItems.length, 'items — Supabase import coming soon');
        await fetchData(); // Refresh from DB
    };

    const clearAllData = () => {
        console.log('Clear all data — not supported in Supabase mode');
    };

    return (
        <WarehouseContext.Provider value={{
            warehouseData,
            zones,
            loading,
            error,
            getZoneData,
            getBinData,
            searchItems,
            importData,
            clearAllData,
            refreshData: fetchData,
        }}>
            {children}
        </WarehouseContext.Provider>
    );
};
