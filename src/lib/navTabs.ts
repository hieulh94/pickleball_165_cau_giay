export type NavTab = 'overview' | 'matches' | 'leaderboard' | 'members' | 'settings'

/** Đường dẫn URL cho từng tab chính — copy link mở đúng tab. */
export const TAB_PATHS: Record<NavTab, string> = {
  overview: '/',
  matches: '/events',
  leaderboard: '/bxh',
  members: '/thanh-vien',
  settings: '/cai-dat',
}

const PATH_TO_TAB = new Map<string, NavTab>(
  (Object.entries(TAB_PATHS) as [NavTab, string][]).map(([tab, path]) => [path, tab]),
)

export function getTabPath(tab: NavTab): string {
  return TAB_PATHS[tab]
}

/** null = đang ở trang event chi tiết hoặc path không thuộc tab. */
export function getTabFromPath(pathname: string): NavTab | null {
  if (pathname.startsWith('/event/')) return null
  return PATH_TO_TAB.get(pathname) ?? null
}

export function isHomeTabPath(pathname: string): boolean {
  return getTabFromPath(pathname) !== null
}
