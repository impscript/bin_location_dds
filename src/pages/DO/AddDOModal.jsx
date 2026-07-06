import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const AddDOModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        document_date: new Date().toISOString().split('T')[0],
        document_number: '',
        purchase_order_no: '',
        reference_no: '',
        customer_code: '',
        customer_name: '',
        shipping_address: '',
        product_code: '',
        item_name: '',
        unit: 'EA',
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

        if (!formData.document_date || !formData.document_number.trim() || !formData.customer_name.trim() || !formData.item_name.trim() || formData.qty <= 0) {
            toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('delivery_orders')
                .insert([{
                    document_date: formData.document_date,
                    document_number: formData.document_number.trim(),
                    purchase_order_no: formData.purchase_order_no.trim() || null,
                    reference_no: formData.reference_no.trim() || null,
                    customer_code: formData.customer_code.trim() || null,
                    customer_name: formData.customer_name.trim(),
                    shipping_address: formData.shipping_address.trim(),
                    product_code: formData.product_code.trim() || null,
                    item_name: formData.item_name.trim(),
                    unit: formData.unit.trim() || 'EA',
                    qty: formData.qty,
                    status: 'pending',
                    created_by: user?.id || null
                }])
                .select();

            if (error) throw error;

            toast.success('เพิ่มใบส่งสินค้าสำเร็จ!');
            setFormData({
                document_date: new Date().toISOString().split('T')[0],
                document_number: '',
                purchase_order_no: '',
                reference_no: '',
                customer_name: '',
                shipping_address: '',
                product_code: '',
                item_name: '',
                unit: 'EA',
                qty: 1,
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Failed to create DO:', err);
            toast.error('ไม่สามารถสร้างใบส่งสินค้าได้: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">เพิ่มใบส่งสินค้า (DO)</h2>
                        <p className="text-sm text-slate-500">กรอกข้อมูลใบส่งสินค้าใหม่เข้าระบบด้วยตนเอง</p>
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">วันที่ *</label>
                            <input
                                type="date"
                                name="document_date"
                                value={formData.document_date}
                                onChange={handleChange}
                                required
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">เลขที่ใบส่งสินค้า *</label>
                            <input
                                type="text"
                                name="document_number"
                                value={formData.document_number}
                                onChange={handleChange}
                                placeholder="เช่น DO-2607001"
                                required
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">เลขที่ใบสั่งซื้อ (PO)</label>
                            <input
                                type="text"
                                name="purchase_order_no"
                                value={formData.purchase_order_no}
                                onChange={handleChange}
                                placeholder="เช่น PO-2026-001"
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">เลขที่อ้างอิง</label>
                            <input
                                type="text"
                                name="reference_no"
                                value={formData.reference_no}
                                onChange={handleChange}
                                placeholder="เลขที่อ้างอิง (ถ้ามี)"
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div>
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

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase">สถานที่ส่ง</label>
                        <textarea
                            name="shipping_address"
                            value={formData.shipping_address}
                            onChange={handleChange}
                            placeholder="กรอกสถานที่ส่งสินค้า"
                            rows={3}
                            className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">รหัสสินค้า</label>
                            <input
                                type="text"
                                name="product_code"
                                value={formData.product_code}
                                onChange={handleChange}
                                placeholder="รหัสสินค้า (ถ้ามี)"
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">หน่วย</label>
                            <input
                                type="text"
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                placeholder="เช่น EA, BOX, PCS"
                                className="w-full mt-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">รายการสินค้า *</label>
                            <input
                                type="text"
                                name="item_name"
                                value={formData.item_name}
                                onChange={handleChange}
                                placeholder="ชื่อสินค้า"
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

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'กำลังบันทึก...' : 'บันทึกใบส่งสินค้า'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddDOModal;