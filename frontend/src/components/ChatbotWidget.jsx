import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Minimize2,
  Maximize2,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
  Sparkles,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

const ROLE_PROMPTS = {
  DEPT_OWNER: [
    "What is the status of my change requests?",
    "Explain Rule #245 and its authority chain",
    "Who approves unbudgeted assets up to USD 500,000?",
    "What does BRPC and ICAAP mean?",
    "What is the mandatory checklist before submitting a proposal?"
  ],
  REVIEWER: [
    "Which rules require Central Bank (CBB) approval?",
    "What does BRPC, GNRC, and E2 mean?",
    "Explain Rule #239 year-end financial statements",
    "What is the status of my change requests?",
    "Where can I find the side-by-side diff comparison?"
  ],
  APPROVER: [
    "Which rules require Shareholders or Board approval?",
    "Explain Rule #230 disposal of assets",
    "What is the status of my change requests?",
    "What does RAROC and ALCO mean?",
    "Open the Change Queue for review"
  ],
  DEFAULT: [
    "What is the status of my change requests?",
    "Explain Rule #245 and its authority chain",
    "Who approves third-party liability above USD 50,000?",
    "What does BRPC, ICAAP, and E2 mean?",
    "What is the mandatory checklist before submitting a proposal?"
  ]
};

/**
 * Lightweight inline markdown renderer for **bold** and `code` spans
 */
function renderFormattedLine(line, idx) {
  const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <span key={idx}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-slate-100 text-cyan-900 font-mono text-[10px] border border-slate-200"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}

function FormattedBotMessage({ text, isUser }) {
  if (isUser) {
    return <div className="whitespace-pre-line">{text}</div>;
  }
  const lines = String(text || '').split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => (
        <div key={idx} className="leading-relaxed">
          {renderFormattedLine(line, idx)}
        </div>
      ))}
    </div>
  );
}

const INITIAL_MESSAGE = {
  id: 1,
  sender: 'bot',
  text: "Hello! I am your **DOA Governance Assistant**.\n\nI can help you with:\n• **DOA Rule & Threshold Lookups** (by keyword, role, or rule `#ID`)\n• **Official ToC Acronyms & Codes** (`BRPC`, `ICAAP`, `E1–E6`, `R1–R5`)\n• **Live Workspace Status** (your submitted proposals & role scope)\n• **Submission Checklists & Navigation**\n\n*Note: I operate strictly in read-only mode to uphold 2LoD compliance.*",
  sources: [],
  suggested_actions: [],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function ChatbotWidget({ onNavigate, onInspectRecord, userRole, currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const personaKey = currentUser?.persona_type || 'DEFAULT';
  const starterPrompts = ROLE_PROMPTS[personaKey] || ROLE_PROMPTS.DEFAULT;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleResetChat = () => {
    setMessages([
      {
        ...INITIAL_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async (messageToSend) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Build lightweight client-side history (last 4 messages, 0 server RAM state)
    const recentHistory = messages.slice(-4).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    setMessages((prev) => [...prev, userMessage]);
    if (!messageToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.queryChatbot(
        text,
        {
          role: userRole,
          persona_type: currentUser?.persona_type || null
        },
        recentHistory
      );
      const botResponse = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.response,
        sources: res.sources || [],
        suggested_actions: res.suggested_actions || [],
        is_guardrail: res.is_guardrail_triggered || false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: "I encountered an issue connecting to the governance knowledge base. Please check your network or try again.",
          sources: [],
          suggested_actions: [],
          is_guardrail: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (action.action_type === 'suggest_prompt') {
      handleSend(action.target);
    } else if (action.action_type === 'navigate' && onNavigate) {
      onNavigate(action.target);
    }
  };

  return (
    <aside aria-label="DOA Governance Assistant" className="fixed left-4 top-1/2 -translate-y-1/2 z-50 font-sans flex items-center gap-3">
      {/* Persistent Floating Bot Icon Button (Left Middle, Always Visible to Open / Minimize) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-center w-12 h-12 bg-[#0b2240] hover:bg-[#13325b] text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border border-cyan-500/40 group cursor-pointer shrink-0"
        title={isOpen ? "Minimize DOA Governance Assistant" : "Open DOA Governance Assistant"}
      >
        <div className="relative">
          <Bot className="w-6 h-6 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#0b2240]"></span>
        </div>
      </button>

      {/* Main Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 overflow-hidden w-[380px] sm:w-[430px] h-[540px] max-h-[85vh]">
          {/* Header */}
          <div className="bg-[#0b2240] text-white px-4 py-3 flex items-center justify-between border-b border-cyan-900/40 select-none">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/60">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight text-white">DOA Governance Bot</h3>
                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Read-Only
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button
                  onClick={handleResetChat}
                  className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                  title="Reset conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 bg-slate-50/50">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                        m.sender === 'user'
                          ? 'bg-[#0b2240] text-white rounded-br-xs'
                          : m.is_guardrail
                            ? 'bg-amber-50 text-amber-950 border border-amber-200 rounded-bl-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                      }`}
                    >
                      {/* Guardrail badge */}
                      {m.is_guardrail && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 mb-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Guardrail Boundary</span>
                        </div>
                      )}

                      <FormattedBotMessage text={m.text} isUser={m.sender === 'user'} />

                      {/* Clickable Source References */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-cyan-600" />
                              <span>Referenced DOA Rules (Click to Inspect):</span>
                            </span>
                          </div>
                          {m.sources.map((src) => (
                            <button
                              key={src.id}
                              type="button"
                              onClick={() => onInspectRecord && onInspectRecord(src.id)}
                              className="w-full text-left text-[11px] bg-slate-50 hover:bg-cyan-50/70 rounded-lg p-2 text-slate-700 border border-slate-200/80 hover:border-cyan-300 transition-all group cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-cyan-900 group-hover:text-cyan-700 flex items-center gap-1">
                                  <span>{src.title}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                                </span>
                                {src.regulatory === 'Y' && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold uppercase shrink-0">
                                    Regulatory
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">{src.decision_area}</div>
                              {src.authority_chain && (
                                <div className="text-[10px] font-mono text-teal-800 bg-teal-50/80 border border-teal-200/60 rounded px-1.5 py-0.5 mt-1 truncate">
                                  {src.authority_chain}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action buttons / pills */}
                      {m.suggested_actions && m.suggested_actions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {m.suggested_actions.map((act, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleActionClick(act)}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>{act.label}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-cyan-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 px-1 mt-1">{m.timestamp}</span>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5 w-fit shadow-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600" />
                    <span>Consulting governance policy engine...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Sample Prompts Tray */}
              <div className="p-2 bg-slate-100/70 border-t border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSend(prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 hover:border-cyan-300 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-cyan-600" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask rule #ID, acronyms (BRPC), thresholds, or your request status..."
                  disabled={loading}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-600 focus:bg-white text-slate-800 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-xl bg-[#0b2240] hover:bg-[#13325b] disabled:bg-slate-200 text-white disabled:text-slate-400 transition-colors shadow-xs cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
        </div>
      )}
    </aside>
  );
}
