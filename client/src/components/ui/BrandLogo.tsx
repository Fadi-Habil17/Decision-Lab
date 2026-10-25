import { useId } from 'react'
import '../../styles/brand.css'

/** Vector interpretation of the supplied logo reference; no external font or image request. */
function BrandLogo() {
  const gradientId = useId()

  return (
    <span
      className="decisionlab-logo"
      role="img"
      aria-label="DecisionLab — Think it through."
    >
      <svg
        className="decisionlab-logo-mark"
        viewBox="0 0 100 84"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="8"
            y1="8"
            x2="88"
            y2="78"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#9693ff" />
            <stop offset=".52" stopColor="#4b43f4" />
            <stop offset="1" stopColor="#3c39df" />
          </linearGradient>
        </defs>
        <g
          stroke={`url(#${gradientId})`}
          strokeWidth="10"
          strokeLinecap="round"
        >
          <path d="M14 13H24C43 13 43 42 67 42M14 42H67M14 71H24C43 71 43 42 67 42" />
        </g>
        <circle cx="75" cy="42" r="24" fill={`url(#${gradientId})`} />
        <circle cx="13" cy="13" r="12" fill="#a29aff" />
        <circle cx="13" cy="42" r="12" fill="#4b43f4" />
        <circle cx="13" cy="71" r="12" fill="#a29aff" />
        <path
          d="m65 43 7 7 14-16"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="decisionlab-logo-copy" aria-hidden="true">
        <span className="decisionlab-logo-name">
          Decision<span>Lab</span>
        </span>
        <span className="decisionlab-logo-tagline">Think it through.</span>
      </span>
    </span>
  )
}

export default BrandLogo
