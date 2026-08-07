export default function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left">
            {columns.map((col) => (
              <th
                key={col}
                className="py-3 px-4 font-medium text-xs uppercase tracking-wide text-[var(--color-text-muted)] whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
