import React, { useState, useCallback, useMemo } from 'react';
import { X, Upload, FileUp, Check, AlertTriangle, Download, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import clsx from 'clsx';

const ImportMemoModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [step, setStep] = useState('upload'); // upload, preview, importing, done
    const [importResult, setImportResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [importing, setImporting] = useState(false);

    // Column mapping configuration
    const [columnMap, setColumnMap] = useState({
        etd_date: '',
        if_number: '',
        customer: '',
        shipping_address: '',
        item_name: '',
        qty: '',
    });

    const requiredFields = ['etd_date', 'if_number', 'customer', 'item_name', 'qty'];
    const fieldLabels = {
        etd_date: 'ETD Date *',
        if_number: 'IF Number *',
        customer: 'Ship to Customer *',
        shipping_address: 'Shipping Address',
        item_name: 'Item Name *',
        qty: 'Quantity *',
    };

    const processData = (data, fields) => {
        setHeaders(fields);
        setParsedData(data);

        const autoMap = {};
        const fieldAliases = {
            etd_date: ['etd_date', 'etddate', 'etd date', 'วันที่', 'delivery_date', 'date'],
            if_number: ['if_number', 'ifnumber', 'if number', 'เลขที่เอกสาร', 'if no', 'document_no', 'invoice_no'],
            customer: ['customer', 'ship_to_customer', 'ship to customer', 'ลูกค้า', 'ชื่อลูกค้า', 'customer_name'],
            shipping_address: ['shipping_address', 'shipping address', 'ที่อยู่', 'ที่อยู่จัดส่ง', 'address'],
            item_name: ['item_name', 'item name', 'รายการ', 'ของแถม', 'ของโปรโมชั่น', 'product_name'],
            qty: ['qty', 'quantity', 'จำนวน', 'quantity in transaction units', 'quantity_in_transaction_units', 'amount'],
        };

        for (const [field, aliases] of Object.entries(fieldAliases)) {
            const match = fields.find(h =>
                aliases.some(a => h.toLowerCase().trim().replace(/[\s_-]/g, '') === a.replace(/[\s_-]/g, ''))
            );
            if (match) autoMap[field] = match;
        }
        setColumnMap(prev => ({ ...prev, ...autoMap }));
        setStep('preview');
    };

    const handleFile = (f) => {
        if (!f) return;
        setFile(f);

        const isExcel = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(e.target.result, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
                    const fields = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
                    processData(jsonData, fields);
                } catch (err) {
                    toast.error('ไม่สามารถอ่านไฟล์ Excel: ' + err.message);
                }
            };
            reader.readAsArrayBuffer(f);
        } else {
            Papa.parse(f, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    processData(results.data, results.meta.fields || []);
                },
                error: (err) => {
                    toast.error('ไม่สามารถอ่านไฟล์ CSV: ' + err.message);
                }
            });
        }
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
            handleFile(f);
        } else {
            toast.error('รองรับเฉพาะไฟล์ .csv และ .xlsx');
        }
    }, []);

    const isMapValid = requiredFields.every(f => columnMap[f]);

    // Parse customer string to extract customer code and name
    const parseCustomer = (customerStr) => {
        if (!customerStr) return { code: '', name: '' };
        const cleanStr = customerStr.trim();
        // Match code patterns like CDOZ000975
        const match = cleanStr.match(/^(CDOZ\d+|[A-Z0-9]+)\s+(.+)$/i);
        if (match) {
            return { code: match[1], name: match[2] };
        }
        return { code: '', name: cleanStr };
    };

    // Format date string from DD/MM/YYYY or DD.MM.YYYY to YYYY-MM-DD
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const clean = dateStr.trim();
        // Match DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
        const dmyMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            return `${year}-${month}-${day}`;
        }
        // Fallback or if already YYYY-MM-DD
        return clean;
    };

    // Consolidate all rows from the parsed data to handle duplicates gracefully
    const processedRows = useMemo(() => {
        if (!isMapValid) return [];

        const mapped = parsedData.map(row => {
            const rawCustomer = row[columnMap.customer] || '';
            const { code, name } = parseCustomer(rawCustomer);
            return {
                etd_date: formatDate(row[columnMap.etd_date]) || row[columnMap.etd_date] || '',
                if_number: (row[columnMap.if_number] || '').trim(),
                customer_code: code || null,
                customer_name: name || 'ลูกค้าทั่วไป',
                shipping_address: (row[columnMap.shipping_address] || '').trim(),
                item_name: (row[columnMap.item_name] || '').trim(),
                qty: parseInt(row[columnMap.qty]) || 1,
            };
        }).filter(r => r.if_number && r.item_name && r.etd_date);

        // Group by (if_number, item_name) and sum qty
        const consolidatedMap = new Map();
        for (const row of mapped) {
            const key = `${row.if_number}::${row.item_name}`;
            if (consolidatedMap.has(key)) {
                consolidatedMap.get(key).qty += row.qty;
            } else {
                consolidatedMap.set(key, { ...row });
            }
        }
        return Array.from(consolidatedMap.values());
    }, [parsedData, columnMap, isMapValid]);

    // Preview data with mapped columns
    const previewRows = useMemo(() => {
        return processedRows.slice(0, 10);
    }, [processedRows]);

    const BATCH_SIZE = 100;

    const handleImport = async () => {
        if (!isMapValid) return;
        setImporting(true);
        setStep('importing');

        try {
            if (processedRows.length === 0) {
                throw new Error('ไม่พบข้อมูลของแถมที่สามารถนำเข้าได้');
            }

            const rowsToImport = processedRows.map(row => ({
                ...row,
                status: 'pending',
                created_by: user?.id || null,
            }));

            const totalBatches = Math.ceil(rowsToImport.length / BATCH_SIZE);
            let importedCount = 0;

            for (let i = 0; i < totalBatches; i++) {
                const batch = rowsToImport.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                setImportResult({ progress: `Batch ${i + 1}/${totalBatches}`, pct: Math.round(((i + 1) / totalBatches) * 100) });

                // Upsert to Supabase
                const { data, error } = await supabase
                    .from('premium_memos')
                    .upsert(batch, { onConflict: 'if_number,item_name' })
                    .select();

                if (error) throw error;
                importedCount += data.length;
            }

            setImportResult({
                total_rows: rowsToImport.length,
                success_count: importedCount,
                errors_count: rowsToImport.length - importedCount
            });
            setStep('done');
            toast.success(`นำเข้าของแถมสำเร็จทั้งหมด ${importedCount} รายการ!`);
            onSuccess?.();
        } catch (err) {
            console.error('Import premium memos error:', err);
            toast.error('การนำเข้าล้มเหลว: ' + err.message);
            setStep('preview');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const template = 'ETD Date,IF Number,Ship to Customer,Shipping Address,Item Name,Quantity in Transaction Units\n2/7/2026,IFS-DS-260600901,CDOZ000975 บริษัท ยูเนียนเปเปอร์คาร์ตอนส์ จำกัด (สำนักงานใหญ่),เลขที่ 4 ซ.เอกชัย 78 แขวงคลองบางพราน เขตบางบอน กรุงเทพมหานคร 10150,Premium : พัดลมพกพา (สีเขียว) P.24,3\n';
        const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'premium_import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        if (importing) return;
        setFile(null);
        setParsedData([]);
        setHeaders([]);
        setStep('upload');
        setImportResult(null);
        setColumnMap({ etd_date: '', if_number: '', customer: '', shipping_address: '', item_name: '', qty: '' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">นำเข้าข้อมูล Memo ของแถม</h2>
                        <p className="text-sm text-slate-500">
                            {step === 'upload' && 'เลือกไฟล์ CSV ของแถมเพื่อนำเข้าและจัดเตรียมพิมพ์ใบของแถม'}
                            {step === 'preview' && `พบข้อมูลทั้งหมด ${parsedData.length} แถว — กรุณาตั้งค่าความสอดคล้องของคอลัมน์ (Column Mapping)`}
                            {step === 'importing' && 'กำลังเขียนข้อมูลลงฐานข้อมูล...'}
                            {step === 'done' && 'การนำเข้าเสร็จสิ้น!'}
                        </p>
                    </div>
                    <button onClick={handleClose} disabled={importing} className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50">
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
                                <p className="text-sm text-slate-500 mt-1">หรือคลิกเพื่อเลือกไฟล์จากเครื่องคอมพิวเตอร์</p>
                                <input
                                    id="csv-input"
                                    type="file"
                                    accept=".csv,.txt,.xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => handleFile(e.target.files[0])}
                                />
                            </div>
                            <div className="flex justify-center">
                                <button onClick={handleDownloadTemplate} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
                                    <Download className="w-4 h-4" />
                                    ดาวน์โหลดเทมเพลตตัวอย่างไฟล์ของแถม (.csv)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Preview & Mapping */}
                    {step === 'preview' && (
                        <div className="space-y-6">
                            {/* Column Mapping */}
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-3">คอลัมน์จากไฟล์อัปโหลด</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {Object.entries(fieldLabels).map(([field, label]) => (
                                        <div key={field}>
                                            <label className="text-xs text-slate-500 font-semibold">{label}</label>
                                            <select
                                                value={columnMap[field] || ''}
                                                onChange={(e) => setColumnMap(prev => ({ ...prev, [field]: e.target.value }))}
                                                className={clsx(
                                                    "w-full mt-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                                    requiredFields.includes(field) && !columnMap[field]
                                                        ? "border-red-300 bg-red-50/50 focus:border-red-500"
                                                        : "border-slate-200 focus:border-blue-500"
                                                )}
                                            >
                                                <option value="">— เลือกคอลัมน์ —</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                {!isMapValid && (
                                    <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5 font-medium">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        กรุณาแมปคอลัมน์ที่จำเป็นทั้งหมด (มีเครื่องหมาย *) เพื่อทำการแสดงผลพรีวิว
                                    </p>
                                )}
                            </div>

                            {/* Preview Table */}
                            {isMapValid && (
                                <div>
                                    <h3 className="font-semibold text-slate-800 mb-3">
                                        ตัวอย่างข้อมูลพรีวิว (แสดงสูงสุด {Math.min(10, parsedData.length)} รายการแรก)
                                    </h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">ETD Date</th>
                                                    <th className="px-4 py-3 text-left">IF Number</th>
                                                    <th className="px-4 py-3 text-left">Customer Code</th>
                                                    <th className="px-4 py-3 text-left">Customer Name</th>
                                                    <th className="px-4 py-3 text-left">Item Name</th>
                                                    <th className="px-4 py-3 text-right">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {previewRows.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/55 transition">
                                                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{row.etd_date}</td>
                                                        <td className="px-4 py-2.5 font-mono text-xs text-slate-800 font-medium">{row.if_number}</td>
                                                        <td className="px-4 py-2.5 font-mono text-xs text-blue-600">{row.customer_code || '-'}</td>
                                                        <td className="px-4 py-2.5 max-w-[200px] truncate text-slate-700">{row.customer_name}</td>
                                                        <td className="px-4 py-2.5 max-w-[200px] truncate text-slate-700 font-medium">{row.item_name}</td>
                                                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{row.qty}</td>
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
                            <p className="text-lg font-medium text-slate-700">กำลังนำเข้าของแถม {processedRows.length} รายการ...</p>
                            {importResult?.progress && (
                                <p className="text-sm text-blue-600 mt-2 font-medium">{importResult.progress} ({importResult.pct}%)</p>
                            )}
                            <p className="text-sm text-slate-500 mt-1">กำลังบันทึกข้อมูลเพื่อความเสถียร กรุณาอย่าปิดหน้าต่างนี้</p>
                        </div>
                    )}

                    {/* Step 4: Done */}
                    {step === 'done' && importResult && (
                        <div className="text-center py-8 space-y-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <Check className="w-8 h-8 text-emerald-600" />
                             </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">นำเข้าข้อมูลสำเร็จแล้ว!</h3>
                                <p className="text-sm text-slate-500 mt-1">ข้อมูลของแถมพร้อมสำหรับการค้นหาและพิมพ์แล้ว</p>
                            </div>
                            <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">รายการที่นำเข้าสำเร็จ:</span>
                                    <span className="font-bold text-slate-800 text-lg">{importResult.success_count}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-3">
                                    <span className="text-slate-500 font-medium">จำนวนแถวทั้งหมดในไฟล์:</span>
                                    <span className="font-semibold text-slate-700">{parsedData.length} แถว</span>
                                </div>
                                {parsedData.length !== importResult.success_count && (
                                    <div className="text-xs text-amber-600 mt-2 font-medium">
                                        * ระบบรวมรายการของแถมที่ซ้ำกันเรียบร้อยแล้ว
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                    {step === 'preview' && (
                        <>
                            <button
                                onClick={() => { setStep('upload'); setFile(null); setParsedData([]); }}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
                            >
                                เลือกไฟล์ใหม่
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!isMapValid || importing}
                                className={clsx(
                                    "px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2",
                                    isMapValid ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                <FileUp className="w-4 h-4" />
                                บันทึกข้อมูล {processedRows.length} รายการ
                            </button>
                        </>
                    )}
                    {step === 'done' && (
                        <button onClick={handleClose} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                            กลับไปหน้ารายการ
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportMemoModal;
