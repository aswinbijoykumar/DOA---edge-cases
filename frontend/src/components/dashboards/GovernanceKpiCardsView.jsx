import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Building2,
  PieChart,
  Users,
  Share2,
  CheckCircle,
  ChevronDown,
  Check,
  Search,
  Award,
  BookOpen,
  ShieldCheck,
  RefreshCw,
  Filter,
  SlidersHorizontal,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Download,
  ArrowUpRight,
  X,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowUp,
  CheckCircle2
} from 'lucide-react';

/**
 * Interface / Schema definition:
 * interface KPICardItem {
 *   id: string;
 *   romanNumeral: string;
 *   title: string;
 *   primaryMetric: string | number;
 *   subtext: string;
 *   icon: React.ComponentType;
 *   badge: string;
 *   badgeColor: string;
 *   iconBg: string;
 *   iconColor: string;
 *   dropdownHeader: string;
 *   triggerLabel: string;
 *   dropdownOptions: {
 *     id: string;
 *     label: string;
 *     description?: string;
 *     badge?: string;
 *     badgeColor?: string;
 *   }[];
 * }
 */

export const GOVERNANCE_KPI_CONFIG = [
  {
    id: 'function',
    romanNumeral: 'I.',
    title: 'FUNCTIONS',
    primaryMetric: '14 Units',
    subtext: 'All corporate functions',
    icon: Layers,
    badge: '9 Active',
    badgeColor: 'bg-blue-50 text-blue-600 border-blue-200/60',
    iconBg: 'bg-blue-50 border-blue-100',
    iconColor: 'text-blue-600',
    dropdownHeader: 'SELECT FUNCTION',
    triggerLabel: 'Select function',
    dropdownOptions: [
      { id: 'ops_logistics', label: 'Operations & Logistics', badge: '96% Compliant' },
      { id: 'finance_treasury', label: 'Finance & Treasury', badge: 'Audited' },
      { id: 'risk_compliance', label: 'Risk & Compliance', badge: '2 Actions', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
      { id: 'legal_regulatory', label: 'Legal & Regulatory', badge: 'Verified' },
      { id: 'tech_cyber', label: 'Technology & Cyber', badge: 'Active ISO', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { id: 'all_functions', label: 'All Corporate Functions', badge: '14 Units' }
    ]
  },
  {
    id: 'board_committee',
    romanNumeral: 'II.',
    title: 'BOARD COMMITTEE',
    primaryMetric: '6 Standing',
    subtext: 'Full Board Oversight',
    icon: Building2,
    badge: '5 Charters',
    badgeColor: 'bg-purple-50 text-purple-600 border-purple-200/60',
    iconBg: 'bg-purple-50 border-purple-100',
    iconColor: 'text-purple-600',
    dropdownHeader: 'SELECT BOARD COMMITTEE',
    triggerLabel: 'Select committee',
    dropdownOptions: [
      { id: 'audit_committee', label: 'Audit Committee (BAC)', badge: 'Statutory' },
      { id: 'risk_committee', label: 'Board Risk & Policy (BRPC)', badge: 'Active Oversight' },
      { id: 'exec_committee', label: 'Executive Committee (EXCO)', badge: 'Delegated' },
      { id: 'nom_rem_committee', label: 'Nomination & Remuneration (GNRC)', badge: 'Chartered' },
      { id: 'all_committees', label: 'All Standing Committees', badge: '6 Standing' }
    ]
  },
  {
    id: 'shareholder',
    romanNumeral: 'III.',
    title: 'SHAREHOLDER',
    primaryMetric: '3 Tiers',
    subtext: 'AGM Resolutions Valid',
    icon: PieChart,
    badge: '100% Voting',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200/60',
    iconBg: 'bg-teal-50 border-teal-100',
    iconColor: 'text-teal-600',
    dropdownHeader: 'SELECT SHAREHOLDER TIER',
    triggerLabel: 'Select holder tier',
    dropdownOptions: [
      { id: 'agm', label: 'Annual General Meeting (AGM)', badge: 'Annual Vote' },
      { id: 'egm', label: 'Extraordinary General Meeting (EGM)', badge: 'Special Res.' },
      { id: 'founding_shareholders', label: 'Institutional & Anchor Tiers', badge: 'Qualified' },
      { id: 'all_shareholders', label: 'All Shareholder Mandates', badge: '100% Voting' }
    ]
  },
  {
    id: 'c_level',
    romanNumeral: 'IV.',
    title: 'C-LEVEL MANAGEMENT',
    primaryMetric: 'Exec Committee',
    subtext: 'All Executive Portfolios',
    icon: Users,
    badge: '7 Officers',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/60',
    iconBg: 'bg-amber-50 border-amber-100',
    iconColor: 'text-amber-600',
    dropdownHeader: 'SELECT EXECUTIVE',
    triggerLabel: 'Select executive',
    dropdownOptions: [
      { id: 'exec_committee_all', label: 'Exec Committee (All Portfolios)', badge: '7 Officers' },
      { id: 'gceo', label: 'Group CEO (GCEO)', badge: 'Top Exec' },
      { id: 'ceo', label: 'Chief Executive Officer (CEO)', badge: 'Full Op Scope' },
      { id: 'c_level1', label: 'Head of Finance & Treasury (CFO)', badge: 'Finance Sign-off' },
      { id: 'c_level2', label: 'Enterprise Risk Reviewer (CRO)', badge: 'Risk Sign-off' },
      { id: 'mgmt_committees', label: 'Management Committee (MANCO)', badge: 'Consensus' }
    ]
  },
  {
    id: 'group_wide',
    romanNumeral: 'V.',
    title: 'GROUP WIDE AUTHORITIES',
    primaryMetric: 'Matrix 4.2',
    subtext: 'Delegated threshold matrix',
    icon: Share2,
    badge: '100% In Effect',
    badgeColor: 'bg-rose-50 text-rose-600 border-rose-200/60',
    iconBg: 'bg-rose-50 border-rose-100',
    iconColor: 'text-rose-600',
    dropdownHeader: 'SELECT MATRIX POLICY',
    triggerLabel: 'Select matrix policy',
    dropdownOptions: [
      { id: 'matrix_4_2', label: 'Matrix 4.2 Core Delegations', badge: 'Master Live' },
      { id: 'subsidiary_matrix', label: 'Subsidiary Matrix (KSA / GCC)', badge: 'Cross-Entity' },
      { id: 'statutory_regulatory', label: 'Statutory & Regulatory Mandates', badge: 'Central Bank' },
      { id: 'expenditure_limits', label: 'Controlled Expenditure Limits', badge: 'Thresholds' }
    ]
  }
];

// Helper to format authority chains with right-to-left flow arrows (←)
function formatAuthorityFlow(str) {
  if (!str) return '—';
  return str.replace(/[➔→]|->/g, '←');
}

export default function GovernanceKpiCardsView({
  currentUser,
  activeCategoryId = 'c_level',
  selectedOptionsMap = {},
  onSelectCategory = () => {},
  matrixData = null,
  isLoading = false
}) {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL'); // ALL, APPROVE, ENDORSE, RECOMMEND, PROPOSE, NOTIFICATION
  const [departmentFilter, setDepartmentFilter] = useState('ALL'); // ALL, Finance, Risk, Treasury, Operations, Legal
  const [regulatoryFilter, setRegulatoryFilter] = useState('ALL'); // ALL, REGULATORY, NON_REGULATORY
  const [selectedLinkageItem, setSelectedLinkageItem] = useState(null);
  const [isTableScrolled, setIsTableScrolled] = useState(false);
  const [isOuterHeaderSticky, setIsOuterHeaderSticky] = useState(false);
  const [stickyHeaderMetrics, setStickyHeaderMetrics] = useState({ width: 0, left: 0, top: 0 });
  const containerRef = useRef(null);
  const governanceTableBodyRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const tableScrollContainerRef = useRef(null);
  const stickyHeaderScrollRef = useRef(null);



  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpenDropdownId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCardClick = (cardId) => {
    setOpenDropdownId((prev) => (prev === cardId ? null : cardId));
  };

  const handleOptionSelect = (cardId, option) => {
    setOpenDropdownId(null);
    onSelectCategory(cardId, option);
  };

  // Find active card & selected option config
  const activeCardConfig = GOVERNANCE_KPI_CONFIG.find((c) => c.id === activeCategoryId) || GOVERNANCE_KPI_CONFIG[3];
  const activeSelectedOption =
    selectedOptionsMap[activeCategoryId] || activeCardConfig.dropdownOptions[0];

  // Filter authorities in the table
  const authoritiesList = matrixData?.authorities || [];
  const filteredAuthorities = authoritiesList.filter((item) => {
    // Action code filter (Approve, Endorse/Review, Recommend, Propose, Notify)
    if (actionFilter !== 'ALL') {
      if (actionFilter === 'PROPOSE') {
        const v = (item.authority_code || item.composite_authority || '').toUpperCase();
        if (!v.includes('P') && !v.includes('INITIATE') && item.action_type !== 'PROPOSE') return false;
      } else if (actionFilter === 'RECOMMEND') {
        const v = (item.authority_code || '').toUpperCase();
        if (item.action_type !== 'RECOMMEND' && !v.includes('(R)')) return false;
      } else if (actionFilter === 'ENDORSE') {
        const v = (item.authority_code || '').toUpperCase();
        if (item.action_type !== 'ENDORSE' && !v.includes('(E)')) return false;
      } else if (item.action_type !== actionFilter) {
        return false;
      }
    }

    // Department / Function view filter
    if (departmentFilter !== 'ALL') {
      const func = (item.function || '').toLowerCase();
      const bline = (item.business_line || '').toLowerCase();
      const darea = (item.decision_area || '').toLowerCase();
      const target = departmentFilter.toLowerCase();
      if (!func.includes(target) && !bline.includes(target) && !darea.includes(target)) {
        return false;
      }
    }

    // Regulatory & Non-Regulatory filter
    if (regulatoryFilter === 'REGULATORY') {
      const isReg = item.regulatory === 'Y' || Boolean(item.regulatory_requirement);
      if (!isReg) return false;
    } else if (regulatoryFilter === 'NON_REGULATORY') {
      const isReg = item.regulatory === 'Y' || Boolean(item.regulatory_requirement);
      if (isReg) return false;
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.id?.toString().toLowerCase().includes(q) ||
      item.decision_area?.toLowerCase().includes(q) ||
      item.business_line?.toLowerCase().includes(q) ||
      item.function?.toLowerCase().includes(q) ||
      item.authority_code?.toLowerCase().includes(q) ||
      item.policy_reference?.toLowerCase().includes(q) ||
      item.regulatory_requirement?.toLowerCase().includes(q) ||
      item.composite_authority?.toLowerCase().includes(q)
    );
  });

  // Outer Page Scroll Listener to keep Designation View table header sticky when scrolling page
  useEffect(() => {
    const updateStickyMetrics = () => {
      if (!tableWrapperRef.current) return;
      const rect = tableWrapperRef.current.getBoundingClientRect();
      const mainHeader = document.querySelector('header');
      const navbarHeight = mainHeader ? mainHeader.offsetHeight : 88;
      
      const shouldStick = rect.top <= navbarHeight && rect.bottom > (navbarHeight + 60);
      setIsOuterHeaderSticky(shouldStick);
      
      if (shouldStick) {
        setStickyHeaderMetrics({
          width: rect.width,
          left: rect.left,
          top: navbarHeight
        });

        if (tableScrollContainerRef.current && stickyHeaderScrollRef.current) {
          if (stickyHeaderScrollRef.current.scrollLeft !== tableScrollContainerRef.current.scrollLeft) {
            stickyHeaderScrollRef.current.scrollLeft = tableScrollContainerRef.current.scrollLeft;
          }
        }
      }
    };

    window.addEventListener('scroll', updateStickyMetrics, { passive: true });
    window.addEventListener('resize', updateStickyMetrics, { passive: true });
    updateStickyMetrics();

    return () => {
      window.removeEventListener('scroll', updateStickyMetrics);
      window.removeEventListener('resize', updateStickyMetrics);
    };
  }, [filteredAuthorities.length]);

  const handleTableHorizontalScroll = (e) => {
    if (stickyHeaderScrollRef.current && stickyHeaderScrollRef.current.scrollLeft !== e.currentTarget.scrollLeft) {
      stickyHeaderScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleStickyHorizontalScroll = (e) => {
    if (tableScrollContainerRef.current && tableScrollContainerRef.current.scrollLeft !== e.currentTarget.scrollLeft) {
      tableScrollContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (!filteredAuthorities.length) return;
    const headers = [
      'Ref #',
      'Function',
      'Business Line',
      'Decision Area',
      'Action Code',
      'Key / Non-Key',
      'Policy Reference',
      'Regulatory Requirement',
      'LUD (Last Update Date)',
      'Composite Authority Flow'
    ];

    const rows = filteredAuthorities.map((item) => [
      `"${item.id || ''}"`,
      `"${(item.function || '').replace(/"/g, '""')}"`,
      `"${(item.business_line || '').replace(/"/g, '""')}"`,
      `"${(item.decision_area || '').replace(/"/g, '""')}"`,
      `"${item.authority_code || item.action_type || ''}"`,
      `"${item.key_non_key || 'Key'}"`,
      `"${(item.policy_reference || '').replace(/"/g, '""')}"`,
      `"${(item.regulatory_requirement || '').replace(/"/g, '""')}"`,
      `"${item.last_update_date || item.effective_date || '2026-02-15'}"`,
      `"${(formatAuthorityFlow(item.composite_authority) || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DOA_Designation_Matrix_${activeCategoryId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to PDF (Print-ready report)
  const handleExportPdf = () => {
    if (!filteredAuthorities.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>DOA Nexus - Designation Matrix Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
            h2 { margin: 0 0 4px 0; color: #0f172a; font-size: 20px; }
            .subtitle { color: #64748b; font-size: 12px; margin-bottom: 16px; }
            .meta { margin-bottom: 20px; font-size: 11px; color: #475569; display: flex; gap: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 6px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 9px; }
            td { border: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }
            tr:nth-child(even) { background: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; }
            .badge-approve { background: #dcfce7; color: #166534; }
            .badge-endorse { background: #dbeafe; color: #1e40af; }
            .badge-recommend { background: #fef3c7; color: #92400e; }
            .date { color: #64748b; font-family: monospace; }
          </style>
        </head>
        <body>
          <h2>DOA Nexus &bull; Designation Matrix Authority Report</h2>
          <div class="subtitle">Category: ${activeSelectedOption?.label || activeCardConfig.title} &bull; Generated: ${new Date().toLocaleString()}</div>
          <div class="meta">
            <div><strong>Total Lines:</strong> ${filteredAuthorities.length}</div>
            <div><strong>Action Filter:</strong> ${actionFilter}</div>
            <div><strong>Function:</strong> ${departmentFilter}</div>
            <div><strong>Regulatory Scope:</strong> ${regulatoryFilter}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 45px;">Ref #</th>
                <th style="width: 90px;">Function / Line</th>
                <th>Decision Area Mandate</th>
                <th style="width: 75px;">Action</th>
                <th style="width: 120px;">Policy & Regulatory</th>
                <th style="width: 100px;">Last Update Date</th>
                <th style="width: 140px;">Composite Flow</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAuthorities.map(item => `
                <tr>
                  <td style="font-weight: bold;">#${item.id}</td>
                  <td><strong>${item.function}</strong><br/><span style="color:#64748b;">${item.business_line || ''}</span></td>
                  <td><strong>${item.decision_area}</strong></td>
                  <td><span class="badge ${item.action_type === 'APPROVE' ? 'badge-approve' : item.action_type === 'ENDORSE' ? 'badge-endorse' : 'badge-recommend'}">${item.authority_code}</span></td>
                  <td>${item.policy_reference || item.regulatory_requirement || '<span style="color:#94a3b8;">Internal Standard</span>'}</td>
                  <td class="date">${item.last_update_date || item.effective_date || '2026-02-15'}</td>
                  <td style="font-family: monospace; font-size: 9px;">${formatAuthorityFlow(item.composite_authority) || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* ========================================================================= */}
      {/* 1. TOP ROW: 5 INTERACTIVE GOVERNANCE KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {GOVERNANCE_KPI_CONFIG.map((card) => {
          const Icon = card.icon;
          const isCardActive = activeCategoryId === card.id;
          const isDropdownOpen = openDropdownId === card.id;
          const currentOption = selectedOptionsMap[card.id];

          return (
            <div
              key={card.id}
              className={`relative bg-white rounded-2xl border transition-all duration-200 p-3.5 sm:p-4 flex flex-col justify-between text-left cursor-pointer group shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:shadow-[0_10px_25px_-4px_rgba(15,23,42,0.08)] ${
                isCardActive
                  ? 'border-amber-300 ring-2 ring-amber-300/40 bg-amber-50/15'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
              onClick={() => handleCardClick(card.id)}
            >
              {/* Card Top: Small logo in left corner aligned with h4 heading */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-xl border ${card.iconBg} ${card.iconColor} shadow-2xs shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight uppercase truncate">
                  {card.title}
                </h4>
              </div>

              {/* Card Bottom: Dropdown Action Cue */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span
                  className={`truncate font-semibold ${
                    isCardActive
                      ? 'text-amber-600 font-bold'
                      : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                >
                  {currentOption ? currentOption.label : card.triggerLabel}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    isDropdownOpen
                      ? 'transform rotate-180 text-teal-600'
                      : isCardActive
                      ? 'text-amber-500'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
              </div>

              {/* ========================================================================= */}
              {/* FLOATING DROPDOWN MENU */}
              {/* ========================================================================= */}
              {isDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-2 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 text-left animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    {card.dropdownHeader}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 py-1">
                    {card.dropdownOptions.map((opt) => {
                      const isOptionSelected =
                        isCardActive && currentOption?.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleOptionSelect(card.id, opt)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-all ${
                            isOptionSelected
                              ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isOptionSelected && (
                              <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            )}
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {opt.badge && (
                            <span
                              className={`shrink-0 text-[10px] px-2 py-0.5 rounded font-semibold ${
                                opt.badgeColor
                                  ? opt.badgeColor
                                  : 'text-slate-400 bg-slate-100'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. GOVERNANCE SEGMENT SUMMARY & DETAILS PANEL */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 animate-fade-in">
        {/* Panel Header */}
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded text-[10px] font-extrabold uppercase">
              {activeCardConfig.title}
            </span>
            <h3 className="text-xl font-black text-slate-900">
              {activeSelectedOption?.label || activeCardConfig.title} Details
            </h3>
          </div>
        </div>

        {/* Action Code Legend & Multi-Tier Filter Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
          {/* Row 1: Action Filters & Department Views */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Action Filters (Propose, Review, Endorse, Approve, Notify) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-extrabold text-slate-500 uppercase text-[10px] mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3 text-teal-600" /> Action:
              </span>
              {[
                { id: 'ALL', label: 'All Actions' },
                { id: 'PROPOSE', label: 'Propose (P)', color: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100' },
                { id: 'RECOMMEND', label: 'Review / Recommend (R)', color: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100' },
                { id: 'ENDORSE', label: 'Endorse (E)', color: 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100' },
                { id: 'APPROVE', label: 'Approve (A)', color: 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100' },
                { id: 'NOTIFICATION', label: 'Notify (N)', color: 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100' }
              ].map((f) => {
                const isSelected = actionFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActionFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : f.color || 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search authorities..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Row 2: Department View, Regulatory Mandate Filters & Export Options */}
          <div className="pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Function View Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-500 uppercase text-[10px]">
                  Function View:
                </span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="ALL">All Functions</option>
                  <option value="Finance">Finance &amp; Treasury</option>
                  <option value="Risk">Enterprise Risk</option>
                  <option value="Procurement">Procurement &amp; Ops</option>
                  <option value="Capital">Capital Management</option>
                  <option value="Legal">Legal &amp; Compliance</option>
                </select>
              </div>

              {/* Regulatory Mandate Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-500 uppercase text-[10px]">
                  Mandate:
                </span>
                <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRegulatoryFilter('ALL')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      regulatoryFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegulatoryFilter('REGULATORY')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      regulatoryFilter === 'REGULATORY'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Regulatory
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegulatoryFilter('NON_REGULATORY')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      regulatoryFilter === 'NON_REGULATORY'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 hover:text-teal-700'
                    }`}
                  >
                    Internal
                  </button>
                </div>
              </div>
            </div>

            {/* Export Options (Excel & PDF) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                title="Download visible data in Excel (CSV) format"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                title="Generate printable PDF authority dossier"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. AUTHORITIES TABLE */}
        {/* ========================================================================= */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs font-semibold">Loading governance authorities...</p>
          </div>
        ) : filteredAuthorities.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold">No direct authorities mapped to this selection.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Try selecting another category or resetting the action filter.
            </p>
          </div>
        ) : (
          <div ref={tableWrapperRef} className="relative border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            {/* Sticky Floating Table Header for Outer Page Scrolling */}
            {isOuterHeaderSticky && (
              <div 
                style={{
                  position: 'fixed',
                  top: `${stickyHeaderMetrics.top}px`,
                  left: `${stickyHeaderMetrics.left}px`,
                  width: `${stickyHeaderMetrics.width}px`,
                  zIndex: 25
                }}
                className="bg-slate-100 border-x border-b border-slate-300 shadow-lg overflow-hidden animate-fade-in"
              >
                <div 
                  ref={stickyHeaderScrollRef}
                  onScroll={handleStickyHorizontalScroll}
                  className="overflow-x-auto no-scrollbar"
                >
                  <div className="min-w-[940px]">
                    <table className="w-full text-left text-xs table-fixed border-collapse">
                      <colgroup>
                        <col className="w-[7%]" />
                        <col className="w-[16%]" />
                        <col className="w-[28%]" />
                        <col className="w-[11%]" />
                        <col className="w-[16%]" />
                        <col className="w-[11%]" />
                        <col className="w-[11%]" />
                      </colgroup>
                      <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Ref #</th>
                          <th className="py-3 px-4">Function &bull; Business Line</th>
                          <th className="py-3 px-6">Decision Area / Authority Mandate</th>
                          <th className="py-3 px-4 text-center">Specific Action</th>
                          <th className="py-3 px-4">Policy &amp; Regulatory Linkage</th>
                          <th className="py-3 px-3 text-center whitespace-nowrap">Last Update Date</th>
                          <th className="py-3 px-4">Composite Flow</th>
                        </tr>
                      </thead>
                    </table>
                  </div>
                </div>
              </div>
            )}



            <div ref={tableScrollContainerRef} onScroll={handleTableHorizontalScroll} className="overflow-x-auto">
              <div className="min-w-[940px]">
                {/* Fixed Table Header (Scrollbar starts strictly below this header) */}
                <table className="w-full text-left text-xs table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[7%]" />
                    <col className="w-[16%]" />
                    <col className="w-[28%]" />
                    <col className="w-[11%]" />
                    <col className="w-[16%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                  </colgroup>
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Ref #</th>
                      <th className="py-3 px-4">Function &bull; Business Line</th>
                      <th className="py-3 px-6">Decision Area / Authority Mandate</th>
                      <th className="py-3 px-4 text-center">Specific Action</th>
                      <th className="py-3 px-4">Policy &amp; Regulatory Linkage</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">Last Update Date</th>
                      <th className="py-3 px-4">Composite Flow</th>
                    </tr>
                  </thead>
                </table>

                {/* Scrollable Table Body: Scrollbar starts ONLY below the header */}
                <div 
                  ref={governanceTableBodyRef}
                  onScroll={(e) => setIsTableScrolled(e.currentTarget.scrollTop > 120)}
                  className="max-h-[580px] overflow-y-auto overscroll-contain scroll-smooth"
                >
                  <table className="w-full text-left text-xs table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[7%]" />
                      <col className="w-[16%]" />
                      <col className="w-[28%]" />
                      <col className="w-[11%]" />
                      <col className="w-[16%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                    </colgroup>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAuthorities.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            #{item.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                item.function === 'Risk'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-teal-50 text-teal-700 border border-teal-200'
                              }`}
                            >
                              {item.function}
                            </span>
                            <div className="text-[11px] text-slate-600 font-semibold mt-1 truncate max-w-[180px]">
                              {item.business_line}
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <p className="font-bold text-slate-800 leading-snug">
                              {item.decision_area}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.2 rounded ${
                                  item.key_non_key === 'Key'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.key_non_key} Decision
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-lg font-black text-xs border ${
                                item.action_type === 'APPROVE'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : item.action_type === 'ENDORSE'
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : item.action_type === 'RECOMMEND'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-purple-100 text-purple-900 border-purple-300'
                              }`}
                            >
                              {item.authority_code} ({item.action_type})
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {item.policy_reference && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedLinkageItem(item)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline text-left cursor-pointer group"
                                  title="Click to view full Policy &amp; Charter mandate details"
                                >
                                  <BookOpen className="h-3 w-3 text-teal-600 shrink-0 group-hover:scale-110 transition-transform" />
                                  <span className="truncate max-w-[160px]">{item.policy_reference}</span>
                                  <ArrowUpRight className="h-2.5 w-2.5 opacity-60 shrink-0" />
                                </button>
                              )}
                              {item.regulatory_requirement && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedLinkageItem(item)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:underline text-left cursor-pointer group"
                                  title="Click to view statutory requirement &amp; regulatory code"
                                >
                                  <ShieldCheck className="h-3 w-3 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                                  <span className="truncate max-w-[160px]">{item.regulatory_requirement}</span>
                                  <ArrowUpRight className="h-2.5 w-2.5 opacity-60 shrink-0" />
                                </button>
                              )}
                              {!item.policy_reference && !item.regulatory_requirement && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedLinkageItem(item)}
                                  className="text-slate-400 text-[11px] italic hover:text-teal-700 hover:underline flex items-center gap-1 text-left cursor-pointer"
                                  title="Click to inspect internal DOA standard details"
                                >
                                  <span>Internal DOA Standard</span>
                                  <ArrowUpRight className="h-2.5 w-2.5 opacity-60 shrink-0" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Last Update Date */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                              <span>{item.last_update_date || item.effective_date || '2026-02-15'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-xs font-mono font-medium text-slate-700 block max-w-xs truncate" title={formatAuthorityFlow(item.composite_authority)}>
                              {formatAuthorityFlow(item.composite_authority)}
                            </span>
                          </td>
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>


              </div>
            </div>

            {/* Floating "Top" Quick Action Pill Pop-up */}
            {(isTableScrolled || isOuterHeaderSticky) && (
              <button
                type="button"
                onClick={() => {
                  governanceTableBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="absolute bottom-16 right-6 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-teal-700 text-white text-xs font-bold shadow-xl border border-white/10 transition-all transform hover:scale-105 backdrop-blur-xs cursor-pointer animate-fade-in"
                title="Scroll back to top of table"
              >
                <ArrowUp className="h-3.5 w-3.5 text-teal-300" />
                <span>Top</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* POLICY & REGULATORY LINKAGE DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedLinkageItem && (
        <div 
          onClick={() => setSelectedLinkageItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up cursor-default"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200/60">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span>Policy &amp; Regulatory Mandate</span>
                    <span className="text-xs font-mono px-2 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                      #{selectedLinkageItem.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedLinkageItem.function} &bull; {selectedLinkageItem.business_line}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLinkageItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Decision Area Callout */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Governed Decision Area
              </span>
              <p className="text-xs font-bold text-slate-800 leading-snug">
                {selectedLinkageItem.decision_area}
              </p>
            </div>

            {/* Linked Cards */}
            <div className="space-y-3">
              {/* Card 1: Internal Corporate Policy Reference */}
              <div className="p-3.5 bg-teal-50/50 border border-teal-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                    Internal Corporate Policy Mandate
                  </span>
                  <span className="px-2 py-0.2 bg-teal-100 text-teal-800 rounded text-[9px] font-extrabold uppercase">
                    Charter Binding
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-teal-950">
                    {selectedLinkageItem.policy_reference || 'Group Delegation of Authority Standard §4.2'}
                  </p>
                  <p className="text-[11px] text-teal-800 font-medium">
                    Charter Terms of Reference: <strong className="text-slate-900">{selectedLinkageItem.charter_section || 'Board Governance Committee Mandate'}</strong>
                  </p>
                </div>
              </div>

              {/* Card 2: Statutory & Central Bank Regulatory Requirements */}
              <div className="p-3.5 bg-rose-50/50 border border-rose-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
                    Statutory &amp; Central Bank Regulatory Code
                  </span>
                  <span className={`px-2 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                    selectedLinkageItem.regulatory === 'Y'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedLinkageItem.regulatory === 'Y' ? 'Statutory Mandated' : 'Internal Guideline'}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-rose-950">
                    {selectedLinkageItem.regulatory_requirement || 'Central Bank Rulebook (High-Level Control &amp; Corporate Governance Module §12)'}
                  </p>
                  <p className="text-[11px] text-rose-800 font-medium">
                    Mandatory 2LoD Review, Segregation of Duties (VAL-06), and Audit Dossier snapshot required.
                  </p>
                </div>
              </div>

              {/* Card 3: Line Item Telemetry & LUD */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Last Update Date (LUD)
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] mt-0.5 block">
                    {selectedLinkageItem.last_update_date || selectedLinkageItem.effective_date || '2026-02-15'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Authority Action Code
                  </span>
                  <span className="font-bold text-slate-800 text-[11px] mt-0.5 block">
                    {selectedLinkageItem.authority_code} ({selectedLinkageItem.action_type})
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-full">
                Flow: {formatAuthorityFlow(selectedLinkageItem.composite_authority)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

