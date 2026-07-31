# Reflection — Nguyễn Văn Đạt

- **Mã HV:** 2A202601968
- **Vai trò:** Knowledge Hub/RAG và kiểm tra grounding

## Phần tôi trực tiếp phụ trách

Tôi phụ trách luồng Document RAG/Knowledge Hub: upload tài liệu, trích xuất text, chia đoạn theo cấu hình 500 ký tự với overlap 80, tạo embedding, tìm kiếm bằng pgvector và trả lời trong Bot Chat. Tôi tách rõ Bot Chat dùng để hỏi tài liệu với Team Chat dùng để trao đổi giữa thành viên. Tôi cũng tham gia kiểm tra grounding cho prompt và golden set của Auto-Tasking.

Trong phần RAG, tôi đặt ba ranh giới chính: câu trả lời chỉ được dựa trên context đã retrieve, thông tin phải kèm chỉ dẫn nguồn dạng `[Nguồn N]`, và khi không có căn cứ thì bot phải nói không tìm thấy thay vì đoán. Dữ liệu được lọc theo `projectId`; API key và service-role key chỉ được dùng phía server. Mock mode phục vụ demo được ghi nhãn rõ và không được xem là production.

## AI đã hỗ trợ tôi và cách tôi kiểm tra lại

AI hỗ trợ viết prompt RAG, gợi ý cấu trúc upload → chunk → retrieve → answer và tạo nhanh các component chat/upload. Tôi kiểm tra lại bằng cách đọc trace nguồn trả về, đối chiếu câu trả lời với đúng chunk và thử câu hỏi không có trong tài liệu. Tôi đặc biệt kiểm tra deadline, người phụ trách và quyết định kỹ thuật vì đây là các trường model dễ điền theo suy đoán.

Ở mức tích hợp, tôi không chỉ kiểm tra câu chữ của câu trả lời mà còn kiểm tra schema. Feature RAG cần `project_id`, `source_id`, `filename`, `chunk_index`, `metadata` và RPC có `filter_project_id`. Việc đối chiếu này giúp nhóm phát hiện schema gốc và migration RAG từng không cùng contract; nếu chỉ nhìn UI chạy ở mock mode thì lỗi production này rất dễ bị bỏ qua.

## Case fail thật, nguyên nhân và bài học

Case tôi chọn là `synthetic-13-deadline-missing` trong Eval Run 01. Nguồn mô tả công việc nhưng không có deadline; hệ thống vẫn chọn `propose_tasks` và tạo một task thay vì hỏi lại. Dù task nghe hợp lý, kết quả vẫn fail vì không được grounded đầy đủ vào source truth.

Nguyên nhân là prompt v1 ưu tiên tạo output hữu ích hơn là kiểm tra dữ kiện bắt buộc trước khi sinh task. Bài học của tôi là grounding không chỉ có nghĩa “không nói sai tài liệu”; nó còn có nghĩa không biến phần tài liệu không nói thành một quyết định cụ thể. Decision gate phải chạy trước generation, và evaluator phải kiểm tra cả trường bị thiếu, không chỉ độ trôi chảy của câu trả lời.

## Phần tôi có thể giải thích tại CP5/CP6

Tôi có thể trình bày luồng RAG end-to-end, cách chunk/retrieve, cách hiển thị nguồn và cách bot phản hồi khi không có căn cứ. Tôi cũng có thể giải thích khác biệt giữa mock và Supabase mode, rủi ro lẫn dữ liệu giữa project, xung đột schema đã phát hiện, và vì sao case thiếu deadline phải được xử lý như một lỗi grounding.
