export function firstDefined(...values) {
  return values.find(v => v != null)
}

export function applyCanonicalGameContext(target, prediction) {
  if (!target || !prediction) return

  if (prediction.game_time && !target.game_time) target.game_time = prediction.game_time
  if (prediction.game_date && !target.game_date) target.game_date = prediction.game_date

  if (prediction.home_record != null && prediction.home_record !== '' && !target.home_record) target.home_record = prediction.home_record
  if (prediction.away_record != null && prediction.away_record !== '' && !target.away_record) target.away_record = prediction.away_record

  if (prediction.season_phase && !target.season_phase) target.season_phase = prediction.season_phase
  if (prediction.is_playoffs != null && target.is_playoffs == null) target.is_playoffs = prediction.is_playoffs
  if (prediction.playoff_round && !target.playoff_round) target.playoff_round = prediction.playoff_round
  if (prediction.series_text && !target.series_text) target.series_text = prediction.series_text
  if (prediction.home_playoff_rank != null && target.home_playoff_rank == null) target.home_playoff_rank = prediction.home_playoff_rank
  if (prediction.away_playoff_rank != null && target.away_playoff_rank == null) target.away_playoff_rank = prediction.away_playoff_rank
  if (prediction.home_series_wins != null && target.home_series_wins == null) target.home_series_wins = prediction.home_series_wins
  if (prediction.home_series_losses != null && target.home_series_losses == null) target.home_series_losses = prediction.home_series_losses
  if (prediction.away_series_wins != null && target.away_series_wins == null) target.away_series_wins = prediction.away_series_wins
  if (prediction.away_series_losses != null && target.away_series_losses == null) target.away_series_losses = prediction.away_series_losses
  if (prediction.home_series_record && !target.home_series_record) target.home_series_record = prediction.home_series_record
  if (prediction.away_series_record && !target.away_series_record) target.away_series_record = prediction.away_series_record

  if (prediction.home_stars_out != null && target.home_stars_out == null) target.home_stars_out = prediction.home_stars_out
  if (prediction.away_stars_out != null && target.away_stars_out == null) target.away_stars_out = prediction.away_stars_out
  if (prediction.home_starters_out != null && target.home_starters_out == null) target.home_starters_out = prediction.home_starters_out
  if (prediction.away_starters_out != null && target.away_starters_out == null) target.away_starters_out = prediction.away_starters_out
  if (prediction.home_rotation_out != null && target.home_rotation_out == null) target.home_rotation_out = prediction.home_rotation_out
  if (prediction.away_rotation_out != null && target.away_rotation_out == null) target.away_rotation_out = prediction.away_rotation_out

  if (prediction.home_key_out?.length && !target.home_key_out?.length) target.home_key_out = prediction.home_key_out
  if (prediction.away_key_out?.length && !target.away_key_out?.length) target.away_key_out = prediction.away_key_out
}

export function finalizeCanonicalB2B(game) {
  if (!game) return game
  const sources = [game.possession, game.playerdeep, game.v2, game.fourfactor, game.simple]
  game.home_b2b = firstDefined(...sources.map(s => s?.home_b2b), game.home_b2b) ?? false
  game.away_b2b = firstDefined(...sources.map(s => s?.away_b2b), game.away_b2b) ?? false
  return game
}
