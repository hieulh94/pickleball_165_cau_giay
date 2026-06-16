interface SectionLabelProps {
  children: string
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
      {children}
    </h2>
  )
}
