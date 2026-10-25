import { useId } from 'react'

/** Decorative sample cards only: these numbers are not calculated decision results. */
function AuthArtwork({ isRegister }: { isRegister: boolean }) {
  const id = useId()
  const cards = isRegister
    ? [
        { name: 'Career move', score: 80 },
        { name: 'New city', score: 68 },
        { name: 'Further study', score: 59 },
      ]
    : [
        { name: 'Option A', score: 72 },
        { name: 'Option B', score: 64 },
        { name: 'Option C', score: 58 },
      ]
  const colors = ['#3678ff', '#35bf94', '#9564f5']

  return (
    <svg
      className="auth-artwork"
      viewBox="0 0 500 300"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter
          id={`${id}-shadow`}
          x="-30%"
          y="-30%"
          width="170%"
          height="180%"
        >
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="12"
            floodColor="#667bd2"
            floodOpacity=".12"
          />
        </filter>
        <linearGradient id={`${id}-bar`}>
          <stop stopColor="#3265ff" />
          <stop offset="1" stopColor="#8caaff" />
        </linearGradient>
      </defs>
      <g strokeWidth="2.2">
        <path d="M208 61c58 0 24 80 96 80" stroke={colors[0]} />
        <path d="M208 141c47 0 39 17 96 17" stroke={colors[1]} />
        <path d="M208 221c58 0 28-46 96-46" stroke={colors[2]} />
        {[
          { x: 248, y: 94 },
          { x: 252, y: 150 },
          { x: 255, y: 193 },
        ].map((point, index) => (
          <circle
            key={point.x}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="white"
            stroke={colors[index]}
          />
        ))}
      </g>
      {cards.map((card, index) => (
        <g key={card.name} transform={`translate(12 ${29 + index * 80})`}>
          <rect
            width="204"
            height="64"
            rx="14"
            fill="white"
            fillOpacity=".96"
            filter={`url(#${id}-shadow)`}
          />
          <circle
            cx="32"
            cy="32"
            r="22"
            fill={colors[index]}
            fillOpacity=".13"
          />
          <g transform="translate(20 20)" fill={colors[index]}>
            {index === 0 ? (
              isRegister ? (
                <>
                  <rect x="2" y="6" width="20" height="15" rx="3" />
                  <path
                    d="M8 6V3h8v3M2 12h20M10 11v3h4v-3"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </>
              ) : (
                <>
                  <path d="m0 10 12-10 12 10-3 3-2-2v12H5V11l-2 2Z" />
                  <path d="M10 23v-8h5v8" stroke="white" strokeWidth="1.5" />
                </>
              )
            ) : index === 1 ? (
              isRegister ? (
                <>
                  <path d="M12 0C0 0 0 13 12 24 24 13 24 0 12 0Z" />
                  <circle cx="12" cy="9" r="4" fill="white" />
                </>
              ) : (
                <>
                  <path d="M22 1C7-1-2 8 4 17 13 23 23 15 22 1Z" />
                  <path d="m3 23 13-15" stroke="white" strokeWidth="1.5" />
                </>
              )
            ) : isRegister ? (
              <>
                <path d="m0 8 12-6 12 6-12 6ZM5 13v7q7 5 14 0v-7" />
                <path d="M23 8v10" stroke={colors[index]} strokeWidth="2" />
              </>
            ) : (
              <path d="M12 22 2 12C-5 3 7-3 12 5c5-8 17-2 10 7Z" />
            )}
          </g>
          <text x="70" y="27" fill="#172447" fontSize="12" fontWeight="700">
            {card.name}
          </text>
          <rect
            x="70"
            y="38"
            width="85"
            height="9"
            rx="4.5"
            fill={colors[index]}
            fillOpacity=".2"
          />
          <rect
            x="70"
            y="38"
            width={card.score * 0.8}
            height="9"
            rx="4.5"
            fill={colors[index]}
            fillOpacity=".8"
          />
          <text x="168" y="46" fill="#233359" fontSize="13" fontWeight="700">
            {card.score}
          </text>
        </g>
      ))}
      <g transform="translate(296 81)">
        <rect
          width="183"
          height="169"
          rx="18"
          fill="white"
          fillOpacity=".97"
          filter={`url(#${id}-shadow)`}
        />
        <path d="m23 25 5 6 5-10 5 10 5-6-3 13H26Z" fill="#3858f6" />
        <text x="50" y="35" fill="#3d4fda" fontSize="13" fontWeight="700">
          {isRegister ? 'Top option' : 'Best choice'}
        </text>
        <text x="23" y="80" fill="#111d40" fontSize="28" fontWeight="750">
          {cards[0].score}
          <tspan fill="#7885a1" fontSize="17" fontWeight="600">
            {' '}
            / 100
          </tspan>
        </text>
        <rect x="23" y="97" width="137" height="10" rx="5" fill="#e3e9ff" />
        <rect
          x="23"
          y="97"
          width="108"
          height="10"
          rx="5"
          fill={`url(#${id}-bar)`}
        />
        <rect x="23" y="119" width="137" height="10" rx="5" fill="#edf0fc" />
        <rect x="23" y="119" width="108" height="10" rx="5" fill="#d4dcff" />
        <rect x="23" y="140" width="81" height="10" rx="5" fill="#dfe5fa" />
        <circle
          cx="154"
          cy="0"
          r="18"
          fill="#2cbb79"
          stroke="white"
          strokeWidth="4"
        />
        <path
          d="m146 0 5 5 10-11"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m165-32 5-10m9 20 10-3m-36-11 1-10"
          stroke="#4c70ff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

export default AuthArtwork
