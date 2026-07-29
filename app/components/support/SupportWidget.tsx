"use client";
import { useEffect, useRef, useState } from "react";
import { Headset, X, MessageCircle, FileText, Send, Loader2, CheckCircle } from "lucide-react";

interface Message {
  id: number;
  sender: "user" | "bot" | "agent";
  body: string;
  createdAt: string;
}
interface Chat {
  id: string;
  status: "open" | "handed_off" | "closed";
}

type View = "menu" | "chat" | "request" | "request-sent";

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  // Live chat state
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Request form state
  const [reqSubject, setReqSubject] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [reqOrderNumber, setReqOrderNumber] = useState("");
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function resetAndClose() {
    if (pollRef.current) clearInterval(pollRef.current);
    setOpen(false);
    setView("menu");
    setChat(null);
    setMessages([]);
    setInput("");
    setReqSubject("");
    setReqMessage("");
    setReqOrderNumber("");
    setReqError(null);
  }

  function beginPolling(chatId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/support/chat/${chatId}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        setChat(data.chat);
        setMessages(data.messages ?? []);
      } catch {
        // transient poll failure — try again on the next tick
      }
    }, 3000);
  }

  async function startChat() {
    setStarting(true);
    try {
      const res = await fetch("/api/support/chat", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start chat");
      setChat(data.chat);
      setMessages(data.messages ?? []);
      setView("chat");
      beginPolling(data.chat.id);
    } catch {
      // stay on the menu — keep this MVP simple, no error toast yet
    } finally {
      setStarting(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !chat || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/support/chat/${chat.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setChat(data.chat);
        setMessages(data.messages ?? []);
      }
    } finally {
      setSending(false);
    }
  }

  async function closeChat() {
    if (!chat) return;
    if (pollRef.current) clearInterval(pollRef.current);
    await fetch(`/api/support/chat/${chat.id}/close`, { method: "POST" }).catch(() => {});
    resetAndClose();
  }

  async function submitRequest() {
    setReqError(null);
    if (!reqMessage.trim()) {
      setReqError("Please describe what you need help with.");
      return;
    }
    setReqSubmitting(true);
    try {
      const res = await fetch("/api/support/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: reqSubject, message: reqMessage, orderNumber: reqOrderNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReqError(data.error ?? "Could not submit your request.");
        return;
      }
      setView("request-sent");
    } catch {
      setReqError("Something went wrong. Please try again.");
    } finally {
      setReqSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full text-center text-xs font-bold text-[var(--brand-navy)] bg-white border border-[var(--brand-border)] hover:border-[#FF6A00] hover:text-[#FF6A00] py-2 rounded-lg transition-colors"
      >
        Contact Support
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6">
          <div className="fixed inset-0 bg-black/40" onClick={view === "chat" ? undefined : resetAndClose} />
          <div className="relative w-full sm:w-[380px] h-[85vh] sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-[#081A36] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Headset className="w-4 h-4" />
                <span className="font-bold text-sm">
                  {view === "chat"
                    ? "Support Chat"
                    : view === "request" || view === "request-sent"
                    ? "Submit a Request"
                    : "Need Help?"}
                </span>
              </div>
              <button
                onClick={view === "chat" ? closeChat : resetAndClose}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {view === "menu" && (
                <div className="p-5 space-y-3">
                  <p className="text-sm text-slate-500 mb-2">How can we help?</p>
                  <button
                    onClick={startChat}
                    disabled={starting}
                    className="w-full flex items-center gap-3 border border-slate-200 hover:border-[#FF6A00] rounded-xl p-4 text-left transition-colors disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#FF6A00]/10 flex items-center justify-center flex-shrink-0">
                      {starting ? (
                        <Loader2 className="w-5 h-5 text-[#FF6A00] animate-spin" />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-[#FF6A00]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#081A36]">Chat with an agent</p>
                      <p className="text-xs text-slate-400">Get a quick answer in real time</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setView("request")}
                    className="w-full flex items-center gap-3 border border-slate-200 hover:border-[#FF6A00] rounded-xl p-4 text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#081A36]">Submit a request</p>
                      <p className="text-xs text-slate-400">Send us details and we&apos;ll follow up by email</p>
                    </div>
                  </button>
                </div>
              )}

              {view === "chat" && (
                <>
                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            m.sender === "user"
                              ? "bg-[#FF6A00] text-white"
                              : m.sender === "agent"
                              ? "bg-[#081A36] text-white"
                              : "bg-white border border-slate-200 text-slate-700"
                          }`}
                        >
                          {m.sender === "agent" && (
                            <p className="text-[10px] font-bold uppercase text-emerald-300 mb-0.5">Support Agent</p>
                          )}
                          {m.body}
                        </div>
                      </div>
                    ))}
                    {chat?.status === "open" && (
                      <p className="text-[11px] text-slate-400 text-center pt-1">
                        Tell us what you need — we&apos;ll bring in a team member right after.
                      </p>
                    )}
                  </div>
                  <div className="border-t border-slate-100 p-3 flex items-center gap-2 flex-shrink-0">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message…"
                      className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !input.trim()}
                      className="w-9 h-9 rounded-xl bg-[#FF6A00] hover:bg-[#FF8C1A] text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              {view === "request" && (
                <div className="p-5 space-y-3 overflow-y-auto">
                  {reqError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{reqError}</p>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Subject</label>
                    <input
                      value={reqSubject}
                      onChange={(e) => setReqSubject(e.target.value)}
                      placeholder="e.g. Billing question"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Order # (if applicable)</label>
                    <input
                      value={reqOrderNumber}
                      onChange={(e) => setReqOrderNumber(e.target.value)}
                      placeholder="e.g. ORD-1234"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">How can we help?</label>
                    <textarea
                      value={reqMessage}
                      onChange={(e) => setReqMessage(e.target.value)}
                      rows={5}
                      placeholder="Describe your issue or request…"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                    />
                  </div>
                  <button
                    onClick={submitRequest}
                    disabled={reqSubmitting}
                    className="w-full bg-[#FF6A00] hover:bg-[#FF8C1A] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {reqSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      "Send Request"
                    )}
                  </button>
                  <button onClick={() => setView("menu")} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">
                    ← Back
                  </button>
                </div>
              )}

              {view === "request-sent" && (
                <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
                  <p className="font-bold text-[#081A36]">Request sent</p>
                  <p className="text-xs text-slate-400 mt-1">We&apos;ll follow up by email shortly.</p>
                  <button onClick={resetAndClose} className="mt-4 text-xs font-bold text-[#FF6A00] hover:underline">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
