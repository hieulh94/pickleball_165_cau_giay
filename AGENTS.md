# AGENTS.md — Pickleball 165 Cầu Giấy

Hướng dẫn cho AI agent khi làm việc trong repo này. Đọc file này trước khi sửa code. Chi tiết setup Firebase/deploy: xem `README.md`.

## Mục tiêu dự án

Web app tổ chức **mini game pickleball** nội bộ CLB: tạo event, thêm người chơi, ghép cặp đôi, chia bảng, sinh lịch vòng bảng theo sân, nhập kết quả, bảng xếp hạng và vòng playoff. Dữ liệu lưu **Firebase Firestore**, đồng bộ realtime giữa nhiều thiết bị.

## Tech stack

| Layer | Công nghệ |
|-------|-----------|
| UI | React 19, TypeScript, Tailwind CSS 4 (`@tailwindcss/vite`) |
| Build | Vite 8 |
| Routing | react-router-dom 7 |
| Backend | Firestore (không có server riêng) |

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build → dist/
npm run lint
npm run preview
```

Env (copy từ `.env.example`): `VITE_FIREBASE_*` — **không commit** `.env`.

## Cấu trúc thư mục

```
src/
  main.tsx, App.tsx          # Entry, routes
  pages/
    HomePage.tsx             # Danh sách event, tạo/xóa, join bằng mã
    EventPage.tsx            # Toàn bộ flow 1 event (file lớn ~1100+ dòng)
  components/                # UI tái sử dụng (dialog, playoff, BXH, wheel...)
  lib/                       # Logic thuần — ưu tiên đặt nghiệp vụ ở đây
  types/index.ts             # PickleballEvent, Participant, Pair, Match
firestore.rules              # Rules Firestore (publish trên Console)
vercel.json                  # SPA rewrite → index.html
```

## Routing

- `/` → `HomePage`
- `/event/:id` → `EventPage`
- Layout chung: `components/Layout.tsx`

## Model dữ liệu (`src/types/index.ts`)

- **Participant**: `skillLevel` chỉ `1 | 2`
- **Pair**: hai `playerId`, optional `group` (tên bảng, VD `Bảng A`), `isManual` / `locked` cho ghép tay
- **Match**: `round`, `court`, `phase` (`group` | `playoff`), `completed`, điểm `score1`/`score2`
- **PickleballEvent**: document Firestore; gồm `accessCode`, `accessPassword`, `splitGroups`, `groupCount`, `courts[]`, `participants`, `pairs`, `matches`

Firestore: collection `events`, document id = `event.id`. Schema mô tả trong `README.md`.

## Luồng nghiệp vụ & file logic

| File | Trách nhiệm |
|------|-------------|
| `lib/storage.ts` | `subscribeEvents`, `subscribeEvent`, `upsertEvent`, `deleteEvent`; migrate `courtCount` → `courts[]`; chuẩn hóa `accessCode` uppercase |
| `lib/firebase.ts` | Init app, `isFirebaseConfigured()`, `getDb()` |
| `lib/pairing.ts` | `randomPairs`: ghép chéo trình độ 1↔2 (số lượng hai level phải bằng nhau), hoặc shuffle thuần; `shuffleArray`, `getPairLabel` |
| `lib/groups.ts` | Chia bảng A–Z (`MIN_GROUP_COUNT` 2, `MAX_GROUP_COUNT` 26), `applyGroupsToPairs` |
| `lib/schedule.ts` | `generateSchedule`: round-robin trong từng bảng, gói theo số sân; chèn vòng nghỉ nếu không thể tránh cặp đá liên tiếp (VD 4 cặp / 1 sân) |
| `lib/matches.ts` | `isGroupMatch` / `isPlayoffMatch` — playoff **không** tính BXH |
| `lib/standings.ts` | `calculateStandings`, xếp hạng: thắng → hiệu số → điểm ghi |
| `lib/pairColors.ts` | Màu thẻ cặp theo số thứ tự |

**Quy tắc ghép cặp:** Có cả level 1 và 2 → mỗi cặp gồm 1 người mỗi level. Chỉ một level → ghép ngẫu nhiên trong nhóm.

**Lịch đấu:** User nhập danh sách số sân cụ thể (VD `1, 3, 5`), không chỉ “số lượng sân”.

## Realtime & persistence

- UI subscribe Firestore qua `onSnapshot`; mọi thay đổi lưu bằng `upsertEvent` (full document `setDoc`).
- `removeUndefined` trước khi ghi — Firestore không chấp nhận `undefined`.
- Không có optimistic locking; concurrent edit có thể ghi đè.

## Bảo mật event (client-side)

- Mỗi event có `accessCode` (6 ký tự, auto) và optional `accessPassword`.
- `HomePage` / `EventPage`: join/quản lý/xóa có thể yêu cầu mật khẩu qua `EventCodeDialog`.
- Firestore rules hiện **open read/write** (`firestore.rules`) — phù hợp link nội bộ; không coi là bảo mật thật.

## UI & copy

- Giao diện và thông báo lỗi **tiếng Việt**.
- Theme xanh lá (`green`/`emerald`), `max-w-5xl` container.
- `EventPage` dùng `CollapsibleSection` cho các khối (người chơi, cặp, lịch, BXH, playoff).
- `FirebaseSetupNotice` khi thiếu env.

## Quy ước code

- Functional components + hooks; không class components.
- Logic tính toán đặt trong `src/lib/`, page chủ yếu orchestration + state.
- ID mới: `crypto.randomUUID()`.
- Types dùng từ `src/types/index.ts`; không duplicate interface.
- Styling: Tailwind utility classes inline; không CSS module riêng (trừ `index.css` global).

## Khi sửa code — lưu ý

1. Đổi shape `PickleballEvent` → cập nhật `types`, `storage.ts` migrate nếu cần, và docs trong `README.md`.
2. Trận `phase: 'playoff'` phải tiếp tục loại khỏi BXH (`standings.ts` / `isGroupMatch`).
3. `EventPage.tsx` rất lớn: tách component/lib mới thay vì nhồn thêm hàng trăm dòng nếu có thể.
4. Không hardcode Firebase credentials; không commit `.env`.
5. Sau đổi rules/schema Firestore, nhắc publish `firestore.rules` trên Console.

## File tham chiếu nhanh

| Nhu cầu | File |
|---------|------|
| Tạo/sửa type | `src/types/index.ts` |
| CRUD + subscribe | `src/lib/storage.ts` |
| Trang chi tiết event | `src/pages/EventPage.tsx` |
| Trang chủ | `src/pages/HomePage.tsx` |
| Playoff UI | `src/components/PlayoffSection.tsx` |
| Nhập kết quả | `src/components/ResultDialog.tsx` |
| Deploy / Firebase setup | `README.md` |
