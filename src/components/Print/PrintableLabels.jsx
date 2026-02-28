import React from 'react';

// Layout presets: defines paper size, grid, and label styling
const LAYOUT_PRESETS = {
    'A4': {
        label: 'A4',
        desc: '1 label',
        pageWidth: '297mm', pageHeight: '210mm', printSize: 'A4',
        cols: 1, rows: 1,
        style: {
            titleSize: 'text-4xl', subTitleSize: 'text-xl',
            qrSize: '500x500', qrImgClass: 'w-80 h-80',
            binIdSize: 'text-[5rem]', padding: 'p-8',
            footerSize: 'text-xl', binNoSize: 'text-xs',
            fullIdSize: 'text-base', headerBorder: 'border-b-4',
            labelBorder: 'border-4', footerPy: 'py-2', gap: 'gap-4'
        }
    },
    'A5': {
        label: 'A5',
        desc: '1 label',
        pageWidth: '210mm', pageHeight: '148mm', printSize: 'A5',
        cols: 1, rows: 1,
        style: {
            titleSize: 'text-3xl', subTitleSize: 'text-lg',
            qrSize: '400x400', qrImgClass: 'w-64 h-64',
            binIdSize: 'text-[4rem]', padding: 'p-6',
            footerSize: 'text-lg', binNoSize: 'text-xs',
            fullIdSize: 'text-base', headerBorder: 'border-b-4',
            labelBorder: 'border-4', footerPy: 'py-2', gap: 'gap-4'
        }
    },
    'A6': {
        label: 'A6',
        desc: '1 label',
        pageWidth: '148mm', pageHeight: '105mm', printSize: 'A6',
        cols: 1, rows: 1,
        style: {
            titleSize: 'text-xl', subTitleSize: 'text-sm',
            qrSize: '250x250', qrImgClass: 'w-40 h-40',
            binIdSize: 'text-[3rem]', padding: 'p-4',
            footerSize: 'text-sm', binNoSize: 'text-[10px]',
            fullIdSize: 'text-xs', headerBorder: 'border-b-2',
            labelBorder: 'border-2', footerPy: 'py-1.5', gap: 'gap-3'
        }
    },
    'A7': {
        label: 'A7',
        desc: '1 label',
        pageWidth: '105mm', pageHeight: '74mm', printSize: 'A7',
        cols: 1, rows: 1,
        style: {
            titleSize: 'text-sm', subTitleSize: 'text-[10px]',
            qrSize: '150x150', qrImgClass: 'w-20 h-20',
            binIdSize: 'text-[1.5rem]', padding: 'p-2',
            footerSize: 'text-[10px]', binNoSize: 'text-[8px]',
            fullIdSize: 'text-[10px]', headerBorder: 'border-b',
            labelBorder: 'border-2', footerPy: 'py-0.5', gap: 'gap-2'
        }
    },
    'A5x4': {
        label: 'A5',
        desc: '4 labels',
        pageWidth: '210mm', pageHeight: '148mm', printSize: 'A5',
        cols: 2, rows: 2, multiUp: true,
        style: {
            qrSize: '250x250',
            binIdSize: 'text-[2rem]',
            fullIdSize: 'text-[10px]',
        }
    },
    'A4x8': {
        label: 'A4',
        desc: '8 labels',
        pageWidth: '297mm', pageHeight: '210mm', printSize: 'A4',
        cols: 4, rows: 2, multiUp: true,
        style: {
            qrSize: '250x250',
            binIdSize: 'text-[1.8rem]',
            fullIdSize: 'text-[10px]',
        }
    }
};

// Single label component (horizontal layout - QR left, text right)
const Label = ({ bin, style }) => (
    <div className={`flex flex-col items-center justify-between ${style.labelBorder} border-black box-border relative bg-white ${style.padding} w-full h-full`}>
        {/* Header */}
        <div className={`w-full text-center ${style.headerBorder} border-black pb-0.5`}>
            <h1 className={`${style.titleSize} font-black uppercase tracking-widest text-slate-900 leading-tight`}>DDS Warehouse</h1>
            <p className={`${style.subTitleSize} font-bold text-slate-600 leading-tight`}>Location ID</p>
        </div>

        {/* Content */}
        <div className={`flex-1 flex flex-row items-center justify-center w-full ${style.gap}`}>
            <div className="bg-white flex-shrink-0">
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=${style.qrSize}&data=${encodeURIComponent(bin.id)}`}
                    alt={`QR Code for ${bin.id}`}
                    className={`${style.qrImgClass} object-contain border border-slate-200`}
                />
            </div>
            <div className="text-center flex-1 min-w-0">
                <p className={`${style.binNoSize} text-slate-400 font-bold mb-0.5 uppercase tracking-wider`}>BIN NO.</p>
                <h2 className={`${style.binIdSize} leading-none font-black tracking-tight text-slate-900 break-words`}>
                    {bin.id}
                </h2>
            </div>
        </div>

        {/* Footer */}
        <div className={`w-full bg-black text-white ${style.footerPy} text-center mt-auto rounded-sm`}>
            <p className={`${style.footerSize} font-bold uppercase tracking-widest`}>Scan to Update</p>
        </div>
    </div>
);

// Multi-up compact label (vertical layout - QR top, text bottom)
const CompactLabel = ({ bin, style }) => (
    <div className="flex flex-col items-center border border-black box-border bg-white w-full h-full overflow-hidden"
        style={{ padding: '2mm' }}
    >
        {/* QR Code - fills most of the cell */}
        <div className="flex-1 flex items-center justify-center w-full" style={{ minHeight: 0 }}>
            <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=${style.qrSize}&data=${encodeURIComponent(bin.id)}`}
                alt={`QR Code for ${bin.id}`}
                className="object-contain"
                style={{ width: '100%', height: '100%' }}
            />
        </div>

        {/* BIN Info - tight text below QR */}
        <div className="w-full text-center flex-shrink-0" style={{ paddingTop: '5mm' }}>
            <h2 className={`${style.binIdSize} leading-none font-black tracking-tight text-slate-900`}>
                {bin.id}
            </h2>
        </div>
    </div>
);

// Group array into chunks
const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

const PrintableLabels = ({ bins, layout = 'A5' }) => {
    const preset = LAYOUT_PRESETS[layout] || LAYOUT_PRESETS['A5'];
    const perPage = preset.cols * preset.rows;
    const isMultiUp = perPage > 1;

    if (isMultiUp) {
        const pages = chunkArray(bins, perPage);
        return (
            <div className="w-full bg-white">
                <style>
                    {`
                        @media print {
                            @page {
                                size: ${preset.printSize} landscape;
                                margin: 0;
                            }
                            body {
                                print-color-adjust: exact;
                                -webkit-print-color-adjust: exact;
                            }
                        }
                    `}
                </style>
                {pages.map((pageBins, pageIdx) => (
                    <div
                        key={pageIdx}
                        className="print-page-break bg-white mx-auto my-8 print:my-0"
                        style={{
                            width: preset.pageWidth,
                            height: preset.pageHeight,
                            display: 'grid',
                            gridTemplateColumns: `repeat(${preset.cols}, 1fr)`,
                            gridTemplateRows: `repeat(${preset.rows}, 1fr)`,
                            padding: '3mm',
                            gap: '1.5mm',
                            boxSizing: 'border-box'
                        }}
                    >
                        {pageBins.map((bin) => (
                            <CompactLabel key={bin.id} bin={bin} style={preset.style} />
                        ))}
                        {/* Empty slots for incomplete pages */}
                        {Array.from({ length: perPage - pageBins.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="border border-dashed border-slate-300 rounded" />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    // Single label per page
    return (
        <div className="w-full bg-white">
            <style>
                {`
                    @media print {
                        @page {
                            size: ${preset.printSize} landscape;
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
                    className="print-page-break mx-auto my-8 print:my-0"
                    style={{ width: preset.pageWidth, height: preset.pageHeight }}
                >
                    <Label bin={bin} style={preset.style} />
                </div>
            ))}
        </div>
    );
};

export { LAYOUT_PRESETS };
export default PrintableLabels;
