import React from 'react'

const DEFAULT_LANE_STATES = {
  simple: { lane: 'simple', status: 'loading', is_loading: true, has_data: false },
  playerdeep: { lane: 'playerdeep', status: 'loading', is_loading: true, has_data: false },
  possession: { lane: 'possession', status: 'loading', is_loading: true, has_data: false },
  fourfactor: { lane: 'fourfactor', status: 'loading', is_loading: true, has_data: false },
}

const VISIBLE_LANES = ['possession', 'playerdeep', 'fourfactor']

export function getLaneStates(payload) {
  return {
    playerdeep: payload?.lane_states?.playerdeep ?? payload?.playerdeep_state ?? DEFAULT_LANE_STATES.playerdeep,
    possession: payload?.lane_states?.possession ?? payload?.possession_state ?? DEFAULT_LANE_STATES.possession,
    fourfactor: payload?.lane_states?.fourfactor ?? payload?.fourfactor_state ?? DEFAULT_LANE_STATES.fourfactor,
  }
}

export function laneIsLoading(state) {
  return Boolean(state?.is_loading || state?.status === 'loading')
}

export function laneHasData(state) {
  return Boolean(state?.has_data || (state?.prediction_count ?? 0) > 0)
}

export function laneIsSettled(state) {
  return !laneIsLoading(state)
}

export function anyLaneLoading(laneStates) {
  return Object.values(laneStates || {}).some(laneIsLoading)
}

export function getVisibleLaneStates(laneStates) {
  return VISIBLE_LANES.map((lane) => laneStates?.[lane]).filter(Boolean)
}

export function anyVisibleLaneLoading(laneStates) {
  return getVisibleLaneStates(laneStates).some(laneIsLoading)
}

export function anyVisibleLaneHasData(laneStates) {
  return getVisibleLaneStates(laneStates).some(laneHasData)
}

export function getScheduledGamesCount(laneStates) {
  const counts = Object.values(laneStates || {})
    .map((state) => Number(state?.games_today))
    .filter((count) => Number.isFinite(count))
  if (!counts.length) return null
  return Math.max(...counts)
}

export function lanePlaceholderText(state, label) {
  if (laneIsLoading(state)) return `${label} loading`
  if (state?.status === 'error') return `${label} unavailable`
  if (state?.status === 'stale') return `${label} retrying`
  if (state?.status === 'empty') return `${label} pending`
  return `${label} pending`
}

export function renderLanePlaceholderCell(state, label, colSpan = 1) {
  const loading = laneIsLoading(state)
  const status = state?.status
  const display = loading
    ? 'Loading…'
    : status === 'error'
      ? 'Unavailable'
      : status === 'stale'
        ? 'Retrying'
        : 'Pending'
  return (
    <td
      className="model-cell dim"
      colSpan={colSpan}
      style={{ textAlign: 'center', opacity: loading ? 0.75 : 0.72 }}
      title={lanePlaceholderText(state, label)}
    >
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, justifyContent: 'center', lineHeight: 1.1 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          {loading ? <span className="spinner" /> : null}
          <span>{display}</span>
        </span>
        {!loading && state?.error?.message ? <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>lane failed</span> : null}
      </span>
    </td>
  )
}

export function renderLanePlaceholderBlock(state, label) {
  const loading = laneIsLoading(state)
  return (
    <div className="possession-skeleton">
      <div className="skeleton-header">
        {loading ? <span className="spinner" /> : null}
        <span>{lanePlaceholderText(state, label)}</span>
      </div>
    </div>
  )
}
