'use client';

import React, { useState, useRef } from 'react';
import { FileText, Sparkles, Loader2, UploadCloud, X, File as FileIcon } from 'lucide-react';
import { defaultSkillTags } from '../types';

interface CVUploaderProps {
    onProfileExtracted: (skills: string[], rawCV: string, file?: File) => void;
    onNextStep?: () => void;
}

export const CVUploader: React.FC<CVUploaderProps> = ({ onProfileExtracted, onNextStep }) => {
    const [cvText, setCvText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleSkill = (skill: string) => {
        if (selectedSkills.includes(skill)) {
            setSelectedSkills(selectedSkills.filter((s) => s !== skill));
        } else {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const handleFileSelect = (file: File) => {
        if (!file) return;
        setSelectedFile(file);

        // Nếu là file text thô, đọc nội dung trực tiếp
        if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                if (text) setCvText(text);
            };
            reader.readAsText(file);
        } else {
            // Với PDF/DOCX, ghi chú thông tin tệp và thông báo sẽ bóc tách qua Server
            setCvText((prev) => prev || `[Đã đính kèm: ${file.name} (${(file.size / 1024).toFixed(1)} KB) — AI Server sẽ tự động bóc tách nội dung PDF/DOCX]` );
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleParseCV = async () => {
        if (!cvText.trim() && selectedSkills.length === 0 && !selectedFile) return;

        setIsParsing(true);
        try {
            const formData = new FormData();
            formData.set('rawCV', cvText);
            formData.set('skills', JSON.stringify(selectedSkills));
            if (selectedFile) formData.set('file', selectedFile);

            const response = await fetch('/api/onboarding/parse-cv', {
                method: 'POST',
                body: formData,
            });
            const payload = await response.json() as {
                success?: boolean;
                rawCV?: string;
                skills?: string[];
                error?: string;
            };

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Không thể phân tích CV.');
            }

            const nextSkills = payload.skills?.length ? payload.skills : selectedSkills;
            const nextCV = payload.rawCV || cvText;
            setSelectedSkills(nextSkills);
            setCvText(nextCV);
            onProfileExtracted(nextSkills, nextCV, selectedFile || undefined);
            if (onNextStep) onNextStep();
        } catch (error) {
            console.error('[onboarding] Parse CV failed', error);
            onProfileExtracted(selectedSkills, cvText, selectedFile || undefined);
            if (onNextStep) onNextStep();
        } finally {
            setIsParsing(false);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            {/* VinUni Palette Navy Header Accent (#00205B) */}
            <div className="border-l-4 border-[#00205B] pl-4 mb-6">
                <h2 className="text-xl font-bold text-[#00205B] dark:text-blue-400 uppercase tracking-wide flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#A6192E]" />
                    Upload CV & Số hóa Năng lực
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Tải lên file CV (PDF/DOCX) hoặc dán tóm tắt kinh nghiệm để AI băm kỹ năng tự động.
                </p>
            </div>

            <div className="space-y-6">
                {/* 1. Drag & Drop Zone */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Tải lên Hồ sơ CV (PDF / DOCX / TXT)
                    </label>
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                                ? 'border-[#A6192E] bg-red-50/50 dark:bg-red-950/20 scale-[1.01]'
                                : selectedFile
                                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                                    : 'border-slate-300 dark:border-slate-700 hover:border-[#00205B] bg-slate-50/50 dark:bg-slate-800/40'
                            }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                            className="hidden"
                        />

                        {selectedFile ? (
                            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-lg">
                                        <FileIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[280px]">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {(selectedFile.size / 1024).toFixed(1)} KB • Sẵn sàng trích xuất
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile();
                                    }}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="w-12 h-12 bg-[#00205B]/10 text-[#00205B] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
                                    <UploadCloud className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Kéo thả file CV vào đây hoặc <span className="text-[#A6192E] font-semibold underline">bấm để tải lên</span>
                                </p>
                                <p className="text-xs text-slate-400">Hỗ trợ định dạng PDF, DOCX, TXT (Tối đa 10MB)</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Fast Skill Selector Tags */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Kỹ năng chuyên môn chính (Chọn nhanh)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {defaultSkillTags.map((tag) => {
                            const isSelected = selectedSkills.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleSkill(tag)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isSelected
                                            ? 'bg-[#00205B] text-white shadow-sm ring-2 ring-[#00205B]/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {isSelected ? '✓ ' : '+ '}
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Text Area Input */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Hoặc Dán Nội dung CV / Mô tả kinh nghiệm (Text thô)
                    </label>
                    <textarea
                        rows={4}
                        value={cvText}
                        onChange={(e) => setCvText(e.target.value)}
                        placeholder="Dán tóm tắt kinh nghiệm làm việc, dự án đã làm hoặc link GitHub..."
                        className="w-full p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#00205B] outline-none text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 text-sm transition"
                    />
                </div>

                {/* 4. Action Button */}
                <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> {selectedSkills.length} kỹ năng đã chọn
                    </span>

                    <button
                        type="button"
                        onClick={handleParseCV}
                        disabled={isParsing || (selectedSkills.length === 0 && !cvText.trim() && !selectedFile)}
                        className="flex items-center gap-2 bg-[#00205B] hover:bg-[#001844] text-white px-6 py-2.5 rounded-xl font-medium text-sm transition shadow-md disabled:opacity-50"
                    >
                        {isParsing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                Đang xử lý AI...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                Phân tích CV & Tiếp tục
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};