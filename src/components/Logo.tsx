// VulneraMy wordmark — an inline SVG mark (a stability line rising through a
// job/bar motif) + Alexandria wordmark. White for the dark sidebar; pass
// `dark={true}` for use on light surfaces (ink-colored).
interface Props {
  size?: number // px, controls the whole lockup
  dark?: boolean
}

export default function Logo({ size = 56, dark = false }: Props) {
  const ink = dark ? '#1a1a1a' : '#ffffff'
  const accent = '#1a2b88'

  return (
    <div className="flex items-center gap-3" style={{ fontFamily: "'Alexandria', sans-serif" }}>
      {/* Mark: an upward stability line rising through 4 job bars */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        {/* container chip */}
        <rect x="2" y="2" width="60" height="60" rx="14" fill={dark ? '#ffffff' : '#1a1a1a'} />
        <rect x="2" y="2" width="60" height="60" rx="14" stroke={accent} strokeOpacity="0.35" strokeWidth="1" />
        {/* job bars */}
        <rect x="13" y="36" width="8" height="12" rx="2" fill={accent} />
        <rect x="25" y="30" width="8" height="18" rx="2" fill={accent} />
        <rect x="37" y="24" width="8" height="24" rx="2" fill={accent} />
        {/* rising stability line */}
        <path
          d="M13 20 L22 20 L22 15 L31 15 L31 11 L40 11 L40 17 L49 17"
          stroke={ink}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* end point */}
        <circle cx="50" cy="17" r="2.6" fill={accent} />
      </svg>

      {/* Wordmark */}
      <div className="leading-none">
        <span
          className="block text-[24px] tracking-tight leading-none"
          style={{ color: dark ? '#000000' : '#ffffff', fontWeight: 500 }}
        >
          VulneraMy
        </span>
        <span
          className="block text-[8px] uppercase whitespace-nowrap mt-1.5"
          style={{ color: dark ? '#4a4a4a' : '#ffffff', opacity: dark ? 1 : 0.75 }}
        >
          Sustainability Analytics
        </span>
      </div>
    </div>
  )
}