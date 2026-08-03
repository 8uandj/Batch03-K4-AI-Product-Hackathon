'use client';

import React, { useState } from 'react';
import { EQProfile } from '../types';
import { BrainCircuit, Check, X, Loader2 } from 'lucide-react';

interface EQTestModalProps {
    isOpen: boolean;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmitEQ: (eqData: EQProfile) => void;
}

export const EQTestModal: React.FC<EQTestModalProps> = ({
    isOpen,
    isSubmitting = false,
    onClose,
    onSubmitEQ,
}) => {
    const [q1, setQ1] = useState<string>('');
    const [q2, setQ2] = useState<string>('');
    const [q3, setQ3] = useState<string>('');
    const [q4, setQ4] = useState<string>('');
    const [q5, setQ5] = useState<string>('');

    if (!isOpen) return null;

    const isValid =
        q2.trim() !== '' &&
        q3.trim() !== '' &&
        q5.trim() !== '';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || isSubmitting) return;

        onSubmitEQ({
            q1_bugHandling: q1,
            q2_taskPreference: q2,
            q3_communication: q3,
            q4_conflictResolution: q4,
            q5_feedbackHandling: q5,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-2xl shadow-cyan-950/10 flex flex-col max-h-[92vh]">
                {/* Header với Accent VinUni Red #A6192E & Navy #00205B */}
                <div className="bg-gradient-to-br from-cyan-700 via-blue-700 to-indigo-800 text-white p-5 sm:p-6 flex items-center justify-between relative shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/15 rounded-2xl text-white shadow-md ring-1 ring-white/20">
                            <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg tracking-wide">Trắc nghiệm đánh giá EQ</h3>
                            <p className="text-xs text-cyan-100">Giúp Nexus chọn cách giao việc phù hợp. Bạn có thể bỏ qua 2 câu bổ sung.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-slate-300 hover:text-white p-1.5 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content (Có scroll) */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-7 space-y-5 text-sm overflow-y-auto flex-1 bg-slate-50/60">
                    {/* Question 1 */}
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#00205B] text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
                            Khi gặp bug kĩ thuật sát hạn nộp (Deadline), bạn thường:
                        </label>
                        <div className="space-y-2 pl-7">
                            {[
                                'A - Tự tìm cách gỡ một mình trước khi hỏi',
                                'B - Báo ngay lên nhóm chat để xin hỗ trợ',
                                'C - Bình tĩnh phân tích log và hẹn nhóm họp gỡ chung',
                            ].map((option) => (
                                <label
                                    key={option}
                                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border transition ${q1 === option
                                        ? 'border-sky-600 bg-sky-50 font-medium text-sky-900'
                                        : 'border-transparent text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="q1"
                                        checked={q1 === option}
                                        onChange={() => setQ1(option)}
                                        className="accent-[#00205B]"
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Question 2 */}
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#00205B] text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
                            Bạn thích nhận task như thế nào từ AI / PM?
                        </label>
                        <div className="space-y-2 pl-7">
                            {[
                                'A - Task được chẻ rất nhỏ, rõ mục tiêu từng ngày',
                                'B - Nhận mục tiêu lớn, tự do chủ động cách triển khai',
                                'C - Cần checklist chi tiết kèm tài liệu tham khảo',
                            ].map((option) => (
                                <label
                                    key={option}
                                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border transition ${q2 === option
                                        ? 'border-sky-600 bg-sky-50 font-medium text-sky-900'
                                        : 'border-transparent text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="q2"
                                        checked={q2 === option}
                                        onChange={() => setQ2(option)}
                                        className="accent-[#00205B]"
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Question 3 */}
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#00205B] text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
                            Kênh giao tiếp ưu tiên của bạn trong làm việc nhóm:
                        </label>
                        <div className="space-y-2 pl-7">
                            {[
                                'A - Trực tiếp qua Chat / Slack',
                                'B - Họp Quick-call Google Meet 5-10 phút',
                                'C - Cập nhật qua bình luận trực tiếp trên thẻ Kanban',
                            ].map((option) => (
                                <label
                                    key={option}
                                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border transition ${q3 === option
                                        ? 'border-sky-600 bg-sky-50 font-medium text-sky-900'
                                        : 'border-transparent text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="q3"
                                        checked={q3 === option}
                                        onChange={() => setQ3(option)}
                                        className="accent-[#00205B]"
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Question 4 */}
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#00205B] text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
                            Khi có bất đồng ý kiến về kiến trúc / kỹ thuật trong nhóm, bạn sẽ:
                        </label>
                        <div className="space-y-2 pl-7">
                            {[
                                'A - Trình bày chứng cứ/benchmark kĩ để thuyết phục nhóm',
                                'B - Lắng nghe đa số và làm theo phương án chung để đảm bảo tiến độ',
                                'C - Thảo luận với Team Lead/PM để đưa ra quyết định chốt',
                            ].map((option) => (
                                <label
                                    key={option}
                                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border transition ${q4 === option
                                        ? 'border-sky-600 bg-sky-50 font-medium text-sky-900'
                                        : 'border-transparent text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="q4"
                                        checked={q4 === option}
                                        onChange={() => setQ4(option)}
                                        className="accent-[#00205B]"
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Question 5 */}
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#00205B] text-white text-xs flex items-center justify-center font-bold shrink-0">5</span>
                            Cách bạn tiếp nhận phản hồi (Feedback) & Code Review từ đồng đội:
                        </label>
                        <div className="space-y-2 pl-7">
                            {[
                                'A - Vui vẻ tiếp thu và sửa ngay theo góp ý',
                                'B - Thảo luận lại góc nhìn cá nhân trước khi quyết định refactor',
                                'C - Xem xét kĩ tổng thể hệ thống trước khi điều chỉnh code',
                            ].map((option) => (
                                <label
                                    key={option}
                                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border transition ${q5 === option
                                        ? 'border-sky-600 bg-sky-50 font-medium text-sky-900'
                                        : 'border-transparent text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="q5"
                                        checked={q5 === option}
                                        onChange={() => setQ5(option)}
                                        className="accent-[#00205B]"
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl transition font-medium text-xs"
                        >
                            Để sau
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || isSubmitting}
                            className="px-6 py-2.5 bg-[#A6192E] hover:bg-[#8B1426] disabled:opacity-50 text-white font-semibold rounded-xl shadow-md transition flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" /> Hoàn tất Hồ sơ
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
