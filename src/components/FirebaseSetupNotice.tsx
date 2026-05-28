export function FirebaseSetupNotice() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-950">
      <h3 className="font-semibold">Firebase chưa được cấu hình</h3>
      <p className="mt-2">
        Tạo file <code className="rounded bg-amber-100 px-1">.env</code> từ{' '}
        <code className="rounded bg-amber-100 px-1">.env.example</code>, điền thông tin
        project Firebase, rồi chạy lại <code className="rounded bg-amber-100 px-1">npm run dev</code>.
      </p>
      <p className="mt-2">
        Xem hướng dẫn chi tiết trong file <code className="rounded bg-amber-100 px-1">README.md</code>.
      </p>
    </div>
  )
}
