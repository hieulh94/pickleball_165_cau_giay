# Pickleball 165 Cầu Giấy - Mini Game

Website tổ chức mini game pickleball và showmatch tuần: tạo event, ghép cặp đôi, chia bảng, lịch thi đấu và cập nhật kết quả.

Dữ liệu lưu trên **Firebase Firestore** — đồng bộ giữa mọi thiết bị khi deploy.

## Tính năng

- **Tạo Event** — Mini game hoặc showmatch tuần (mỗi tuần một event showmatch)
- **Showmatch tuần** — Ghép cặp tay, lên lịch Bo3 (chạm 2), nhập điểm từng ván (không BXH)
- **Highlight tuần** — Carousel vuốt ngang xem lịch showmatch theo từng tuần trên trang chủ
- **Người tham gia** — Thêm tên và trình độ (1 hoặc 2)
- **Random cặp đôi** — Ghép cặp không cùng trình độ
- **Chia bảng đấu** — Checkbox để chia cặp vào các bảng A, B, C...
- **Lịch thi đấu** — Nhập số sân cụ thể (VD: 1, 3, 5) rồi tạo lịch vòng bảng
- **Cập nhật kết quả** — Dialog nhập điểm + xác nhận trước khi lưu
- **Bảng xếp hạng** — Tự động cập nhật theo kết quả trận đấu

---

## Bước 1: Tạo project Firebase (làm 1 lần)

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → đặt tên (VD: `pickleball-165-cau-giay`)
3. Tắt Google Analytics nếu không cần → **Create project**

### Bật Firestore

1. Menu trái → **Build** → **Firestore Database**
2. **Create database**
3. Chọn **Start in test mode** (dev) hoặc **production mode**
4. Chọn region gần VN: `asia-southeast1` (Singapore)
5. **Enable**

### Cấu hình Security Rules

1. Tab **Rules** trong Firestore
2. Dán nội dung file `firestore.rules` trong repo này
3. **Publish**

> Rules hiện tại cho phép mọi người đọc/ghi (phù hợp link nội bộ CLB). Sau này có thể bật **Authentication** để giới hạn quyền.

### Tạo Web App

1. Project Overview → biểu tượng **Web** `</>`
2. Đặt nickname (VD: `pickleball-web`) → **Register app**
3. Copy các giá trị `firebaseConfig` hiển thị trên màn hình

---

## Bước 2: Cấu hình project local

```bash
npm install
cp .env.example .env
```

Mở file `.env` và điền thông tin từ Firebase Console:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Chạy dev:

```bash
npm run dev
```

Mở `http://localhost:5173` — tạo event thử, vào Firebase Console → Firestore → collection `events` sẽ thấy dữ liệu.

---

## Bước 3: Deploy lên web (miễn phí)

### Vercel (gợi ý)

1. Push code lên GitHub
2. Vào [vercel.com](https://vercel.com) → **Import** repo
3. **Environment Variables** → thêm 6 biến `VITE_FIREBASE_*` giống file `.env`
4. **Deploy**

### Netlify

Tương tự Vercel: import repo, thêm env vars, build command `npm run build`, publish directory `dist`.

### Firebase Hosting (tuỳ chọn)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # chọn project, public folder: dist
npm run build
firebase deploy --only hosting
```

Nhớ thêm env vars khi build (Vercel/Netlify tự inject; Firebase Hosting cần `.env` lúc build).

---

## Cấu trúc dữ liệu Firestore

```
events (collection)
  └── {eventId} (document)
        ├── id
        ├── name
        ├── createdAt
        ├── eventType: 'tournament' | 'showmatch'  (mặc định tournament)
        ├── accessCode, accessPassword
        ├── splitGroups
        ├── courts: number[]
        ├── participants: [...]
        ├── pairs: [...]
        └── matches: [...]  (phase: group | playoff | showmatch; showmatch: scheduledAt, showmatchFormat, games[])
```

---

## Scripts

```bash
npm run dev      # Chạy local
npm run build    # Build production
npm run preview  # Xem bản build
```

---

## Xử lý lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| "Firebase chưa được cấu hình" | Tạo file `.env` từ `.env.example`, restart `npm run dev` |
| `Missing or insufficient permissions` | Publish rules trong Firestore (xem `firestore.rules`) |
| Deploy xong không có data | Thêm env vars trên Vercel/Netlify và deploy lại |
| Data không hiện | Kiểm tra Firestore đã bật, đúng `projectId` trong `.env` |
