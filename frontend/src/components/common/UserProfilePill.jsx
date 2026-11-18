import React, { useState, useRef } from 'react';
import { 
  Mail, 
  Building2, 
  Network
} from 'lucide-react';
import { getUserProfile } from '../../data/orgHierarchy';

export default function UserProfilePill({ currentUser, onOpenOrgChart }) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const profile = getUserProfile(currentUser);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. Main Landing UI Pill: ONLY Name and AI Avatar */}
      <div 
        className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        title="Hover to view profile card"
      >
        {/* Circular AI Avatar */}
        <div className="relative shrink-0">
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            className="w-6 h-6 rounded-full object-cover border border-slate-300 shadow-2xs group-hover:scale-105 transition-transform" 
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
        </div>

        {/* User Name Only */}
        <span className="font-bold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">
          {profile.name}
        </span>
      </div>

      {/* 2. Compact & Precise Profile Hover Card */}
      {isHovered && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden animate-fade-in text-slate-900"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Sleek Header Banner (Without MS Teams text & without Available button) */}
          <div className="h-12 bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-950" />

          {/* Profile Details Container */}
          <div className="px-4 pb-4 pt-0 relative">
            
            {/* Avatar overlapping banner */}
            <div className="relative -mt-7 mb-2.5 inline-block">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-14 h-14 rounded-full object-cover border-3 border-white shadow-md bg-white"
              />
              <div 
                className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" 
                title="Active" 
              />
            </div>

            {/* Name + Org Chart Symbol Beside the Name */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">
                  {profile.name}
                </h3>
                
                {/* Org Chart Symbol beside name (Click to open Org Chart) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHovered(false);
                    if (onOpenOrgChart) onOpenOrgChart();
                  }}
                  title="View Organization Hierarchy"
                  className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/70 transition-all shadow-2xs hover:scale-105 shrink-0 cursor-pointer"
                >
                  <Network className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Designation */}
              <p className="text-xs font-semibold text-indigo-600 mt-0.5 truncate">
                {profile.designation}
              </p>

              {/* Role Badge only (No tier 2 duplicate) */}
              <div className="mt-1.5">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  {profile.role}
                </span>
              </div>
            </div>

            {/* Contact & Entity Info */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-800 truncate text-[11px]">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate text-[11px]">{profile.entity}</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
