import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, Check, AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const DataImportExport = ({ isOpen, onClose }) => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [isConfirmingClear, setIsConfirmingClear] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState('');
    const { warehouseData, clearAllData, refreshData } = useWarehouse();
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    const BATCH_SIZE = 200; // rows per RPC call to avoid statement timeout

    const handleDownloadTemplate = () => {
        const headers = ["Bin ID", "Product Code", "Product Name", "Unit", "NS Code", "NS Name", "NS SubGroup", "Quantity"];
        const sampleData = [
            ["OB_Non A1-1", "P001", "Sample Product", "PCS", "NS-001", "NS Product Name", "Stationery", "100"],
            ["OB_Non A1-2", "P002", "Another Product", "BOX", "NS-002", "NS Another Name", "General", "50"]
        ];

        const csvContent = [
            headers.join(","),
            ...sampleData.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "inventory_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const processFile = (file) => {
        if (!file) return;

        setFile(file);
        setIsValidating(true);
        setValidationErrors([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.split(/\r\n|\n/);

                // Basic CSV parser to handle quotes if necessary, but simple split for now
                // Assuming simple CSV structure as per previous valid files
                const headers = lines[0].split(',').map(h => h.trim());

                // Validate Headers
                const requiredHeaders = ["Bin ID", "Product Code", "Product Name", "Unit", "NS Code", "NS Name", "NS SubGroup", "Quantity"];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

                if (missingHeaders.length > 0) {
                    setValidationErrors([`Invalid CSV format. Missing headers: ${missingHeaders.join(', ')}`]);
                    setIsValidating(false);
                    return;
                }

                const parsedData = [];
                const errors = [];

                // Helper to safely split CSV line considering simple quotes (basic implementation)
                // For robust parsing, a library like PapaParse is recommended, but we stick to simple logic here
                // if the user's data doesn't have complex quoted commas.
                // Given the template content, we might have commas in names? 
                // Let's use a regex split or just standard split if no quotes expected.
                // The template has "Product Name" like 'QUALITY BLUE 70G. A4(500)6L 480 R/P BOX' - no commas.
                // But wait, line 145: "ซองน้ำตาล บอสตัน 6""x12"" (10:P)" -> Quotes!
                // We need a better parser or a robust regex.

                // Simple regex for CSV parsing
                const parseCSVLine = (str) => {
                    const result = [];
                    let start = 0;
                    let quote = false;
                    for (let i = 0; i < str.length; i++) {
                        if (str[i] === '"') {
                            quote = !quote;
                        } else if (str[i] === ',' && !quote) {
                            result.push(str.substring(start, i));
                            start = i + 1;
                        }
                    }
                    result.push(str.substring(start));
                    return result.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
                };

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const values = parseCSVLine(line);

                    if (values.length < requiredHeaders.length) {
                        // Skip empty lines or malformed
                        continue;
                    }

                    // Map values to keys based on header index
                    const rowData = {};
                    requiredHeaders.forEach((header, index) => {
                        const headerIndex = headers.indexOf(header);
                        rowData[header] = values[headerIndex];
                    });

                    const binId = rowData["Bin ID"];

                    const cleanBinId = binId ? binId.trim() : "";
                    let binError = null;

                    if (!cleanBinId) {
                        binError = `Row ${i + 1}: Missing Bin ID`;
                    }

                    if (binError) errors.push(binError);

                    if (!binError) {
                        parsedData.push({
                            binId: cleanBinId,
                            productCode: rowData["Product Code"],
                            productName: rowData["Product Name"],
                            unit: rowData["Unit"],
                            nsCode: rowData["NS Code"],
                            nsName: rowData["NS Name"],
                            nsSubGroup: rowData["NS SubGroup"],
                            quantity: rowData["Quantity"]
                        });
                    }
                }

                if (errors.length > 0) {
                    setValidationErrors(errors);
                } else {
                    setParsedData(parsedData);
                }
            } catch (err) {
                console.error(err);
                setValidationErrors(["Error parsing file. Please ensure it is a valid CSV."]);
            } finally {
                setIsValidating(false);
            }
        };
        reader.onerror = () => {
            setValidationErrors(["Error reading file."]);
            setIsValidating(false);
        };
        reader.readAsText(file);
    };

    const handleFileUpload = (e) => {
        processFile(e.target.files[0]);
    };

    // Drag and Drop Handlers
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "text/csv") {
            processFile(droppedFile);
        } else if (droppedFile) {
            toast.error("Please upload a valid CSV file.");
        }
    };

    const handleConfirmImport = async () => {
        if (parsedData.length === 0 || validationErrors.length > 0) return;

        setIsImporting(true);
        try {
            // Map parsed data to the format expected by upsert_inventory_csv
            const rows = parsedData.map(row => ({
                product_code: (row.productCode || '').trim(),
                product_name: (row.productName || '').trim(),
                ns_code: (row.nsCode || '').trim(),
                ns_name: (row.nsName || '').trim(),
                bin_code: (row.binId || '').trim(),
                qty: parseInt(row.quantity) || 0,
                unit: (row.unit || 'EA').trim(),
            })).filter(r => r.product_code && r.bin_code);

            // Process in batches to avoid statement timeout
            const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
            let totalResult = { products_created: 0, products_updated: 0, bins_created: 0, inventory_updated: 0, errors_count: 0 };

            for (let i = 0; i < totalBatches; i++) {
                const batch = rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                setImportProgress(`batch ${i + 1}/${totalBatches} (${Math.min((i + 1) * BATCH_SIZE, rows.length)}/${rows.length} แถว)`);

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

            await refreshData();

            // Reset and close
            setFile(null);
            setParsedData([]);
            setValidationErrors([]);
            setImportProgress('');
            onClose();
            toast.success(`นำเข้าสำเร็จ! ${totalResult.products_created} สินค้าใหม่, ${totalResult.products_updated} อัพเดท, ${totalResult.inventory_updated} inventory`);
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Import ล้มเหลว: ' + err.message);
        } finally {
            setIsImporting(false);
            setImportProgress('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-slate-900 flex justify-between items-center" id="modal-title">
                                    Inventory Data Import/Export
                                    <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                                        <X className="h-6 w-6" />
                                    </button>
                                </h3>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Download Section */}
                                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                        <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                            <Download className="h-5 w-5 text-blue-500" />
                                            1. Download Template
                                        </h4>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Get the CSV template with the correct headers to prepare your data.
                                        </p>
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full"
                                        >
                                            Download .CSV Template
                                        </button>
                                    </div>

                                    {/* Clear Data Section */}
                                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                                            <Trash2 className="h-5 w-5" />
                                            Reset Data
                                        </h4>
                                        <p className="text-sm text-red-600 mb-4">
                                            Clear all current data to start fresh.
                                        </p>

                                        {!isConfirmingClear ? (
                                            <button
                                                onClick={() => setIsConfirmingClear(true)}
                                                disabled={isClearing}
                                                className="inline-flex justify-center py-2 px-4 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-full"
                                            >
                                                Clear All Data
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            setIsClearing(true);
                                                            await clearAllData();
                                                            setIsConfirmingClear(false);
                                                            onClose();
                                                            toast.success("ล้างข้อมูลทั้งหมดสำเร็จ!");
                                                        } catch (err) {
                                                            console.error('Clear data error:', err);
                                                            toast.error('ล้างข้อมูลล้มเหลว: ' + err.message);
                                                        } finally {
                                                            setIsClearing(false);
                                                        }
                                                    }}
                                                    disabled={isClearing}
                                                    className="inline-flex justify-center items-center gap-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-full disabled:opacity-50"
                                                >
                                                    {isClearing && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    {isClearing ? 'กำลังล้างข้อมูล...' : 'ยืนยันล้างข้อมูล?'}
                                                </button>
                                                <button
                                                    onClick={() => setIsConfirmingClear(false)}
                                                    disabled={isClearing}
                                                    className="inline-flex justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50"
                                                >
                                                    ยกเลิก
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Section (Drop Zone) */}
                                    <div
                                        className={`border-2 border-dashed rounded-lg p-4 transition-colors duration-200 ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50'
                                            }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                            <Upload className={`h-5 w-5 ${isDragging ? 'text-emerald-600' : 'text-emerald-500'}`} />
                                            2. Upload Data
                                        </h4>
                                        <p className="text-sm text-slate-500 mb-4">
                                            {isDragging ? 'Drop CSV file here...' : 'Drag & drop CSV file or click to select'}
                                        </p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept=".csv"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="inline-flex justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full"
                                        >
                                            Select CSV File
                                        </button>
                                    </div>
                                </div>

                                {/* Preview & Validation */}
                                {file && (
                                    <div className="mt-6 border-t border-slate-200 pt-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-slate-400" />
                                                File Preview: <span className="text-slate-500 font-normal">{file.name}</span>
                                            </h4>

                                            {validationErrors.length === 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <Check className="h-3 w-3 mr-1" /> Validated ({parsedData.length} records)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <AlertTriangle className="h-3 w-3 mr-1" /> {validationErrors.length} Issues Found
                                                </span>
                                            )}
                                        </div>

                                        {/* Validation Errors */}
                                        {validationErrors.length > 0 && (
                                            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 max-h-40 overflow-y-auto">
                                                <div className="flex">
                                                    <div className="flex-shrink-0">
                                                        <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                                    </div>
                                                    <div className="ml-3">
                                                        <h3 className="text-sm font-medium text-red-800">Import Errors</h3>
                                                        <div className="mt-2 text-sm text-red-700">
                                                            <ul className="list-disc pl-5 space-y-1">
                                                                {validationErrors.map((err, idx) => (
                                                                    <li key={idx}>{err}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Data Table Preview */}
                                        {parsedData.length > 0 && (
                                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                                <div className="max-h-60 overflow-y-auto">
                                                    <table className="min-w-full divide-y divide-gray-300">
                                                        <thead className="bg-gray-50 sticky top-0">
                                                            <tr>
                                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin ID</th>
                                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Code</th>
                                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NS Code</th>
                                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NS Name</th>
                                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NS SubGroup</th>
                                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {parsedData.slice(0, 100).map((row, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">{row.binId}</td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{row.productCode}</td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={row.productName}>{row.productName}</td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{row.unit}</td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{row.nsCode}</td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={row.nsName}>{row.nsName}</td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{row.nsSubGroup}</td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 font-bold">{row.quantity}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {parsedData.length > 100 && (
                                                    <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t border-gray-200">
                                                        Showing first 100 of {parsedData.length} records
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-all ${validationErrors.length > 0 || !file || isImporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                }`}
                            onClick={handleConfirmImport}
                            disabled={validationErrors.length > 0 || !file || isImporting}
                        >
                            {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isImporting ? `กำลังนำเข้า ${importProgress || '...'}` : 'Import Data'}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataImportExport;
