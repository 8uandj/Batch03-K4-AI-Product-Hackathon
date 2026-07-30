# Nexus AI Product Update Roadmap

## 1. Product Vision

Nexus AI se phat trien thanh workspace quan ly du an kieu Jira, nhung co AI dong hanh trong toan bo vong doi du an: tu dang ky thanh vien, onboarding nang luc, khoi tao du an, moi thanh vien, nap tai lieu, tom tat tri thuc, goi y chia viec, ho tro hoi dap, nhac deadline, dieu phoi conflict, den dashboard suc khoe team cho PM.

Muc tieu MVP khong phai lam day du Jira, ma tao duoc mot workflow lien mach:

```text
Sign in -> Onboarding member -> PM tao project -> Invite team -> Upload docs
-> AI scan/tong hop -> PM chia task co AI goi y -> Team chat + Bot chat
-> Kanban execution -> AI remind/coaching/conflict support -> PM dashboard
```

## 2. Nguyen tac cap nhat

- Khong sua truc tiep code feature dang giao cho dev khac neu chua co yeu cau review/fix ro rang.
- PM/tech lead uu tien lam nen mong: deploy, database contract, type contract, route shell, docs, acceptance criteria va integration checklist.
- Moi feature merge vao `main` phai co it nhat: UI state co mock, data access/API, type contract, empty/loading/error state, va lint/build pass.
- Moi release chi them mot nang luc chinh de de debug va demo.
- Neu branch dev dua tren nen cu, khong merge thang khi diff co nguy co xoa config/layout/package. Lay noi dung feature co chon loc roi tao merge commit an toan.

## 3. Phase 0: Auto-Deploy Vercel truoc khi release feature

Chi tiet thao tac nam trong `docs/vercel-auto-deploy.md`.

Muc tieu: moi branch/PR co Preview Deployment, merge vao `main` se co Production Deployment. Team co link de test tung tinh nang truoc khi nghiem thu.

### 3.1 Vercel project settings

- Import GitHub repo `8uandj/Batch03-K4-AI-Product-Hackathon` vao Vercel.
- Vi app nam trong monorepo folder `nexus-ai`, dat Root Directory la `nexus-ai`.
- Framework Preset: Next.js.
- Production Branch: `main`.
- Install Command: `npm install` hoac mac dinh cua Vercel.
- Build Command: `npm run build`.
- Output Directory: de mac dinh cho Next.js.

### 3.2 Environment variables tren Vercel

Them cho ca Preview va Production:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

Khong them `SUPABASE_SERVICE_ROLE_KEY` vao frontend runtime. Neu can service role cho server job, chi them server-only env va chi dung trong Route Handler/Server Action.

### 3.3 Release policy

- `main` la production branch.
- Moi dev lam tren branch rieng: `feature/onboarding`, `feature/document-rag`, `feature/kanban-board`, `feature/chat-space`.
- Push branch se tao Preview Deployment.
- PM test Preview URL truoc khi merge.
- Merge vao `main` chi khi `npm run lint` va `npm run build` pass.
- Moi release tag nen theo dang `release/mvp-0.x` hoac Git tag `v0.x.0` neu can demo checkpoint.

### 3.4 Definition of Done cho deploy

- Vercel da tao project thanh cong voi Root Directory `nexus-ai`.
- Preview Deployment chay duoc khi push mot branch test.
- Production Deployment chay duoc khi merge/push `main`.
- Env vars da cau hinh cho Preview va Production.
- README hoac docs co link production sau khi co domain.

## 4. Phase 1: Chuan hoa data contract cho workspace

Muc tieu: mo rong schema hien co thanh contract du de cac feature lam song song ma khong dam chan nhau.

### 4.1 Bang hien co

- `users`: ho so thanh vien, skills, eq_answers.
- `documents`: noi dung tai lieu, embedding pgvector.
- `tasks`: task Kanban voi status `todo | doing | done`.
- `match_documents`: RPC search tai lieu bang vector.

### 4.2 Bang can thiet ke tiep theo

De xuat bo sung sau khi team thong nhat contract:

- `projects`: du an do PM tao.
- `project_members`: thanh vien trong du an, role `pm | member`.
- `project_invites`: ma moi/email invite thanh vien.
- `documents.project_id`: gan tai lieu vao du an.
- `tasks.project_id`: gan task vao du an.
- `tasks.due_at`, `tasks.priority`, `tasks.description`: phuc vu deadline va goi y chia viec.
- `chat_rooms`: phan biet `team` va `bot` chat space.
- `chat_messages`: luu lich su tin nhan team/bot.
- `ai_summaries`: luu tom tat tai lieu, project brief, member insight.
- `ai_recommendations`: goi y chia viec va ly do.
- `risk_events`: Red Flag, overdue, overload, conflict, burnout signal.

### 4.3 Viec PM/tech lead co the lam ma khong dung feature dev

- Viet SQL proposal trong file migration rieng, chua apply neu team chua confirm.
- Cap nhat `src/types/index.ts` sau khi schema duoc duyet.
- Viet docs API contract cho tung bang trong `docs/api-contracts.md`.
- Tao seed/mock data chung cho demo neu khong conflict voi feature owner.

## 5. Phase 2: Auth, roles va onboarding flow

Owner chinh: Dev onboarding/auth.

Pham vi san pham:

- User sign up/login bang Supabase Auth.
- User moi khai bao profile, skills, CV va tra loi cau hoi EQ.
- He thong chuyen profile thanh structured data cho AI dung ve sau.

Acceptance criteria:

- Co route login/sign up.
- Co onboarding form nhap thong tin co ban, skills, EQ answers.
- Co upload CV hoac mock CV ingestion.
- Data luu vao `users` hoac bang profile lien quan.
- User login xong vao duoc workspace.
- Co empty/loading/error state.

Ranh gioi khong nen dung khi PM lam nen mong:

- Khong sua UI form onboarding khi dev dang lam.
- Chi cung cap contract: field nao can co, type nao can export, policy nao can bat.

## 6. Phase 3: Project workspace va invite member

Owner co the tach rieng hoac PM/tech lead lam nen mong.

Pham vi san pham:

- PM tao project moi.
- PM invite thanh vien vao project.
- Thanh vien nhan invite va join workspace.
- Sidebar/dashboard hien theo project context.

Acceptance criteria:

- Co `projects` va `project_members` contract.
- PM co role `pm` trong project minh tao.
- Member chi thay project da join.
- Route du kien: `/project/[id]/board`, `/project/[id]/chat`, `/project/[id]/documents`, `/pm-dashboard`.

## 7. Phase 4: Document RAG va Project Knowledge Hub

Owner chinh: Dev document-rag.

Pham vi san pham:

- PM upload tai lieu lien quan den project.
- AI scan, chunk, embedding, va luu vao `documents`.
- AI tao project brief/tom tat tai lieu.
- Bot tra loi dua tren tai lieu da upload.

Acceptance criteria:

- Co UI upload/list documents.
- Co API upload/process documents.
- Co mock documents cho demo neu chua goi OpenAI.
- Co RPC/document search hoat dong voi `match_documents`.
- Bot tra loi co citation/tai lieu nguon o muc MVP.

Ranh gioi PM/tech lead:

- Co the cap nhat schema `documents.project_id` va docs contract.
- Khong implement UI upload neu dev RAG dang phu trach.

## 8. Phase 5: AI-assisted task assignment + Kanban execution

Owner chinh: Dev kanban-board, phoi hop RAG/onboarding.

Pham vi san pham:

- AI doc project brief + member profile de goi y chia task.
- PM accept/edit goi y thanh task Kanban.
- Thanh vien keo tha task giua `todo`, `doing`, `done`.
- Task co assignee, due date, priority.

Acceptance criteria:

- Co Kanban UI drag-drop.
- Co CRUD tasks voi Supabase.
- Co mock suggestion data truoc khi AI live.
- Co function tao recommendation dua tren skills/profile/docs.
- Task update ghi lai `updated_at` de dashboard/risk engine dung.

## 9. Phase 6: Two Chat Spaces

Owner co the tach thanh chat feature rieng, phoi hop RAG va EQ Radar.

Pham vi san pham:

- Team Chat: thanh vien trao doi voi nhau trong project.
- Bot Chat: thanh vien hoi AI ve tai lieu, task, project context.
- AI bot co the duoc mention trong Team Chat.
- AI nhan dien conflict signal o muc MVP bang rule/mock truoc, LLM sau.

Acceptance criteria:

- Co `chat_rooms` type `team | bot`.
- Co `chat_messages` voi sender la user hoac assistant.
- Bot Chat co the query RAG.
- Team Chat co UI rieng khong tron voi Bot Chat.
- Co mock conflict detection va message suggestion cho demo.

## 10. Phase 7: EQ Radar, reminder va PM dashboard nang cao

Owner chinh: dashboard/eq-radar.

Pham vi san pham:

- Quet task tre deadline hoac `doing` qua nguong.
- Gui reminder/coaching message cho member.
- Phat hien overload/conflict signal tu task + chat.
- Tong hop team health cho PM.
- Dashboard hien tien do, Red Flags, workload, stress/risk trend.

Da co trong repo:

- Dashboard UI MVP.
- Logic stats theo `todo | doing | done`.
- Logic Red Flag task `doing` qua 48 gio.
- Mock data cho demo.
- Supabase live fetch tu bang `tasks`.

Can bo sung sau:

- Due date based overdue, khong chi dua vao `updated_at`.
- Workload per member.
- Risk event history.
- Reminder action log.
- Conflict/coaching summary.

## 11. Suggested Release Train

### Release 0.1: Deployable Shell

- Auto-deploy Vercel.
- Production URL hoat dong.
- README/docs setup day du.
- Layout, Supabase client, schema/types, PM dashboard MVP.

### Release 0.2: Auth + Onboarding MVP

- Login/sign up.
- Member profile + skills + EQ answers.
- Mock CV ingestion.

### Release 0.3: Project + Invite MVP

- PM tao project.
- Invite/join member.
- Project-scoped routes.

### Release 0.4: Knowledge Hub MVP

- Upload/list documents.
- AI summary mock/live.
- Bot chat can answer from documents.

### Release 0.5: Kanban + AI Assignment MVP

- Kanban CRUD/drag-drop.
- AI suggested task assignment.
- Accept/edit suggestions.

### Release 0.6: Team Chat + Bot Chat

- Team chat room.
- Bot chat room.
- Mention bot in team chat.

### Release 0.7: EQ Radar Advanced

- Reminder/coaching events.
- Conflict signals.
- PM dashboard workload/risk insight.

## 12. PM Checklist truoc moi lan merge

- Feature co dung folder ownership khong?
- Co dung `src/types/index.ts` contract khong?
- Co Supabase query an toan, khong dung service role o client khong?
- Co mock data de demo khi API/AI chua san sang khong?
- Co empty/loading/error state khong?
- GitHub Actions `Nexus AI CI` pass?
- `npm run lint` pass neu test local?
- `npm run build` pass neu test local?
- Vercel Preview URL test duoc khong?
- Neu dat yeu cau, moi merge vao `main` de release Production.

## 13. Immediate Next Actions

1. Thiet lap Vercel Auto-Deploy voi Root Directory `nexus-ai`.
2. Cau hinh GitHub repository secrets cho `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`.
3. Tao mot branch test nho, push len GitHub va xac nhan GitHub Actions CI + Preview Deployment.
4. Merge/push `main` va xac nhan Production Deployment.
5. Sau khi deploy on dinh, moi chot schema proposal cho `projects`, `project_members`, `chat_rooms`, `chat_messages`, `risk_events`.
6. Giao tung dev tiep tuc feature theo acceptance criteria o tren.
