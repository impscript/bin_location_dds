import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const AddMemoModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        etd_date: new Date().toISOString().split('T')[0],
        if_number: '',
        customer_code: '',
        customer_name: '',
        shipping_address: '',
        item_name: '',
        qty: 1,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'qty' ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.etd_date || !formData.if_number.trim() || !formData.customer_name.trim() || !formData.item_name.trim() || formData.qty <= 0) {
            toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('premium_memos')
                .insert([{
                    etd_date: formData.etd_date,
                    if_number: formData.if_number.trim(),
                    customer_code: formData.customer_code.trim() || null,
                    customer_name: formData.customer_name.trim(),
                    shipping_address: formData.shipping_address.trim(),
                    item_name: formData.item_name.trim(),
                    qty: formData.qty,
                    status: 'pending',
                    created_by: user?.id || null
                }])
                .select();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('เลขที่เอกสาร (IF Number) และชื่อของแถมนี้มีอยู่ในระบบแล้ว');
                }
                throw error;
            }

            toast.success('เพิ่มรายการของแถมสำเร็จ!');
            // Reset Form
            setFormData({
                etd_date: new Date().toISOString().split('T')[0],
                if_number: '',
                customer_code: '',
                customer_name: '',
                shipping_address: '',
                item_name: '',
                qty: 1,
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Failed to create manual memo:', err);
            toast.error('ไม่สามารถสร้างรายการได้: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">เพิ่มรายการ Memo ของแถม</h2>
                        <p className="text-sm text-slate-500">กรอกข้อมูลรายการของแถมใหม่เข้าระบบด้วยตนเอง</p>
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">วันที่ส่งสินค้า (ETD) *</label>
                            <input
                                type="date"
                                name="etd_date"
                                value={formData.etd_date}
                                onChange={handleChange}
                                required
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">เลขที่เอกสาร (IF Number) *</label>
                            <input
                                type="text"
                                name="if_number"
                                value={formData.if_number}
                                onChange={handleChange}
                                placeholder="เช่น IFS-DS-260600901"
                                required
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">รหัสลูกค้า</label>
                            <input
                                type="text"
                                name="customer_code"
                                value={formData.customer_code}
                                onChange={handleChange}
                                placeholder="เช่น CDOZ000975"
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">ชื่อลูกค้า *</label>
                            <input
                                type="text"
                                name="customer_name"
                                value={formData.customer_name}
                                onChange={handleChange}
                                placeholder="ชื่อบริษัท หรือ ชื่อลูกค้าเต็ม"
                                required
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase">ที่อยู่จัดส่งสินค้า</label>
                        <textarea
                            name="shipping_address"
                            value={formData.shipping_address}
                            onChange={handleChange}
                            placeholder="กรอกที่อยู่สำหรับระบุในเอกสารจัดส่ง"
                            rows={3}
                            className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">ชื่อของโปรโมชั่น/ของแถม *</label>
                            <input
                                type="text"
                                name="item_name"
                                value={formData.item_name}
                                onChange={handleChange}
                                placeholder="เช่น Premium : พัดลมพกพา (สีเขียว) P.24"
                                required
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">จำนวน *</label>
                            <input
                                type="number"
                                name="qty"
                                min="1"
                                value={formData.qty}
                                onChange={handleChange}
                                required
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4.5 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'กำลังบันทึก...' : 'บันทึกของแถม'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMemoModal;
