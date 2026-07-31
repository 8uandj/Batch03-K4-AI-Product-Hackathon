export type EqConfidence = "low" | "medium" | "high";
export type WorkloadRiskLevel = "low" | "moderate" | "high";

export type PersonalityAnalysis = {
  headline: string;
  summary: string;
  strengths: string[];
  watchouts: string[];
  workStyle: string;
  communicationStyle: string;
  decisionStyle: string;
  feedbackStyle: string;
  evidence: string[];
  confidence: EqConfidence;
  answeredQuestions: number;
};

export type WorkloadAnalysis = {
  score: number;
  level: WorkloadRiskLevel;
  summary: string;
  signals: string[];
  activeTasks: number;
  doingTasks: number;
  overdueTasks: number;
  staleDoingTasks: number;
  disclaimer: string;
};

export type CoachingTip = {
  title: string;
  rationale: string;
  suggestion: string;
};

export type CoachingPlan = {
  goal: string;
  tips: CoachingTip[];
  conversationStarter: string;
  actionPlan: string;
  avoid: string[];
};

export type EqAnswers = Record<string, unknown>;

export type WorkloadTask = {
  title: string;
  status: string;
  priority?: string | null;
  due_at?: string | null;
  updated_at?: string | null;
};

export function workloadRiskLevel(score: number): WorkloadRiskLevel {
  return score >= 60 ? "high" : score >= 40 ? "moderate" : "low";
}

type EqDimension =
  | "bugHandling"
  | "taskPreference"
  | "communication"
  | "conflictResolution"
  | "feedbackHandling";

type Choice = "A" | "B" | "C";

const ANSWER_KEYS: Record<EqDimension, string[]> = {
  bugHandling: ["q1_bugHandling", "bug_handling", "q1"],
  taskPreference: ["q2_taskPreference", "task_preference", "q2"],
  communication: ["q3_communication", "communication", "q3"],
  conflictResolution: ["q4_conflictResolution", "conflict_resolution", "q4"],
  feedbackHandling: ["q5_feedbackHandling", "feedback_handling", "q5"],
};

const DIMENSION_LABELS: Record<EqDimension, string> = {
  bugHandling: "Xử lý sự cố",
  taskPreference: "Nhận task",
  communication: "Giao tiếp",
  conflictResolution: "Bất đồng",
  feedbackHandling: "Feedback",
};

const FALLBACK_VALUE = "Chưa đủ dữ liệu để kết luận";

function readAnswer(answers: EqAnswers, dimension: EqDimension) {
  for (const key of ANSWER_KEYS[dimension]) {
    const value = answers[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function choiceOf(answer: string): Choice | null {
  const match = answer.trim().match(/^([ABC])(?:\s*[-–—:.)]|\s|$)/i);
  return match ? (match[1].toUpperCase() as Choice) : null;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function shortAnswer(answer: string) {
  return answer.replace(/^[ABC]\s*[-–—:.)]\s*/i, "").trim();
}

function preferenceFor(
  answers: EqAnswers,
  dimension: EqDimension,
  choices: Record<Choice, string>,
) {
  const choice = choiceOf(readAnswer(answers, dimension));
  return choice ? choices[choice] : FALLBACK_VALUE;
}

export function buildPersonalityAnalysis(answers: EqAnswers): PersonalityAnalysis {
  const dimensions = Object.keys(ANSWER_KEYS) as EqDimension[];
  const answered = dimensions
    .map((dimension) => ({
      dimension,
      answer: readAnswer(answers, dimension),
    }))
    .filter((item) => item.answer);

  const taskChoice = choiceOf(readAnswer(answers, "taskPreference"));
  const communicationChoice = choiceOf(readAnswer(answers, "communication"));
  const bugChoice = choiceOf(readAnswer(answers, "bugHandling"));
  const conflictChoice = choiceOf(readAnswer(answers, "conflictResolution"));
  const feedbackChoice = choiceOf(readAnswer(answers, "feedbackHandling"));

  const workStyle = preferenceFor(answers, "taskPreference", {
    A: "Ưa công việc được chia nhỏ, mục tiêu ngắn hạn và tiến độ nhìn thấy được",
    B: "Ưa nhận mục tiêu đầu ra cùng quyền chủ động chọn cách triển khai",
    C: "Ưa checklist rõ ràng và có tài liệu tham chiếu trước khi bắt đầu",
  });
  const communicationStyle = preferenceFor(answers, "communication", {
    A: "Ưu tiên trao đổi trực tiếp, ngắn gọn qua chat",
    B: "Ưu tiên quick-call 5–10 phút khi cần làm rõ",
    C: "Ưu tiên trao đổi có ngữ cảnh ngay trên thẻ Kanban",
  });
  const decisionStyle = preferenceFor(answers, "conflictResolution", {
    A: "Thiên về quyết định dựa trên chứng cứ và benchmark",
    B: "Thiên về đồng thuận nhóm và bảo toàn tiến độ chung",
    C: "Muốn có người chịu trách nhiệm chốt khi nhóm chưa thống nhất",
  });
  const feedbackStyle = preferenceFor(answers, "feedbackHandling", {
    A: "Sẵn sàng tiếp thu và chuyển phản hồi thành hành động nhanh",
    B: "Muốn trao đổi hai chiều để hiểu lý do trước khi thay đổi",
    C: "Muốn đánh giá tác động toàn hệ thống trước khi chỉnh sửa",
  });

  const strengths: string[] = [];
  const watchouts: string[] = [];

  if (bugChoice === "A") {
    strengths.push("Có xu hướng tự chủ và kiên trì khi xử lý sự cố");
    watchouts.push("Có thể báo blocker muộn nếu chưa thống nhất ngưỡng cần hỗ trợ");
  } else if (bugChoice === "B") {
    strengths.push("Minh bạch sớm về blocker và sẵn sàng tìm hỗ trợ");
    watchouts.push("Cần đủ ngữ cảnh khi nhờ hỗ trợ để tránh ngắt mạch làm việc của nhóm");
  } else if (bugChoice === "C") {
    strengths.push("Kết hợp phân tích dữ liệu với phối hợp nhóm khi xử lý sự cố");
    watchouts.push("Có thể mất thời gian điều phối nếu sự cố nhỏ chưa cần họp");
  }

  if (taskChoice === "A") {
    strengths.push("Dễ duy trì nhịp giao hàng với mục tiêu nhỏ, rõ ràng");
    watchouts.push("Mục tiêu quá rộng hoặc thiếu mốc kiểm tra có thể làm giảm độ rõ ràng");
  } else if (taskChoice === "B") {
    strengths.push("Phát huy tốt khi có quyền tự chủ và đầu ra rõ");
    watchouts.push("Quản lý quá chi tiết có thể làm giảm không gian chủ động");
  } else if (taskChoice === "C") {
    strengths.push("Làm việc cẩn thận khi có checklist và nguồn tham chiếu");
    watchouts.push("Thiếu tài liệu hoặc tiêu chí hoàn thành có thể làm chậm điểm bắt đầu");
  }

  if (conflictChoice === "A") {
    strengths.push("Đưa thảo luận về dữ liệu và tiêu chí kỹ thuật");
    watchouts.push("Nên dành chỗ cho góc nhìn khác, không chỉ phương án có benchmark tốt nhất");
  } else if (conflictChoice === "B") {
    strengths.push("Ưu tiên sự đồng thuận và tiến độ chung của nhóm");
    watchouts.push("Có thể nhường ý kiến quá sớm dù vẫn còn rủi ro kỹ thuật cần nêu rõ");
  } else if (conflictChoice === "C") {
    strengths.push("Chủ động tìm điểm chốt để tránh bất đồng kéo dài");
    watchouts.push("Cần nêu phương án và đánh đổi trước khi chuyển quyết định lên PM/Lead");
  }

  if (feedbackChoice === "A") {
    strengths.push("Phản hồi nhanh và cởi mở với góp ý");
  } else if (feedbackChoice === "B") {
    strengths.push("Có tư duy phản biện và muốn hiểu lý do của feedback");
  } else if (feedbackChoice === "C") {
    strengths.push("Quan tâm tác động hệ thống trước khi thay đổi");
  }

  const headlineParts = [
    taskChoice === "B"
      ? "Tự chủ theo mục tiêu"
      : taskChoice === "A"
        ? "Ưa cấu trúc rõ ràng"
        : taskChoice === "C"
          ? "Chuộng checklist và ngữ cảnh"
          : "",
    communicationChoice === "A"
      ? "giao tiếp trực tiếp"
      : communicationChoice === "B"
        ? "làm rõ qua hội thoại"
        : communicationChoice === "C"
          ? "trao đổi có lưu vết"
          : "",
  ].filter(Boolean);

  const headline =
    headlineParts.length > 0
      ? headlineParts.join(" · ")
      : "Chưa đủ dữ liệu để xác định phong cách làm việc";

  const summary =
    answered.length > 0
      ? `Dữ liệu onboarding cho thấy thành viên ${workStyle.toLowerCase()}. ${communicationStyle}. Đây là xu hướng tự khai báo để PM thử nghiệm cách phối hợp, không phải nhãn tính cách cố định.`
      : "Thành viên chưa hoàn tất đủ câu hỏi onboarding. Chưa nên suy diễn phong cách làm việc hoặc cách phản hồi phù hợp.";

  return {
    headline,
    summary,
    strengths: unique(strengths).slice(0, 3),
    watchouts: unique(watchouts).slice(0, 3),
    workStyle,
    communicationStyle,
    decisionStyle,
    feedbackStyle,
    evidence: answered.map(
      ({ dimension, answer }) =>
        `${DIMENSION_LABELS[dimension]}: ${shortAnswer(answer)}`,
    ),
    confidence:
      answered.length >= 5 ? "high" : answered.length >= 3 ? "medium" : "low",
    answeredQuestions: answered.length,
  };
}

export function summarizeEqSignal(answers: EqAnswers) {
  const profile = buildPersonalityAnalysis(answers);
  if (profile.answeredQuestions === 0) return "Chưa có dữ liệu EQ/onboarding.";
  return `${profile.headline} · ${profile.answeredQuestions}/5 tín hiệu tự khai báo`;
}

export function buildWorkloadAnalysis(
  tasks: readonly WorkloadTask[],
  now = new Date(),
): WorkloadAnalysis {
  const openTasks = tasks.filter((task) => task.status !== "done");
  const doingTasks = openTasks.filter((task) => task.status === "doing");
  const overdueTasks = openTasks.filter((task) => {
    if (!task.due_at) return false;
    const dueAt = new Date(task.due_at);
    return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < now.getTime();
  });
  const staleDoingTasks = doingTasks.filter((task) => {
    if (!task.updated_at) return false;
    const updatedAt = new Date(task.updated_at);
    return (
      !Number.isNaN(updatedAt.getTime()) &&
      now.getTime() - updatedAt.getTime() > 48 * 60 * 60 * 1000
    );
  });
  const highPriorityTasks = openTasks.filter((task) => task.priority === "high");

  const score = Math.min(
    100,
    openTasks.length * 10 +
      doingTasks.length * 8 +
      overdueTasks.length * 16 +
      staleDoingTasks.length * 12 +
      highPriorityTasks.length * 8,
  );
  const level = workloadRiskLevel(score);

  const signals = [
    `${openTasks.length} task đang mở`,
    doingTasks.length ? `${doingTasks.length} task đang Doing` : "",
    overdueTasks.length ? `${overdueTasks.length} task đã quá hạn` : "",
    staleDoingTasks.length
      ? `${staleDoingTasks.length} task Doing chưa cập nhật quá 48 giờ`
      : "",
    highPriorityTasks.length
      ? `${highPriorityTasks.length} task ưu tiên cao chưa hoàn thành`
      : "",
  ].filter(Boolean);

  const levelText =
    level === "high" ? "cao" : level === "moderate" ? "trung bình" : "thấp";
  const strongestSignal =
    overdueTasks.length > 0
      ? `Có ${overdueTasks.length} task quá hạn cần được làm rõ blocker hoặc ưu tiên.`
      : staleDoingTasks.length > 0
        ? `Có ${staleDoingTasks.length} task Doing chưa cập nhật quá 48 giờ.`
        : openTasks.length > 0
          ? `Hiện có ${openTasks.length} task chưa hoàn thành.`
          : "Hiện không có task mở được ghi nhận.";

  return {
    score,
    level,
    summary: `Rủi ro tải việc ở mức ${levelText}. ${strongestSignal}`,
    signals,
    activeTasks: openTasks.length,
    doingTasks: doingTasks.length,
    overdueTasks: overdueTasks.length,
    staleDoingTasks: staleDoingTasks.length,
    disclaimer:
      "Chỉ số này phản ánh dữ liệu task, deadline và nhịp cập nhật; không phải đánh giá tâm lý hay mức stress thực tế.",
  };
}

function communicationSuggestion(answers: EqAnswers) {
  const choice = choiceOf(readAnswer(answers, "communication"));
  if (choice === "A") {
    return "Gửi một tin nhắn ngắn gồm bối cảnh, câu hỏi cần trả lời và thời điểm cần phản hồi.";
  }
  if (choice === "B") {
    return "Đề nghị quick-call 5–10 phút, gửi trước agenda và chốt lại quyết định bằng tin nhắn.";
  }
  if (choice === "C") {
    return "Trao đổi ngay trên thẻ Kanban, gắn tiêu chí hoàn thành và @mention người cần phối hợp.";
  }
  return "Hỏi thành viên muốn trao đổi qua chat, quick-call hay Kanban trước khi đi vào nội dung.";
}

function taskSuggestion(answers: EqAnswers) {
  const choice = choiceOf(readAnswer(answers, "taskPreference"));
  if (choice === "A") {
    return "Chia đầu ra thành checklist theo ngày, mỗi mục có tiêu chí hoàn thành và mốc check-in.";
  }
  if (choice === "B") {
    return "Chốt outcome, ràng buộc và deadline; để thành viên tự đề xuất cách triển khai.";
  }
  if (choice === "C") {
    return "Giao checklist kèm tài liệu tham chiếu, dependency và ví dụ đầu ra mong muốn.";
  }
  return "Chốt đầu ra, deadline và hỏi thành viên cần mức chi tiết nào để bắt đầu tự tin.";
}

export function buildFallbackCoaching(input: {
  name: string;
  skills: string[];
  answers: EqAnswers;
  personality: PersonalityAnalysis;
  workload: WorkloadAnalysis;
}): CoachingPlan {
  const { name, skills, answers, personality, workload } = input;
  const safeName = name.trim() || "thành viên";
  const skillsText = skills.length
    ? `Các task liên quan ${skills.slice(0, 3).join(", ")} nên có tiêu chí kỹ thuật rõ.`
    : "Hãy xác nhận kỹ năng cần dùng và nguồn hỗ trợ trước khi chốt task.";
  const workloadHigh = workload.level === "high";
  const workloadModerate = workload.level === "moderate";
  const feedbackChoice = choiceOf(readAnswer(answers, "feedbackHandling"));

  const feedbackSuggestion =
    feedbackChoice === "A"
      ? "Đưa feedback theo thứ tự ưu tiên và xác nhận lại thay đổi quan trọng trước khi sửa ngay."
      : feedbackChoice === "B"
        ? "Nêu quan sát và tác động trước, dành thời gian để thành viên phản biện phương án."
        : feedbackChoice === "C"
          ? "Nêu phạm vi ảnh hưởng, tiêu chí an toàn và cho phép kiểm tra tác động hệ thống trước khi sửa."
          : "Dùng cấu trúc quan sát – tác động – đề nghị và hỏi lại cách thành viên tiếp nhận feedback tốt nhất.";

  const workloadTip: CoachingTip = workloadHigh
    ? {
        title: "Giảm tải trước khi thúc tiến độ",
        rationale: workload.summary,
        suggestion:
          "Cùng rà từng task mở, xác nhận blocker và thống nhất chuyển người hoặc lùi một task ít ưu tiên.",
      }
    : workloadModerate
      ? {
          title: "Chốt một ưu tiên chính",
          rationale: workload.summary,
          suggestion:
            "Xác nhận task quan trọng nhất trong 24 giờ tới và tạm hoãn việc không trực tiếp hỗ trợ đầu ra đó.",
        }
      : {
          title: "Duy trì nhịp và quyền chủ động",
          rationale: workload.summary,
          suggestion:
            "Giữ một mốc check-in ngắn, tránh tự động giao thêm việc chỉ vì điểm tải đang thấp.",
        };

  return {
    goal: workloadHigh
      ? `Giúp ${safeName} làm rõ ưu tiên, lộ blocker và đưa tải việc về mức kiểm soát được.`
      : `Tạo cách phối hợp phù hợp với phong cách “${personality.headline}” và duy trì tiến độ có thể quan sát.`,
    tips: [
      {
        title: "Chọn đúng kênh giao tiếp",
        rationale: personality.communicationStyle,
        suggestion: communicationSuggestion(answers),
      },
      {
        title: "Giao task đúng mức tự chủ",
        rationale: personality.workStyle,
        suggestion: `${taskSuggestion(answers)} ${skillsText}`,
      },
      workloadTip,
    ],
    conversationStarter: workloadHigh
      ? `${safeName}, mình thấy bạn đang có ${workload.activeTasks} task mở. Task nào đang tạo nhiều ma sát nhất, và mình có thể bỏ bớt hoặc làm rõ điều gì ngay hôm nay?`
      : `${safeName}, cách giao việc và trao đổi hiện tại đã đủ rõ với bạn chưa? Có một thay đổi nhỏ nào giúp bạn làm việc hiệu quả hơn trong sprint này?`,
    actionPlan: workloadHigh
      ? "Trong buổi check-in kế tiếp, dành 10 phút xếp hạng các task mở, ghi blocker và chốt một thay đổi tải việc có người chịu trách nhiệm."
      : "Trong buổi check-in kế tiếp, thử một điều chỉnh về kênh giao tiếp hoặc cách giao task; hẹn kiểm tra lại hiệu quả sau 2–3 ngày.",
    avoid: [
      "Không gắn nhãn tính cách cố định hoặc kết luận thành viên đang stress chỉ từ dữ liệu task.",
      feedbackSuggestion,
    ],
  };
}
