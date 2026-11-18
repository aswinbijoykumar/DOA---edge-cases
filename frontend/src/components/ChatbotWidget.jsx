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
  Info,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_PROMPTS = [
  "What is the approval threshold for CapEx or Finance?",
  "What is the mandatory checklist before submitting a proposal?",
  "Where can I find the side-by-side diff comparison?",
  "What does status 'Clarification Required' mean?",
  "Can you approve this change request for me?" // Demo of guardrail refusal!
];

export default function ChatbotWidget({ onNavigate, userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I am your **DOA Governance Assistant**.\n\nI can help you check **published delegation limits**, guide you through **mandatory checklists**, explain **system statuses**, or navigate the application.\n\n*Note: I operate strictly in read-only mode to uphold 2LoD compliance.*",
      sources: [],
      suggested_actions: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (messageToSend) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.queryChatbot(text, { role: userRole });
      const botResponse = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.response,
        sources: res.sources || [],
        suggested_actions: res.suggested_actions || [],
        is_guardrail: res.is_guardrail_triggered || false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (err) {
      setMessages(prev => [
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
    <aside aria-label="DOA Governance Assistant" className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-[#0b2240] hover:bg-[#13325b] text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border border-cyan-500/40 group"
          title="Open DOA Governance Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#0b2240]"></span>
          </div>
          <span className="text-sm font-semibold tracking-wide">DOA Policy Assistant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">2LoD</span>
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div 
          className={`bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 overflow-hidden ${
            isMinimized 
              ? 'w-80 h-14' 
              : 'w-[400px] sm:w-[440px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-[#0b2240] text-white px-4 py-3 flex items-center justify-between border-b border-cyan-900/40 select-none">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/60">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-white">DOA Governance Bot</h3>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Read-Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">Policy, Thresholds & Checklists</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Body (When not minimized) */}
          {!isMinimized && (
            <>
              {/* Guardrail Disclaimer Banner */}
              <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span>Strict 2LoD Read-Only Compliance</span>
                </div>
                <span className="text-[10px] text-slate-600">No ERP / No Writes</span>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
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

                      <div className="whitespace-pre-line prose-sm">
                        {m.text}
                      </div>

                      {/* Source References */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-cyan-600" />
                            <span>Referenced DOA Matrix Rules:</span>
                          </div>
                          {m.sources.map(src => (
                            <div key={src.id} className="text-[11px] bg-slate-50 rounded p-1.5 text-slate-700 border border-slate-100">
                              <span className="font-semibold text-cyan-800">{src.title}</span>
                              <div className="text-[10px] text-slate-600 truncate">{src.decision_area}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons / pills */}
                      {m.suggested_actions && m.suggested_actions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {m.suggested_actions.map((act, i) => (
                            <button
                              key={i}
                              onClick={() => handleActionClick(act)}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1 transition-colors"
                            >
                              <span>{act.label}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-cyan-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600 px-1 mt-1">{m.timestamp}</span>
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
                {DEFAULT_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    disabled={loading}
                    onClick={() => handleSend(prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 hover:border-cyan-300 transition-all shrink-0 flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-cyan-600" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about thresholds, checklists, or navigation..."
                  disabled={loading}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-600 focus:bg-white text-slate-800 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-xl bg-[#0b2240] hover:bg-[#13325b] disabled:bg-slate-200 text-white disabled:text-slate-400 transition-colors shadow-xs"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
