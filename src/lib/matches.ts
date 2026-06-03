import type { Match } from '../types'

export function isPlayoffMatch(match: Match): boolean {
  return match.phase === 'playoff'
}

export function isGroupMatch(match: Match): boolean {
  return match.phase !== 'playoff'
}

export function filterGroupMatches(matches: Match[]): Match[] {
  return matches.filter(isGroupMatch)
}

export function filterPlayoffMatches(matches: Match[]): Match[] {
  return matches.filter(isPlayoffMatch)
}
