import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-green-100 bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
              P
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Pickleball 165 Cầu Giấy</h1>
              <p className="text-xs text-green-100">Tổ chức Mini Game</p>
            </div>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
