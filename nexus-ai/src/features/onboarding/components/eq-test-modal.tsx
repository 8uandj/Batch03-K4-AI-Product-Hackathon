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
        q1.trim() !== '' &&
        q2.trim() !== '' &&
        q3.trim() !== '' &&
        q4.trim() !== '' &&
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
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header với Accent VinUni Red #A6192E & Navy #00205B */}
                <div className="bg-[#00205B] text-white p-5 flex items-center justify-between relative shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#A6192E] rounded-xl text-white shadow-md">
                            <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg tracking-wide">Trắc nghiệm đánh giá EQ</h3>
                            <p className="text-xs text-slate-300">Giúp AI phân tích độ hòa hợp & chẻ task phù hợp cho bạn</p>
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
                <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm overflow-y-auto flex-1">
                    {/* Question 1 */}
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
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
                                        ? 'border-[#00205B] bg-blue-50/50 dark:bg-blue-950/30 font-medium text-[#00205B] dark:text-blue-300'
                                        : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                        <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
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
                                        ? 'border-[#00205B] bg-blue-50/50 dark:bg-blue-950/30 font-medium text-[#00205B] dark:text-blue-300'
                                        : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                        <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
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
                                        ? 'border-[#00205B] bg-blue-50/50 dark:bg-blue-950/30 font-medium text-[#00205B] dark:text-blue-300'
                                        : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                        <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
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
                                        ? 'border-[#00205B] bg-blue-50/50 dark:bg-blue-950/30 font-medium text-[#00205B] dark:text-blue-300'
                                        : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                        <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
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
                                        ? 'border-[#00205B] bg-blue-50/50 dark:bg-blue-950/30 font-medium text-[#00205B] dark:text-blue-300'
                                        : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition font-medium text-xs"
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