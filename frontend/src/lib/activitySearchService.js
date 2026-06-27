import { captureLead, supabaseRest } from './supabaseRest';
import { loadFreezonePackages } from './pricingService';

const ACTIVITY_COLUMNS = 'id,freezone,activity_name,activity_code,industry_group,keywords,is_active';
const FALLBACK_RECOMMENDATIONS = ['Meydan FZ', 'IFZA Dubai', 'SPC Free Zone'];

// Industry group → preferred freezone slugs (in priority order). Used when we
// don't have an exact activity row but know the broad business type.
const INDUSTRY_PREFERENCE = {
  media: ['shams', 'spc-free-zone', 'twofour54', 'dmcc'],
  publishing: ['spc-free-zone', 'shams', 'dmcc'],
  ecommerce: ['ifza', 'meydan-fz', 'ancfz', 'rakez'],
  trading: ['dmcc', 'ifza', 'meydan-fz', 'rakez'],
  consulting: ['meydan-fz', 'ifza', 'spc-free-zone'],
  technology: ['meydan-fz', 'ifza', 'spc-free-zone', 'dtec'],
  industrial: ['kizad', 'rakez', 'jafza'],
  logistics: ['jafza', 'rakez', 'dafz'],
  healthcare: ['dhcc', 'meydan-fz'],
  finance: ['difc', 'adgm', 'dmcc'],
  education: ['dko', 'dubai-ic'],
};

function escapeLike(value = '') {
  return String(value).trim().replace(/[%,()]/g, ' ');
}

export function normalizeActivity(row = {}) {
  return {
    id: row.id || `${row.freezone || 'uae'}-${row.activity_code || row.activity_name}`,
    freezone: row.freezone || 'Mainland',
    activity_name: row.activity_name || row.name || row.activity || '',
    activity_code: row.activity_code || row.code || '',
    industry_group: row.industry_group || '',
    keywords: row.keywords || '',
    is_active: row.is_active !== false,
  };
}

export async function searchActivities(term, { freezone, limit = 20 } = {}) {
  const cleaned = escapeLike(term);
  const filters = ['is_active=eq.true'];

  if (freezone && freezone !== 'All') {
    filters.push(`freezone=ilike.*${encodeURIComponent(freezone)}*`);
  }

  if (cleaned) {
    const q = encodeURIComponent(`*${cleaned}*`);
    filters.push(`or=(activity_name.ilike.${q},activity_code.ilike.${q},industry_group.ilike.${q},keywords.ilike.${q})`);
  }

  const query = `?select=${ACTIVITY_COLUMNS}&${filters.join('&')}&order=activity_name.asc&limit=${limit}`;
  const data = await supabaseRest.select('activities_master', query);
  return (data || []).map(normalizeActivity);
}

function detectIndustry(text = '') {
  const lower = text.toLowerCase();
  if (/media|publish|adverti|broadcast|production/.test(lower)) return 'media';
  if (/e-?commerce|online retail|web ?shop/.test(lower)) return 'ecommerce';
  if (/trad|import|export|wholesale|gold|commodit/.test(lower)) return 'trading';
  if (/consult|advisory|management/.test(lower)) return 'consulting';
  if (/software|it|tech|ai|saas|app|develop|cyber/.test(lower)) return 'technology';
  if (/industr|manufactur|factory|assembly/.test(lower)) return 'industrial';
  if (/logist|warehouse|freight|shipping|cargo/.test(lower)) return 'logistics';
  if (/health|medic|clinic|pharma|hospital/.test(lower)) return 'healthcare';
  if (/financ|invest|bank|fintech|capital/.test(lower)) return 'finance';
  if (/educat|training|school|tuition/.test(lower)) return 'education';
  return null;
}

/**
 * Polished recommendation builder (Phase 7).
 * If `livePackages` is provided, returns up to 3 ranked free-zone cards with
 * live pricing, processing time, visa quota and a "why" reason. Otherwise
 * falls back to the legacy single-zone output.
 *
 * Note: `livePackages` items come from `normalizeFreezonePackage()` and use
 * `freezone_name`, `slug`, `base_price`, `service_fee`, `visa_count`, etc.
 */

// Map freezone slug → typical processing-time string.
const ZONE_PROCESSING = {
  ancfz: '24–72 hrs',
  spc: '3–5 days',
  'spc-free-zone': '3–5 days',
  shams: '3–5 days',
  rakez: '1–2 weeks',
  meydan: '3–5 days',
  'meydan-fz': '3–5 days',
  ifza: '3–5 days',
  dmcc: '2–4 weeks',
  jafza: '2–3 weeks',
  kizad: '2–4 weeks',
  dafza: '2–3 weeks',
};

// Pick the cheapest package per free-zone to use as the "best card" for that zone.
function bestPerFreezone(packages) {
  const byZone = new Map();
  packages.forEach((p) => {
    const key = String(p.slug || p.freezone_name || '').toLowerCase();
    if (!key) return;
    const current = byZone.get(key);
    if (!current || (p.base_price || 0) < (current.base_price || 0)) {
      byZone.set(key, p);
    }
  });
  return [...byZone.values()];
}

export function buildRecommendation(activity, livePackages = []) {
  const row = normalizeActivity(activity);
  const haystack = `${row.activity_name} ${row.keywords} ${row.industry_group}`.toLowerCase();
  const industry = detectIndustry(haystack);
  const preferred = (industry && INDUSTRY_PREFERENCE[industry]) || [];

  // Group packages by zone, keep the cheapest per zone as the headline option.
  const oneCardPerZone = bestPerFreezone(livePackages || []);

  // Score every zone against the activity.
  const scored = oneCardPerZone
    .map((p) => {
      let score = 55;
      const reasons = [];
      const zoneSlug = String(p.slug || '').toLowerCase();
      const zoneName = String(p.freezone_name || '').toLowerCase();

      // Exact freezone match (activity is listed under this exact zone).
      if (row.freezone && zoneName.includes(row.freezone.toLowerCase())) {
        score += 28;
        reasons.push('Activity listed under this authority');
      }
      // Industry preference.
      const slugIdx = preferred.indexOf(zoneSlug);
      if (slugIdx === 0) { score += 22; reasons.push(`Top pick for ${industry}`); }
      else if (slugIdx > 0 && slugIdx < 4) { score += 15 - slugIdx * 2; reasons.push(`Recommended for ${industry}`); }

      // Cost-effective boost for cheap zones.
      const price = p.base_price || p.total_with_service || 0;
      if (price > 0 && price < 7000) { score += 10; reasons.push('Most cost-effective'); }
      else if (price > 0 && price < 13000) { score += 4; reasons.push('Cost-effective'); }

      // Visa quota signal.
      if ((p.visa_count || 0) >= 1) { score += 3; }

      const processing = ZONE_PROCESSING[zoneSlug] || '3–5 days';
      if (/24|48|1[ -]?3|2[ -]?5|3[ -]?5/.test(processing)) {
        score += 5; reasons.push('Quick issuance');
      }

      return { p, score, reasons, processing, price };
    })
    .sort((a, b) => b.score - a.score);

  const top3 = scored.slice(0, 3).map((x) => ({
    zone_name: x.p.freezone_name,
    zone_slug: x.p.slug,
    package_name: x.p.package_name,
    package_id: x.p.package_id,
    gov: x.price,
    svc: x.p.service_fee || 0,
    processing_time: x.processing,
    visa_quota: x.p.visa_count || x.p.raw?.visa_count || null,
    activities_allowed: x.p.raw?.activities_allowed || null,
    shareholders: x.p.raw?.shareholder_count || null,
    score: Math.min(99, x.score),
    reasons: x.reasons,
    raw: x.p,
  }));

  const fallbackBest = row.freezone && row.freezone !== 'All' ? row.freezone : 'Meydan FZ';
  const bestZone = top3[0]?.zone_name || fallbackBest;
  const cost = top3[0] ? `AED ${(top3[0].gov || 0).toLocaleString()}` : 'AED 12,500';
  const processingTime = top3[0]?.processing_time || '2–3 weeks';
  const alternatives = top3.length
    ? top3.slice(1).map((t) => t.zone_name)
    : FALLBACK_RECOMMENDATIONS.filter((z) => z !== bestZone).slice(0, 2);
  const matchScore = top3[0]?.score || (row.freezone ? 92 : 84);

  return {
    activity: row.activity_name,
    activityCode: row.activity_code,
    industryGroup: row.industry_group || industry || 'General',
    industryDetected: industry,
    bestZone,
    cost,
    processingTime,
    matchScore,
    alternatives,
    options: top3, // ← new: ranked, live-priced cards
    raw: row,
  };
}

/** Convenience wrapper used by UI — fetches live packages then ranks them. */
export async function buildLiveRecommendation(activity) {
  let packages = [];
  try {
    packages = await loadFreezonePackages();
  } catch {
    packages = [];
  }
  return buildRecommendation(activity, packages);
}

export async function captureAILead(form, recommendation, sourceCta = 'ai_search_start_application') {
  return captureLead({
    source_page: sourceCta,
    name: form.name,
    email: form.email,
    phone_country_code: form.countryCode,
    phone_number: form.phone,
    whatsapp: form.whatsapp || form.phone,
    nationality: form.nationality,
    residence_country: form.residenceCountry,
    business_activity: recommendation?.activity,
    activity_code: recommendation?.activityCode,
    freezone_name: recommendation?.bestZone,
    selected_freezone: recommendation?.bestZone,
    selected_activity: recommendation?.activity,
    industry_group: recommendation?.industryGroup,
    message: `AI Search lead: ${recommendation?.activity || ''} → ${recommendation?.bestZone || ''}`,
    raw_payload: { form, recommendation },
  });
}
