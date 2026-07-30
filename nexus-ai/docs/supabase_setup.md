# Supabase setup cho Nexus AI

## 1. Cài thư viện

```bash
npm install @supabase/supabase-js
```

## 2. Tạo biến môi trường

Copy file mẫu và điền key được PM chia sẻ qua kênh bảo mật:

```bash
cp .env.example .env
```

```env
RAG_MODE=supabase

NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
OPENAI_API_KEY=<server-only-openai-key>
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Chỉ dùng trong API route phía server. Không thêm tiền tố NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>

RAG_MATCH_THRESHOLD=0.35
RAG_MATCH_COUNT=5
```

Không commit `.env`. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` được dùng ở
browser và chịu kiểm soát bởi RLS. `SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng
trong API route phía server; tuyệt đối không import nó vào Client Component.

## 3. Tạo database

Trong Supabase Dashboard, mở **SQL Editor**, dán và chạy toàn bộ file
`supabase/migrations/001_document_rag.sql`. Sau khi chạy thành công, kiểm tra
Table Editor có bảng `public.documents`.

## 4. Dùng client có type

```ts
import { supabase } from '@/lib/supabase';
import type { Task } from '@/types';

const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('status', 'todo');

const tasks = data as Task[] | null;
```

## 5. Tạo task

```ts
const { data, error } = await supabase
  .from('tasks')
  .insert({
    title: 'Thiết kế luồng onboarding',
    assignee_id: userId,
  })
  .select()
  .single();
```

## 6. Semantic search documents

```ts
const { data, error } = await supabase.rpc('match_documents', {
  query_embedding: embedding,
  filter_project_id: projectId,
  match_threshold: 0.35,
  match_count: 5,
});
```

`embedding` là mảng `number[]` gồm 1536 phần tử từ model embedding tương thích. Tạo embedding bằng server route hoặc Server Action để không lộ `OPENAI_API_KEY`.

`filter_project_id` là bắt buộc trong migration RAG để tài liệu của project này
không xuất hiện trong kết quả tìm kiếm của project khác.

## 7. Phân quyền

Trước khi mở app cho người dùng, bật Row Level Security và thêm policies cho
từng bảng trong Supabase Dashboard. Không đưa `service_role` key vào mã
frontend. Feature RAG hiện gọi Supabase từ API route bằng service-role key trong
`.env`; khi auth hoàn thiện, cần kiểm tra membership của `projectId` trước mỗi
request.
