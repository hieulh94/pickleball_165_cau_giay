const STORAGE_KEY = 'pickleball_settings_access'

/** Mật khẩu tab Cài đặt (client-side, nội bộ CLB). */
export const SETTINGS_ACCESS_PASSWORD =
  import.meta.env.VITE_SETTINGS_ACCESS_PASSWORD ??
  import.meta.env.VITE_MEMBERS_ACCESS_PASSWORD ??
  'Mothaiba@123'

export function isSettingsAccessGranted(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function grantSettingsAccess(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // sessionStorage có thể bị chặn — bỏ qua
  }
}

export function verifySettingsPassword(password: string): boolean {
  return password === SETTINGS_ACCESS_PASSWORD
}
