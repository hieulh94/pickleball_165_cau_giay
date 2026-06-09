import type { Match } from '../types'

export function isPlayoffMatch(match: Match): boolean {
  return match.phase === 'playoff'
}

export function isShowMatch(match: Match): boolean {
  return match.phase === 'showmatch'
}

export function isGroupMatch(match: Match): boolean {
  return match.phase !== 'playoff' && match.phase !== 'showmatch'
}

export function filterGroupMatches(matches: Match[]): Match[] {
  return matches.filter(isGroupMatch)
}

export function filterPlayoffMatches(matches: Match[]): Match[] {
  return matches.filter(isPlayoffMatch)
}

export function filterShowMatches(matches: Match[]): Match[] {
  return matches.filter(isShowMatch)
}
