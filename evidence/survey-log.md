# Survey log — Pain điều phối và chia việc nhóm

## Phạm vi và nguồn

- Nguồn gốc: file Google Forms `Khảo sát - Câu trả lời biểu mẫu 1.csv` do nhóm cung cấp ngày 31/07/2026.
- Số phản hồi: **23**, đủ ngưỡng `n ≥ 20`.
- Form không thu tên/email. Repo dùng mã `R01–R23`, bỏ timestamp và giữ nguyên toàn bộ câu trả lời tại `survey-responses-anonymized.csv`.
- **Giới hạn xác minh:** file nguồn không có trường nhận dạng nên không thể tự kiểm tra 23 người có đều ngoài nhóm hay không. Nhóm cần xác nhận điều kiện này với TA; không bổ sung tên giả vào log.

## Chín câu hỏi đã dùng

1. Nghĩ về dự án nhóm gần nhất, chuyện gì trong nhóm khiến bạn khó chịu hoặc mệt nhất?
2. Lúc đó bạn đã làm gì?
3. Nếu bạn không nói gì — vì sao?
4. Mỗi tuần bạn mất bao lâu chỉ để hỏi/cập nhật xem ai đang làm đến đâu?
5. Có dự án nhóm nào từng thất bại hoặc kém hẳn vì chuyện nội bộ chứ không phải thiếu năng lực không?
6. Chọn tối đa hai thứ gây khó chịu nhất cho chính bạn.
7. Bot nhắn riêng “hình như bạn đang bị quá tải” — phản ứng đầu tiên?
8. Bot tự chia việc dựa trên nội dung chat — bạn sẽ tin và làm theo hay tham khảo rồi tự chỉnh?
9. Điều gì khiến bạn không dùng một công cụ như vậy?

## Quy tắc và kết quả xác nhận pain

Một người **xác nhận pain điều phối tiến độ** khi họ trả lời mất ít nhất 15 phút/tuần chỉ để hỏi hoặc cập nhật ai đang làm đến đâu. Đây là câu hỏi hành vi có khoảng thời gian, không phải câu hỏi ý định dùng tính năng.

| Chỉ số | Kết quả | Diễn giải |
|---|---:|---|
| Mất ≥15 phút/tuần để hỏi/cập nhật tiến độ | **18/23 = 78,3%** | Đạt ngưỡng ≥50% |
| Mất 30 phút trở lên/tuần | **3/23 = 13,0%** | 2 người: 30–60 phút; 1 người: trên 1 giờ |
| Từng có dự án kém/thất bại vì vấn đề nội bộ | **22/23 = 95,7%** | Signal hậu quả rộng, không riêng Auto-Tasking |
| Chọn “không biết ai đang làm đến đâu” là khó chịu nhất | **8/23 = 34,8%** | Nhóm lựa chọn lớn nhất |
| Muốn dùng kết quả bot như bản nháp rồi tự chỉnh | **17/23 = 73,9%** | Ủng hộ automation = augment |
| Sẵn sàng tin và làm theo ngay | **6/23 = 26,1%** | Không dùng để biện minh automate vì cost-of-error cao |
| Phản ứng “phiền” hoặc “bị theo dõi” với bot quá tải | **11/23 = 47,8%** | Bằng chứng loại chủ động nhắn riêng khỏi lát cắt chính |

## Phân bố đầy đủ của các câu định lượng

### Thời gian cập nhật tiến độ mỗi tuần

| Phương án | Số người | Tỷ lệ |
|---|---:|---:|
| Dưới 15 phút | 5 | 21,7% |
| 15–30 phút | 15 | 65,2% |
| 30–60 phút | 2 | 8,7% |
| Trên 1 giờ | 1 | 4,3% |

### Pain được chọn là khó chịu nhất

| Pain | Số người | Tỷ lệ |
|---|---:|---:|
| Không biết ai đang làm đến đâu, phải hỏi từng người | 8 | 34,8% |
| Có người không làm phần mình, không ai dám nhắc | 7 | 30,4% |
| Tranh luận ý tưởng mãi không chốt | 5 | 21,7% |
| Họp nhiều mà không quyết định | 1 | 4,3% |
| Chia việc lệch, có người ôm hết | 1 | 4,3% |
| Bản thân quá tải/nản nhưng không nói | 1 | 4,3% |

> Câu hỏi ghi “chọn tối đa 2”, nhưng file xuất ghi đúng một giá trị cho mỗi người; tổng số lựa chọn bằng 23. Phân tích dùng đúng dữ liệu được xuất, không suy diễn lựa chọn thứ hai.

## Quote nguyên văn có mã nguồn

1. `R02`: “Có người trễ dl”.
2. `R08`: “phân chia role”.
3. `R13`: “phân chia team role”.
4. `R15`: “khó kiểm soát code push lên”.
5. `R16`: “Việc trì trệ nộp sản phẩm deadline”.
6. `R20`: “Khó nắm bắt tiến độ của các thành viên trong nhóm”.
7. `R22`: “Chưa đủ thông minh để chia nhỏ dự án”.
8. `R23`: “Chưa tin tưởng”.

## Khả năng kiểm lại

Mọi tỷ lệ trên được tính trực tiếp từ 23 dòng trong `survey-responses-anonymized.csv`. Đối chiếu bằng mã `Rxx`; không lọc bỏ phản hồi ngắn, phủ định hoặc bất lợi. File gốc có timestamp nằm ngoài repo và không cần thiết cho việc chấm nội dung.
