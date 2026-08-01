# Hồ sơ nộp bài — Nexus AI

Nexus AI là trợ lý lập kế hoạch có kiểm soát cho PM của team dự án ngắn hạn. Lát cắt nộp bài tập trung vào Auto-Tasking: từ project brief hoặc đoạn trao đổi, hệ thống quyết định đề xuất task, hỏi lại khi thiếu dữ kiện hoặc từ chối yêu cầu vượt quyền; PM luôn sửa và duyệt trước khi task vào Kanban.

Link sản phẩm: https://nexus-ai-ebon-eight.vercel.app/

## Thành viên và phân công

| Mã HV | Thành viên | Phần phụ trách |
|---|---|---|
| 2A202601822 | Sẻ Thế Hưng | Onboarding và dữ liệu đầu vào |
| 2A202601968 | Nguyễn Văn Đạt | Knowledge Hub/RAG và kiểm tra grounding |
| 2A202602021 | Nguyễn Đặng Thành Vinh | Auto-Tasking, Kanban, prompt và eval |
| 2A202601104 | Đặng Hữu Khanh | EQ Radar, analytics và safety cases |
| 2A202601908 | Hoàng Duy Hưng | PM, spec, evidence, hạ tầng và tích hợp |

> Tên, mã học viên và vai trò trong bảng được đồng bộ theo 5 reflection cá nhân trong thư mục `reflection/`.

Phân công chi tiết theo deliverable và phạm vi từng người nằm tại [`spec.md`](spec.md#8-phân-công--kế-hoạch).

## Danh mục artifact nộp bài

| Yêu cầu | Artifact | Trạng thái |
|---|---|---|
| README có thành viên, mã HV, phân công | `README.md` | Hoàn tất |
| AI Spec | `spec.md` | Có; các mục cần dữ liệu thật được đánh dấu `TODO bắt buộc` |
| Slide demo 6 trang | `demo-slides.pdf` | Có; trang 5 chờ quote validation thật |
| Prototype | `nexus-ai/` | Có; hiện chưa đổi tên thành `codebase/` theo yêu cầu của chủ repo |
| Golden set và kết quả chạy | `eval/` | Có 24 case đúng cơ cấu; Run 01 trên bộ v1: 13/20 (65%); Run 02 chờ xác nhận gửi API |
| Evidence | `evidence/` | Có 23 phản hồi ẩn danh, log đầy đủ, phương pháp và số liệu tổng hợp |
| Validation | `validation/` | Có protocol và feedback log; **chờ ≥5 người thật** |
| Reflection cá nhân | `reflection/` | Hoàn tất 5 file cá nhân, đúng tên và mã học viên |
| Backup demo | `demo-backup/README.md` | Có checklist; **chờ ảnh/video của lượt chạy thật** |

## Chạy prototype và eval

Xem hướng dẫn môi trường, Supabase và cách chạy tại [`nexus-ai/README.md`](nexus-ai/README.md). Chạy eval từ thư mục gốc:

```bash
node --env-file=nexus-ai/.env eval/run-eval.mjs --run-id run-02
```

Không commit `.env`, `.env.local`, API key, dữ liệu cá nhân hoặc data pack của ban tổ chức.

## Việc bắt buộc còn lại trước CP6

1. Điền tên nhóm và zone trong `spec.md`.
2. Xác nhận 23 người khảo sát đều ngoài nhóm; form không thu danh tính nên repo chưa tự chứng minh được điều này.
3. Điền ≥3 willing users trong `spec.md`; test với ≥5 người ngoài nhóm và cập nhật `validation/feedback-log.md` cùng slide 5.
4. Xác nhận được phép gửi 24 golden cases tới OpenAI rồi chạy Run 02; không ghi đè Run 01.
5. Chụp ảnh/quay video flow thật cho `demo-backup/`, dry run và kiểm tra PDF lần cuối.

---

# Mini Hackathon AI — Batch 03

**SPEC → Prototype → Demo.** Đây không phải cuộc thi code — đây là cuộc thi **tư duy sản phẩm AI**.

- Thời lượng: **1,5 ngày** (một ngày build + một buổi demo)
- Nhóm: **4-5 người** · zone tối đa 5 nhóm · thi theo lớp

## Bắt đầu từ đâu?

1. Đọc **`01-de-bai.md`** để chọn hướng và hiểu tiêu chí.
2. Mở **`02-guide.md`** — hướng dẫn từng giai đoạn, đứng ở đâu đọc mục đó.
3. Viết spec theo **`03-template-ai-spec.md`** — deliverable trung tâm của cả sự kiện.
4. Đọc **`04-rubric.md`** ngay từ đầu — biết trước bài được chấm theo tiêu chí nào.

| File / thư mục | Nội dung |
|---|---|
| `01-de-bai.md` | Đề bài 3 hướng · 5 tiêu chí nghiệm thu · ràng buộc chung |
| `02-guide.md` | Hướng dẫn 5 giai đoạn: khám phá → spec → build → đo & validate → demo |
| `03-template-ai-spec.md` | Template AI Spec (nộp 23:59 ngày 1) |
| `04-rubric.md` | Rubric 100 điểm (25 nộp checkpoint + 75 chấm bài) + checklist xác minh 6 mốc |
| `data/` | Dữ liệu thật đã ẩn danh: chatlog VLearn tutor + 6 transcript bài giảng + 2 bộ slide bản hackathon — dùng để tìm bằng chứng và xây golden set |
| `tham-khao/` | JTBD Playbook (PDF) + worksheet JTBD đầy đủ — đọc khi muốn đào sâu |

## Lịch — 6 mốc

| Mốc | Khoá 3 | Khoá 4 |
|---|---|---|
| Khai mạc + phát đề | 09:00 ngày 1 | 14:00 ngày 1 |
| CP1 · Chốt Canvas | 10:00 ngày 1 | 15:00 ngày 1 |
| CP2 · Show được thứ bấm được | 12:00 ngày 1 | 17:00 ngày 1 |
| CP3 · AI chạy thật + đo lượt đầu | 16:00 ngày 1 | 10:30 ngày 2 |
| CP4 · Chốt tiến độ — spec nộp hạn cứng **23:59 ngày 1** | 17:30 ngày 1 | 12:00 ngày 2 |
| CP5 · Xác minh + validation + dry run | 09:00 ngày 2 | 14:00 ngày 2 |
| CP6 · Demo | 10:00 ngày 2 | 15:00 ngày 2 |

Mỗi mốc cần show gì và được xác minh thế nào: xem bảng trong `04-rubric.md`.

## Nộp bài

Một repo nhóm, cấu trúc như sau. Spec chốt lúc 23:59 ngày 1; bản hoàn chỉnh trước CP6.

```
repo/
├── README.md          ← thành viên (mã HV + tên) + phân công có tên từng phần
├── spec.md            ← AI Spec theo 03-template-ai-spec.md
├── demo-slides.pdf    ← slide 6 trang theo 02-guide.md §5.1
├── codebase/          ← prototype (ghi rõ phần nào mock)
├── eval/              ← golden set + bảng kết quả các lượt chạy
├── validation/        ← feedback log từ vòng user test
└── reflection/        ← mỗi người 1 file
```

## Chấm điểm

Tổng **100 điểm = 25 điểm nộp checkpoint + 75 điểm chấm bài nộp**. Chi tiết từng ý điểm: `04-rubric.md`.

**25 điểm nộp — mỗi checkpoint 5 điểm (CP1-CP5):** nộp đúng hạn → 5 điểm · nộp muộn → 0 điểm cho mốc đó. Mỗi thành viên nộp riêng, cả nhóm dùng chung một link repo.

**75 điểm chấm — trên artifact trong repo, mỗi con điểm trỏ về một file:**

| Khối | Điểm | Chấm trên file nào |
|---|---|---|
| R1 · Bằng chứng & impact | 15 | `spec.md` §1-§2 + log khảo sát/mining |
| R2 · Lát cắt & thiết kế | 15 | `spec.md` §4 |
| R3 · Chỗ khó & kịch bản rủi ro | 11 | `spec.md` §5-§6 |
| R4 · Kiểm thử | 15 | `spec.md` §7 + `eval/` |
| R5 · Prototype chạy được | 8 | `codebase/` + demo |
| R6 · Validation với user | 8 | `validation/` |
| R7 · Quy trình & repo | 3 | cấu trúc repo |

Ba điều nên biết trước khi làm:

- Điểm dựa trên **chuỗi quyết định và bằng chứng**, không dựa trên mức độ hoành tráng của sản phẩm.
- Kết quả đo **ghi nhận trung thực** — kể cả khi không đạt mục tiêu nhóm tự đặt — vẫn được tính đủ điểm. Số liệu bị chỉnh sửa hoặc che giấu sẽ không được tính.
- Reflection cá nhân chấm riêng theo rubric của khoá. Điểm vòng demo, chấm chéo trong zone và thưởng thêm (nếu có) theo thể lệ công bố lúc khai mạc.

## Luật chung

1. Prototype có 3 mức **Sketch / Mock / Working** — mức nào cũng bắt buộc **≥1 lời gọi AI chạy thật**.
2. **Vibe-coding rule:** dùng AI để build thoải mái, nhưng không giải thích được phần có tên mình thì phần đó 0 điểm (kiểm tra tại CP5).
3. **Quality bar** chốt tại spec.md 23:59 ngày 1 và giữ nguyên sau đó.
4. Chỉ dùng dữ liệu trong `data/` hoặc dữ liệu giả tự sinh — không dùng dữ liệu thật của người thật. Không commit API key.
5. Tuân thủ **quy định bảo mật dữ liệu** bên dưới — đây là điều kiện để được cấp data.

## Bảo mật dữ liệu được cung cấp

Dữ liệu trong `data/` là dữ liệu thật của khoá học (đã ẩn danh), cấp riêng cho hackathon này. Khi nhận data, nhóm cam kết:

1. **Chỉ dùng trong phạm vi hackathon** — cho việc tìm bằng chứng, xây golden set và build prototype. Không dùng cho mục đích khác.
2. **Không chia sẻ ra ngoài khoá học** — không đăng lên mạng xã hội, không gửi cho người ngoài, không đưa vào bất kỳ dataset hay repo công khai nào.
3. **Không commit data pack vào repo nộp bài** — repo nhóm chỉ chứa trích dẫn ngắn để minh hoạ (vài dòng); golden set trích từ data ghi rõ mã đoạn/mã hội thoại thay vì dán nguyên văn dài.
4. **Cẩn trọng khi đưa data vào công cụ ngoài** — chỉ đưa phần tối thiểu cần cho việc đang làm; lưu ý API/công cụ free tier có thể dùng dữ liệu để huấn luyện (xem `02-guide.md` §3.4).
5. **Không cố suy ngược danh tính** từ dữ liệu đã ẩn danh ([học viên], mã U/C/T/M).
6. Sau sự kiện, **xoá các bản sao data pack** khỏi máy cá nhân và các công cụ đã upload nếu ban tổ chức yêu cầu.

Vi phạm được xử lý theo quy định của khoá và có thể ảnh hưởng trực tiếp đến điểm của nhóm.
