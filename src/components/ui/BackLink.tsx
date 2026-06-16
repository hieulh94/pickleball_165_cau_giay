import { Link } from 'react-router-dom'

interface BackLinkProps {
  className?: string
  compact?: boolean
}

export function BackLink({ className = 'text-sm', compact = false }: BackLinkProps) {
  return (
    <Link
      to="/"
      className={`${className} inline-flex items-center font-medium text-primary-600 transition hover:text-primary-700 hover:underline`}
    >
      ← {compact ? 'Danh sách' : 'Quay lại danh sách'}
    </Link>
  )
}
