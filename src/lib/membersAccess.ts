const STORAGE_KEY = 'pickleball_members_access'

/** Mật khẩu xem danh sách thành viên (client-side, nội bộ CLB). */
export const MEMBERS_ACCESS_PASSWORD =
  import.meta.env.VITE_MEMBERS_ACCESS_PASSWORD ?? 'Mothaiba@123'

export function isMembersAccessGranted(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function grantMembersAccess(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // sessionStorage có thể bị chặn — bỏ qua
  }
}

export function verifyMembersPassword(password: string): boolean {
  return password === MEMBERS_ACCESS_PASSWORD
}
