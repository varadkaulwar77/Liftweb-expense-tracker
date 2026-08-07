export function SkeletonLine({ className = '' }) {
  return <div className={`skeleton rounded-md ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
      <SkeletonLine className="h-3 w-24 mb-3" />
      <SkeletonLine className="h-7 w-32" />
    </div>
  )
}

export function SkeletonTableRow({ cols = 5 }) {
  return (
    <tr className="border-b border-[var(--color-border)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3.5 px-4">
          <SkeletonLine className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}
