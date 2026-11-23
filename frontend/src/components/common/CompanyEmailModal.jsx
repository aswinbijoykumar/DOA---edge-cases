import React, { useState, useMemo } from 'react';
import {
  Mail,
  X,
  Inbox,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  FileCheck2,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { getUserProfile } from '../../data/orgHierarchy';

export default function CompanyEmailModal({ isOpen, onClose, currentUser, onNavigateTab }) {
  const profile = getUserProfile(currentUser);

  const emails = useMemo(() => {
    const userName = profile?.name || currentUser?.full_name || 'Governance User';
    const userRoleLabel = profile?.designation || currentUser?.role || 'Authority Custodian';
    const dept = profile?.department || currentUser?.department || 'Finance';

    return [
      {
        id: 'mail-1',
        step: '1st Email',
        stageLabel: 'Proposal Submitted',
        stageBadgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        fromName: 'DOA Governance Workflow Engine',
        fromEmail: 'noreply-doa@pronexus-governance.com',
        subject: '[Action Required] New Decision Area Added With Your Role',
        timestamp: 'Today, 10:42 AM',
        preview: 'A decision area has been added with your role in it - click here to view and action',
        headline: 'A decision area has been added with your role in it - click here to view and action',
        details: [
          `Dear ${userName} (${userRoleLabel}),`,
          `A new Delegation of Authority change proposal in the ${dept} domain has been submitted and routes through your designated authority role.`,
          `Reference: CR-2026-041 • Decision Area: Approve Capital Management Policy & Amendments (#232)`
        ],
        ctaLabel: 'Click here to view and action',
        targetTab: 'queue'
      },
      {
        id: 'mail-2',
        step: '2nd Email',
        stageLabel: 'Authority Chain Update',
        stageBadgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        fromName: 'DOA Governance Workflow Engine',
        fromEmail: 'noreply-doa@pronexus-governance.com',
        subject: '[Workflow Update] Authority Role Action Recorded in Decision Area',
        timestamp: 'Today, 11:15 AM',
        preview: 'Head of Finance (GCFO) has approved/rejected their role in the decision area',
        headline: 'Head of Finance (GCFO) has approved/rejected their role in the decision area',
        details: [
          `Dear ${userName},`,
          `An authority holder upstream in the delegation chain has recorded their decision:`,
          `• Actor: Head of Finance (GCFO) — Approved`,
          `• Decision Area: Approve Capital Management Policy & Amendments (#232)`,
          `The proposal is now progressing to the remaining authorities in the chain.`
        ],
        ctaLabel: 'View Approval Progress',
        targetTab: 'queue'
      },
      {
        id: 'mail-3',
        step: '3rd Email',
        stageLabel: 'All Authorities Approved',
        stageBadgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
        fromName: 'DOA Governance Workflow Engine',
        fromEmail: 'noreply-doa@pronexus-governance.com',
        subject: '[Ready for Governance] All People in the Authority Chain Have Approved',
        timestamp: 'Today, 11:30 AM',
        preview: 'All people in the authority chain have approved',
        headline: 'All people in the authority chain have approved',
        details: [
          `Dear ${userName},`,
          `All designated roles across Propose (P), Review (R), Endorse (E), and Approve (A) in the authority chain have completed their sign-offs.`,
          `• Decision Area: Approve Capital Management Policy & Amendments (#232)`,
          `• Current Status: Approved by All Authorities — Pending Final Governance Team Publication`
        ],
        ctaLabel: 'Inspect Approved Proposal',
        targetTab: 'queue'
      },
      {
        id: 'mail-4',
        step: '4th Email',
        stageLabel: 'Published to Final DOA',
        stageBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        fromName: 'Governance Secretariat (2LoD)',
        fromEmail: 'governance@pronexus-governance.com',
        subject: '[Final DOA Published] Decision Area Approved by Governance & Published',
        timestamp: 'Today, 11:45 AM',
        preview: 'The decision area Approve Capital Management Policy (#232) has now been approved by Governance and published to the final DOA',
        headline: 'The decision area "Approve Capital Management Policy (#232)" has now been approved by Governance and published to the final DOA',
        details: [
          `Dear ${userName},`,
          `Governance Secretariat has completed final verification and published the updated rule into the active Master Delegation of Authority Matrix (Version v2.0).`,
          `• Published Decision Area: Approve Capital Management Policy (#232)`,
          `• Effective Date: Immediate • Immutable Audit Ledger Entry Recorded`
        ],
        ctaLabel: 'View in Final DOA Matrix',
        targetTab: 'search'
      }
    ];
  }, [profile, currentUser]);

  const [selectedId, setSelectedId] = useState('mail-1');
  const [readIds, setReadIds] = useState({});

  if (!isOpen) return null;

  const selectedEmail = emails.find((e) => e.id === selectedId) || emails[0];
  const unreadCount = emails.filter((e) => !readIds[e.id]).length;

  const handleSelectEmail = (emailId) => {
    setSelectedId(emailId);
    setReadIds((prev) => ({ ...prev, [emailId]: true }));
  };

  const handleActionClick = (targetTab) => {
    onClose();
    if (onNavigateTab && targetTab) {
      onNavigateTab(targetTab);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[560px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Mail Client Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0b2240] to-indigo-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  Company Internal Mail — DOA Notifications
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 shrink-0">
                  Integrated Prototype
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Inbox for <span className="font-semibold text-white">{profile.email}</span> ({profile.name})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Company Mail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Split Pane: Left Email List + Right Reading Pane */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
          {/* Left Pane: Inbox List */}
          <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5 text-blue-600" />
                <span>Inbox ({emails.length})</span>
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {unreadCount} Unread
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70">
              {emails.map((item) => {
                const isSelected = item.id === selectedEmail.id;
                const isRead = Boolean(readIds[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectEmail(item.id)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-blue-50/90 border-l-4 border-l-blue-600'
                        : 'hover:bg-white border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          {item.step}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${item.stageBadgeClass}`}>
                          {item.stageLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{item.timestamp}</span>
                    </div>
                    <div className={`text-xs truncate ${isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {item.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                      {item.preview}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Email Content Viewer */}
          <div className="md:col-span-7 bg-white flex flex-col min-h-0 overflow-y-auto p-5 sm:p-6">
            <div className="space-y-4">
              {/* Email Meta Header */}
              <div className="border-b border-slate-100 pb-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${selectedEmail.stageBadgeClass}`}>
                    {selectedEmail.step} &bull; {selectedEmail.stageLabel}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedEmail.timestamp}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {selectedEmail.subject}
                </h3>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 w-10">From:</span>
                    <span className="font-semibold text-slate-800">{selectedEmail.fromName}</span>
                    <span className="text-slate-400 font-mono text-[11px]">&lt;{selectedEmail.fromEmail}&gt;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 w-10">To:</span>
                    <span className="font-semibold text-blue-700">{profile.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">&lt;{profile.email}&gt;</span>
                  </div>
                </div>
              </div>

              {/* Highlighted Core Notification Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-blue-200 text-blue-700 shrink-0 shadow-2xs">
                  {selectedEmail.id === 'mail-4' ? (
                    <FileCheck2 className="h-4 w-4 text-emerald-600" />
                  ) : selectedEmail.id === 'mail-3' ? (
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  ) : selectedEmail.id === 'mail-2' ? (
                    <UserCheck className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Send className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                    Automated DOA Notification
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                    "{selectedEmail.headline}"
                  </p>
                </div>
              </div>

              {/* Email Body Copy */}
              <div className="space-y-2.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                {selectedEmail.details.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>

              {/* Interactive Action Link Inside Email */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleActionClick(selectedEmail.targetTab)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0b2240] via-blue-700 to-teal-600 hover:from-[#102d54] hover:via-blue-600 hover:to-teal-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <span>{selectedEmail.ctaLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                  <span>Internal SMTP / Exchange Relay Prototype</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
