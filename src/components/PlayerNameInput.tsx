import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { filterClubPlayers } from '../lib/clubPlayers'
import { formatParticipantName, normalizeParticipantName } from '../lib/showmatchParticipants'
import { PlayerPickerDialog } from './PlayerPickerDialog'

interface PlayerNameInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  excludedNames?: string[]
  extraNames?: string[]
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

const MAX_SUGGESTIONS = 8

function buildSuggestions(
  query: string,
  extraNames: string[],
  excludedNames: string[],
): string[] {
  const normalizedQuery = normalizeParticipantName(query)
  if (!normalizedQuery) return []

  const excludedSet = new Set(excludedNames.map((name) => normalizeParticipantName(name)))
  const seen = new Set<string>()
  const results: string[] = []

  const addName = (name: string) => {
    const formatted = formatParticipantName(name)
    const key = normalizeParticipantName(formatted)
    if (!key || excludedSet.has(key) || seen.has(key)) return
    if (!key.includes(normalizedQuery)) return
    seen.add(key)
    results.push(formatted)
  }

  for (const player of filterClubPlayers(query)) {
    addName(player.name)
    if (results.length >= MAX_SUGGESTIONS) return results
  }

  for (const name of extraNames) {
    addName(name)
    if (results.length >= MAX_SUGGESTIONS) return results
  }

  return results
}

export function PlayerNameInput({
  value,
  onChange,
  placeholder = 'Chọn hoặc nhập tên',
  className = '',
  excludedNames = [],
  extraNames = [],
  onKeyDown,
}: PlayerNameInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestions = useMemo(
    () => buildSuggestions(value, extraNames, excludedNames),
    [value, extraNames, excludedNames],
  )

  const showSuggestions = focused && value.trim().length > 0 && suggestions.length > 0

  useEffect(() => {
    setHighlightIndex(0)
  }, [value, suggestions.length])

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    }
  }, [])

  const selectSuggestion = (name: string) => {
    onChange(name)
    setFocused(false)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightIndex((index) => Math.min(index + 1, suggestions.length - 1))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightIndex((index) => Math.max(index - 1, 0))
        return
      }
      if (event.key === 'Enter' && suggestions[highlightIndex]) {
        event.preventDefault()
        selectSuggestion(suggestions[highlightIndex]!)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setFocused(false)
        return
      }
    }

    onKeyDown?.(event)
  }

  return (
    <>
      <div className="relative min-w-0 flex-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
              setFocused(true)
            }}
            onBlur={() => {
              blurTimeoutRef.current = setTimeout(() => setFocused(false), 150)
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className={
              className ||
              'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20'
            }
          />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            title="Chọn từ danh sách CLB"
          >
            Chọn
          </button>
        </div>

        {showSuggestions && (
          <ul className="absolute left-0 right-12 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {suggestions.map((name, index) => (
              <li key={name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(name)}
                  className={`w-full px-3 py-2 text-left text-sm ${
                    index === highlightIndex
                      ? 'bg-secondary-50 font-medium text-secondary-700'
                      : 'text-neutral-800 hover:bg-neutral-50'
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PlayerPickerDialog
        open={pickerOpen}
        excludedNames={excludedNames}
        onClose={() => setPickerOpen(false)}
        onSelect={onChange}
      />
    </>
  )
}
