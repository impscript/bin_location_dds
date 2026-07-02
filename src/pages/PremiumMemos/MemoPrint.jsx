import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Printer, ArrowLeft, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

const MemoPrint = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [memos, setMemos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCombined, setIsCombined] = useState(true); // Toggle mode: single page vs separate pages

    const ids = new URLSearchParams(location.search).get('ids')?.split(',').filter(Boolean) || [];

    useEffect(() => {
        const fetchMemos = async () => {
            if (ids.length === 0) {
                toast.error('ไม่พบเลขที่ Memo ที่ต้องการพิมพ์');
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('premium_memos')
                    .select('*')
                    .in('id', ids)
                    .order('etd_date', { ascending: false });

                if (error) throw error;
                setMemos(data || []);

                // Update status to 'printed' for those that are still 'pending'
                const pendingIds = (data || [])
                    .filter(m => m.status === 'pending')
                    .map(m => m.id);

                if (pendingIds.length > 0) {
                    await supabase
                        .from('premium_memos')
                        .update({ 
                            status: 'printed', 
                            printed_at: new Date().toISOString(),
                            printed_by: user?.id || null
                        })
                        .in('id', pendingIds);
                }
            } catch (err) {
                console.error('Failed to load memos for print:', err);
                toast.error('โหลดข้อมูลพิมพ์ไม่สำเร็จ: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMemos();
    }, [location.search]);

    const handlePrint = () => {
        window.print();
    };

    const formatDateThai = (dateStr) => {
        if (!dateStr) return '';
        try {
            const [y, m, d] = dateStr.split('-');
            return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
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

    if (memos.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <FileText className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">ไม่พบเอกสารของแถม</h3>
                <button
                    onClick={() => navigate('/premium-memos')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    กลับไปหน้ารายการ
                </button>
            </div>
        );
    }

    // Config for the 3 parts of the delivery memo
    const PART_CONFIGS = [
        {
            title: 'ส่วนที่ 1 สำหรับบริษัทฯ',
            subtitle: '(นำกลับ)',
            colorClass: 'text-rose-600 border-rose-600 bg-rose-50/20',
            badgeColor: 'border-rose-600 text-rose-600 bg-rose-50',
            dotColor: 'border-rose-300',
            noteColor: 'text-rose-500',
            index: 1
        },
        {
            title: 'ส่วนที่ 2 สำหรับ',
            subtitle: '( ลูกค้า )',
            colorClass: 'text-emerald-600 border-emerald-600 bg-emerald-50/20',
            badgeColor: 'border-emerald-600 text-emerald-600 bg-emerald-50',
            dotColor: 'border-emerald-300',
            noteColor: 'text-emerald-500',
            index: 2
        },
        {
            title: 'ส่วนที่ 3 สำหรับคนรถ',
            subtitle: '(นำกลับ)',
            colorClass: 'text-blue-600 border-blue-600 bg-blue-50/20',
            badgeColor: 'border-blue-600 text-blue-600 bg-blue-50',
            dotColor: 'border-blue-300',
            noteColor: 'text-blue-500',
            index: 3
        }
    ];

    // Helper to render the body of a specific copy (reusable across modes)
    const renderPartContent = (memo, part, partIdx, combinedMode) => {
        const textTitle = combinedMode ? 'text-base' : 'text-xl';
        const textSubtitle = combinedMode ? 'text-[8px]' : 'text-[10px]';
        const gapGrid = combinedMode ? 'gap-2' : 'gap-3';
        const paddingCell = combinedMode ? 'px-2 py-1.5' : 'px-3 py-3';
        const textLabel = combinedMode ? 'text-[8px]' : 'text-[10px]';
        const textValue = combinedMode ? 'text-[10px]' : 'text-xs';
        const textSign = combinedMode ? 'text-[9px]' : 'text-[11px]';
        const paddingBadge = combinedMode ? 'px-2 py-1 text-[9px]' : 'px-4 py-2.5 text-sm';
        const paddingChecklist = combinedMode ? 'pb-1' : 'pb-8';

        return (
            <div className="flex-1 flex w-full h-full">
                {/* Left Panel (Details & Item Table) - 68% Width */}
                <div className="w-[68%] pr-6 flex flex-col justify-between h-full py-1">
                    <div className="space-y-2">
                        {/* Top Title/Address */}
                        <div className="flex justify-between items-start border-b border-slate-200 pb-1">
                            <div className="space-y-0.5">
                                <h2 className={`font-bold ${textTitle} text-slate-800 tracking-wide`}>ของโปรโมชั่น สำหรับลูกค้า</h2>
                                <p className={`${textSubtitle} text-slate-400 font-medium leading-none`}>
                                    47/2 หมู่ 1 แขวงพระโขนง เขตคลองเตย กรุงเทพมหานคร 10260 โทร.02-659-1234 # 4 แฟกซ์ 02-659-1399
                                </p>
                            </div>
                        </div>

                        {/* Shipping and Doc details */}
                        <div className={`grid grid-cols-12 ${gapGrid} text-[10px]`}>
                            <div className="col-span-8 bg-slate-50 border border-slate-200 rounded-lg p-1.5 leading-normal">
                                <span className={`font-semibold text-slate-400 block ${textLabel} uppercase leading-none`}>สถานที่ส่ง</span>
                                <span className={`font-bold text-slate-800 mt-0.5 block leading-none ${textValue}`}>
                                    {memo.customer_code ? `${memo.customer_code} ` : ''}{memo.customer_name}
                                </span>
                                <p className={`text-slate-600 mt-0.5 ${combinedMode ? 'text-[9px]' : 'text-[11px]'} truncate`} title={memo.shipping_address}>
                                    {memo.shipping_address || 'ไม่มีข้อมูลที่อยู่จัดส่ง'}
                                </p>
                            </div>
                            <div className="col-span-4 flex flex-col justify-between gap-1">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 flex-1 flex flex-col justify-center leading-none">
                                    <span className={`font-semibold text-slate-400 block ${textLabel} uppercase`}>เลขที่เอกสาร</span>
                                    <span className={`font-bold text-blue-600 ${textValue} mt-0.5 block font-mono`}>{memo.if_number}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 flex-1 flex flex-col justify-center leading-none">
                                    <span className={`font-semibold text-slate-400 block ${textLabel} uppercase`}>วันที่ส่งสินค้า</span>
                                    <span className={`font-bold text-slate-800 ${textValue} mt-0.5 block`}>{formatDateThai(memo.etd_date)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-[10px] premium-print-table">
                                <thead className="bg-slate-100 text-[8px] text-slate-500 font-bold uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="px-2 py-1 text-center w-8 border-r border-slate-200">ลำดับ</th>
                                        <th className="px-2 py-1 text-left border-r border-slate-200">รายการ</th>
                                        <th className="px-2 py-1 text-center w-20">จำนวน (EA)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 font-medium">
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-2 py-1 text-center border-r border-slate-200 font-mono text-slate-500">1</td>
                                        <td className={`border-r border-slate-200 text-slate-800 font-semibold ${paddingCell}`}>{memo.item_name}</td>
                                        <td className={`text-center font-bold text-slate-800 bg-blue-50/15 ${paddingCell}`}>{memo.qty}</td>
                                    </tr>
                                    {!combinedMode && Array.from({ length: 2 }).map((_, idx) => (
                                        <tr key={idx} className="h-10">
                                            <td className="border-r border-slate-200"></td>
                                            <td className="border-r border-slate-200"></td>
                                            <td></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Sign-off (Receiver and Sender) */}
                    <div className={`${combinedMode ? 'space-y-2 mt-2' : 'space-y-6 mt-8'}`}>
                        <div className={`grid grid-cols-2 gap-4 ${textSign} text-slate-600`}>
                            <div className="space-y-0.5">
                                <p>ลงชื่อ .............................................................. ผู้รับ</p>
                                <p>(&nbsp;&nbsp;..................................................................&nbsp;&nbsp;)</p>
                                <p>{combinedMode ? 'ตำแหน่ง ............................. วันที่ .............................' : 'ตำแหน่ง ...........................................................'}</p>
                                {!combinedMode && <p>วันที่ ................................................................</p>}
                            </div>
                            <div className="space-y-0.5">
                                <p>ลงชื่อ .............................................................. ผู้ส่ง</p>
                                <p>(&nbsp;&nbsp;..................................................................&nbsp;&nbsp;)</p>
                                <p>วันที่ ................................................................</p>
                            </div>
                        </div>
                        {/* Note footer */}
                        <div className={`border-t border-slate-200 pt-1 flex justify-between items-center ${combinedMode ? 'text-[8px]' : 'text-[10px]'} text-slate-400 font-medium`}>
                            <span>* มีปัญหาด้านการจัดส่งสินค้าติดต่อ คุณสมใจ 085-835-3519</span>
                            <span className="font-mono text-[7px]">DDS Premium Set</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel (Stub copy designation) - 32% Width */}
                <div className="w-[32%] pl-6 flex flex-col justify-between py-1 text-right">
                    <div className="space-y-2">
                        {/* Company Title */}
                        <div className="text-right">
                            <h3 className="font-bold text-slate-800 text-[10px] tracking-tight">บริษัท ดับเบิ้ล เอ ดิจิตอล ซินเนอร์จี จำกัด</h3>
                            <p className="text-[7px] text-slate-400 leading-normal">
                                โทร.02-659-1234 # 4 แฟกซ์ 02-659-1399
                            </p>
                        </div>

                        {/* Badge/Indication */}
                        <div className="flex justify-end">
                            <div className={`border rounded-lg font-bold text-center shadow-sm max-w-[170px] leading-tight ${part.badgeColor} ${part.colorClass} ${paddingBadge}`}>
                                <div>{part.title}</div>
                                <div className="mt-0.5">{part.subtitle}</div>
                            </div>
                        </div>
                    </div>

                    {/* Status Checklist / Highlight of copy */}
                    <div className={`space-y-1.5 text-left pl-2 ${paddingChecklist}`}>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block text-right leading-none mb-1">เอกสารในชุด</span>
                        {PART_CONFIGS.map((p) => {
                            const isCurrent = p.index === part.index;
                            return (
                                <div
                                    key={p.index}
                                    className={`flex items-center gap-1.5 text-[8px] font-semibold py-0.5 px-1.5 rounded border justify-end leading-none ${
                                        isCurrent
                                            ? `${p.colorClass} ${p.badgeColor}`
                                            : 'text-slate-400 border-slate-100 bg-slate-50/50'
                                    }`}
                                >
                                    <span>{p.title} {p.subtitle}</span>
                                    <div className={`w-2 h-2 rounded-full border flex items-center justify-center ${
                                        isCurrent ? 'border-current' : 'border-slate-300'
                                    }`}>
                                        {isCurrent && <div className="w-1 h-1 rounded-full bg-current"></div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-800 p-0 md:p-6 print:p-0 print:bg-white">
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: ${isCombined ? '8mm' : '15mm'};
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    /* Override global table width rules from index.css */
                    table.premium-print-table {
                        width: 100% !important;
                        table-layout: fixed !important;
                    }
                    table.premium-print-table th,
                    table.premium-print-table td {
                        width: auto !important;
                        white-space: normal !important;
                        word-break: break-word !important;
                        overflow: visible !important;
                        text-overflow: clip !important;
                    }
                    table.premium-print-table th:nth-child(1),
                    table.premium-print-table td:nth-child(1) {
                        width: 10% !important;
                    }
                    table.premium-print-table th:nth-child(2),
                    table.premium-print-table td:nth-child(2) {
                        width: 75% !important;
                    }
                    table.premium-print-table th:nth-child(3),
                    table.premium-print-table td:nth-child(3) {
                        width: 15% !important;
                    }
                }
            `}</style>

            {/* Toolbar - Hidden in Print */}
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
                        <h1 className="font-bold text-slate-800 text-sm md:text-base">พิมพ์ใบส่งของแถม</h1>
                        <p className="text-xs text-slate-500">จำนวนทั้งหมด {memos.length} เอกสาร ({memos.length * (isCombined ? 1 : 3)} แผ่นพิมพ์)</p>
                    </div>
                </div>

                {/* Print Options & Actions */}
                <div className="flex items-center gap-4">
                    {/* Toggle Layout Options */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-700">
                        <button
                            type="button"
                            onClick={() => setIsCombined(true)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg transition-all",
                                isCombined ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900 text-slate-500"
                            )}
                        >
                            รวม A4 แผ่นเดียว
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCombined(false)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg transition-all",
                                !isCombined ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900 text-slate-500"
                            )}
                        >
                            แยกพิมพ์ 3 หน้า
                        </button>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-md"
                    >
                        <Printer className="w-4 h-4" />
                        พิมพ์เอกสาร
                    </button>
                </div>
            </div>

            {/* Printable Pages Wrapper */}
            <div className="max-w-[800px] mx-auto space-y-8 print:space-y-0 print:w-full print:max-w-none">
                {memos.map((memo) => {
                    if (isCombined) {
                        return (
                            <div
                                key={memo.id}
                                className="bg-white border border-slate-200 shadow-lg rounded-none p-5 print:p-0 print:border-none print:shadow-none w-full h-[1120px] print:h-screen flex flex-col justify-between overflow-hidden print:page-break-after-always"
                                style={{ pageBreakAfter: 'always' }}
                            >
                                {PART_CONFIGS.map((part, partIdx) => (
                                    <div
                                        key={part.index}
                                        className={clsx(
                                            "relative w-full h-[32%] flex flex-col justify-between overflow-hidden py-2 border-b border-dashed border-slate-300 last:border-b-0",
                                            partIdx > 0 && "pt-3"
                                        )}
                                    >
                                        {/* Dotted Center Line (Simulate tear line) */}
                                        <div className="absolute inset-y-0 left-[68%] border-l border-dashed border-slate-300 print:border-slate-400 z-10 pointer-events-none"></div>
                                        {renderPartContent(memo, part, partIdx, true)}
                                    </div>
                                ))}
                            </div>
                        );
                    } else {
                        return (
                            <React.Fragment key={memo.id}>
                                {PART_CONFIGS.map((part, partIdx) => (
                                    <div
                                        key={part.index}
                                        className="bg-white border border-slate-200 shadow-lg rounded-none p-8 print:p-0 print:border-none print:shadow-none relative w-full h-[1120px] print:h-screen flex flex-col justify-between overflow-hidden print:page-break-after-always"
                                        style={{ pageBreakAfter: 'always' }}
                                    >
                                        {/* Dotted Center Line (Simulate tear line) */}
                                        <div className="absolute inset-y-0 left-[68%] border-l border-dashed border-slate-300 print:border-slate-400 z-10 pointer-events-none"></div>
                                        {renderPartContent(memo, part, partIdx, false)}
                                    </div>
                                ))}
                            </React.Fragment>
                        );
                    }
                })}
            </div>
        </div>
    );
};

export default MemoPrint;
