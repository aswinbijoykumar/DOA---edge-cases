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
  ArrowRight
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
    dropdownHeader: 'SELECT DEPARTMENT',
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
  const [actionFilter, setActionFilter] = useState('ALL'); // ALL, APPROVE, ENDORSE, RECOMMEND, NOTIFICATION
  const containerRef = useRef(null);

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
    const matchesAction = actionFilter === 'ALL' || item.action_type === actionFilter;
    if (!matchesAction) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.id?.toString().toLowerCase().includes(q) ||
      item.decision_area?.toLowerCase().includes(q) ||
      item.business_line?.toLowerCase().includes(q) ||
      item.function?.toLowerCase().includes(q) ||
      item.authority_code?.toLowerCase().includes(q) ||
      item.policy_reference?.toLowerCase().includes(q)
    );
  });

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

        {/* Action Code Legend & Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-extrabold text-slate-500 uppercase text-[10px] mr-1">
              Filter Action:
            </span>
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'APPROVE', label: 'Approve (A)', color: 'bg-emerald-100/70 text-emerald-900 border-emerald-300' },
              { id: 'ENDORSE', label: 'Endorse (E)', color: 'bg-blue-100/70 text-blue-900 border-blue-300' },
              { id: 'RECOMMEND', label: 'Recommend (R)', color: 'bg-amber-100/70 text-amber-900 border-amber-300' },
              { id: 'NOTIFICATION', label: 'Notify (N)', color: 'bg-purple-100/70 text-purple-900 border-purple-300' }
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
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
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
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700">
                Displaying <span className="text-teal-700">{filteredAuthorities.length}</span> of{' '}
                {authoritiesList.length} authorities
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Function &bull; Business Line</th>
                    <th className="py-3 px-6">Decision Area / Authority Mandate</th>
                    <th className="py-3 px-4 text-center">Specific Action</th>
                    <th className="py-3 px-4">Policy &amp; Regulatory Linkage</th>
                    <th className="py-3 px-4">Composite Flow</th>
                  </tr>
                </thead>
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
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                              <BookOpen className="h-3 w-3 text-teal-600 shrink-0" />
                              <span className="truncate max-w-[180px]">{item.policy_reference}</span>
                            </div>
                          )}
                          {item.regulatory_requirement && (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
                              <ShieldCheck className="h-3 w-3 text-rose-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{item.regulatory_requirement}</span>
                            </div>
                          )}
                          {!item.policy_reference && !item.regulatory_requirement && (
                            <span className="text-slate-400 text-[11px] italic">Internal DOA Standard</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-mono font-medium text-slate-700 block max-w-xs truncate" title={item.composite_authority}>
                          {item.composite_authority || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

