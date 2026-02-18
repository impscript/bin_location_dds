import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, SwitchCamera, Loader2 } from 'lucide-react';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);
    const [error, setError] = useState(null);
    const [starting, setStarting] = useState(true);

    useEffect(() => {
        let html5Qrcode = null;
        let mounted = true;

        const startScanner = async () => {
            try {
                html5Qrcode = new Html5Qrcode("reader");
                scannerRef.current = html5Qrcode;

                // Auto-start with rear camera
                await html5Qrcode.start(
                    { facingMode: "environment" }, // rear camera
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        onScanSuccess(decodedText);
                    },
                    () => {
                        // Ignore per-frame scan errors
                    }
                );

                if (mounted) setStarting(false);
            } catch (err) {
                console.error("Camera error:", err);
                if (mounted) {
                    setStarting(false);
                    setError(
                        typeof err === 'string' ? err :
                            err?.message || 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง'
                    );
                }
            }
        };

        startScanner();

        return () => {
            mounted = false;
            if (html5Qrcode && html5Qrcode.isScanning) {
                html5Qrcode.stop().catch(err => {
                    console.error("Failed to stop scanner:", err);
                });
            }
        };
    }, [onScanSuccess]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-in zoom-in-95 duration-200 border border-gray-700">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Camera className="w-5 h-5 text-blue-400" />
                        Scan Barcode
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-600 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Camera view */}
                <div className="relative bg-black">
                    <div id="reader" className="w-full" />

                    {/* Loading overlay */}
                    {starting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-3 min-h-[300px]">
                            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                            <p className="text-white font-medium text-sm">กำลังเปิดกล้อง...</p>
                            <p className="text-gray-400 text-xs">กรุณาอนุญาตการใช้กล้อง</p>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-3 p-6 min-h-[300px]">
                            <Camera className="w-12 h-12 text-red-400" />
                            <p className="text-white font-medium text-sm text-center">ไม่สามารถเปิดกล้องได้</p>
                            <p className="text-gray-400 text-xs text-center">{error}</p>
                            <button
                                onClick={onClose}
                                className="mt-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition"
                            >
                                ปิด
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="p-3 text-center bg-gray-800 border-t border-gray-700">
                    <p className="text-gray-300 text-sm font-medium">📷 หันกล้องไปที่ QR Code หรือ Barcode</p>
                    <p className="text-gray-500 text-xs mt-1">ระบบจะสแกนอัตโนมัติ</p>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
