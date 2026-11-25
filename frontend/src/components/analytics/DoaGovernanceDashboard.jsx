import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCcw,
  ShieldCheck,
  Briefcase,
  Layers
} from 'lucide-react';
import InteractiveDonutChart from './InteractiveDonutChart';
import { DOA_ANALYTICS_DATASET } from '../../data/doaAnalyticsData';

// Color Palettes
const COLORS = {
  function: {
    Finance: '#1D4ED8', // Royal Sapphire
    Risk: '#6D28D9'     // Indigo Violet
  },
  regulated: {
    Y: '#0D9488', // Emerald Teal
    N: '#0284C7'  // Sky Cyan
  },
  subprocesses: [
    '#2563EB', // Blue
    '#0891B2', // Cyan
    '#7C3AED', // Purple
    '#0D9488', // Teal
    '#3B82F6', // Sky
    '#6366F1', // Indigo
    '#D946EF', // Fuchsia
    '#F59E0B'  // Amber
  ]
};

export default function DoaGovernanceDashboard({ className = '' }) {
  // Master records
  const [records] = useState(DOA_ANALYTICS_DATASET);

  // 3 Primary Filter States: Function, Regulatory Parameter, Subprocess
  const [selectedFunction, setSelectedFunction] = useState('All'); // 'All' | 'Finance' | 'Risk'
  const [selectedRegulated, setSelectedRegulated] = useState('All'); // 'All' | 'Y' | 'N'
  const [selectedSubprocess, setSelectedSubprocess] = useState('All'); // 'All' | string

  // Dynamic Subprocesses available under the selected Function
  const availableSubprocesses = useMemo(() => {
    let pool = records;
    if (selectedFunction !== 'All') {
      pool = pool.filter(r => r.function === selectedFunction);
    }
    return Array.from(new Set(pool.map(r => r.subprocess))).filter(Boolean);
  }, [records, selectedFunction]);

  // When function changes, reset subprocess if not available in current function
  useEffect(() => {
    if (selectedSubprocess !== 'All' && !availableSubprocesses.includes(selectedSubprocess)) {
      setSelectedSubprocess('All');
    }
  }, [selectedFunction, availableSubprocesses, selectedSubprocess]);

  // Filtered dataset based on the 3 parameters
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (selectedFunction !== 'All' && record.function !== selectedFunction) {
        return false;
      }
      if (selectedRegulated !== 'All' && record.regulated !== selectedRegulated) {
        return false;
      }
      if (selectedSubprocess !== 'All' && record.subprocess !== selectedSubprocess) {
        return false;
      }
      return true;
    });
  }, [records, selectedFunction, selectedRegulated, selectedSubprocess]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedFunction('All');
    setSelectedRegulated('All');
    setSelectedSubprocess('All');
  };

  const activeFiltersCount = [
    selectedFunction !== 'All',
    selectedRegulated !== 'All',
    selectedSubprocess !== 'All'
  ].filter(Boolean).length;

  // --------------------------------------------------------------------------
  // KPI Metrics for Donut Centers
  // --------------------------------------------------------------------------
  const totalDecisions = filteredRecords.length;
  const regulatedCount = filteredRecords.filter(r => r.regulated === 'Y').length;
  const regulatedPct = totalDecisions > 0 ? ((regulatedCount / totalDecisions) * 100).toFixed(0) : '0';
  const distinctSubprocesses = new Set(filteredRecords.map(r => r.subprocess)).size;

  // --------------------------------------------------------------------------
  // Donut 1 Data: Function Split (Finance vs. Risk)
  // --------------------------------------------------------------------------
  const functionDonutData = useMemo(() => {
    let pool = records;
    if (selectedRegulated !== 'All') pool = pool.filter(r => r.regulated === selectedRegulated);

    const financeCount = pool.filter(r => r.function === 'Finance').length;
    const riskCount = pool.filter(r => r.function === 'Risk').length;

    return [
      {
        id: 'Finance',
        label: 'Finance',
        value: financeCount,
        color: COLORS.function.Finance
      },
      {
        id: 'Risk',
        label: 'Risk',
        value: riskCount,
        color: COLORS.function.Risk
      }
    ];
  }, [records, selectedRegulated]);

  // --------------------------------------------------------------------------
  // Donut 2 Data: Regulatory Parameter (Regulated vs. Non-Regulated)
  // --------------------------------------------------------------------------
  const regulatedDonutData = useMemo(() => {
    let pool = records;
    if (selectedFunction !== 'All') pool = pool.filter(r => r.function === selectedFunction);
    if (selectedSubprocess !== 'All') pool = pool.filter(r => r.subprocess === selectedSubprocess);

    const regCount = pool.filter(r => r.regulated === 'Y').length;
    const nonRegCount = pool.filter(r => r.regulated === 'N').length;

    return [
      {
        id: 'Y',
        label: 'Regulated',
        value: regCount,
        color: COLORS.regulated.Y
      },
      {
        id: 'N',
        label: 'Non-Regulated',
        value: nonRegCount,
        color: COLORS.regulated.N
      }
    ];
  }, [records, selectedFunction, selectedSubprocess]);

  // --------------------------------------------------------------------------
  // Donut 3 Data: Subprocess Breakdown
  // --------------------------------------------------------------------------
  const subprocessDonutData = useMemo(() => {
    let pool = records;
    if (selectedFunction !== 'All') pool = pool.filter(r => r.function === selectedFunction);
    if (selectedRegulated !== 'All') pool = pool.filter(r => r.regulated === selectedRegulated);

    const counts = {};
    pool.forEach(r => {
      counts[r.subprocess] = (counts[r.subprocess] || 0) + 1;
    });

    return Object.entries(counts).map(([sp, count], idx) => ({
      id: sp,
      label: sp,
      value: count,
      color: COLORS.subprocesses[idx % COLORS.subprocesses.length]
    }));
  }, [records, selectedFunction, selectedRegulated]);

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      {/* Background with Subtle Circuit Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(135deg, #F4F9FF 0%, #E6F2FF 50%, #D8ECFF 100%)'
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="doa-clean-circuit-pattern"
              x="0"
              y="0"
              width="140"
              height="140"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M10 20 L50 20 L70 40 L120 40 M30 80 L70 80 L90 100 L130 100 M60 10 L60 50 L90 80 M10 110 L40 110 L60 130"
                fill="none"
                stroke="#0284C7"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="50" cy="20" r="2.5" fill="#38BDF8" />
              <circle cx="70" cy="40" r="3" fill="#0284C7" stroke="#BAE6FD" strokeWidth="1" />
              <circle cx="120" cy="40" r="2" fill="#0284C7" />
              <circle cx="70" cy="80" r="2.5" fill="#38BDF8" />
              <circle cx="90" cy="100" r="3" fill="#0284C7" stroke="#BAE6FD" strokeWidth="1" />
              <circle cx="60" cy="50" r="2" fill="#38BDF8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#doa-clean-circuit-pattern)" />
        </svg>
      </div>

      {/* Main Container */}
      <div className="relative z-10 p-4 sm:p-5 space-y-5">

        {/* Top Control Bar: Title, Breadcrumbs, & 3 Clean Filter Controls */}
        <div className="bg-white/85 backdrop-blur-md border border-sky-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          
          {/* Header */}
          <div className="flex items-center pb-3 border-b border-sky-100">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Delegation of Authority Governance &amp; Analytics
            </h2>
          </div>

          {/* Clean 3-Filter Row: Function | Regulatory Parameter | Subprocess | Reset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-10 gap-3 items-end">
            
            {/* Filter a: Function */}
            <div className="lg:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                Function
              </label>
              <select
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
                className="w-full text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="All">All Functions</option>
                <option value="Finance">Finance</option>
                <option value="Risk">Risk</option>
              </select>
            </div>

            {/* Filter b: Regulatory Parameter */}
            <div className="lg:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                Regulatory Parameter
              </label>
              <select
                value={selectedRegulated}
                onChange={(e) => setSelectedRegulated(e.target.value)}
                className="w-full text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="All">All Parameters</option>
                <option value="Y">Regulated (Yes)</option>
                <option value="N">Non-Regulated (No)</option>
              </select>
            </div>

            {/* Filter c: Subprocess */}
            <div className="lg:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-purple-600" />
                Subprocess
              </label>
              <select
                value={selectedSubprocess}
                onChange={(e) => setSelectedSubprocess(e.target.value)}
                className="w-full text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="All">All Subprocesses</option>
                {availableSubprocesses.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="lg:col-span-1 flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={activeFiltersCount === 0}
                className={`w-full h-[42px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xs ${
                  activeFiltersCount > 0
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
                title="Reset filters"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>Reset</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Primary Visualization: 3 Synchronized Donut Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Donut 1: Function Distribution */}
          <InteractiveDonutChart
            title="Function Distribution"
            data={functionDonutData}
            activeId={selectedFunction !== 'All' ? selectedFunction : null}
            onSelect={(id) => setSelectedFunction(prev => prev === id ? 'All' : id)}
            centerMetric={totalDecisions}
            centerLabel="Decisions"
          />

          {/* Donut 2: Regulatory Parameter */}
          <InteractiveDonutChart
            title="Regulatory Parameter"
            data={regulatedDonutData}
            activeId={selectedRegulated !== 'All' ? selectedRegulated : null}
            onSelect={(id) => setSelectedRegulated(prev => prev === id ? 'All' : id)}
            centerMetric={`${regulatedPct}%`}
            centerLabel="Regulated"
          />

          {/* Donut 3: Subprocess Breakdown */}
          <InteractiveDonutChart
            title="Subprocess Breakdown"
            data={subprocessDonutData}
            activeId={selectedSubprocess !== 'All' ? selectedSubprocess : null}
            onSelect={(id) => setSelectedSubprocess(prev => prev === id ? 'All' : id)}
            centerMetric={distinctSubprocesses}
            centerLabel="Subprocesses"
          />

        </div>

      </div>
    </div>
  );
}
