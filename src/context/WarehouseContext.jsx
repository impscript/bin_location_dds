import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateWarehouseData } from '../utils/dataGenerator';

const WarehouseContext = createContext();

export const useWarehouse = () => useContext(WarehouseContext);

export const WarehouseProvider = ({ children }) => {
    const [warehouseData, setWarehouseData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Save to LocalStorage helper
    const saveToStorage = (data) => {
        try {
            localStorage.setItem('warehouse_data', JSON.stringify(data));
        } catch (err) {
            console.error("Failed to save to localStorage", err);
        }
    };

    useEffect(() => {
        // Load from LocalStorage or Initialize Empty
        const stored = localStorage.getItem('warehouse_data');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setWarehouseData(parsed);
                console.log("Loaded data from localStorage:", parsed.length, "bins");
            } catch (e) {
                console.error("Error parsing localStorage, resetting...", e);
                const emptyData = generateWarehouseData(false); // False = Empty
                setWarehouseData(emptyData);
                saveToStorage(emptyData);
            }
        } else {
            // First time load: Start Clean (No Mock Data)
            const emptyData = generateWarehouseData(false);
            setWarehouseData(emptyData);
            saveToStorage(emptyData);
            console.log("Initialized empty warehouse data.");
        }
        setLoading(false);
    }, []);

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

    // Helper to parse Bin ID into components
    const parseBinId = (binId) => {
        // Default structure
        let zone = 'General';
        let shelf = 'General';
        let level = 1;

        const cleanId = binId.trim();

        // Pattern 1: OB_Non [Zone][Shelf]-[Level] (e.g., OB_Non A1-1)
        const standardMatch = cleanId.match(/^OB_Non\s+([A-Z]+)(\d+)-(\d+)$/i);
        if (standardMatch) {
            const [_, zoneCode, shelfNum, levelNum] = standardMatch;
            return {
                id: cleanId,
                zone: zoneCode.toUpperCase(), // e.g. "A"
                shelf: `${zoneCode}${shelfNum}`, // e.g. "A1"
                level: parseInt(levelNum),
                items: [],
                isSim: false,
                isOccupied: false
            };
        }

        // Pattern 2: OB_Premium [Level]
        const premiumMatch = cleanId.match(/^OB_Premium\s+(\d+)$/i);
        if (premiumMatch) {
            return {
                id: cleanId,
                zone: 'Premium',
                shelf: 'Premium',
                level: parseInt(premiumMatch[1]),
                items: [],
                isSim: false,
                isOccupied: false
            };
        }

        // Pattern 3: Special Zones based on known keywords or simple heuristic
        // Check known special zones first if we had imports, but for dynamic we might just guess.
        // If it looks like "E-Com", "Cutsize", etc.
        // Let's use the whole ID as Zone if it doesn't match standard patterns, or try to split.

        // Simple fallback: If it contains "OB_", remove it for Zone name.
        if (cleanId.startsWith("OB_")) {
            const remainder = cleanId.replace("OB_", "").trim();
            // e.g. OB_Cutsize -> Zone: Cutsize
            return {
                id: cleanId,
                zone: remainder,
                shelf: 'Bulk Storage',
                level: 1,
                items: [],
                isSim: false,
                isOccupied: false
            };
        }

        // Final fallback: Use the ID itself as the Zone
        return {
            id: cleanId,
            zone: cleanId,
            shelf: 'Bulk Storage',
            level: 1,
            items: [],
            isSim: false,
            isOccupied: false
        };
    };

    const importData = (newItems) => {
        // 1. Clear existing data and prepare for full replacement
        // Note: We are NOT merging. User request: "BIN เดิมที่มีให้เคลียร์... ไม่ต้อง fix แบบเดิม"

        const newWarehouseData = [];
        const binMap = new Map(); // id -> binObject

        newItems.forEach(newItem => {
            const binId = newItem.binId.trim();

            // 2. Get or Create Bin
            if (!binMap.has(binId)) {
                const newBin = parseBinId(binId);
                binMap.set(binId, newBin);
                newWarehouseData.push(newBin);
            }

            const bin = binMap.get(binId);

            // 3. Add Item
            // Mapping based on template_final.csv headers:
            // Bin ID, Product Code, Product Name, Unit, NS Code, NS Name, NS SubGroup, Quantity
            const item = {
                code: newItem.productCode || "N/A",
                name: newItem.productName || "Unknown Product",
                unit: newItem.unit || "EA",
                nsCode: newItem.nsCode || "",
                nsName: newItem.nsName || "",
                nsSubGroup: newItem.nsSubGroup || "",
                bin: binId,
                qty: parseInt(newItem.quantity) || 0,
                isDummy: false
            };

            bin.items.push(item);
            bin.isOccupied = true;
        });

        // 4. Update State and Storage
        setWarehouseData(newWarehouseData);
        saveToStorage(newWarehouseData);

        // return for optional immediate usage
        return newWarehouseData;
    };

    const clearAllData = () => {
        const emptyData = generateWarehouseData(false);
        setWarehouseData(emptyData);
        saveToStorage(emptyData);
    };

    return (
        <WarehouseContext.Provider value={{ warehouseData, loading, getZoneData, getBinData, searchItems, importData, clearAllData }}>
            {children}
        </WarehouseContext.Provider>
    );
};
