import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        // Initialize scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                // Success callback
                onScanSuccess(decodedText);
                // We don't auto-close here to allow continuous scanning if needed,
                // but usually the parent will close it.
            },
            (error) => {
                // Ignore errors as they happen on every frame without a code
                // console.warn(error);
            }
        );

        // Cleanup function
        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5-qrcode scanner. ", error);
            });
        };
    }, [onScanSuccess]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Scan Barcode</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-0 bg-black">
                    {/* The library will render the video stream here */}
                    <div id="reader" className="w-full"></div>
                </div>

                <div className="p-4 text-center bg-white text-xs text-slate-500">
                    Point camera at a barcode to scan
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
