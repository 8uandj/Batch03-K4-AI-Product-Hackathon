# Feature Review Feedback

Ngay review: 2026-07-31

## 1. Ket luan tong quan

Repo hien tai da co hai feature co code that: `dashboard` va `document-rag`. Tuy nhien cac feature dang co dau hieu lech nhau ve contract va luong san pham. Truoc khi nhan them feature moi, PM nen chot lai data model trung tam cho workspace: `projects`, `project_members`, `documents`, `tasks`, `chat_rooms`, `chat_messages`, `risk_events`.

Theo `product-update-roadmap.md`, workflow dung nen la:

```text
Sign in -> Onboarding member -> PM tao project -> Invite team -> Upload docs
-> AI scan/tong hop -> PM chia task co AI goi y -> Team chat + Bot chat
-> Kanban execution -> AI remind/coaching/conflict support -> PM dashboard
```

Hien tai code moi dat duoc mot phan:

- PM Dashboard MVP: da co UI, stats, Red Flag, mock data, Supabase fetch.
- Document RAG/Bot Chat MVP: da co upload, chunk, mock retrieval, API chat/documents, page `/project/[id]/chat`.
- Chua co Auth/Login thuc te.
- Chua co Project/Invite contract.
- Chua co Kanban Board thuc te.
- Chua co Team Chat rieng.
- Chua co EQ Radar nang cao, reminder, conflict support.

## 2. Feedback cho feature `document-rag` / branch `role-2`

### Diem da lam tot

- Co cau truc feature rieng tai `src/features/document-rag`, dung huong feature-based architecture.
- Co UI upload document va chat bot tai `/project/[id]/chat`.
- Co API route rieng:
  - `POST /api/projects/[id]/documents`
  - `POST /api/projects/[id]/chat`
- Co mock mode `RAG_MODE=mock`, giup demo UI/RAG flow khi chua co OpenAI/Supabase service role.
- Co server-side separation cho OpenAI key va Supabase service role trong `clients.ts`, khong dua service role vao client component.
- Co README feature giai thich flow upload -> chunk -> embedding -> retrieve -> answer.
- Build hien tai pass va route moi da xuat hien trong Next build.

### Van de can sua truoc khi nghiem thu production

1. Data contract `documents` dang xung dot voi schema goc.

`supabase/schema.sql` hien co:

```sql
documents(id, content, embedding, created_at)
match_documents(query_embedding, match_threshold, match_count)
```

Migration RAG lai can:

```sql
documents(id, project_id, source_id, filename, chunk_index, content, embedding, metadata, created_at)
match_documents(query_embedding, filter_project_id, match_threshold, match_count)
```

Neu chay `schema.sql` truoc, migration `create table if not exists public.documents (...)` se khong them cot moi. Ket qua: RAG production se fail khi insert `project_id`, `source_id`, `filename`, `chunk_index`.

Yeu cau sua: PM/infra can hop nhat schema documents thanh mot contract duy nhat, hoac migration phai dung `alter table add column if not exists`.

2. `src/types/index.ts` chua cap nhat contract RAG.

Type `Document` va `Database.Functions.match_documents` van theo schema cu, khong co `project_id`, `filename`, `chunk_index`, `metadata`, `filter_project_id`. Feature RAG dang cast thu cong o repository, nen team khac se khong co contract chung de dung.

Yeu cau sua: cap nhat `src/types/index.ts` sau khi schema documents duoc chot.

3. UI RAG da duoc chuan hoa lai bang Tailwind truc tiep.

Cac class custom bi thieu nhu `rag-shell`, `chat-panel`, `upload-card`, `primary-button` da duoc loai bo khoi source. Component hien khong con phu thuoc CSS global bi that lac khi merge branch.

4. Chua co auth/project membership guard.

API nhan `projectId` tu URL va dung service role khi `RAG_MODE=supabase`, nhung chua xac thuc user co thuoc project do hay khong. Day la rui ro lon khi bat production.

Yeu cau sua: truoc production, route handler phai check Supabase Auth session va membership trong `project_members`.

5. Bot Chat va Team Chat dang bi tron concept.

Roadmap yeu cau 2 chat space:

- Team Chat: thanh vien noi chuyen voi nhau.
- Bot Chat: hoi dap AI/RAG.

Feature hien tai chi co Bot Chat o `/project/[id]/chat`. Ten route co the gay hieu nham vi sau nay Team Chat cung can route chat.

De xuat: doi structure sau khi co contract:

```text
/project/[id]/chat/team
/project/[id]/chat/bot
```

Hoac:

```text
/project/[id]/team-chat
/project/[id]/bot-chat
```

6. Mock store chi nam trong memory process.

`mock-store.ts` dung global memory. OK cho demo, nhung reload server se mat data, serverless/Vercel co the reset bat ky luc nao.

Yeu cau: README can noi ro mock chi dung local demo. Production bat buoc chay Supabase mode.

7. Security/ops can bo sung.

- Can validate MIME/extension ky hon neu cho upload production.
- Can rate limit upload/chat route.
- Can gioi han history/message length.
- Can log source/chunk/error co trace id, khong log content nhay cam.

### Trang thai nghiem thu de xuat

- MVP demo local/mock: Co the chap nhan tam.
- Production-ready: Chua dat.
- Viec can lam tiep: add auth guard, tach Bot Chat/Team Chat contract, verify Supabase migration tren DB that.

## 3. Feedback cho feature `dashboard`

### Diem da lam tot

- Co UI Dashboard MVP dung `features/dashboard`.
- Co Progress Bar Done/Total.
- Co Red Flag card va icon canh bao.
- Co logic tinh status count `todo | doing | done`.
- Co logic Red Flag cho task `doing` qua 48 gio.
- Co mock data dung yeu cau demo.
- Co fetch Supabase live tu bang `tasks`, fallback mock khi loi.
- Co test unit cho analytics; hien tai 6/6 pass.

### Van de can sua sau khi co project/member contract

1. Dashboard chua project-scoped.

Hien tai fetch toan bo `tasks`, khong loc theo `project_id`. Khi co nhieu project, PM se thay lan du lieu.

Yeu cau: sau khi them `projects/tasks.project_id`, dashboard phai filter theo project hoac theo PM scope.

2. `assigneeName` dang fallback thanh `assignee_id`.

`tasks` chi co `assignee_id`, dashboard chua join sang `users.name`. UI hien `Phu trach: <uuid>` se khong tot.

Yeu cau: sau khi chot user/project_members, query tasks kem assignee profile.

3. Red Flag chi dua vao `updated_at > 48h`.

Roadmap sau nay can overdue dua tren `due_at`, workload, stress/risk trend, reminder action log. Logic hien tai dat MVP nhung chua du cho EQ Radar.

4. Dashboard UI dang nam trong page wrapper rieng.

Component Dashboard render `<main className="min-h-screen...">` ben trong RootLayout da co `<main>`. Khong nghiem trong, nhung ve semantic/layout nen doi thanh `<section>` hoac wrapper div de tranh nested main.

### Trang thai nghiem thu de xuat

- MVP dashboard: Dat.
- Production multi-project/team-health: Chua dat.
- Viec can lam tiep: project scope, assignee join, due date risk, workload/risk_events.

## 4. Feedback ve kien truc tong the

### Van de lon nhat: thieu core workspace contract

Cac feature dang bat dau tao route/data rieng nhung chua co nen mong chung:

- `projects`
- `project_members`
- `project_invites`
- `chat_rooms`
- `chat_messages`
- `risk_events`
- `ai_summaries`
- `ai_recommendations`

Neu tiep tuc cho dev lam feature rieng, moi nguoi se tu dinh nghia `projectId`, documents, chat, role theo cach rieng va se rat kho merge.

### De xuat truoc khi nhan feature moi

1. PM/infra chot schema proposal cho core workspace.
2. Cap nhat `supabase/schema.sql` va `src/types/index.ts` mot lan co kiem soat.
3. Tao docs `docs/api-contracts.md` mo ta bang, route, owner.
4. Yeu cau moi teammate implement theo contract do.
5. Chi merge feature neu khong tu y sua/xoa package config, layout, schema goc.

## 5. Checklist feedback gui teammate

### Cho Dev RAG / role-2

- Feature co effort tot va dung huong Bot Chat/Knowledge Hub.
- UI missing CSS da duoc chuan hoa lai bang Tailwind truc tiep.
- Can dong bo schema `documents` va `match_documents` voi schema goc.
- Can cap nhat `src/types/index.ts` cho RAG contract.
- Can them auth/project membership guard truoc production.
- Can tach ro Bot Chat voi Team Chat trong route/UX.

### Cho Dev Dashboard

- MVP dat yeu cau da giao.
- Can doi nested `<main>` thanh section/div khi refine layout.
- Can project scope va assignee join khi co schema moi.
- Can mo rong Red Flag tu `updated_at > 48h` sang due date/workload/risk event.

### Cho ca team

- Khong merge thang branch dua tren nen cu neu diff xoa file nen.
- Khong tu y doi/xoa `package.json`, `layout.tsx`, `schema.sql`, `types/index.ts` neu khong phai owner.
- Feature nao cung phai co mock mode, loading/error/empty state, lint/build pass.
- PR phai kem route test va acceptance criteria.
