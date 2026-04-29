function StatusBar({ status }) {
  if (!status) return null

  const possTime = status.possession_last_run
    ? formatTimeAgo(new Date(status.possession_last_run))
    : null
  const pdTime = status.playerdeep_last_run
    ? formatTimeAgo(new Date(status.playerdeep_last_run))
    : null
  const ffTime = status.fourfactor_last_run
    ? formatTimeAgo(new Date(status.fourfactor_last_run))
    : null

  const lastUpdate = possTime || pdTime || ffTime || 'warming'
  const pdSource = formatPlayerDeepSource(status)

  return (
    <footer className="status-bar">
      <span>Visible models {lastUpdate === 'warming' ? 'warming' : `updated ${lastUpdate}`}</span>
      {pdSource && <span>• PD {pdSource}</span>}
      {status.playerdeep_degraded && <span>• PD degraded: {formatPartialReasons(status.playerdeep_degraded_reasons)}</span>}
      {status.playerdeep_partial && <span>• PD incomplete: {formatPartialReasons(status.playerdeep_partial_reasons)}</span>}
      {status.advanced_endpoint_deprecated && <span>• legacy /advanced alias still works</span>}
    </footer>
  )
}

function formatPartialReasons(reasons) {
  if (!Array.isArray(reasons) || !reasons.length) return 'yes'
  return reasons.map(formatReasonLabel).join(', ')
}

function formatReasonLabel(reason) {
  if (!reason) return 'unknown'
  if (reason === 'player_ratings_fallback') return 'player ratings fallback'
  if (reason === 'team_ratings_fallback') return 'team ratings fallback'
  if (reason === 'injury_report_fallback') return 'injury fallback'
  if (reason === 'schedule_fallback') return 'schedule fallback'
  if (reason === 'schedule_missing_dates') return 'missing schedule dates'
  if (reason === 'fewer_predictions_than_games') return 'missing predictions'
  const modelFallbackMatch = String(reason).match(/^simple_model_fallback_(\d+)_games$/)
  if (modelFallbackMatch) return `simple fallback ${modelFallbackMatch[1]} game${modelFallbackMatch[1] === '1' ? '' : 's'}`
  const oddsMissingMatch = String(reason).match(/^odds_unavailable_(\d+)_games$/)
  if (oddsMissingMatch) return `odds unavailable ${oddsMissingMatch[1]} game${oddsMissingMatch[1] === '1' ? '' : 's'}`
  return String(reason).replaceAll('_', ' ')
}

function formatPlayerDeepSource(status) {
  const parts = []
  const playerSource = formatSourceLabel(status.playerdeep_data_source, status.playerdeep_snapshot_updated_at, 'players')
  const teamSource = formatSourceLabel(status.playerdeep_team_ratings_source, status.playerdeep_team_ratings_snapshot_updated_at, 'teams')
  if (playerSource) parts.push(playerSource)
  if (teamSource && teamSource !== playerSource) parts.push(teamSource)
  return parts.length ? parts.join(', ') : null
}

function formatSourceLabel(source, updatedAt, label) {
  if (!source) return null
  if (source === 'live') return `${label} live`
  if (source === 'memory') return `${label} warm`
  if (source === 'snapshot') {
    const updated = updatedAt
      ? formatTimeAgo(new Date(updatedAt))
      : 'snapshot'
    return `${label} snapshot (${updated})`
  }
  return `${label} ${String(source).replaceAll('_', ' ')}`
}

function formatTimeAgo(date) {
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'just now'
  if (diffMin === 1) return '1 min ago'
  if (diffMin < 60) return `${diffMin} mins ago`

  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs === 1) return '1 hour ago'
  return `${diffHrs} hours ago`
}

export default StatusBar
