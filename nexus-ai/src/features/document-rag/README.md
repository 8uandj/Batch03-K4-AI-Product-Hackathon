# Document RAG — DEV 2

Feature này sở hữu toàn bộ luồng:

`upload → extract text → chunk 500/overlap 80 → embedding → pgvector → retrieve → grounded answer`

## Chạy demo không cần API key

```bash
cp .env.example .env
npm install
npm run dev
```

Mở `http://localhost:3000/project/demo/chat`. `RAG_MODE=mock` vẫn cho phép
upload tài liệu, tìm đoạn theo từ khoá và chạy UI chat end-to-end. Dữ liệu mock
chỉ nằm trong bộ nhớ tiến trình.

## Chạy với OpenAI + Supabase

1. Chạy migration `supabase/migrations/001_document_rag.sql` trong Supabase.
2. Điền các biến trong `.env`.
3. Đặt `RAG_MODE=supabase`.
4. Khởi động lại ứng dụng.

Service-role key chỉ được đọc trong Route Handler phía server, không bao giờ đưa
vào biến `NEXT_PUBLIC_*`.

## API contract

### `POST /api/projects/:id/documents`

Multipart form với field `file`. Hỗ trợ PDF/TXT/MD/CSV/JSON, tối đa 10 MB.

```json
{
  "sourceId": "uuid",
  "filename": "brief.pdf",
  "chunks": 12,
  "mode": "supabase"
}
```

### `POST /api/projects/:id/chat`

```json
{
  "message": "Deadline của sprint là khi nào?",
  "history": [{ "role": "user", "content": "..." }]
}
```

Response là text stream. Header `x-rag-sources` chứa danh sách nguồn đã truy
xuất để UI hiển thị trace.

## Boundary

- Bot chỉ trả lời từ context được retrieve và bắt buộc trích `[Nguồn N]`.
- Không có căn cứ thì bot nói không tìm thấy, không đoán.
- Tài liệu trong project này không được retrieve sang project khác.
- Chỉ server sử dụng OpenAI key và Supabase service-role key.

## Điểm tích hợp do PM/infra phụ trách

- Route hiện nhận `projectId` từ URL. Trước khi deploy, middleware auth phải xác
  nhận người gọi là thành viên của project đó.
- Migration chỉ tạo bảng/RPC thuộc feature RAG; PM có thể gộp nó vào schema
  tổng của `users` và `tasks`.
- Production mode cần OpenAI key, Supabase URL và service-role key thật nên mới
  được xác minh ở mức compile; mock mode đã được smoke test end-to-end.
