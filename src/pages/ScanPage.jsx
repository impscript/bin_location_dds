import { useState } from 'react';
import { ScanLine, Keyboard, Camera, Search, Box, MapPin, ArrowRight, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';
import BarcodeScanner from '../components/BarcodeScanner';

export default function ScanPage() {
    const [manualInput, setManualInput] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [scanResults, setScanResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const navigate = useNavigate();
    const { searchItems, getBinData } = useWarehouse();

    const handleSearch = (query) => {
        if (!query) return;

        setHasSearched(true);
        setScanResults([]);

        // Check if it's a bin code
        const bin = getBinData(query);
        if (bin) {
            navigate(`/bin/${query}`);
            return;
        }

        // Otherwise search as product
        const results = searchItems(query);
        setScanResults(results);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        handleSearch(manualInput.trim());
    };

    const handleScanSuccess = (decodedText) => {
        setIsScannerOpen(false);
        setManualInput(decodedText);
        handleSearch(decodedText);
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Quick Scan (ค้นหาสินค้า)</h1>
                <p className="text-sm text-slate-500 mt-1">สแกนเพื่อตรวจสอบตำแหน่งและจำนวนสินค้า</p>
            </div>

            {/* Promote Stock Count Feature */}
            <div
                onClick={() => navigate('/stock-count')}
                className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition group"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-indigo-900 text-sm">ต้องการนับสต็อก?</h3>
                        <p className="text-xs text-indigo-600">ไปที่เมนู Stock Count เพื่อเริ่มนับตามรอบ</p>
                    </div>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition" />
            </div>

            {/* Camera area placeholder */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="aspect-[4/3] bg-slate-900 flex flex-col items-center justify-center text-white relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-56 h-56 border-2 border-white/30 rounded-2xl relative">
                            <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-3 border-l-3 border-blue-400 rounded-tl-xl" />
                            <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-3 border-r-3 border-blue-400 rounded-tr-xl" />
                            <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-3 border-l-3 border-blue-400 rounded-bl-xl" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-3 border-r-3 border-blue-400 rounded-br-xl" />
                        </div>
                    </div>
                    <Camera className="w-12 h-12 text-white/20 mb-4" />
                    <p className="text-white/40 text-sm">แตะปุ่มด้านล่างเพื่อเปิดกล้อง</p>
                </div>

                {/* Actions */}
                <div className="p-4 flex gap-3">
                    <button
                        onClick={() => {
                            setShowManual(!showManual);
                            setHasSearched(false);
                            setScanResults([]);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition ${showManual ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Keyboard className="w-4 h-4" />
                        พิมพ์รหัส
                    </button>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-sm active:scale-95"
                    >
                        <ScanLine className="w-4 h-4" />
                        เปิดกล้อง
                    </button>
                </div>
            </div>

            {/* Scanner Modal */}
            {isScannerOpen && (
                <BarcodeScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            {/* Manual input */}
            {showManual && (
                <form onSubmit={handleManualSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-slate-700 mb-2 block">พิมพ์รหัส Bin หรือ Product Code</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="เช่น OB_Non A1-1 หรือ NS Code..."
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition text-sm shadow-sm shadow-blue-200"
                        >
                            ค้นหา
                        </button>
                    </div>
                </form>
            )}

            {/* Results */}
            {hasSearched && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-slate-800">ผลการค้นหา ({scanResults.length})</h2>
                        {scanResults.length > 0 && (
                            <span className="text-xs text-slate-500">พบสินค้าใน {scanResults.length} ตำแหน่ง</span>
                        )}
                    </div>

                    {scanResults.length === 0 ? (
                        <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100">
                            <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">ไม่พบข้อมูล</p>
                            <p className="text-xs text-slate-400 mt-1">ลองตรวจสอบรหัสสินค้า หรือ Bin Code อีกครั้ง</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {scanResults.map((res, index) => (
                                <div key={index} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-slate-900 text-lg">{res.item.code}</div>
                                            <div className="text-sm text-slate-500">{res.item.name}</div>
                                            {res.item.nsCode && (
                                                <div className="text-xs text-blue-600 font-mono mt-1 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
                                                    NS: {res.item.nsCode}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-slate-100 px-3 py-1 rounded-lg text-center min-w-[3rem]">
                                            <div className="text-xs text-slate-500 uppercase">QTY</div>
                                            <div className="font-bold text-slate-800 text-lg">{res.item.qty}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded-lg">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <span>อยู่ที่ Bin: <strong>{res.binId}</strong> (Zone {res.zone})</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => navigate(`/product/${res.item._productId}`)}
                                            className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium text-sm border border-blue-200"
                                        >
                                            ดูสินค้า
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/bin/${res.binId}`)}
                                            className="flex items-center justify-center gap-2 py-2 px-3 bg-white text-slate-600 rounded-lg hover:bg-slate-50 transition font-medium text-sm border border-slate-200"
                                        >
                                            ดู Bin
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tips (only show if not searched) */}
            {!hasSearched && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-sm font-medium text-blue-800 mb-2">💡 วิธีใช้</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>qr ของ bin</strong> — สแกนแล้วดูสินค้าใน bin นั้น</li>
                        <li>• <strong>barcode สินค้า</strong> — สแกนเพื่อค้นหาตำแหน่ง</li>
                        <li>• <strong>ต้องการนับสต็อก?</strong> — กรุณาใช้เมนู Stock Count</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
