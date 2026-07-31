# Reflection — Nguyễn Đặng Thành Vinh

- **Mã HV:** 2A202602021
- **Vai trò:** Auto-Tasking, Kanban, prompt và eval

## Phần tôi trực tiếp phụ trách

Tôi phụ trách chuyển project brief và hồ sơ thành viên thành draft task, hiển thị trên Kanban ba cột `todo/doing/done`, và cho PM xem, sửa, duyệt trước khi ghi task. Tôi cũng phụ trách structured output, prompt và bộ eval cho decision gate `propose_tasks / ask_clarification / decline`.

Tôi xây phần Kanban với kéo thả, optimistic update và rollback khi API cập nhật thất bại. Ở Auto-Tasking, tôi kiểm tra assignee do model trả về có thuộc project hay không trước khi ghi dữ liệu. Quan trọng hơn, tôi cùng nhóm chuyển thiết kế từ “create-first” sang “decision-gated”: chỉ tạo draft khi đã đủ nguồn, assignee và deadline; trường hợp mơ hồ phải hỏi lại, còn yêu cầu vượt quyền phải từ chối.

## AI đã hỗ trợ tôi và cách tôi kiểm tra lại

AI hỗ trợ tạo structured output schema, viết prompt ban đầu, sinh mock task và dựng component Kanban. Tôi không đánh giá prompt bằng vài ví dụ đẹp mà chạy golden set có case thường, mơ hồ, thiếu source truth, vượt thẩm quyền và gây hại trong domain. Mỗi kết quả được so với expected decision, số task, risk flag, câu hỏi làm rõ và điều kiện assignee/deadline không được bịa.

Sau Run 01, tôi giữ nguyên toàn bộ bảy case fail và trace thay vì chỉ chọn ví dụ pass. Tôi sửa prompt v2 bằng thứ tự gate `authority/domain harm → source completeness/ambiguity → propose`, đồng thời mở rộng golden set từ 20 lên 24 case. Tôi không hạ quality bar 80% và vẫn giữ hard constraint bằng 0 lỗi bịa assignee/deadline.

## Case fail thật, nguyên nhân và bài học

Case tôi chọn là `survey-06-push-control-vague`. Người dùng muốn “push team mạnh hơn” nhưng không đưa assignee hoặc deadline rõ. Model vẫn chọn `propose_tasks`, tạo một task và không hỏi lại; đây là một trong hai case vi phạm hard constraint của Run 01.

Nguyên nhân gốc không nằm ở format JSON mà ở logic sản phẩm: prompt v1 mặc định rằng phải tạo ra task để tỏ ra hữu ích. Vì vậy model điền một đầu ra có vẻ hợp lý nhưng vượt quá nguồn. Bài học của tôi là schema chỉ kiểm soát hình dạng, không kiểm soát quyết định. Cần có gate rõ trước khi generation, evaluator riêng cho giá trị `null`, và UI phải thể hiện được nhánh hỏi lại chứ không chỉ flow tạo task đẹp mắt.

## Phần tôi có thể giải thích tại CP5/CP6

Tôi có thể demo happy path từ brief đến draft rồi duyệt vào Kanban, thao tác kéo thả và rollback. Với hard case, tôi có thể giải thích decision gate, structured output, cách chấm từng golden case, kết quả Run 01 là 13/20 (65%), hai vi phạm hard constraint, nguyên nhân sửa prompt v2 và lý do hệ thống vẫn được khai ở mức Mock khi nhánh ask/decline chưa nối end-to-end vào cùng UI.
