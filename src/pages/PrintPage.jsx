import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';
import PrintableLabels, { LAYOUT_PRESETS } from '../components/Print/PrintableLabels';
import { ArrowLeft, Printer, Grid2x2, List } from 'lucide-react';

const PrintPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { warehouseData, loading } = useWarehouse();
    const [layout, setLayout] = React.useState('A5x4');
    const [globalLotNo, setGlobalLotNo] = React.useState('');
    const [printByItem, setPrintByItem] = React.useState(false);

    const binIds = searchParams.get('bins')?.split(',') || [];
    const binsToPrint = warehouseData.filter(b => binIds.includes(b.id));

    let labelsToPrint = [];
    if (printByItem) {
        binsToPrint.forEach(bin => {
            if (bin.items && bin.items.length > 0) {
                bin.items.forEach((item, index) => {
                    labelsToPrint.push({
                        ...bin,
                        uniqueKey: `${bin.id}-${index}-${item.lotNo || ''}`,
                        isItem: true,
                        itemLotNo: item.lotNo || '',
                        itemName: item.nsName || item.name || ''
                    });
                });
            } else {
                labelsToPrint.push({ ...bin, uniqueKey: bin.id });
            }
        });
    } else {
        labelsToPrint = binsToPrint.map(b => ({ ...b, uniqueKey: b.id }));
    }

    const totalLabels = labelsToPrint.length;

    useEffect(() => {
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div>Loading...</div>;
    if (labelsToPrint.length === 0) return <div className="p-10">No bins selected to print.</div>;

    const preset = LAYOUT_PRESETS[layout];
    const perPage = preset.cols * preset.rows;
    const totalPages = Math.ceil(totalLabels / perPage);

    // Separate single vs multi-up layouts
    const singleLayouts = ['A4', 'A5', 'A6', 'A7'];
    const multiUpLayouts = ['A5x4', 'A4x8'];

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            {/* Toolbar - Hidden on Print */}
            <div className="bg-white shadow-sm border-b border-slate-200 p-4 print:hidden flex justify-between items-center sticky top-0 z-10 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800">Print Preview ({totalLabels} Labels)</h1>
                        <p className="text-xs text-slate-500">
                            {preset.label} · {preset.desc}/page · {totalPages} page{totalPages !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                    {/* Print by Item Toggle */}
                    <button
                        onClick={() => setPrintByItem(!printByItem)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                            printByItem
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <List className={`w-4 h-4 ${printByItem ? 'text-indigo-600' : 'text-slate-400'}`} />
                        Print by Item
                    </button>

                    {/* Lot No Input */}
                    <div className="flex flex-col">
                        <input
                            type="text"
                            placeholder="ระบุ Lot No. (ถ้ามี)"
                            value={globalLotNo}
                            onChange={(e) => setGlobalLotNo(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                    </div>

                    {/* Single label sizes */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                        {singleLayouts.map(key => (
                            <button
                                key={key}
                                onClick={() => setLayout(key)}
                                className={`px-3 py-1 text-sm rounded-md transition-all font-medium ${layout === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>

                    {/* Multi-up layouts */}
                    <div className="flex items-center bg-amber-50 rounded-lg p-1 border border-amber-200">
                        {multiUpLayouts.map(key => {
                            const p = LAYOUT_PRESETS[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => setLayout(key)}
                                    className={`px-3 py-1 text-sm rounded-md transition-all font-medium flex items-center gap-1 ${layout === key ? 'bg-white shadow text-amber-900' : 'text-amber-600 hover:text-amber-800'}`}
                                >
                                    <Grid2x2 className="h-3.5 w-3.5" />
                                    {p.label}×{p.cols * p.rows}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium shadow-sm transition"
                    >
                        <Printer className="h-4 w-4" />
                        Print Now
                    </button>
                </div>
            </div>

            {/* Print Content */}
            <div className="flex justify-center my-8 print:my-0 print:block">
                <PrintableLabels bins={labelsToPrint} layout={layout} globalLotNo={globalLotNo} />
            </div>
        </div>
    );
};

export default PrintPage;
