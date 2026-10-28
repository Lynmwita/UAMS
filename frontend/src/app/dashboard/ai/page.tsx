'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import {
  Sparkles,
  Send,
  Bot,
  User,
  GraduationCap,
  CreditCard,
  BookOpen,
  Home,
  FileText,
  AlertCircle,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const PRESET_PROMPTS = [
  {
    title: 'Exam Clearance & Fees',
    icon: CreditCard,
    prompt: 'What are the institutional fee clearance thresholds and attendance requirements to sit for upcoming semester examinations?',
  },
  {
    title: 'Degree & GPA Honors',
    icon: GraduationCap,
    prompt: 'Explain the 4.0 GPA scale at UAMS and how cumulative GPA is weighted for First Class and Second Class Honors degrees.',
  },
  {
    title: 'Course Prerequisites',
    icon: BookOpen,
    prompt: 'What are the prerequisites for Advanced Database Systems (BCS 311) and Distributed Systems (BIT 312), and what is the maximum recommended credit load?',
  },
  {
    title: 'Hostel Allocation Policy',
    icon: Home,
    prompt: 'How does university hostel room reservation work, when does check-in close, and what is the fee policy per semester?',
  },
  {
    title: 'Academic Appeal Template',
    icon: FileText,
    prompt: 'Help me draft a formal academic inquiry letter to the Head of Department (HOD) regarding a special examination sitting request.',
  },
];

export default function AIAssistantPage() {
  const { role } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### Welcome to UAMS Institutional AI Advisor\n\nI am your **AI Academic & Operational Assistant**, powered by **NVIDIA NIM Accelerated Intelligence**.\n\nI can assist you with:\n* **Academic Regulations**: Course prerequisites, registration rules, GPA standing & honors calculations\n* **Financial Clearance**: Exam clearance thresholds, M-Pesa automated receipts & billing\n* **Campus Life**: Hostel allocation guidelines, digital library policies, and timetable conflicts\n* **Administrative Drafts**: Inquiry letters, department appeals, and institutional memorandums\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userRole: role,
          userName: ROLE_LABELS[role] || 'Scholar',
        }),
      });

      const data = await res.json();

      if (data?.success && data?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ **Advisory Notice**: ${data?.error || 'Unable to communicate with AI model. Please verify API configuration.'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ **Network Error**: Unable to reach AI server. Please check your network connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation refreshed. How may I assist your academic journey today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-academic-navy-900 via-academic-navy-800 to-academic-navy-950 text-white rounded-2xl p-6 shadow-md border border-academic-navy-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-academic-gold-500/20 border border-academic-gold-400/40 flex items-center justify-center text-academic-gold-400 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">UAMS AI Academic Advisor</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
                  NVIDIA NIM Active
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                Contextual institutional intelligence tailored for{' '}
                <span className="text-academic-gold-300 font-semibold">{ROLE_LABELS[role] || 'Student'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              <Cpu className="w-3.5 h-3.5 text-academic-gold-400" />
              <span>Llama 3.2 NIM</span>
            </div>
            <button
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition border border-white/10"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Accuracy disclaimer */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <p>
          <strong>Check before you act:</strong> AI answers are generated guidance, not verified official
          rulings. Always check them against the official university regulations and your faculty&apos;s
          published rules, and stay within your signed-in role&apos;s scope. No live AI answer shown here
          has been verified against an official source.
        </p>
      </div>

      {/* Preset Suggestions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Academic Inquiries</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRESET_PROMPTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(item.prompt)}
                disabled={isLoading}
                className="text-left p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-academic-gold-400 transition shadow-sm hover:shadow group flex items-start space-x-3 disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-academic-gold-50 text-slate-700 group-hover:text-academic-gold-700 flex items-center justify-center shrink-0 transition">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-academic-navy-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {item.prompt}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[460px] max-h-[640px]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-academic-gold-500 text-academic-navy-950 shadow-sm'
                      : 'bg-academic-navy-900 text-academic-gold-400 shadow-sm'
                  }`}
                >
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-academic-navy-900 text-white rounded-tr-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5 opacity-70">
                    <span className="font-semibold">{isUser ? 'You' : 'UAMS AI'}</span>
                    <div className="flex items-center space-x-2">
                      <span>{message.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="hover:opacity-100 p-0.5"
                          title="Copy text"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans text-sm">
                      {message.content}
                    </div>
                  ) : (
                    <MarkdownRenderer content={message.content} />
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-academic-navy-900 text-academic-gold-400 flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center space-x-2 shadow-sm">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-academic-gold-500 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-academic-gold-500 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-academic-gold-500 animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-xs text-slate-500 font-medium ml-1">Analyzing institutional records...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/60 rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about exam clearance, GPA, courses, hostels, or policies...`}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-academic-navy-900 focus:border-transparent transition shadow-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-medium text-sm transition shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed shrink-0 space-x-2"
            >
              <span>Ask AI</span>
              <Send className="w-4 h-4 text-academic-gold-400" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>NVIDIA NIM Secure Institutional Gateway</span>
            </span>
            <span>UAMS Enterprise v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
