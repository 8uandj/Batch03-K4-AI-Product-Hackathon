# Nexus AI

Cấu trúc frontend được chia theo routing, UI dùng chung và nghiệp vụ độc lập:

```text
nexus-ai/
└── src/
    ├── app/                  # Routing và khai báo các trang
    │   ├── (auth)/login      # Dev 1
    │   ├── project/[id]/board# Dev 3
    │   ├── project/[id]/chat # Dev 2
    │   └── pm-dashboard/     # Khanh
    ├── components/
    │   ├── ui/               # Component shadcn/ui dùng chung
    │   └── shared/           # Navbar, Sidebar và layout dùng chung
    ├── features/
    │   ├── onboarding/       # Dev 1: components, hooks, API calls
    │   ├── document-rag/     # Dev 2
    │   ├── kanban-board/     # Dev 3
    │   └── dashboard/        # Khanh: tiến độ, EQ Radar và Red Flags
    ├── lib/                  # Supabase client, OpenAI config, utilities
    └── types/                # TypeScript interfaces và DB models dùng chung
```

## Quy ước

- Logic nghiệp vụ đặt trong `src/features/<feature>`, không đặt trực tiếp trong route.
- `src/app` chỉ phụ trách route/page và kết nối feature tương ứng.
- Component dùng chung đặt trong `src/components`; component chỉ dùng cho một feature đặt trong feature đó.
- Model dùng chung đặt trong `src/types` để các nhóm cùng sử dụng.

## Quy ước giao diện

- Dashboard dùng palette xanh–đỏ lấy cảm hứng từ logo VinUni; token tập trung
  trong `src/features/dashboard/theme.ts`.
- Màu đỏ chỉ dùng cho cảnh báo/rủi ro; màu xanh dùng cho điều hướng, tiến độ và
  thông tin trung tính.
- Giao diện phải nói rõ đang dùng dữ liệu mẫu hay Supabase thật.

## Kiểm tra logic Dashboard

```bash
node --test --experimental-strip-types \
  src/features/dashboard/dashboard-analytics.test.ts
```
