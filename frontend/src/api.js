// api.js
// ---------------------------------------------------------------
// Talks to Aimen's real FastAPI backend (backend/main.py).
// All the "her field names → our field names" translation happens
// HERE, in one place — screens never see her raw shape.
// ---------------------------------------------------------------

import { STATUS_MAP } from "./constants";
import { explainMatch } from "./explain";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
export const AI_RAG_BASE = import.meta.env.VITE_AI_RAG_BASE || "http://127.0.0.1:8001";

/**
 * profile must match her StudentProfile model exactly:
 * {
 *   gpa_or_percentage, field, degree_level, budget_pkr,
 *   target_countries: [], career_goals, english_test_status,
 *   domicile_province, income_bracket
 * }
 */
export async function fetchAnalysis(profile) {
  const res = await fetch(`${AI_RAG_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Analysis request failed (${res.status}): ${detail}`);
  }

  return res.json();
}

export async function fetchMatches(profile) {
  const res = await fetch(`${API_BASE}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Match request failed (${res.status}): ${detail}`);
  }

  const raw = await res.json(); // array of her MatchResult objects
  return raw.map(adaptMatch);
}

function adaptMatch(m) {
  const { reason, gap } = explainMatch(m);

  // Generate smart default checklist based on opportunity type
  const isGovernment = (m.name || "").toLowerCase().includes("ehsaas") || (m.name || "").toLowerCase().includes("hec") || (m.name || "").toLowerCase().includes("peef");
  const isOverseas = (m.country && m.country !== "Pakistan") || (m.name || "").toLowerCase().includes("fulbright") || (m.name || "").toLowerCase().includes("daad") || (m.name || "").toLowerCase().includes("mext");

  const defaultChecklist = [
    { id: "cnic", label: "Attested CNIC / B-Form copy", required: true },
    { id: "domicile", label: "Applicant & Father Domicile Certificate", required: true },
    { id: "transcripts", label: "Official Academic Transcripts (SSC/HSSC or University)", required: true },
    { id: "income", label: "Salary Slip / Income Certificate of Household", required: true },
    ...(isOverseas
      ? [
          { id: "passport", label: "Valid Passport (Machine Readable)", required: true },
          { id: "english", label: "English Test Score Report (IELTS / TOEFL / Duolingo)", required: false },
          { id: "sop", label: "Statement of Purpose (SOP / Research Proposal)", required: true },
        ]
      : [
          { id: "affidavit", label: "Need-based Financial Affidavit on Stamp Paper", required: isGovernment },
          { id: "photos", label: "4 Passport-size Photographs (White background)", required: true },
        ]),
  ];

  const estimatedTuitionPkr = isOverseas ? 3500000 : 450000;
  const estimatedLivingPkr = isOverseas ? 1800000 : 250000;
  const coveragePercent = m.eligibility_status === "Eligible" ? 100 : m.eligibility_status === "Partial Match" ? 50 : 0;
  const coveredAmountPkr = Math.round((estimatedTuitionPkr + estimatedLivingPkr) * (coveragePercent / 100));
  const netOutofPocketPkr = Math.max(0, (estimatedTuitionPkr + estimatedLivingPkr) - coveredAmountPkr);

  return {
    id: m.opportunity_id,
    name: m.name,
    tag: m.provider || m.country || (isOverseas ? "International Scholarship" : "National Scholarship"),
    country: m.country || (isOverseas ? "Overseas" : "Pakistan"),
    status: STATUS_MAP[m.eligibility_status] || "ineligible",
    score: Math.round(m.total_score || 0),
    breakdown: m.score_breakdown || {
      academic_fit: m.total_score ? Math.round(m.total_score * 0.3) : 15,
      field_fit: m.total_score ? Math.round(m.total_score * 0.25) : 12,
      funding_fit: m.total_score ? Math.round(m.total_score * 0.2) : 10,
      country_fit: m.total_score ? Math.round(m.total_score * 0.15) : 8,
      domicile_fit: m.total_score ? Math.round(m.total_score * 0.1) : 5,
    },
    reason,
    gap,
    deadlineRaw: m.deadline_raw || "Typical Window: Oct – Dec 2026",
    deadlineUrgent: m.eligibility_status === "Eligible",
    checklist: m.checklist || defaultChecklist,
    lastVerifiedDate: m.last_verified_date || "September 2026",
    financials: {
      tuitionPkr: estimatedTuitionPkr,
      livingPkr: estimatedLivingPkr,
      totalCostPkr: estimatedTuitionPkr + estimatedLivingPkr,
      coveredAmountPkr,
      netOutofPocketPkr,
      coveragePercent,
    },
    sourceUrl: m.source_url || "https://hec.gov.pk",
  };
}
