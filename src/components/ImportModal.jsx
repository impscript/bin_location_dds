import React, { useState, useCallback, useMemo } from 'react';
import { X, Upload, FileUp, Check, AlertTriangle, Download, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import clsx from 'clsx';

const ImportModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [step, setStep] = useState('upload'); // upload, preview, importing, done
    const [importResult, setImportResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [importing, setImporting] = useState(false);

    // Column mapping
    const [columnMap, setColumnMap] = useState({
        product_code: '',
        product_name: '',
        ns_code: '',
        ns_name: '',
        bin_code: '',
        qty: '',
        unit: '',
    });

    const requiredFields = ['product_code', 'bin_code', 'qty'];
    const fieldLabels = {
        product_code: 'Product Code *',
        product_name: 'Product Name',
        ns_code: 'NS Code',
        ns_name: 'NS Name',
        bin_code: 'Bin Code *',
        qty: 'Quantity *',
        unit: 'Unit',
    };

    const handleFile = (f) => {
        if (!f) return;
        setFile(f);

        Papa.parse(f, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => {
                setHeaders(results.meta.fields || []);
                setParsedData(results.data);

                // Auto-map columns by matching header names
                const autoMap = {};
                const fieldAliases = {
                    product_code: ['product_code', 'productcode', 'รหัสสินค้า', 'item_code', 'sku'],
                    product_name: ['product_name', 'productname', 'ชื่อสินค้า', 'item_name', 'name', 'description'],
                    ns_code: ['ns_code', 'nscode', 'netsuite_code', 'ns code'],
                    ns_name: ['ns_name', 'nsname', 'netsuite_name', 'ns name'],
                    bin_code: ['bin_code', 'bincode', 'bin', 'location', 'รหัสbin', 'shelf'],
                    qty: ['qty', 'quantity', 'จำนวน', 'stock', 'amount', 'on_hand'],
                    unit: ['unit', 'uom', 'หน่วย'],
                };

                for (const [field, aliases] of Object.entries(fieldAliases)) {
                    const match = results.meta.fields.find(h =>
                        aliases.some(a => h.toLowerCase().trim().replace(/[\s_-]/g, '') === a.replace(/[\s_-]/g, ''))
                    );
                    if (match) autoMap[field] = match;
                }
                setColumnMap(prev => ({ ...prev, ...autoMap }));
                setStep('preview');
            },
            error: (err) => {
                toast.error('ไม่สามารถอ่านไฟล์ CSV: ' + err.message);
            }
        });
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt'))) {
            handleFile(f);
        } else {
            toast.error('รองรับเฉพาะไฟล์ .csv');
        }
    }, []);

    const isMapValid = requiredFields.every(f => columnMap[f]);

    // Preview data with mapped columns
    const previewRows = useMemo(() => {
        if (!isMapValid) return [];
        return parsedData.slice(0, 10).map(row => ({
            product_code: row[columnMap.product_code] || '',
            product_name: row[columnMap.product_name] || '',
            ns_code: row[columnMap.ns_code] || '',
            ns_name: row[columnMap.ns_name] || '',
            bin_code: row[columnMap.bin_code] || '',
            qty: row[columnMap.qty] || '0',
            unit: row[columnMap.unit] || 'EA',
        }));
    }, [parsedData, columnMap, isMapValid]);

    const BATCH_SIZE = 200;

    const handleImport = async () => {
        if (!isMapValid) return;
        setImporting(true);
        setStep('importing');

        try {
            // Map all rows
            const rows = parsedData.map(row => ({
                product_code: (row[columnMap.product_code] || '').trim(),
                product_name: (row[columnMap.product_name] || '').trim(),
                ns_code: (row[columnMap.ns_code] || '').trim(),
                ns_name: (row[columnMap.ns_name] || '').trim(),
                bin_code: (row[columnMap.bin_code] || '').trim(),
                qty: parseInt(row[columnMap.qty]) || 0,
                unit: (row[columnMap.unit] || 'EA').trim(),
            })).filter(r => r.product_code && r.bin_code);

            // Process in batches to avoid statement timeout
            const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
            let totalResult = { products_created: 0, products_updated: 0, bins_created: 0, inventory_updated: 0, errors_count: 0 };

            for (let i = 0; i < totalBatches; i++) {
                const batch = rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                setImportResult({ progress: `batch ${i + 1}/${totalBatches}`, pct: Math.round(((i + 1) / totalBatches) * 100) });

                const { data, error } = await supabase.rpc('upsert_inventory_csv', {
                    p_rows: JSON.stringify(batch),
                    p_user_id: user.id,
                });

                if (error) throw error;

                const result = typeof data === 'string' ? JSON.parse(data) : data;
                totalResult.products_created += result.products_created || 0;
                totalResult.products_updated += result.products_updated || 0;
                totalResult.bins_created += result.bins_created || 0;
                totalResult.inventory_updated += result.inventory_updated || 0;
                totalResult.errors_count += result.errors_count || 0;
            }

            setImportResult(totalResult);
            setStep('done');
            toast.success(`นำเข้าสำเร็จ! ${totalResult.products_created} สินค้าใหม่, ${totalResult.products_updated} อัพเดท`);
            onSuccess?.();
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Import ล้มเหลว: ' + err.message);
            setStep('preview');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const template = 'product_code,product_name,ns_code,ns_name,bin_code,qty,unit\nPROD-001,Sample Product,NS001,NS Sample,A-01-01,100,EA\n';
        const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        setHeaders([]);
        setStep('upload');
        setImportResult(null);
        setColumnMap({ product_code: '', product_name: '', ns_code: '', ns_name: '', bin_code: '', qty: '', unit: '' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Import ข้อมูล CSV</h2>
                        <p className="text-sm text-slate-500">
                            {step === 'upload' && 'เลือกไฟล์ CSV เพื่อนำเข้าข้อมูลสินค้าและสต็อก'}
                            {step === 'preview' && `${parsedData.length} แถว — ตรวจสอบ Column Mapping`}
                            {step === 'importing' && 'กำลังนำเข้าข้อมูล...'}
                            {step === 'done' && 'นำเข้าสำเร็จ!'}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                className={clsx(
                                    "border-2 border-dashed rounded-2xl p-12 text-center transition cursor-pointer",
                                    dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                                )}
                                onClick={() => document.getElementById('csv-input').click()}
                            >
                                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-slate-700">ลาก CSV ไฟล์มาวางที่นี่</p>
                                <p className="text-sm text-slate-500 mt-1">หรือคลิกเพื่อเลือกไฟล์</p>
                                <input
                                    id="csv-input"
                                    type="file"
                                    accept=".csv,.txt"
                                    className="hidden"
                                    onChange={(e) => handleFile(e.target.files[0])}
                                />
                            </div>
                            <button onClick={handleDownloadTemplate} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mx-auto">
                                <Download className="w-4 h-4" />
                                ดาวน์โหลด Template CSV
                            </button>
                        </div>
                    )}

                    {/* Step 2: Preview & Mapping */}
                    {step === 'preview' && (
                        <div className="space-y-6">
                            {/* Column Mapping */}
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-3">Column Mapping</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(fieldLabels).map(([field, label]) => (
                                        <div key={field}>
                                            <label className="text-xs text-slate-500 font-medium">{label}</label>
                                            <select
                                                value={columnMap[field] || ''}
                                                onChange={(e) => setColumnMap(prev => ({ ...prev, [field]: e.target.value }))}
                                                className={clsx(
                                                    "w-full mt-1 px-3 py-2 rounded-lg border text-sm",
                                                    requiredFields.includes(field) && !columnMap[field]
                                                        ? "border-red-300 bg-red-50"
                                                        : "border-slate-200"
                                                )}
                                            >
                                                <option value="">— เลือก column —</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                {!isMapValid && (
                                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        กรุณาเลือก column ที่จำเป็น (product_code, bin_code, qty)
                                    </p>
                                )}
                            </div>

                            {/* Preview Table */}
                            {isMapValid && (
                                <div>
                                    <h3 className="font-semibold text-slate-800 mb-3">
                                        Preview (แสดง {Math.min(10, parsedData.length)} จาก {parsedData.length} แถว)
                                    </h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Product Code</th>
                                                    <th className="px-3 py-2 text-left">Name</th>
                                                    <th className="px-3 py-2 text-left">NS Code</th>
                                                    <th className="px-3 py-2 text-left">Bin</th>
                                                    <th className="px-3 py-2 text-right">Qty</th>
                                                    <th className="px-3 py-2 text-left">Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewRows.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2 font-mono text-xs">{row.product_code}</td>
                                                        <td className="px-3 py-2 truncate max-w-[150px]">{row.product_name}</td>
                                                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{row.ns_code}</td>
                                                        <td className="px-3 py-2 font-mono text-xs">{row.bin_code}</td>
                                                        <td className="px-3 py-2 text-right font-medium">{row.qty}</td>
                                                        <td className="px-3 py-2 text-slate-500">{row.unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Importing */}
                    {step === 'importing' && (
                        <div className="text-center py-12">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                            <p className="text-lg font-medium text-slate-700">กำลังนำเข้า {parsedData.length} แถว...</p>
                            {importResult?.progress && (
                                <p className="text-sm text-blue-600 mt-2 font-medium">{importResult.progress} ({importResult.pct}%)</p>
                            )}
                            <p className="text-sm text-slate-500 mt-1">กรุณารอสักครู่</p>
                        </div>
                    )}

                    {/* Step 4: Done */}
                    {step === 'done' && importResult && (
                        <div className="text-center py-8 space-y-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <Check className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">นำเข้าสำเร็จ!</h3>
                                <p className="text-sm text-slate-500 mt-1">ข้อมูลถูกอัพเดทเรียบร้อย</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-700">{importResult.products_created || 0}</div>
                                    <div className="text-xs text-blue-600">สินค้าใหม่</div>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-emerald-700">{importResult.products_updated || 0}</div>
                                    <div className="text-xs text-emerald-600">อัพเดท</div>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-purple-700">{importResult.bins_created || 0}</div>
                                    <div className="text-xs text-purple-600">Bin ใหม่</div>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-amber-700">{importResult.inventory_updated || 0}</div>
                                    <div className="text-xs text-amber-600">Inventory</div>
                                </div>
                            </div>
                            {importResult.errors_count > 0 && (
                                <div className="bg-red-50 rounded-xl p-4 text-left max-w-lg mx-auto">
                                    <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        {importResult.errors_count} แถวมีปัญหา
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                    {step === 'preview' && (
                        <>
                            <button onClick={() => { setStep('upload'); setFile(null); setParsedData([]); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition">
                                เลือกไฟล์ใหม่
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!isMapValid || importing}
                                className={clsx(
                                    "px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2",
                                    isMapValid ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                <FileUp className="w-4 h-4" />
                                นำเข้า {parsedData.length} แถว
                            </button>
                        </>
                    )}
                    {step === 'done' && (
                        <button onClick={handleClose} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                            ปิด
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
