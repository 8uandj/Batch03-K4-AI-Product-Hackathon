# Nexus AI

Nexus AI là workspace quản lý dự án dành cho PM và các team trẻ làm đồ án, hackathon hoặc startup giai đoạn đầu. Sản phẩm tập trung giải quyết 3 vấn đề chính: PM khó nắm năng lực thực tế để chia việc, thành viên ngại đọc tài liệu chung, và team thường ngại nhắc nhau khi có dấu hiệu trễ deadline hoặc quá tải.

Giá trị cốt lõi của Nexus AI là kết hợp IQ và EQ trong quản lý dự án: IQ để đọc tài liệu, gợi ý chia task, hỏi đáp RAG; EQ để theo dõi sức khỏe team, phát hiện Red Flag, và hỗ trợ PM can thiệp đúng lúc.

## MVP Scope

- Onboarding đa tầng: thu thập profile/CV, kỹ năng và câu trả lời EQ để AI hiểu năng lực/tính cách từng thành viên.
- Nexus Knowledge Hub: upload tài liệu, tạo embedding, hỏi đáp RAG theo ngữ cảnh dự án.
- Kanban Board: quản lý task theo trạng thái `todo`, `doing`, `done`, hỗ trợ kéo thả.
- PM Dashboard: thống kê tiến độ Done/Total và hiển thị Red Flag khi task `doing` quá 48 giờ.
- EQ Radar: theo dõi dấu hiệu trễ deadline/quá tải, làm nền tảng cho trợ lý nhắc nhở và coaching 1-1.

## Tech Stack

| Lớp (Layer) | Công nghệ lựa chọn |
| --- | --- |
| Framework chính | Next.js 14+ App Router + TypeScript |
| Giao diện (Styling) | Tailwind CSS |
| UI Components cơ bản | Shadcn/ui |
| UI/UX hiệu ứng AI | Aceternity UI hoặc Magic UI |
| Kéo thả Kanban | dnd-kit (`@dnd-kit/core`) |
| Icon & State | Lucide React + Zustand |
| Database & Auth | Supabase (PostgreSQL + pgvector) |
| AI Integration | Vercel AI SDK + LangChain.js |

> Trạng thái repo hiện tại đang dùng Next.js 16, React 19, Tailwind CSS 4 và Supabase JS. Các package chưa có trong `package.json` như dnd-kit, Zustand, Vercel AI SDK, LangChain.js sẽ được cài khi feature tương ứng bắt đầu implement.

## Yêu cầu môi trường

- Node.js 20+ (khuyến nghị dùng nvm). Repo hiện tại đã chạy được với Node 24.
- npm 10+.
- Python 3.10+ để chạy các script AI/RAG/ETL phụ trợ.
- Supabase project đã bật PostgreSQL + pgvector.
- OpenAI API key cho embedding/chat server-side.

Nếu terminal VSCode không nhận `npm`, hãy mở terminal login shell hoặc load nvm:

```bash
source ~/.nvm/nvm.sh
nvm use 24
npm --version
```

## Setup nhanh

```bash
cd nexus-ai
npm install
cp .env.example .env.local
```

Điền các biến môi trường trong `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
OPENAI_API_KEY=<server-only-openai-key>
```

Không commit `.env.local`. Không đưa `service_role` key vào frontend.

## Setup Python venv

Dùng venv cho các script phụ trợ như đọc PDF, xử lý tài liệu, tạo embedding offline hoặc seed data.

```bash
cd nexus-ai
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Trên Windows PowerShell:

```powershell
cd nexus-ai
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Setup Supabase

1. Tạo project trên Supabase.
2. Mở SQL Editor.
3. Chạy toàn bộ file `supabase/schema.sql`.
4. Copy Project URL và Publishable Key vào `.env.local`.
5. Đảm bảo `vector` extension đã bật thành công.

Schema hiện tại gồm:

- `users`: profile, skills, EQ answers.
- `documents`: nội dung tài liệu và embedding `vector(1536)`.
- `tasks`: task Kanban với status `todo | doing | done`.
- `match_documents`: RPC similarity search cho RAG.

Ví dụ query task:

```ts
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('status', 'doing');
```

## Chạy dự án

```bash
npm run dev
```

Mở app tại:

```text
http://localhost:3000
```

Dashboard PM:

```text
http://localhost:3000/pm-dashboard
```

## Lệnh kiểm tra

```bash
npm run lint
npm run build
node --test src/features/dashboard/dashboard-analytics.test.ts
```

`node --test` có thể hiện warning `MODULE_TYPELESS_PACKAGE_JSON`; hiện tại test vẫn pass. Khi team chuẩn hóa test runner, có thể chuyển sang Vitest hoặc thêm config ESM riêng.

## Cấu trúc thư mục

```text
nexus-ai/
├── docs/                  # Tài liệu sản phẩm, Lean Canvas, setup notes
├── supabase/              # SQL schema và database contracts
├── src/
│   ├── app/               # App Router pages/layout
│   │   └── pm-dashboard/  # Dashboard dành cho PM
│   ├── components/        # UI dùng chung
│   │   ├── ui/            # Shadcn/ui primitives
│   │   └── shared/        # Sidebar, Header, layout shared
│   ├── features/          # Code nghiệp vụ tách theo domain
│   │   ├── dashboard/     # PM dashboard, stats, Red Flags
│   │   ├── onboarding/    # Dev 1: profile/CV/EQ onboarding
│   │   ├── document-rag/  # Dev 2: Knowledge Hub/RAG
│   │   ├── kanban-board/  # Dev 3: board kéo thả task
│   │   └── eq-radar/      # PM/EQ health insights
│   ├── lib/               # Supabase client, utils, AI config
│   └── types/             # TypeScript interfaces/Database contract
└── requirements.txt       # Python dependencies cho script phụ trợ
```

## Quy ước làm việc cho team

- Route trong `src/app` chỉ nên gọi feature, không nhét logic nghiệp vụ trực tiếp vào page.
- Logic nghiệp vụ đặt trong `src/features/<feature>`.
- Component dùng chung đặt trong `src/components`; component riêng của feature đặt trong feature đó.
- Type dùng chung cập nhật tại `src/types/index.ts` trước khi các dev tích hợp API.
- Supabase schema thay đổi thì cập nhật `supabase/schema.sql`, `src/types/index.ts` và README nếu ảnh hưởng setup.
- Không commit `.env.local`, `.venv`, `.next`, key riêng, hoặc service role key.

## Tài liệu liên quan

- `docs/Lean Canvas_ Nexus AI (v1.0 MVP).pdf`: mô tả bài toán, khách hàng, UVP và MVP.
- `docs/supabase-setup.md`: hướng dẫn Supabase chi tiết hơn.
- `supabase/schema.sql`: schema chuẩn để khởi tạo database.
