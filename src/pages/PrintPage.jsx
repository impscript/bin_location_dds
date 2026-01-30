import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';
import PrintableLabels from '../components/Print/PrintableLabels';
import { ArrowLeft, Printer } from 'lucide-react';

const PrintPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { warehouseData, loading } = useWarehouse();
    const [paperSize, setPaperSize] = React.useState('A5');

    const binIds = searchParams.get('bins')?.split(',') || [];

    const binsToPrint = warehouseData.filter(b => binIds.includes(b.id));

    useEffect(() => {
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div>Loading...</div>;
    if (binsToPrint.length === 0) return <div className="p-10">No bins selected to print.</div>;

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            {/* Toolbar - Hidden on Print */}
            <div className="bg-white shadow-sm border-b border-slate-200 p-4 print:hidden flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800">Print Preview ({binsToPrint.length} Labels)</h1>
                        <p className="text-xs text-slate-500">Paper Size: {paperSize}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => setPaperSize('A5')}
                            className={`px-3 py-1 text-sm rounded-md transition-all font-medium ${paperSize === 'A5' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            A5
                        </button>
                        <button
                            onClick={() => setPaperSize('A6')}
                            className={`px-3 py-1 text-sm rounded-md transition-all font-medium ${paperSize === 'A6' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            A6
                        </button>
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
                <PrintableLabels bins={binsToPrint} paperSize={paperSize} />
            </div>
        </div>
    );
};

export default PrintPage;
