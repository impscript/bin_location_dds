import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Printer, ArrowLeft, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

const DOPrint = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const ids = new URLSearchParams(location.search).get('ids')?.split(',').filter(Boolean) || [];

    useEffect(() => {
        const fetchOrders = async () => {
            if (ids.length === 0) {
                toast.error('ไม่พบเลขที่ใบส่งสินค้าที่ต้องการพิมพ์');
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('delivery_orders')
                    .select('*')
                    .in('id', ids)
                    .order('document_date', { ascending: false });

                if (error) throw error;
                
                // Group by document_number
                const grouped = {};
                (data || []).forEach(item => {
                    if (!grouped[item.document_number]) {
                        grouped[item.document_number] = [];
                    }
                    grouped[item.document_number].push(item);
                });
                
                // Convert to array of groups
                const orderGroups = Object.values(grouped);
                setOrders(orderGroups);

                const pendingIds = (data || [])
                    .filter(m => m.status === 'pending')
                    .map(m => m.id);

                if (pendingIds.length > 0) {
                    await supabase
                        .from('delivery_orders')
                        .update({
                            status: 'printed',
                            printed_at: new Date().toISOString(),
                            printed_by: user?.id || null
                        })
                        .in('id', pendingIds);
                }
            } catch (err) {
                console.error('Failed to load orders for print:', err);
                toast.error('โหลดข้อมูลพิมพ์ไม่สำเร็จ: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [location.search]);

    const handlePrint = () => {
        window.print();
    };

    const formatDateThai = (dateStr) => {
        if (!dateStr) return '';
        try {
            const [y, m, d] = dateStr.split('-');
            const thaiYear = parseInt(y) + 543;
            return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${thaiYear}`;
        } catch (e) {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400 mb-4" />
                <p className="text-sm font-medium">กำลังเตรียมเอกสารสำหรับพิมพ์...</p>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <FileText className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">ไม่พบเอกสารใบส่งสินค้า</h3>
                <button
                    onClick={() => navigate('/do')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    กลับไปหน้ารายการ
                </button>
            </div>
        );
    }

    const PART_CONFIGS = [
        {
            title: 'ต้นฉบับใบส่งสินค้า',
            subtitle: '',
            colorClass: 'text-rose-600 border-rose-600 bg-rose-50/20',
            badgeColor: 'border-rose-600 text-rose-600 bg-rose-50',
            index: 1
        },
        {
            title: 'สำเนาลูกค้า',
            subtitle: '',
            colorClass: 'text-emerald-600 border-emerald-600 bg-emerald-50/20',
            badgeColor: 'border-emerald-600 text-emerald-600 bg-emerald-50',
            index: 2
        },
        {
            title: 'สำเนาบัญชี',
            subtitle: '',
            colorClass: 'text-blue-600 border-blue-600 bg-blue-50/20',
            badgeColor: 'border-blue-600 text-blue-600 bg-blue-50',
            index: 3
        },
        {
            title: 'สำเนาขนส่ง',
            subtitle: '',
            colorClass: 'text-amber-600 border-amber-600 bg-amber-50/20',
            badgeColor: 'border-amber-600 text-amber-600 bg-amber-50',
            index: 4
        },
        {
            title: 'สำเนาคลัง',
            subtitle: '',
            colorClass: 'text-slate-600 border-slate-600 bg-slate-50/20',
            badgeColor: 'border-slate-600 text-slate-600 bg-slate-50',
            index: 5
        }
    ];

    const renderPartContent = (orderGroup, part, combinedMode) => {
        const textSize = combinedMode ? 'text-xs' : 'text-sm';
        const headerSize = combinedMode ? 'text-lg' : 'text-2xl';
        const padding = combinedMode ? 'p-3' : 'p-6';
        const spacing = combinedMode ? 'space-y-2' : 'space-y-4';

        // orderGroup is an array of orders with same document_number
        const firstOrder = orderGroup[0];
        const totalQty = orderGroup.reduce((sum, item) => sum + item.qty, 0);

        // Parse customer code and name dynamically
        const rawCustomerName = firstOrder.customer_name || '';
        const custMatch = rawCustomerName.trim().match(/^([A-Z0-9]+)\s+(.+)$/);
        const displayCustomerCode = custMatch ? custMatch[1] : (firstOrder.customer_code || 'N/A');
        const displayCustomerName = custMatch ? custMatch[2] : rawCustomerName;

        return (
            <div className={`w-full h-full ${padding} ${spacing} bg-white font-['Sarabun']`}>
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-2 border-black pb-2">
                    {/* Left: Logo only */}
                    <div className="flex items-center">
                        <div className="relative w-40 h-20">
                            <img 
                                src="/images/dds-logo.png" 
                                alt="DDS Logo"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <div className="bg-blue-600 text-white font-bold py-3 px-4 rounded hidden">
                                <div className="text-lg">Double A</div>
                                <div className="text-3xl font-black">DDS</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right: Document Type */}
                    <div className={`${part.badgeColor} px-4 py-2 rounded font-bold text-center`}>
                        <div className="text-sm">{part.title}</div>
                    </div>
                </div>

                {/* Company Name & Address */}
                <div className="text-sm font-bold text-slate-800 mt-1">
                    บริษัท ดั๊บเบิ้ล เอ ดิจิตอล ซินเนอร์จี จำกัด
                </div>
                <div className="text-xs text-gray-600">
                    เลขที่ 47/2 หมู่ที่ 1 แขวงพระโขนง เขตคลองเตย จังหวัด กรุงเทพมหานคร 10110
                </div>
                <div className="text-xs text-gray-600 mb-2">
                    เลขประจำตัวผู้เสียภาษี 0245547000297 (สาขาที่ 2)
                </div>

                {/* Info Boxes Row */}
                <div className="flex gap-4 mb-4">
                    {/* Left Yellow Boxes */}
                    <div className="flex gap-2">
                        <div className="bg-yellow-200 px-3 py-1 min-w-[120px]">
                            <div className="text-xs font-bold text-red-600">รหัสลูกค้า</div>
                            <div className="text-base font-bold">{displayCustomerCode}</div>
                        </div>
                        <div className="bg-yellow-200 px-3 py-1 min-w-[240px]">
                            <div className="text-xs font-bold text-red-600">สถานที่ส่ง</div>
                            <div className="text-base font-semibold">{displayCustomerName}</div>
                            <div className="text-xs">{firstOrder.shipping_address || ''}</div>
                        </div>
                    </div>
                    
                    {/* Right Yellow Boxes */}
                    <div className="flex gap-2 ml-auto">
                        <div className="bg-yellow-200 px-3 py-1 min-w-[80px]">
                            <div className="text-xs font-bold text-red-600">เลขที่</div>
                            <div className="text-sm font-bold">{firstOrder.document_number}</div>
                        </div>
                        <div className="bg-yellow-200 px-3 py-1 min-w-[80px]">
                            <div className="text-xs font-bold text-red-600">วันที่</div>
                            <div className="text-sm">{formatDateThai(firstOrder.document_date)}</div>
                        </div>
                    </div>
                </div>

                {/* Plant Info */}
                <div className="text-sm mb-3">
                    <span className="font-bold">Plant</span>
                    <span className="ml-8">DS | WH_PKN: PKN_OB [DS]</span>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-black mb-4 do-print-table table-fixed">
                    <thead className="bg-green-600 text-white">
                        <tr>
                            <th className="border border-black p-2 text-xs font-bold w-[22%]">เลขที่ใบสั่งซื้อ</th>
                            <th className="border border-black p-2 text-xs font-bold w-[20%]">รหัสสินค้า</th>
                            <th className="border border-black p-2 text-xs font-bold w-[42%]">รายการสินค้า</th>
                            <th className="border border-black p-2 text-xs font-bold w-[8%]">หน่วย</th>
                            <th className="border border-black p-2 text-xs font-bold w-[8%]">จำนวน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderGroup.map((item, idx) => (
                            <tr key={idx}>
                                <td className="border border-black p-2 text-sm">{item.purchase_order_no || ''}</td>
                                <td className="border border-black p-2 text-sm font-mono">{item.product_code || ''}</td>
                                <td className="border border-black p-2 text-sm">{item.item_name}</td>
                                <td className="border border-black p-2 text-sm text-center">{item.unit || 'EA'}</td>
                                <td className="border border-black p-2 text-sm text-center font-bold">{item.qty}</td>
                            </tr>
                        ))}
                        {/* Additional empty rows if needed */}
                        {Array.from({ length: Math.max(0, (combinedMode ? 2 : 4) - orderGroup.length) }).map((_, idx) => (
                            <tr key={`empty-${idx}`}>
                                <td className="border border-black p-2 h-8">&nbsp;</td>
                                <td className="border border-black p-2">&nbsp;</td>
                                <td className="border border-black p-2">&nbsp;</td>
                                <td className="border border-black p-2">&nbsp;</td>
                                <td className="border border-black p-2">&nbsp;</td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr>
                            <td colSpan="4" className="border border-black p-2 text-center font-bold">Total</td>
                            <td className="border border-black p-2 text-center font-bold">{totalQty}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Reference Information */}
                <div className="space-y-2 mb-4">
                    <div className="flex">
                        <span className="font-bold w-32">เลขที่อ้างอิง :</span>
                        <span>{firstOrder.reference_no || ''}</span>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-32">เลขที่ Invoice/Tax Invoice :</span>
                        <span></span>
                    </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-2 mb-6">
                    <div className="flex">
                        <span className="font-bold w-32">หมายเหตุผู้ส่ง :</span>
                        <div className="flex-1 border-b border-dotted border-gray-400 min-h-[20px]"></div>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-32">หมายเหตุผู้รับ :</span>
                        <div className="flex-1 border-b border-dotted border-gray-400 min-h-[20px]"></div>
                    </div>
                </div>

                {/* Signature Section */}
                <div className="flex justify-between mt-auto">
                    {/* Left Signature */}
                    <div className="text-center">
                        <div className="w-40 h-16 border-b border-dotted border-gray-400 mb-2 relative">
                            <img 
                                src="/images/signature.png" 
                                alt="Signature"
                                className="absolute bottom-0 right-2 h-12 w-auto object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                        <div className="text-sm font-bold">ผู้ส่งสินค้า</div>
                    </div>
                    
                    {/* Right Signature */}
                    <div className="text-center">
                        <div className="w-40 h-16 border-b border-dotted border-gray-400 mb-2"></div>
                        <div className="text-sm font-bold">ผู้รับสินค้า</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-800 p-0 md:p-6 print:p-0 print:bg-white">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700;800&display=swap');
                
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        font-family: 'Sarabun', 'TH SarabunPSK', Arial, sans-serif !important;
                    }
                    * {
                        font-family: 'Sarabun', 'TH SarabunPSK', Arial, sans-serif !important;
                    }
                    .print-page {
                        height: 265mm !important;
                        box-sizing: border-box !important;
                        page-break-after: always !important;
                        page-break-inside: avoid !important;
                    }
                    .print-page:last-child {
                        page-break-after: avoid !important;
                    }
                    table.do-print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: fixed !important;
                    }
                    table.do-print-table th,
                    table.do-print-table td {
                        border: 1px solid black !important;
                        padding: 4px 8px !important;
                        font-size: 11px !important;
                        word-break: break-word !important;
                        white-space: normal !important;
                    }
                    table.do-print-table th:nth-child(1),
                    table.do-print-table td:nth-child(1) {
                        width: 22% !important;
                    }
                    table.do-print-table th:nth-child(2),
                    table.do-print-table td:nth-child(2) {
                        width: 20% !important;
                    }
                    table.do-print-table th:nth-child(3),
                    table.do-print-table td:nth-child(3) {
                        width: 42% !important;
                    }
                    table.do-print-table th:nth-child(4),
                    table.do-print-table td:nth-child(4) {
                        width: 8% !important;
                    }
                    table.do-print-table th:nth-child(5),
                    table.do-print-table td:nth-child(5) {
                        width: 8% !important;
                    }
                    table.do-print-table th {
                        background-color: #16a34a !important;
                        color: white !important;
                        font-weight: bold !important;
                    }
                    .bg-yellow-200 {
                        background-color: #fef08a !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .text-red-600 {
                        color: #dc2626 !important;
                    }
                    .bg-green-600 {
                        background-color: #16a34a !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .border-black {
                        border-color: black !important;
                    }
                }
            `}</style>

            {/* Toolbar */}
            <div className="max-w-[800px] mx-auto mb-6 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-md gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                        title="ย้อนกลับ"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800 text-sm md:text-base">พิมพ์ใบส่งสินค้า (DO)</h1>
                        <p className="text-xs text-slate-500">จำนวนทั้งหมด {orders.length} เอกสาร ({orders.length * 5} แผ่นพิมพ์)</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-md"
                    >
                        <Printer className="w-4 h-4" />
                        พิมพ์เอกสาร
                    </button>
                </div>
            </div>

            {/* Printable Pages */}
            <div className="max-w-[800px] mx-auto space-y-8 print:space-y-0 print:w-full print:max-w-none">
                {orders.map((orderGroup, groupIdx) => {
                    const firstOrder = orderGroup[0];
                    const groupKey = `${firstOrder.document_number}-${groupIdx}`;
                    
                    return (
                        <React.Fragment key={groupKey}>
                            {PART_CONFIGS.map((part, partIndex) => (
                                <div
                                    key={`${groupKey}-${part.index}`}
                                    className="bg-white border border-slate-200 shadow-lg rounded-none p-4 print:p-0 print:border-none print:shadow-none w-full min-h-[1120px] print:min-h-0 print-page"
                                >
                                    {renderPartContent(orderGroup, part, false)}
                                </div>
                            ))}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default DOPrint;