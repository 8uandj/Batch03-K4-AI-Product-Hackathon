# Reflection — Sẻ Thế Hưng

- **Mã HV:** 2A202601822
- **Vai trò:** Onboarding và dữ liệu đầu vào

## Phần tôi trực tiếp phụ trách

Tôi phụ trách luồng onboarding để biến thông tin ban đầu của thành viên thành dữ liệu có cấu trúc cho các phần phía sau. Luồng này gồm nhập tên, upload hoặc dán CV, trích xuất kỹ năng, hoàn thành năm câu hỏi EQ và lưu hồ sơ vào bảng `users`. Tôi cũng hỗ trợ validation bằng cách bấm giờ và quan sát người thử mà không hướng dẫn giữa phiên.

Điểm tôi quan tâm nhất là chất lượng đầu vào. Auto-Tasking chỉ có thể gợi ý đúng khi hồ sơ có kỹ năng rõ ràng; nếu dữ liệu thiếu hoặc mơ hồ thì hệ thống phải dừng để hỏi lại, không được tự suy ra người phù hợp. Vì vậy luồng onboarding kiểm tra đủ tên, nội dung CV, ít nhất một kỹ năng và đủ năm câu trả lời EQ trước khi cho hoàn tất. Phần EQ hiện được mô tả đúng là tín hiệu tự khai báo, không phải kết luận cố định về tính cách.

## AI đã hỗ trợ tôi và cách tôi kiểm tra lại

AI hỗ trợ trích xuất danh sách hard skill từ nội dung CV và giúp tôi dựng nhanh UI, kiểu dữ liệu và các trạng thái của form. Tuy nhiên tôi không coi kết quả trích xuất là dữ liệu chắc chắn. Tôi kiểm tra bằng cách đối chiếu từng kỹ năng với nội dung CV, gộp với kỹ năng người dùng đã tự chọn và loại trùng. Khi không có API key hoặc lời gọi AI lỗi, hệ thống chỉ dùng danh sách kỹ năng fallback xuất hiện trực tiếp trong văn bản thay vì âm thầm bịa thêm.

Tôi cũng kiểm tra ranh giới dữ liệu giữa onboarding và Auto-Tasking: `skills` phải là danh sách có cấu trúc; câu trả lời EQ và bản tóm tắt EQ được lưu riêng; dữ liệu trống không được đi tiếp. Những kiểm tra này giúp phần chia task biết dữ kiện nào thực sự có và dữ kiện nào còn thiếu.

## Case fail thật, nguyên nhân và bài học

Case tôi chọn là `synthetic-14-assignee-missing` trong Eval Run 01. Input có nhiều đầu việc nhưng không chỉ rõ ai phụ trách. Hệ thống vẫn trả về hai task thay vì `ask_clarification`, vi phạm điều kiện cứng về việc không được bịa assignee/deadline. Đây là một fail quan trọng với phần tôi phụ trách vì nó cho thấy dữ liệu đầu vào “có nội dung” chưa đồng nghĩa với “đủ để giao việc”.

Nguyên nhân là flow ban đầu thiên về mục tiêu phải tạo được task, nên model cố hoàn thành đầu ra dù thiếu một trường quyết định. Bài học của tôi là cần kiểm tra tính đầy đủ theo mục đích sử dụng, không chỉ kiểm tra form đã có dữ liệu. Với Auto-Tasking, thiếu assignee hoặc thiếu căn cứ ánh xạ kỹ năng phải kích hoạt câu hỏi làm rõ; không nên dùng hồ sơ hay EQ để suy đoán thay cho quyết định của PM.

## Phần tôi có thể giải thích tại CP5/CP6

Tôi có thể demo toàn bộ onboarding từ CV đến hồ sơ có cấu trúc, giải thích cơ chế trích xuất kỹ năng, fallback khi AI lỗi và các điều kiện chặn trước khi lưu. Tôi cũng có thể giải thích vì sao EQ chỉ là dữ liệu tự khai báo, vì sao PM vẫn phải duyệt assignee, và cách case thiếu assignee cần đi vào nhánh hỏi lại thay vì tạo task.
