"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  ShieldCheck,
  History,
  X,
} from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  metadata?: {
    toolCallsMade?: string[];
  };
}

const QUICK_PROMPTS = [
  "What classes do I have today?",
  "What is my max achievable attendance this semester?",
  "What is my attendance summary?",
  "How many classes can I miss?",
  "Which subject has the lowest attendance?",
  "What exams are coming up?",
  "Summarize my academic week.",
];

function AssistantChat() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 **Welcome to Academic AI Assistant!**\n\nI answer your questions using verified database queries and deterministic calculations.\n\nAsk me about your **schedule today**, **subject attendance**, **bunk safety calculations**, or **upcoming exams**!",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialQueryFired = useRef(false); // BUG FIX: prevent double-fire of initial query

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    // BUG FIX: use ref so initialQuery only fires once and doesn't depend on stale `loading`
    if (initialQuery && !initialQueryFired.current) {
      initialQueryFired.current = true;
      sendMessage(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (err) {}
  };

  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setShowHistoryMobile(false);
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await res.json();
      if (data.success && data.conversation?.messages) {
        setMessages(data.conversation.messages);
      }
    } catch (err) {}
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setShowHistoryMobile(false);
    setMessages([
      {
        role: "assistant",
        content:
          "👋 Started a fresh academic chat. What would you like to know about your timetable or attendance?",
      },
    ]);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      if (activeConversationId === convId) {
        handleNewChat();
      }
      loadConversations();
    } catch (err) {}
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userText = text.trim();
    setInputMessage("");

    // Add user message to UI immediately
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: userText, timestamp: new Date().toISOString() },
    ];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          conversationId: activeConversationId || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (!activeConversationId && data.conversationId) {
          setActiveConversationId(data.conversationId);
          loadConversations();
        }

        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: data.response,
            timestamp: new Date().toISOString(),
            metadata: { toolCallsMade: data.toolCallsMade },
          },
        ]);
      } else {
        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: `❌ Error: ${data.message || "Failed to process question."}`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "❌ Network error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  return (
    <div className="relative flex h-[calc(100dvh-135px)] md:h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* Mobile Drawer Backdrop */}
      {showHistoryMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setShowHistoryMobile(false)}
        />
      )}

      {/* Sidebar: Conversation history (Desktop static, Mobile slide-in drawer) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 flex-col rounded-r-3xl border-r bg-card p-4 shadow-2xl transition-transform duration-300 ease-in-out md:static md:z-0 md:flex md:rounded-3xl md:border md:bg-card/60 md:shadow-sm md:backdrop-blur-sm ${
          showHistoryMobile ? "flex translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between pb-2 md:hidden">
          <span className="font-bold text-sm text-foreground">Chat History</span>
          <button
            onClick={() => setShowHistoryMobile(false)}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={handleNewChat}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Academic Chat</span>
        </button>

        <div className="mt-4 flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Previous Conversations
          </div>

          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-center text-muted-foreground text-xs">
              No past conversations.
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                  activeConversationId === c.id
                    ? "bg-primary/15 text-primary font-semibold border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <div className="truncate pr-2">
                  <div className="truncate">{c.title || "Academic Chat"}</div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                    {new Date(c.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteConversation(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Pane */}
      <div className="flex flex-1 flex-col rounded-3xl border bg-card/80 shadow-sm backdrop-blur-md overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="font-extrabold text-xs sm:text-sm text-foreground">
                  Academic Assistant
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-500">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Grounded in DB</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">
                Zero hallucination • MongoDB queries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={() => setShowHistoryMobile(true)}
              className="rounded-xl border p-2 text-muted-foreground hover:bg-muted"
              title="Chat History"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              onClick={handleNewChat}
              className="rounded-xl bg-primary/10 text-primary border border-primary/20 p-2 hover:bg-primary/20"
              title="New Chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground font-medium rounded-tr-sm"
                    : "border bg-muted/30 text-foreground rounded-tl-sm space-y-2"
                }`}
              >
                {/* Tool call badge */}
                {m.metadata?.toolCallsMade && m.metadata.toolCallsMade.length > 0 && (
                  <div className="flex flex-wrap gap-1 pb-1">
                    {m.metadata.toolCallsMade.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary"
                      >
                        Queried: {tool}
                      </span>
                    ))}
                  </div>
                )}

                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.timestamp && (
                  <div
                    className={`text-[9px] pt-1 ${
                      m.role === "user" ? "text-primary-foreground/75" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>

              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold text-xs">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Checking MongoDB & calculating deterministically...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="border-t bg-muted/20 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">
            Suggestions:
          </span>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="shrink-0 rounded-xl border bg-card px-3 py-1 text-[11px] font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t bg-card/90">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask Academic AI about your schedule, attendance, or bunk buffer..."
              className="w-full rounded-2xl border bg-background py-3 pl-4 pr-12 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="absolute right-2 rounded-xl bg-primary p-2 text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading AI Assistant...</div>}>
        <AssistantChat />
      </Suspense>
    </AppLayout>
  );
}
