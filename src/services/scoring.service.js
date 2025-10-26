// Normalized scoring v1.1.0 (0-100 scale)
// Components:
//  - intent_selling: 10 (no) / 25 (yes)
//  - intent_buying: 5 (no) / 15 (yes)
//  - timeframe: 5 / 15 / 28 / 40 (not sure / 6+ / 3-6 / 1-3)
//  - quality: baseline 10 (reserved for future deductions)
//  - base_value: constant 10 (could later vary by suburb / campaign)
// Category thresholds: HOT >= 70, WARM >= 40 else COLD

export function computeScore({ interested, buying, timeframe }) {
  // Normalize inputs (accept booleans or "yes"/"no")
  const sellingYes = typeof interested === 'boolean' ? interested : String(interested).toLowerCase() === 'yes';
  const buyingYes = typeof buying === 'boolean' ? buying : String(buying).toLowerCase() === 'yes';

  // Intent scores
  const intent_selling = sellingYes ? 25 : 10;
  const intent_buying = buyingYes ? 15 : 5;

  // Timeframe weighting
  let timeframe_score;
  switch (timeframe) {
    case '1-3 months':
      timeframe_score = 40; break;
    case '3-6 months':
      timeframe_score = 28; break;
    case '6+ months':
      timeframe_score = 15; break;
    default:
      timeframe_score = 5; // 'not sure' or anything else
  }

  // Quality: placeholder for future completeness checks
  const quality_score = 10;
  const base_value = 10;

  let total_score = intent_selling + intent_buying + timeframe_score + quality_score + base_value; // max 25+15+40+10+10 = 100
  if (total_score < 0) total_score = 0;
  if (total_score > 100) total_score = 100;

  const category = total_score >= 70 ? 'HOT' : total_score >= 40 ? 'WARM' : 'COLD';

  return {
    total_score,
    category,
    factors: {
      intent_selling,
      intent_buying,
      timeframe_score,
      quality_score,
      base_value,
    },
    score_version: 'v1.1.0',
  };
}
