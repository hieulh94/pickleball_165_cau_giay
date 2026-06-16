interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...' }: SearchInputProps) {
  return (
    <div className="relative w-full">
      <SearchIcon />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
      />
    </div>
  )
}
