import React from 'react'
import InjuryTooltip from './InjuryTooltip'

export function hasSignificantInjury(stars = 0, starters = 0, rotation = 0) {
  return stars >= 1 || starters >= 2 || rotation >= 3
}

export function getInjurySummary(team, stars, starters, rotation) {
  if (!hasSignificantInjury(stars, starters, rotation)) return null
  return `${team} ${stars || 0}/${starters || 0}/${rotation || 0}`
}

function isPlayoffGame(game) {
  return Boolean(game?.is_playoffs) || game?.season_phase === 'playoffs'
}

function buildPlayoffMeta(rank, seriesRecord) {
  const parts = []
  if (rank != null && rank !== '') parts.push(`Seed ${rank}`)
  if (seriesRecord) parts.push(seriesRecord)
  return parts.join(' · ')
}

function matchupMetaRecord(game, side) {
  if (isPlayoffGame(game)) {
    return buildPlayoffMeta(game?.[`${side}_playoff_rank`], game?.[`${side}_series_record`])
  }
  return game?.[`${side}_record`] || null
}

function renderTeamLine({ team, isHome = false, injuryFlag, injuryNames, b2b, tanking, record, injurySummary }) {
  return (
    <div className="matchup-team-block">
      <div>
        {isHome ? <strong>{team}</strong> : team}
        {injuryFlag && <InjuryTooltip team={team} names={injuryNames || []} />}
        {b2b && <span className="b2b-icon" title={`${team} B2B`}>😩</span>}
        {tanking && <span title="Tanking">⚰️</span>}
      </div>
      <div className={`matchup-meta-row${record ? '' : ' matchup-meta-row--empty'}`}>
        {record || '—'}
      </div>
      <div
        className={`matchup-inj-row${injurySummary ? '' : ' matchup-inj-row--empty'}`}
        title={injurySummary ? (injuryNames?.length ? `${team} OUT: ${injuryNames.join(', ')}` : injurySummary) : undefined}
      >
        {injurySummary ? injurySummary.replace(`${team} `, '') : '—'}
      </div>
    </div>
  )
}

export function renderMatchupCell(game, options = {}) {
  const { layout = 'split' } = options
  const awayInjurySummary = getInjurySummary(game.away_team, game.away_stars_out, game.away_starters_out, game.away_rotation_out)
  const homeInjurySummary = getInjurySummary(game.home_team, game.home_stars_out, game.home_starters_out, game.home_rotation_out)
  const awayInjured = Boolean(awayInjurySummary)
  const homeInjured = Boolean(homeInjurySummary)

  if (layout === 'stacked') {
    const combinedInjurySummary = [awayInjurySummary, homeInjurySummary].filter(Boolean).join(' | ')
    const combinedInjuryTitle = [
      game.away_key_out?.length ? `${game.away_team} OUT: ${game.away_key_out.join(', ')}` : '',
      game.home_key_out?.length ? `${game.home_team} OUT: ${game.home_key_out.join(', ')}` : '',
    ].filter(Boolean).join(' | ')

    return (
      <div className="matchup-inner">
        <div className="matchup-teams" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {renderTeamLine({
            team: game.away_team,
            injuryFlag: awayInjured,
            injuryNames: game.away_key_out,
            b2b: game.away_b2b,
            tanking: game.possession?.tank_signal && game.possession?.away_rest_risk === 'HIGH',
            record: matchupMetaRecord(game, 'away'),
          })}
          <div className="matchup-separator">@</div>
          {renderTeamLine({
            team: game.home_team,
            isHome: true,
            injuryFlag: homeInjured,
            injuryNames: game.home_key_out,
            b2b: game.home_b2b,
            tanking: game.possession?.tank_signal && game.possession?.home_rest_risk === 'HIGH',
            record: matchupMetaRecord(game, 'home'),
          })}
        </div>
        {combinedInjurySummary && <div className="matchup-inj-row" title={combinedInjuryTitle}>{combinedInjurySummary}</div>}
      </div>
    )
  }

  return (
    <div className="matchup-inner">
      <div className="matchup-teams matchup-teams--grid">
        <div>
          {renderTeamLine({
            team: game.away_team,
            injuryFlag: awayInjured,
            injuryNames: game.away_key_out,
            b2b: game.away_b2b,
            tanking: game.possession?.tank_signal && game.possession?.away_rest_risk === 'HIGH',
            record: matchupMetaRecord(game, 'away'),
            injurySummary: awayInjurySummary,
          })}
        </div>
        <div className="matchup-separator matchup-separator--grid">@</div>
        <div>
          {renderTeamLine({
            team: game.home_team,
            isHome: true,
            injuryFlag: homeInjured,
            injuryNames: game.home_key_out,
            b2b: game.home_b2b,
            tanking: game.possession?.tank_signal && game.possession?.home_rest_risk === 'HIGH',
            record: matchupMetaRecord(game, 'home'),
            injurySummary: homeInjurySummary,
          })}
        </div>
      </div>
    </div>
  )
}

export function renderSignalPickCell({ pick, conviction, emoji, badges = [] }) {
  return (
    <td className="pick-cell">
      <div className="signal-stack">
        <span className="signal-stack-main">
          <strong>{pick}</strong>
          {conviction > 0 && <span className="signal-stack-conviction">{conviction}%</span>}
        </span>
        <div className="signal-stack-icons">
          <span>{emoji}</span>
          {badges.map(({ key, title, icon }) => <span key={key} title={title}>{icon}</span>)}
        </div>
      </div>
    </td>
  )
}

export function renderSupportCell({ signal, confidence, agreementText }) {
  const signalClass = signal === 'BET'
    ? 'support-pill support-pill--bet'
    : signal === 'MONITOR'
      ? 'support-pill support-pill--monitor'
      : 'support-pill support-pill--pass'

  return (
    <td className="model-cell support-cell" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
      <div className="support-stack">
        <span className={signalClass} title={confidence != null ? `Confidence: ${(confidence * 100).toFixed(0)}%` : undefined}>{signal}</span>
        <div className="support-subline">{agreementText || '—'}</div>
      </div>
    </td>
  )
}

export function renderContextCell(flags = []) {
  if (!flags.length) return <td className="context-cell context-cell--empty">—</td>
  return <td className="context-cell">{flags}</td>
}
