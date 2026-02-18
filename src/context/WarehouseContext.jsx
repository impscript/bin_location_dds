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
            getProductData: (productId) => {
                const locations = [];
                let productInfo = null;

                warehouseData.forEach(bin => {
                    bin.items.forEach(item => {
                        if (item._productId === productId) {
                            if (!productInfo) productInfo = { ...item }; // Capture static info
                            locations.push({
                                binId: bin.id,
                                zone: bin.zone,
                                qty: item.qty,
                                binUuid: bin._binUuid
                            });
                        }
                    });
                });

                if (!productInfo) return null;

                return {
                    info: productInfo,
                    locations,
                    totalQty: locations.reduce((sum, loc) => sum + loc.qty, 0)
                };
            },
            moveItem: async (productId, fromBinId, toBinId, qty, userId, reason) => {
                const { error } = await supabase.rpc('move_inventory', {
                    p_product_id: productId,
                    p_from_bin_id: fromBinId,
                    p_to_bin_id: toBinId,
                    p_qty: parseInt(qty),
                    p_user_id: userId,
                    p_reason: reason
                });
                if (error) throw error;
                await fetchData(); // Refresh data
            },
            adjustStock: async (productId, binId, newQty, userId, reason) => {
                const { error } = await supabase.rpc('adjust_inventory', {
                    p_product_id: productId,
                    p_bin_id: binId,
                    p_new_qty: parseInt(newQty),
                    p_user_id: userId,
                    p_reason: reason
                });
                if (error) throw error;
                await fetchData(); // Refresh data
            },
            getProductHistory: async (productId) => {
                const { data, error } = await supabase.rpc('get_product_history', { p_product_id: productId });
                if (error) throw error;
                return data;
            },
            startStockCount: async (name, month, year, zoneIds, userId) => {
                const { data, error } = await supabase.rpc('start_stock_count', {
                    p_batch_name: name,
                    p_month: parseInt(month),
                    p_year: parseInt(year),
                    p_zone_ids: zoneIds,
                    p_user_id: userId
                });
                if (error) throw error;
                return data;
            },
            getStockCounts: async () => {
                const { data, error } = await supabase
                    .from('stock_counts')
                    .select(`
                        *,
                        created_by_user:users!stock_counts_created_by_fkey(display_name),
                        stock_count_zones(count)
                    `)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data;
            },
            updateCountItem: async (itemId, qty, userId) => {
                const { error } = await supabase.rpc('update_count_item', {
                    p_item_id: itemId,
                    p_counted_qty: parseInt(qty),
                    p_user_id: userId
                });
                if (error) throw error;
            },
            getVariance: async (id) => {
                const { data, error } = await supabase.rpc('get_stock_count_variance', {
                    p_stock_count_id: id
                });
                if (error) throw error;
                return data;
            },
            completeStockCount: async (id, userId) => {
                const { error } = await supabase.rpc('complete_stock_count', {
                    p_stock_count_id: id,
                    p_user_id: userId
                });
                if (error) throw error;
            },
            importData,
            clearAllData,
            refreshData: fetchData,
        }}>
            {children}
        </WarehouseContext.Provider>
    );
};
