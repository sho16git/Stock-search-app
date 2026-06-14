"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Send, KeyRound, Bot, User, Trash2 } from "lucide-react";
import { recordAiCall } from "@/lib/ai-usage-client";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "トヨタとホンダ、今買うならどっち？",
  "エヌビディアの株価とPERは？",
  "高配当な日本株を3つ教えて",
  "アップルの最近のニュースを要約して",
];

/** 簡易マークダウン: **bold** と改行のみ */
function renderText(text: string) {
  return text.split("\n").map((line, i) => (
    <p key={i} className={i > 0 ? "mt-1.5" : ""}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>
          : <span key={j}>{part}</span>,
      )}
    </p>
  ));
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "no_key" | "error">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || status === "loading") return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setStatus("loading");
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (res.status === 503) { setStatus("no_key"); return; }
      if (!res.ok) throw new Error("api");
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      recordAiCall("ai-chat");
      setMessages((m) => [...m, { role: "assistant", content: j.reply as string }]);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] sm:h-[calc(100dvh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <div>
          <Link href="/" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-1">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />ホーム
          </Link>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </span>
            AI投資相談
          </h1>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setStatus("idle"); }}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />クリア
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-sm">
        {messages.length === 0 && status === "idle" && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md mb-3">
              <Bot className="w-6 h-6" />
            </span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">銘柄や市場について何でも聞いてください</p>
            <p className="text-[11px] text-slate-400 mt-1">最新の株価・指標・ニュースをAIが調べて答えます</p>
            <div className="flex flex-col gap-2 mt-5 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors text-slate-600 dark:text-slate-300">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
              m.role === "user"
                ? "bg-blue-500 text-white"
                : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
            }`}>
              {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </span>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-blue-500 text-white rounded-tr-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm"
            }`}>
              {renderText(m.content)}
            </div>
          </div>
        ))}

        {status === "loading" && (
          <div className="flex gap-2.5">
            <span className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}

        {status === "no_key" && (
          <div className="flex items-center gap-2 text-[12px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
            <KeyRound className="w-4 h-4 shrink-0" />
            APIキーが未設定です（.env.local の ANTHROPIC_API_KEY）。設定後にサーバーを再起動してください。
          </div>
        )}
        {status === "error" && (
          <div className="text-[12px] text-rose-500 px-1">回答の取得に失敗しました。もう一度お試しください。</div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mt-3 flex items-end gap-2 shrink-0"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="銘柄や市場について質問する…"
          rows={1}
          className="flex-1 resize-none px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-600 placeholder:text-slate-400 max-h-32"
        />
        <button
          type="submit"
          disabled={!input.trim() || status === "loading"}
          className="shrink-0 w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 transition-colors shadow-sm"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
      <p className="text-[9px] text-slate-400 text-center mt-1.5 shrink-0">
        ※ AIによる情報提供であり投資助言ではありません。最終判断は自己責任で。
      </p>
    </div>
  );
}
