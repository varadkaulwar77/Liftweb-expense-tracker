export default function Card({ children, className = '', as: Comp = 'div', ...props }) {
  return (
    <Comp
      className={`rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)] ${className}`}
      {...props}
    >
      {children}
    </Comp>
  )
}
