// Delegation of Authority (DOA) Analytics Dataset parsed from 'Data - DOA Tool.xlsx'
// Contains parsed records from 'Sample Department DOA' + comprehensive 'ToC' acronyms & authority codes + structured Risk records
import dataset from './doaAnalyticsData.json';

export const DOA_ANALYTICS_DATASET = dataset.records;
export const TOC_ACRONYMS = dataset.acronyms;
export const TOC_AUTHORITY_ROLES = dataset.roles;
export const TOC_TECHNICAL_TERMS = dataset.technical_terms;

// Helper to decode acronym to full human-readable title
export function decodeAcronym(acr) {
  if (!acr) return '';
  const clean = String(acr).trim();
  return TOC_ACRONYMS[clean] || TOC_TECHNICAL_TERMS[clean] || clean;
}

// Helper to decode authority operator code (e.g., 'E1', 'P', 'A') to readable label
export function decodeOperator(op) {
  if (!op) return '';
  const clean = String(op).trim();
  return TOC_AUTHORITY_ROLES[clean] || (
    clean.startsWith('P') ? 'Propose' :
    clean.startsWith('R') ? 'Review and/or Recommend' :
    clean.startsWith('E') ? 'Endorse' :
    clean.startsWith('A') ? 'Approve' :
    clean.startsWith('Y') ? 'Ratify' :
    clean.startsWith('N') ? 'Notify' : clean
  );
}

// Role color badges for visual authority chain
export const ROLE_BADGE_COLORS = {
  P: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  R: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  E: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  A: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Y: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  N: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' }
};

export function getRoleBadgeStyle(op) {
  if (!op) return ROLE_BADGE_COLORS.N;
  const prefix = String(op).trim().charAt(0).toUpperCase();
  return ROLE_BADGE_COLORS[prefix] || ROLE_BADGE_COLORS.N;
}
