# Supabase setup cho Nexus AI

## 1. Cài thư viện

```bash
npm install @supabase/supabase-js
```

## 2. Tạo biến môi trường

Copy file mẫu và điền key được PM chia sẻ qua kênh bảo mật:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
OPENAI_API_KEY=<server-only-openai-key>
```

Không commit `.env.local`. Chỉ dùng `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ở browser; không dùng `service_role` key trong frontend.

## 3. Tạo database

Trong Supabase Dashboard, mở **SQL Editor**, dán và chạy `supabase/schema.sql`.

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
  match_threshold: 0.7,
  match_count: 5,
});
```

`embedding` là mảng `number[]` gồm 1536 phần tử từ model embedding tương thích. Tạo embedding bằng server route hoặc Server Action để không lộ `OPENAI_API_KEY`.

## 7. Phân quyền

Trước khi mở app cho người dùng, bật Row Level Security và thêm policies cho từng bảng trong Supabase Dashboard. Không đưa `service_role` key vào `.env.local` phía frontend hoặc mã client.
