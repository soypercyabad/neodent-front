import { cn } from '@/shared/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Etiqueta del grupo para lectores de pantalla. */
  label: string
}

/** Pestañas en forma de píldora. La activa se pinta con el color de marca. */
export function Tabs<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2.5">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'cursor-pointer rounded-full px-5 py-2 text-[0.88rem] font-bold transition',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
              active
                ? 'bg-brand text-white'
                : 'border border-line bg-surface text-ink-soft hover:bg-hover hover:text-ink',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
