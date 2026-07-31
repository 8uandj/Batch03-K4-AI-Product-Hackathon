# Reflection — Nguyễn Hoàng Bảo Minh

- **Mã HV:** 2A202601626
- **Vai trò:** PM, spec, evidence, hạ tầng và tích hợp

## Phần tôi trực tiếp phụ trách

Tôi phụ trách chốt lát cắt sản phẩm, tổng hợp AI Spec, điều phối evidence, thiết kế contract dữ liệu chung và tích hợp các feature. Từ 23 phản hồi khảo sát, tôi cùng nhóm chọn Auto-Tasking dạng draft vì 18/23 người mất ít nhất 15 phút mỗi tuần để hỏi/cập nhật tiến độ và 17/23 muốn tham khảo rồi tự chỉnh thay vì giao toàn quyền cho AI.

Ở phần hạ tầng, tôi phụ trách schema Supabase, TypeScript interfaces, project membership/RLS, cấu trúc route và tài liệu API contract để Onboarding, RAG, Kanban và Dashboard dùng chung một khái niệm `projectId`, user và task. Tôi cũng review/merge, giữ nhãn Mock/Working đúng với artifact, chuẩn bị demo và ghi thao tác/quote trong validation.

## AI đã hỗ trợ tôi và cách tôi kiểm tra lại

AI hỗ trợ tổng hợp khảo sát, dựng spec, rà rubric, đề xuất schema/migration, viết tài liệu tích hợp và kiểm tra các khoảng trống trước khi nộp. Tôi kiểm tra lại số liệu từ log gốc, liên kết từng claim với artifact và đánh dấu rõ các mục chưa có bằng chứng người thật thay vì để AI điền giả. Với code, tôi chạy lint/test/build và đối chiếu migration, type và route contract giữa các feature trước khi merge.

Một kiểm tra quan trọng là phân biệt “demo chạy được” với “lát cắt đã Working”. AI call và Kanban có thể chạy riêng, nhưng eval đo decision gate từ team chat trong khi UI Auto-Tasking chủ yếu nhận project brief và còn thiên về create-first. Vì nhánh `ask_clarification/decline` chưa xuyên suốt cùng một UI, tôi giữ mức prototype là Mock và ghi rõ mismatch trong spec.

## Case fail thật, nguyên nhân và bài học

Case fail tôi chọn là kết quả tổng thể của Run 01: 13/20, chỉ đạt 65% so với quality bar 80%, trong đó có hai vi phạm điều kiện cứng. Bốn trong bảy lỗi đến từ việc hệ thống tạo task quá sớm. Điều đáng chú ý là UI create-first vẫn tạo cảm giác demo tốt, nhưng hành vi được đo lại không đáp ứng thiết kế an toàn decision-gated.

Nguyên nhân là nhóm phát triển các feature song song trước khi chốt một contract trải nghiệm và dữ liệu đủ chặt. Chúng tôi đã có các mảnh chạy được nhưng chưa có cùng một định nghĩa về khi nào được tạo task. Bài học của tôi với vai trò PM là phải chốt acceptance criteria và đường đi happy/ask/decline trước khi tối ưu UI; đồng thời phải giữ kết quả fail, không hạ quality bar và không tuyên bố end-to-end khi artifact chưa chứng minh được.

## Phần tôi có thể giải thích tại CP5/CP6

Tôi có thể trình bày chuỗi evidence → impact → chọn lát cắt, lý do chọn augment thay vì automate, ranh giới Mock/Working và cách năm feature tích hợp qua schema/API contract. Tôi cũng có thể giải thích Run 01, quyết định chuyển từ create-first sang decision-gated, các rủi ro RLS/project scope, kế hoạch validation và những phần còn thiếu bằng chứng thật mà nhóm phải hoàn tất trước khi nộp.
