export const PRIVACY_COPY = {
  onboarding: "NexusAI có thể nhận diện dấu hiệu tải việc như task quá hạn, task bị kẹt lâu hoặc thường xuyên cập nhật ngoài giờ. Dữ liệu này chỉ dùng để đề xuất hỗ trợ và phân bổ công việc công bằng hơn, không dùng để theo dõi thời gian online hay đánh giá thái độ làm việc.",
  lateNightTooltip: "Đây là tín hiệu tổng hợp từ hoạt động cập nhật task, không phải thời gian online. Nexus dùng tín hiệu này để giúp PM kiểm tra workload khi cần.",
  pmDashboard: (name: string) => `${name} có tín hiệu cập nhật task ngoài khung giờ thông thường trong 7 ngày qua. Hãy hỏi xem ${name} có cần điều chỉnh workload hoặc deadline không.`,
};

export type PrivacyPreferences = { behavioralInsightsEnabled: boolean; lateNightSignalEnabled: boolean; chatAnalysisEnabled: boolean; timezone: string };

export const defaultPrivacyPreferences: PrivacyPreferences = {
  behavioralInsightsEnabled: true,
  lateNightSignalEnabled: true,
  chatAnalysisEnabled: false,
  timezone: "Asia/Ho_Chi_Minh",
};
