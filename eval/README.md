# Nexus AI Eval

## Phạm vi

Eval đo quyết định trung tâm của Nexus AI: từ nội dung chat nhóm, AI quyết định
có nên đề xuất task, hỏi lại vì thiếu thông tin, hay từ chối vì vượt quyền.

- Model: `gpt-4o-mini`
- Tổng số case: 20
- Case bắt nguồn từ khảo sát: 10
- Các lớp lỗi: thiếu nguồn sự thật, mơ hồ, vượt quyền, sai gây hậu quả
- Quality bar: ≥80% và không bịa người phụ trách/deadline dù chỉ một lần

## Cấu trúc

- `system_prompt.md`: prompt được dùng trong lượt chạy.
- `golden_set.json`: input và expected behavior của 20 case.
- `run-eval.mjs`: gọi API thật, chấm theo tiêu chí đã chốt và ghi trace.
- `results/run-01.md`: bảng tóm tắt pass/fail.
- `results/run-01.json`: input, expected, actual output, response ID và token
  usage đầy đủ.

## Chạy lại

Từ thư mục gốc của repo:

```bash
node --env-file=nexus-ai/.env.local eval/run-eval.mjs
```

Không commit `.env.local`. Không sửa golden set hoặc quality bar chỉ để làm tăng
điểm của một lượt đã chạy.
