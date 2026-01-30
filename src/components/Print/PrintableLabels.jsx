import React from 'react';
// import { QRCodeSVG } from 'qrcode.react'; // Need to install or use API?
// Spec says: "generated using https://api.qrserver.com/v1/create-qr-code/..."
// So I will use an img tag with that URL.

const PrintableLabels = ({ bins, paperSize = 'A5' }) => {
    // Styles configuration based on paper size
    const styles = paperSize === 'A6' ? {
        width: '148mm',
        height: '105mm',
        titleSize: 'text-xl',
        subTitleSize: 'text-sm',
        qrSize: '250x250',
        qrImgClass: 'w-40 h-40',
        binIdSize: 'text-[3rem]',
        padding: 'p-4',
        footerSize: 'text-sm'
    } : {
        // A5 Default
        width: '210mm',
        height: '148mm',
        titleSize: 'text-3xl',
        subTitleSize: 'text-lg',
        qrSize: '400x400',
        qrImgClass: 'w-64 h-64',
        binIdSize: 'text-[4rem]',
        padding: 'p-6',
        footerSize: 'text-lg'
    };

    return (
        <div className="w-full bg-white">
            <style>
                {`
                    @media print {
                        @page {
                            size: ${paperSize} landscape;
                            margin: 0;
                        }
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                `}
            </style>
            {bins.map((bin) => (
                <div
                    key={bin.id}
                    className={`print-page-break flex flex-col items-center justify-between border-4 border-black box-border relative bg-white ${styles.padding} mx-auto my-8 print:my-0`}
                    style={{ width: styles.width, height: styles.height }}
                >
                    {/* Header */}
                    <div className="w-full text-center border-b-4 border-black pb-2">
                        <h1 className={`${styles.titleSize} font-black uppercase tracking-widest text-slate-900`}>DDS Warehouse</h1>
                        <p className={`${styles.subTitleSize} font-bold text-slate-600`}>Location ID</p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-row items-center justify-center w-full space-x-6">
                        <div className="bg-white">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=${styles.qrSize}&data=${encodeURIComponent(bin.id)}`}
                                alt={`QR Code for ${bin.id}`}
                                className={`${styles.qrImgClass} object-contain border-2 border-slate-200`}
                            />
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">BIN NO.</p>
                            <h2 className={`${styles.binIdSize} leading-none font-black tracking-tighter text-slate-900 break-words`}>
                                {bin.id.replace('OB_Non ', '').replace('OB_', '')}
                            </h2>
                            <p className={`font-mono mt-1 bg-slate-100 px-2 rounded inline-block text-slate-600 ${paperSize === 'A6' ? 'text-xs' : 'text-base'}`}>
                                {bin.id}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="w-full bg-black text-white py-2 text-center mt-auto rounded-sm">
                        <p className={`${styles.footerSize} font-bold uppercase tracking-widest`}>Scan to Update</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PrintableLabels;
