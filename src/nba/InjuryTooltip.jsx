import React from 'react'

export default function InjuryTooltip({ team, names = [] }) {
  const label = names?.length ? `${team} OUT: ${names.join(', ')}` : 'Injuries'
  return (
    <span className="injury-tooltip-wrap">
      <span className="injury-warn-icon injury-tooltip-trigger">🚑</span>
      <span className="injury-tooltip-bubble" role="tooltip">{label}</span>
    </span>
  )
}
