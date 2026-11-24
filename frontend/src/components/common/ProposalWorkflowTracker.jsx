import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Paperclip,
  Send,
  Layers,
} from 'lucide-react';

/**
 * Reusable dynamic horizontal scroller with auto-detected overflow arrows,
 * subtle edge fade indicators, and mouse-wheel horizontal scrolling.
 */
function DynamicHorizontalScroller({ children, className = '', arrowTheme = 'light' }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', updateScrollState);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, children]);

  const scrollByAmount = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  const handleWheel = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  };

  const btnClass =
    arrowTheme === 'dark'
      ? 'bg-slate-800/95 hover:bg-slate-700 text-teal-300 border-slate-600 shadow-md'
      : 'bg-white/95 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-md';

  return (
    <div className="relative group flex items-center min-w-0 w-full">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          aria-label="Scroll left"
          className={`absolute left-0 z-10 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${btnClass}`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        onWheel={handleWheel}
        className={`flex items-center overflow-x-auto scroll-smooth w-full no-scrollbar ${
          canScrollLeft ? 'pl-7' : ''
        } ${canScrollRight ? 'pr-7' : ''} ${className}`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          aria-label="Scroll right"
          className={`absolute right-0 z-10 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${btnClass}`}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Parse an authority chain string (e.g. "CEO (A) ← Head of Retail (R) ← Head of Risk (P)" or "CA > A > R > P")
 * into P (Propose), R (Review), and A (Approve) role labels plus a normalized display chain.
 */
function parseAuthorityChain(cr) {
  const proposed = cr?.proposed_value || {};
  const current = cr?.current_value || {};
  const rawChain =
    proposed.composite_authority ||
    proposed.compositeAuthority ||
    proposed.authority ||
    current.composite_authority ||
    current.compositeAuthority ||
    '';

  let proposerRole = cr?.department ? `${cr.department} Proposer` : 'Head of Risk';
  let reviewerRole = 'Head of Retail / 2LoD';
  let approverRole = 'CEO / Approving Authority';

  if (rawChain) {
    const tokens = rawChain
      .split(/[←→>]|->/)
      .map((s) => s.trim())
      .filter(Boolean);

    tokens.forEach((tok) => {
      const upper = tok.toUpperCase();
      const cleanName = tok.replace(/\((?:P|R|A|C|I|CA|N)\)/gi, '').trim() || tok;
      if (/\(P\)/i.test(upper) || /^P$/i.test(upper)) {
        proposerRole = cleanName === 'P' ? proposerRole : cleanName;
      } else if (/\(R\)/i.test(upper) || /^R$/i.test(upper)) {
        reviewerRole = cleanName === 'R' ? reviewerRole : cleanName;
      } else if (/\(A\)|\(CA\)/i.test(upper) || /^(A|CA)$/i.test(upper)) {
        approverRole = cleanName === 'A' || cleanName === 'CA' ? approverRole : cleanName;
      }
    });

    // Fallback positional extraction if no (P)/(R)/(A) tags were present
    if (!/\((?:P|R|A|CA)\)/i.test(rawChain) && tokens.length >= 2) {
      approverRole = tokens[0];
      if (tokens.length >= 3) {
        reviewerRole = tokens[1];
        proposerRole = tokens[tokens.length - 1];
      } else {
        proposerRole = tokens[tokens.length - 1];
      }
    }
  }

  const displayChain = rawChain
    ? rawChain.replace(/[←→]|->/g, ' > ')
    : 'CA > A > R > P';

  return {
    rawChain,
    displayChain,
    proposerRole,
    reviewerRole,
    approverRole,
  };
}

/**
 * Derive Layer 1 (Propose -> Review -> Approve) and Layer 2 (Governance -> Published)
 * step states from the Change Request status.
 */
function getWorkflowStates(status = 'SUBMITTED') {
  const s = (status || 'SUBMITTED').toUpperCase();

  // States: 'approved' | 'active' | 'pending' | 'rejected'
  let propose = 'approved';
  let review = 'pending';
  let approve = 'pending';
  let governance = 'pending';
  let published = 'pending';

  if (s === 'SUBMITTED' || s === 'PENDING_PROCESS_OWNER') {
    propose = 'approved';
    review = 'active';
    approve = 'pending';
  } else if (s === 'PENDING_DEPT_OWNER' || s === 'PENDING_2LOD_REVIEW' || s === 'UNDER_REVIEW') {
    propose = 'approved';
    review = 'approved';
    approve = 'active';
  } else if (s === 'APPROVED') {
    propose = 'approved';
    review = 'approved';
    approve = 'approved';
    governance = 'approved';
    published = 'active';
  } else if (s === 'PUBLISHED') {
    propose = 'approved';
    review = 'approved';
    approve = 'approved';
    governance = 'approved';
    published = 'approved';
  } else if (s === 'REJECTED') {
    propose = 'approved';
    review = 'rejected';
    approve = 'rejected';
    governance = 'rejected';
    published = 'rejected';
  }

  return { propose, review, approve, governance, published };
}

function getStepStyle(state) {
  switch (state) {
    case 'approved':
      return {
        card: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'approved',
        Icon: CheckCircle2,
        iconColor: 'text-emerald-600',
      };
    case 'active':
      return {
        card: 'bg-amber-50/90 border-amber-300 text-amber-950 ring-1 ring-amber-200/80',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500 animate-pulse',
        label: 'in queue',
        Icon: Clock,
        iconColor: 'text-amber-600',
      };
    case 'rejected':
      return {
        card: 'bg-rose-50/90 border-rose-200 text-rose-900',
        badge: 'bg-rose-100 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        label: 'rejected',
        Icon: XCircle,
        iconColor: 'text-rose-600',
      };
    default:
      return {
        card: 'bg-slate-50 border-slate-200 text-slate-500',
        badge: 'bg-slate-100 text-slate-500 border-slate-200',
        dot: 'bg-slate-300',
        label: 'pending',
        Icon: Clock,
        iconColor: 'text-slate-400',
      };
  }
}

/**
 * Compact 2-Layer mini tracker for the Change Queue table Status column.
 */
export function ProposalQueueMiniTracker({ status }) {
  const states = getWorkflowStates(status);
  const steps = [
    { key: 'P', state: states.propose, title: 'Layer 1: Propose' },
    { key: 'R', state: states.review, title: 'Layer 1: Review' },
    { key: 'A', state: states.approve, title: 'Layer 1: Approve' },
    { key: 'G', state: states.governance, title: 'Layer 2: Governance' },
    { key: 'Pub', state: states.published, title: 'Layer 2: Published' },
  ];

  return (
    <div className="flex items-center justify-center gap-1 mt-1.5" title="Workflow Position: P → R → A | Gov → Pub">
      {steps.map((step, idx) => {
        const pillColor =
          step.state === 'approved'
            ? 'bg-emerald-500 text-white border-emerald-600'
            : step.state === 'active'
            ? 'bg-amber-400 text-amber-950 border-amber-500 ring-2 ring-amber-200'
            : step.state === 'rejected'
            ? 'bg-rose-500 text-white border-rose-600'
            : 'bg-slate-100 text-slate-400 border-slate-200';

        return (
          <React.Fragment key={step.key}>
            {idx === 3 && (
              <span className="text-[9px] text-slate-300 font-bold mx-0.5">|</span>
            )}
            <span
              title={`${step.title}: ${getStepStyle(step.state).label}`}
              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border leading-none ${pillColor}`}
            >
              {step.key}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Full 2-Layer Proposal Status & Authority Chain Tracker for the Review Proposal Modal.
 * Matches the P | R | A -> Authority Chain -> Rationale/Supporting Info -> Layer 1 -> Layer 2 wireframe.
 */
export function ProposalWorkflowTracker({ cr }) {
  if (!cr) return null;

  const { displayChain, proposerRole, reviewerRole, approverRole } = parseAuthorityChain(cr);
  const states = getWorkflowStates(cr.status);

  const pStyle = getStepStyle(states.propose);
  const rStyle = getStepStyle(states.review);
  const aStyle = getStepStyle(states.approve);
  const gStyle = getStepStyle(states.governance);
  const pubStyle = getStepStyle(states.published);

  let attCount = 0;
  if (Array.isArray(cr.attachments)) {
    attCount = cr.attachments.length;
  } else if (typeof cr.attachments === 'string') {
    try {
      attCount = (JSON.parse(cr.attachments) || []).length;
    } catch {
      attCount = 0;
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
      {/* Top P | R | A Header Boxes (Dynamically Scrollable) */}
      <div className="p-3.5 bg-slate-50/90 border-b border-slate-200">
        <DynamicHorizontalScroller className="gap-3">
          {[
            { code: 'P', title: 'Propose', role: proposerRole, style: pStyle },
            { code: 'R', title: 'Review', role: reviewerRole, style: rStyle },
            { code: 'A', title: 'Approve', role: approverRole, style: aStyle },
          ].map((box) => (
            <div
              key={box.code}
              className={`min-w-[190px] flex-1 shrink-0 rounded-xl border px-3 py-2 flex items-center justify-between gap-2 bg-white shadow-2xs ${
                box.style.card.includes('amber')
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : box.style.card.includes('emerald')
                  ? 'border-emerald-200'
                  : box.style.card.includes('rose')
                  ? 'border-rose-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {box.code}
                </span>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {box.title}
                  </div>
                  <div className="text-xs font-bold text-slate-800 whitespace-nowrap" title={box.role}>
                    {box.role}
                  </div>
                </div>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${box.style.dot}`} title={box.style.label} />
            </div>
          ))}
        </DynamicHorizontalScroller>
      </div>

      {/* Authority Chain & Rationale / Supporting Information */}
      <div className="p-4 space-y-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900 text-white rounded-xl">
          <div className="flex items-center gap-2 shrink-0">
            <Layers className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Authority Chain
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <DynamicHorizontalScroller arrowTheme="dark">
              <span className="text-xs font-bold text-teal-300 whitespace-nowrap" title={displayChain}>
                {displayChain}
              </span>
            </DynamicHorizontalScroller>
          </div>
          <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-slate-200 shrink-0 whitespace-nowrap">
            {cr.department || 'Governance'} &bull; {cr.process || 'DOA Matrix'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText className="h-3 w-3 text-teal-600" /> Rationale
            </span>
            <p className="text-xs font-medium text-slate-800 leading-relaxed">
              {cr.rationale || 'No rationale provided.'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Paperclip className="h-3 w-3 text-teal-600" /> Supporting Information
            </span>
            <p className="text-xs font-medium text-slate-700 leading-relaxed">
              {cr.operational_impact || 'Standard operational & governance controls apply.'}
            </p>
            <div className="text-[10px] font-semibold text-slate-500 pt-0.5">
              Requester: <span className="text-slate-700">{cr.requester_email}</span> &bull;{' '}
              {attCount} {attCount === 1 ? 'attachment' : 'attachments'}
            </div>
          </div>
        </div>
      </div>

      {/* Layer 1: Authority Chain Sign-Off Progression (Dynamically Scrollable) */}
      <div className="p-3.5 bg-slate-50/60 border-b border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Layer 1 &mdash; Authority Chain Progression
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            Propose &rarr; Review &rarr; Approve
          </span>
        </div>

        <DynamicHorizontalScroller className="gap-2 pb-1">
          {[
            {
              step: `Propose - ${proposerRole}`,
              style: pStyle,
            },
            {
              step: `Review - ${reviewerRole}`,
              style: rStyle,
            },
            {
              step: `${approverRole}`,
              style: aStyle,
            },
          ].map((item, idx) => {
            const StepIcon = item.style.Icon;
            return (
              <React.Fragment key={idx}>
                <div
                  className={`min-w-[205px] shrink-0 px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${item.style.card}`}
                >
                  <div className="flex items-center gap-1.5">
                    <StepIcon className={`h-3.5 w-3.5 shrink-0 ${item.style.iconColor}`} />
                    <span className="font-bold whitespace-nowrap" title={item.step}>
                      {item.step}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border shrink-0 ${item.style.badge}`}
                  >
                    {item.style.label}
                  </span>
                </div>
                {idx < 2 && (
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </DynamicHorizontalScroller>
      </div>

      {/* Layer 2: Governance & Published */}
      <div className="p-3.5 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Layer 2 &mdash; Governance &amp; Publication
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            Final Matrix Release
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className={`flex-1 px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${gStyle.card}`}>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${gStyle.iconColor}`} />
              <span className="font-bold">Governance</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${gStyle.badge}`}>
              {gStyle.label}
            </span>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300 hidden sm:block shrink-0" />

          <div className={`flex-1 px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${pubStyle.card}`}>
            <div className="flex items-center gap-1.5">
              <Send className={`h-3.5 w-3.5 shrink-0 ${pubStyle.iconColor}`} />
              <span className="font-bold">Published</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${pubStyle.badge}`}>
              {states.published === 'approved' ? 'published' : pubStyle.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
