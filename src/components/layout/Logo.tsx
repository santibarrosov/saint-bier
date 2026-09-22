import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  markSize?: number
  showWordmark?: boolean
  wordmarkClassName?: string
}

/** Monograma: una hoja de lúpulo estilizada dentro de un anillo ámbar. Vector puro, sin dependencia de fuentes. */
function HopMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <circle cx="20" cy="20" r="19" fill="var(--color-bg-sunken)" stroke="var(--color-primary)" strokeWidth="1.4" />
      <path
        d="M20 8C14 12 11 18 14.5 26C16 29.5 24 29.5 25.5 26C29 18 26 12 20 8Z"
        fill="var(--color-primary)"
        fillOpacity="0.16"
        stroke="var(--color-primary)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M20 11.5V26.5" stroke="var(--color-primary)" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <path d="M20 15L16.5 17.5" stroke="var(--color-primary)" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
      <path d="M20 15L23.5 17.5" stroke="var(--color-primary)" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
      <path d="M20 20.5L16.8 22.7" stroke="var(--color-primary)" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
      <path d="M20 20.5L23.2 22.7" stroke="var(--color-primary)" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

export function Logo({ className, markSize = 34, showWordmark = true, wordmarkClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <HopMark size={markSize} />
      {showWordmark && (
        <span className={cn("font-display leading-none tracking-tight", wordmarkClassName)}>
          <span className="block text-[0.55em] font-medium uppercase tracking-[0.3em] text-[var(--color-primary)]">
            Saint
          </span>
          <span className="block text-[1.15em] font-semibold text-[var(--color-text)]">Bier</span>
        </span>
      )}
    </div>
  )
}
