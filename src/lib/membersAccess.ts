const STORAGE_KEY = 'pickleball_members_access'

export type MembersAccessLevel = 'view' | 'edit'

/** Mật khẩu quản lý thành viên (client-side, nội bộ CLB). */
export const MEMBERS_ACCESS_PASSWORD =
  import.meta.env.VITE_MEMBERS_ACCESS_PASSWORD ?? 'Mothaiba@123'

/** Mật khẩu chỉ xem danh sách — không thêm/sửa/xóa/đồng bộ. */
export const MEMBERS_VIEW_PASSWORD = '0'

export function getMembersAccessLevel(): MembersAccessLevel | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    if (value === 'edit' || value === '1') return 'edit'
    if (value === 'view') return 'view'
    return null
  } catch {
    return null
  }
}

export function isMembersAccessGranted(): boolean {
  return getMembersAccessLevel() !== null
}

export function isMembersEditGranted(): boolean {
  return getMembersAccessLevel() === 'edit'
}

export function grantMembersAccess(level: MembersAccessLevel = 'edit'): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, level)
  } catch {
    // sessionStorage có thể bị chặn — bỏ qua
  }
}

export function verifyMembersPassword(
  password: string,
): MembersAccessLevel | null {
  if (password === MEMBERS_ACCESS_PASSWORD) return 'edit'
  if (password === MEMBERS_VIEW_PASSWORD) return 'view'
  return null
}
