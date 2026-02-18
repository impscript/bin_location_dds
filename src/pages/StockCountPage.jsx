import { ClipboardList, Plus, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StockCountPage() {
    const { hasPermission } = useAuth();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Stock Count</h1>
                    <p className="text-sm text-slate-500 mt-1">รอบการนับสต๊อก</p>
                </div>
                {hasPermission('canCreateStockCount') && (
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition shadow-sm">
                        <Plus className="w-4 h-4" />
                        สร้างรอบนับ
                    </button>
                )}
            </div>

            {/* Empty state */}
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">ยังไม่มีรอบนับ</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                    {hasPermission('canCreateStockCount')
                        ? 'กดปุ่ม "สร้างรอบนับ" เพื่อเริ่มนับสต๊อก เลือก Zone ที่ต้องการนับ แล้วให้ทีมคลังเริ่มนับได้เลย'
                        : 'รอ Admin สร้างรอบนับก่อน จึงจะเริ่มนับได้'}
                </p>
            </div>
        </div>
    );
}
