# Vercel Auto-Deploy Runbook

Tai lieu nay dung de thiet lap auto-deploy cho `nexus-ai` truoc khi team merge them cac feature moi.

## 1. Muc tieu

- Moi branch/PR tren GitHub co Preview Deployment rieng de PM va team test.
- Moi merge/push vao `main` tao Production Deployment.
- Deploy chi build app trong folder `nexus-ai`, khong build toan bo repository.
- Moi release moi chi them mot nang luc chinh de de rollback/debug.

## 2. Trang thai repo da chuan bi

Repo da co cac file ho tro Vercel:

- `vercel.json`: khai bao framework Next.js, install/build/dev command.
- `.vercelignore`: bo qua `.env.local`, `.next`, `node_modules`, `.venv` va file local-only.
- `.env.example`: danh sach env vars can cau hinh.

## 3. Tao Vercel project

1. Dang nhap Vercel bang tai khoan co quyen truy cap GitHub repo.
2. Chon **Add New... -> Project**.
3. Import repo `8uandj/Batch03-K4-AI-Product-Hackathon`.
4. O buoc cau hinh project, bam **Edit** tai **Root Directory**.
5. Chon folder:

```text
nexus-ai
```

6. Framework Preset: **Next.js**.
7. Production Branch: `main`.
8. Install Command: `npm install`.
9. Build Command: `npm run build`.
10. Output Directory: de mac dinh.
11. Bam **Deploy**.

## 4. Cau hinh Environment Variables

Vao **Project Settings -> Environment Variables** va them cac bien sau cho ca **Preview** va **Production**:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

Quy tac bao mat:

- `NEXT_PUBLIC_*` co the xuat hien o browser, chi dung publishable key.
- Khong bao gio dua Supabase `service_role` key vao client component.
- Neu sau nay can service role cho server job, dat ten rieng nhu `SUPABASE_SERVICE_ROLE_KEY` va chi doc trong Route Handler/Server Action.

## 5. GitHub Actions CI Gate

Repo co workflow `.github/workflows/nexus-ai-ci.yml` de chay `npm ci`, `npm run lint` va `npm run build` khi co PR/push anh huong `nexus-ai/**`.

Truoc khi merge feature vao `main`, PM nen kiem tra:

- GitHub Actions `Nexus AI CI` pass.
- Vercel Preview Deployment build pass.
- Preview URL render duoc route can demo.

CI co placeholder an toan de lint/build chay duoc khi chua co secrets. Neu muon CI build voi env that, them GitHub repository secrets trung ten voi Vercel env:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

## 6. Kiem tra Preview Deployment

Sau khi project da link voi GitHub:

1. Tao branch test:

```bash
git checkout -b chore/test-vercel-preview
```

2. Sua mot file docs nho hoac push branch khong doi code feature.
3. Push branch:

```bash
git push -u origin chore/test-vercel-preview
```

4. Mo GitHub Pull Request vao `main`.
5. Kiem tra Vercel comment/check tren PR.
6. Mo Preview URL va test cac route toi thieu:

```text
/
/pm-dashboard
```

7. Neu Preview build fail, doc log Vercel truoc khi merge.

## 7. Kiem tra Production Deployment

Khi Preview da pass:

1. Dam bao local pass:

```bash
npm run lint
npm run build
```

2. Merge PR vao `main`.
3. Vercel se tao Production Deployment tu branch `main`.
4. Mo Production URL va test:

```text
/
/pm-dashboard
```

5. Ghi Production URL vao README hoac team note neu can.

## 8. Release workflow de team lam feature

- Moi dev lam tren branch rieng, vi du:
  - `feature/onboarding`
  - `feature/document-rag`
  - `feature/kanban-board`
  - `feature/chat-space`
- Push branch se co Preview Deployment.
- PM review UI/flow tren Preview URL.
- Chi merge vao `main` khi:
  - GitHub Actions `Nexus AI CI` pass.
  - `npm run lint` pass neu test local.
  - `npm run build` pass neu test local.
  - Preview URL test duoc.
  - Feature khong sua nham folder owner cua team khac.
  - Env vars can thiet da co tren Vercel.

## 9. Troubleshooting nhanh

### Build fail vi thieu env

Kiem tra Vercel Project Settings -> Environment Variables. Them env cho dung moi truong Preview/Production roi redeploy.

### Build sai folder

Kiem tra Root Directory phai la:

```text
nexus-ai
```

Neu Root Directory la repo root, Vercel se khong thay `package.json` dung cua app.

### Dashboard loi Supabase

Kiem tra:

- `NEXT_PUBLIC_SUPABASE_URL` dung project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dung publishable key.
- Da chay `supabase/schema.sql` trong Supabase SQL Editor.
- Bang `tasks` co data hop le neu muon hien live dashboard.

### npm khong chay tren may local

Neu terminal khong nhan `npm`, load nvm:

```bash
source ~/.nvm/nvm.sh
nvm use 24
npm --version
```

## 10. Definition of Done

Auto-deploy duoc xem la xong khi co bang chung:

- Vercel project da link GitHub repo.
- Root Directory la `nexus-ai`.
- GitHub Actions `Nexus AI CI` pass tren PR/push.
- Preview Deployment duoc tao khi push branch/PR.
- Production Deployment duoc tao khi merge vao `main`.
- Env vars da set cho Preview va Production.
- `/` va `/pm-dashboard` render duoc tren Vercel.
