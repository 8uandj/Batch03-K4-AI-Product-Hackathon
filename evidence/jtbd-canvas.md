# CP1 Canvas & JTBD — Nexus AI Auto-Tasking

## Canvas 7 dòng

1. **Hướng:** C — Làn mở; tính năng mới.
2. **Job executor:** PM/leader của team 4–8 người đang chạy dự án ngắn hạn.
3. **Pain:** PM phải tự chuyển thông tin rời rạc thành task; khi dữ kiện thiếu hoặc đổi nhanh, PM dễ bỏ sót việc, gán sai người hoặc điền deadline không có căn cứ, khiến team chậm và mất niềm tin vào kế hoạch.
4. **Bằng chứng:** 18/23 người (78,3%) mất ít nhất 15 phút/tuần chỉ để hỏi/cập nhật tiến độ; 22/23 (95,7%) từng có dự án kém vì vấn đề nội bộ; log đầy đủ tại `survey-log.md`.
5. **Lát cắt:** Khi PM cần chốt việc từ project brief hoặc đoạn trao đổi của team, Nexus quyết định đề xuất task, hỏi lại hay từ chối yêu cầu vượt quyền, rồi trả về bản nháp có căn cứ để PM sửa và duyệt vào Kanban.
6. **Automation + willing users:** Augment vì 17/23 người muốn tham khảo rồi tự chỉnh và gán sai người/deadline gây hậu quả cho người thật; **TODO:** điền ≥3 willing users có tên trong `spec.md`.
7. **Phân công:** Nguyễn Hoàng Bảo Minh—PM/spec/evidence; Hoàng Công Thành—Auto-Tasking/eval; Trần Văn Ngọc—RAG/grounding; Hồ Văn Tâm—analytics/safety; Nguyễn Quý Dương—onboarding/validation support.

## Job map rút gọn

| Bước | PM đang làm gì | Điểm dễ hỏng |
|---|---|---|
| Define | Chốt phạm vi và đầu ra | Brief thiếu hoặc mâu thuẫn |
| Locate | Tìm tài liệu, chat, hồ sơ thành viên | Nguồn phân tán, không biết nguồn nào mới nhất |
| Prepare | Chuẩn hoá deliverable, kỹ năng và tải việc | Dữ kiện về người/deadline thiếu |
| Confirm | Xác nhận hành động, assignee, deadline | Dễ đoán thay vì hỏi lại |
| Execute | Tạo và giao task | Gán sai người hoặc tạo task thừa |
| Monitor | Theo dõi trạng thái và blocker | Cảnh báo muộn hoặc bêu tên |
| Modify | Điều chỉnh scope/người/hạn | AI ghi đè quyết định của PM |
| Conclude | Chốt task và rút kinh nghiệm | Không lưu lý do/correction để kiểm lại |

## Job stories

- Khi cuộc họp vừa chốt nhiều đầu việc, tôi muốn biến ghi chú thành draft task có người và hạn dựa trên căn cứ để cả nhóm xác nhận nhanh mà không bỏ sót.
- Khi yêu cầu chỉ nói “giao cho bạn ấy” hoặc “làm sớm”, tôi muốn hệ thống hỏi đúng điểm còn thiếu để không tạo một kế hoạch nhìn có vẻ chắc chắn nhưng sai.
- Khi một thành viên đang quá tải, tôi muốn thấy rủi ro và phương án điều chỉnh để quyết định giao việc vẫn thuộc về PM.
