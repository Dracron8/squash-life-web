/**
 * SiteLogo — switches between text and image based on data-theme (via CSS).
 * Dark  → "SQUASH LIFE" gold serif text  (sl-logo-text shown)
 * Light → SQSH.LIFE official PNG logo     (sl-logo-img shown)
 *
 * No client JS needed — the swap is done purely in CSS via globals.css.
 */

interface Props {
  /** 'nav' = 36px img / text-2xl, 'navLarge' = 72px img / text-5xl (2×nav), 'hero' = 52px img / text-4xl */
  size?: 'nav' | 'navLarge' | 'hero'
}

export default function SiteLogo({ size = 'nav' }: Props) {
  const textCls =
    size === 'navLarge'
      ? 'text-5xl font-bold tracking-widest'
      : size === 'hero'
        ? 'text-4xl font-bold tracking-widest'
        : 'text-2xl font-bold tracking-widest'

  const imgStyle =
    size === 'navLarge'
      ? { height: '72px', width: 'auto' }
      : size === 'hero'
        ? { height: '52px', width: 'auto' }
        : { height: '36px', width: 'auto' }

  return (
    <>
      {/* Dark mode: gold text wordmark */}
      <span
        className={`sl-logo-text ${textCls} text-[var(--sl-accent)]`}
        style={{ fontFamily: 'Georgia, serif' }}
      >
        SQSH.LIFE
      </span>

      {/* Light mode: official SQSH.LIFE logo image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/sqsh-logo.png"
        alt="SQSH.LIFE"
        className="sl-logo-img"
        style={imgStyle}
      />
    </>
  )
}
