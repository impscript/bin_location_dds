export const REAL_INVENTORY_DATA = [
    // --- ZONE CAT (Standard Shelves) ---
    {
        bin: "OB_Non A1-1", code: "C06110010", name: "แฟ้มสันกว้าง ช้าง 120 A4 3\" ดำ 6 เล่ม:P", qty: 87, unit: "EA",
        nsCode: "2CT-FS-01-004", nsName: "แฟ้มสันกว้าง ตราช้าง 120 A4 สัน 3\" ดำ P.1", nsSubGroup: "DACT"
    },
    {
        bin: "OB_Non A1-1", code: "C06110020", name: "แฟ้มสันกว้าง ช้าง 120F 3\" ดำ 6 เล่ม:P", qty: 1, unit: "EA",
        nsCode: "2CT-FS-01-175", nsName: "แฟ้มสันกว้าง ตราช้าง 120F F4 สัน 3\" ดำ P.1", nsSubGroup: "DACT"
    },
    {
        bin: "OB_Non A1-1", code: "C05413540", name: "กระดาษต่อเนื่อง General ไม่มีเส้น 11x11(1P)", qty: 22, unit: "EA",
        nsCode: "2CT-PB-04-095", nsName: "กระดาษต่อเนื่อง General ไม่มีเส้น11x11(1P)", nsSubGroup: "DACT"
    },
    {
        bin: "OB_Non A1-1", code: "C05910650", name: "ซองน้ำตาลครุฑขยาย 9x12 3/4 555 KA 50EA:P", qty: 3600, unit: "EA",
        nsCode: "2CT-EN-02-038", nsName: "ซองน้ำตาลครุฑขยาย 9x12 3/4 555 KA 50EA", nsSubGroup: "DACT"
    },
    {
        bin: "OB_Non Q27-6", code: "C04320190", name: "กระดาษโปสเตอร์สี 2 หน้า สีครีม", qty: 8, unit: "EA",
        nsCode: "2CT-PS-03-020", nsName: "กระดาษโปสเตอร์สี 2 หน้า ครีม", nsSubGroup: "DACT"
    },
    {
        bin: "OB_Non Q27-6", code: "C04320160", name: "กระดาษโปสเตอร์สี 2 หน้า สีแดง", qty: 61, unit: "EA",
        nsCode: "2CT-PS-03-018", nsName: "กระดาษโปสเตอร์สี 2 หน้า แดง", nsSubGroup: "DACT"
    },
    {
        bin: "OB_Non Q27-6", code: "C04320480", name: "กระดาษโปสเตอร์สี 2 หน้า สีม่วง", qty: 12, unit: "EA",
        nsCode: "2CT-PS-03-025", nsName: "กระดาษโปสเตอร์สี 2 หน้า ม่วง", nsSubGroup: "DACT"
    },

    // --- ZONE CUTSIZE ---
    {
        bin: "OB_Cutsize", code: "208010701412652", name: "QUALITY BLUE 70G. A4(500)6L 480 R/P BOX", qty: 6752, unit: "RM",
        nsCode: "1CZD-QB-070-A04-500-6L-001", nsName: "Quality Blue 70G A4 (500) AUTO 6L 480 R/P N", nsSubGroup: "Cutsize"
    },
    {
        bin: "OB_Cutsize", code: "208010701422412", name: "QUALITY BLUE 70G. A3(500) 4L 140 R/P BOX", qty: 400, unit: "RM",
        nsCode: "1CZD-QB-070-A03-500-4L-001", nsName: "Quality Blue 70G A3 (500) AUTO 4L 140 R/P N (D)", nsSubGroup: "Cutsize"
    },
    {
        bin: "OB_Cutsize", code: "208010701812653", name: "SPEED YELLOW 70G. A4(500)6L 480 R/P SHR", qty: 3515, unit: "RM",
        nsCode: "1CZD-SY-070-A04-500-6L-001", nsName: "Speed Yellow 70G A4 (500) 6L 480 R/P SHR N", nsSubGroup: "Cutsize"
    },

    // --- ZONE E-COM ---
    {
        bin: "E-Com", code: "208010701412652", name: "QUALITY BLUE 70G. A4(500)6L 480 R/P BOX", qty: 200, unit: "RM",
        nsCode: "1CZD-QB-070-A04-500-6L-001", nsName: "Quality Blue 70G A4 (500) AUTO 6L 480 R/P N", nsSubGroup: "Cutsize"
    },
    {
        bin: "E-Com", code: "208790801312652", name: "QUALITY RED 80G. A4(500)6L 480 R/P BOX", qty: 50, unit: "RM",
        nsCode: "1CZD-QR-080-A04-500-6L-001", nsName: "Quality Red 80G A4 (500) AUTO 6L 480 R/P N", nsSubGroup: "Cutsize"
    },

    // --- ZONE FOLIO REAM ---
    {
        bin: "Folio Ream", code: "202761503104300", name: "HI-WC 150G. 31x43 ROP N", qty: 154, unit: "RM",
        nsCode: "1FOD-HW01-150-N21-125-001", nsName: "HI-WC 150G (125) 31x43 56 PAC/P ROP N", nsSubGroup: "Folio"
    },

    // --- ZONE FOLIO FULL PALLET ---
    {
        bin: "Folio Full Pallet", code: "201030601673943", name: "aA-PRINT 60 W.16.75 D39.4 C3", qty: 1102, unit: "KG",
        nsCode: "1RG-AP01-060-0426-1000-3", nsName: "aA-PRINT 60G | W426 D1000 C3\" (W16.75\" D39.4\")", nsSubGroup: "Roll FG"
    },
];

export const STANDARD_ZONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'Premium'];
export const SPECIAL_ZONES = ['Cutsize', 'E-Com', 'Folio Ream', 'Folio Pallet', 'Event', 'Consignment'];
export const ALL_ZONES = [...STANDARD_ZONES, ...SPECIAL_ZONES];

export const SPECIAL_ZONE_MAPPING = {
    'Cutsize': 'OB_Cutsize',
    'E-Com': 'E-Com',
    'Folio Ream': 'Folio Ream',
    'Folio Pallet': 'Folio Full Pallet',
    'Event': 'OB_Event',
    'Consignment': 'OB_Consignment'
};

export const ZONES = ALL_ZONES; // For backward compatibility if needed, but we should switch to explicit Standard/Special where relevant

export const SHELF_CONFIG = {
    STANDARD: { shelves: 3, levels: 4 }, // Zones A-V
    PREMIUM: { shelves: 1, levels: 4 }   // Zone Premium
};
