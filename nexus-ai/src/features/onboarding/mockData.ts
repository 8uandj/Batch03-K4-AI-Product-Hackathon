// ============================================================================
// FILE: mockData.ts (DEV 1 - Onboarding Feature)
// NGUYÊN TẮC: Dữ liệu giả định để phục vụ ghép giao diện UI và truyền state
// cho các tính năng khác (Kanban Board của Dev 3, EQ Radar của Dev 4)
// ============================================================================

/**
 * Interface định nghĩa dữ liệu trắc nghiệm EQ (Phong cách làm việc & Hành vi)
 * Giúp AI phân tích độ hòa hợp nhóm và gợi ý phân chia công việc.
 */
export interface EQProfile {
  /** Cách xử lý khi gặp sự cố kỹ thuật sát thời hạn giao hàng */
  q1_bugHandling: string;
  /** Mức độ mong muốn chẻ nhỏ công việc (Chi tiết vs Tự do) */
  q2_taskPreference: string;
  /** Kênh và phong cách giao tiếp ưu tiên trong nhóm */
  q3_communication: string;
  /** Cách giải quyết khi bất đồng ý kiến kỹ thuật trong nhóm */
  q4_conflictResolution?: string;
  /** Cách tiếp nhận phản hồi và Code Review */
  q5_feedbackHandling?: string;
}

/**
 * Interface chuẩn cho thông tin User đầy đủ sau khi hoàn thành Onboarding
 */
export interface UserProfile {
  /** Mã định danh duy nhất của người dùng trong hệ thống */
  id: string;
  /** Họ và tên hiển thị */
  name: string;
  /** Email sinh viên / tài khoản VinUni */
  email: string;
  /** Mã nhóm dự án (Invite Code) */
  inviteCode?: string;
  /** Đường dẫn ảnh đại diện avatar */
  avatarUrl?: string;
  /** Danh sách kỹ năng chuyên môn trích xuất từ CV (Hard Skills) */
  skills: string[];
  /** Hồ sơ hành vi / EQ trắc nghiệm (Soft Skills & Work Style) */
  eqProfile: EQProfile;
  /** Thời điểm tạo hồ sơ (ISO Timestamp) */
  createdAt: string;
}

/**
 * MOCK DATA TĨNH: Dùng để test giao diện và bàn giao cho DEV 3 / DEV 4
 * Import trực tiếp vào các component khi chưa kết nối Database Supabase thật.
 */
export const mockUserProfile: UserProfile = {
  id: "usr_vin_001",
  name: "Nguyễn Văn A (Dev VinUni)",
  email: "a.nv@vinuni.edu.vn",
  inviteCode: "NEXUS-VINUNI-2026",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=VinUniDev",

  // Danh sách kỹ năng cứng mẫu để AI chẻ task tự động
  skills: [
    "Next.js",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "FastAPI",
    "Python",
    "Supabase"
  ],

  // Kết quả trắc nghiệm EQ mẫu
  eqProfile: {
    q1_bugHandling: "A - Tự tìm cách gỡ một mình trước khi hỏi",
    q2_taskPreference: "A - Task được chẻ rất nhỏ, rõ mục tiêu từng ngày",
    q3_communication: "Trực tiếp qua Chat / Slack",
    q4_conflictResolution: "A - Trình bày chứng cứ/benchmark để thuyết phục nhóm",
    q5_feedbackHandling: "A - Vui vẻ tiếp thu và sửa ngay theo góp ý"
  },

  createdAt: "2026-07-30T00:00:00.000Z"
};

/**
 * Mảng Skill gợi ý mặc định (Fallback tags)
 * Sử dụng cho giao diện chọn nhanh skill nếu file PDF CV của người dùng không trích xuất được text.
 */
export const defaultSkillTags = [
  "React",
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Python",
  "FastAPI",
  "Supabase",
  "OpenAI API",
  "UI/UX Design",
  "Git & GitHub"
];