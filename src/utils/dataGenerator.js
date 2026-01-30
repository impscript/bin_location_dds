import { STANDARD_ZONES, SPECIAL_ZONES, SPECIAL_ZONE_MAPPING, REAL_INVENTORY_DATA, SHELF_CONFIG } from './constants';

const DUMMY_PRODUCTS = [
    {
        code: "DUMMY-P01", name: "ปากกาลูกลื่น น้ำเงิน (Sample)", unit: "ด้าม",
        nsCode: "NS-DM-001", nsName: "ปากกาลูกลื่น NS Standard", nsSubGroup: "Stationery"
    },
    {
        code: "DUMMY-P02", name: "กระดาษ A4 80แกรม (Sample)", unit: "รีม",
        nsCode: "NS-DM-002", nsName: "กระดาษ A4 NS Premium", nsSubGroup: "Paper"
    },
    {
        code: "DUMMY-T01", name: "เทปใส 2 นิ้ว (Sample)", unit: "ม้วน",
        nsCode: "NS-DM-003", nsName: "เทปใส NS Clear Tape", nsSubGroup: "Packing"
    },
    {
        code: "DUMMY-N01", name: "สมุดโน้ตมีเส้น (Sample)", unit: "เล่ม",
        nsCode: "NS-DM-004", nsName: "สมุดโน้ต NS Note", nsSubGroup: "Stationery"
    },
];

const generateDummyItems = (binId) => {
    const items = [];
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 items
    for (let i = 0; i < count; i++) {
        const template = DUMMY_PRODUCTS[Math.floor(Math.random() * DUMMY_PRODUCTS.length)];
        items.push({
            ...template,
            bin: binId,
            qty: Math.floor(Math.random() * 100),
            isDummy: true
        });
    }
    return items;
};

export const generateWarehouseData = (populateItems = true) => {
    let allBins = [];

    // 1. Generate Standard Zones (A-V, Premium)
    STANDARD_ZONES.forEach(zone => {
        const isPremium = zone === 'Premium';
        const config = isPremium ? SHELF_CONFIG.PREMIUM : SHELF_CONFIG.STANDARD;

        // Iterate Shelves
        for (let s = 1; s <= config.shelves; s++) {
            // Iterate Levels (Bins)
            for (let l = 1; l <= config.levels; l++) {
                let binId = '';
                if (isPremium) {
                    binId = `OB_Premium ${l}`;
                } else {
                    binId = `OB_Non ${zone}${s}-${l}`;
                }

                let items = [];
                let isSim = false;

                if (populateItems) {
                    const realItems = REAL_INVENTORY_DATA.filter(d => d.bin === binId);
                    if (realItems.length > 0) {
                        items = realItems;
                    } else {
                        // Dummy data logic: 20% chance
                        if (Math.random() > 0.8) {
                            items = generateDummyItems(binId);
                            isSim = true;
                        }
                    }
                }

                allBins.push({
                    id: binId,
                    zone,
                    shelf: isPremium ? 'Premium' : `${zone}${s}`,
                    level: l,
                    items,
                    isSim,
                    isOccupied: items.length > 0
                });
            }
        }
    });

    // 2. Generate Special Zones (Cutsize, E-Com, etc.)
    SPECIAL_ZONES.forEach(zone => {
        const binId = SPECIAL_ZONE_MAPPING[zone];
        if (binId) {
            let items = [];
            let isSim = false;

            if (populateItems) {
                const realItems = REAL_INVENTORY_DATA.filter(d => d.bin === binId);
                if (realItems.length > 0) {
                    items = realItems;
                } else {
                    items = generateDummyItems(binId);
                    isSim = true;
                }
            }

            allBins.push({
                id: binId,
                zone,
                shelf: 'Bulk Storage',
                level: 1,
                items,
                isSim,
                isOccupied: items.length > 0
            });
        }
    });

    return allBins;
};
