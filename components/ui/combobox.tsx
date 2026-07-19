"use client"

import * as React from "react"
import { Popover } from "radix-ui"
import { Check, ChevronDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"

interface ComboboxProps {
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder: string
    allLabel?: string
    className?: string
}

/**
 * A searchable single-select, for filter lists too long to scan in a plain
 * Select (e.g. companies). Built on the radix-ui Popover already in the
 * project — no new dependency (skip cmdk).
 */
export function Combobox({ value, onChange, options, placeholder, allLabel = "All", className }: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const listId = React.useId()

    const filtered = React.useMemo(
        () => (query ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : options),
        [options, query]
    )

    const displayLabel = value === "all" || !value ? allLabel : value

    const select = (v: string) => {
        onChange(v)
        setOpen(false)
    }

    return (
        <Popover.Root
            open={open}
            onOpenChange={(next) => {
                setOpen(next)
                if (!next) setQuery("")
            }}
        >
            <Popover.Trigger asChild>
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    className={cn(
                        "flex h-10 w-full items-center justify-between gap-2 whitespace-nowrap rounded-full border border-input bg-transparent px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer",
                        className
                    )}
                >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align="start"
                    sideOffset={4}
                    className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover text-popover-foreground shadow-md overflow-hidden"
                >
                    <div className="flex items-center gap-2 border-b border-outline-variant px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                        />
                    </div>
                    <div id={listId} role="listbox" className="max-h-[240px] overflow-y-auto p-1">
                        <button
                            type="button"
                            onClick={() => select("all")}
                            className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-2 pr-8 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                            {(value === "all" || !value) && <Check className="absolute right-2 h-3.5 w-3.5" />}
                            {allLabel}
                        </button>
                        {filtered.length === 0 ? (
                            <p className="px-2 py-1.5 text-sm text-muted-foreground">No matches</p>
                        ) : (
                            filtered.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => select(opt)}
                                    className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-2 pr-8 text-sm hover:bg-accent hover:text-accent-foreground"
                                >
                                    {value === opt && <Check className="absolute right-2 h-3.5 w-3.5" />}
                                    <span className="truncate">{opt}</span>
                                </button>
                            ))
                        )}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}
