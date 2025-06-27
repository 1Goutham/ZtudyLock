"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/app/components/ChatMessage";
import InputBox from "@/app/components/InputBox";
import Header from "@/app/components/Header";
import ChatHeader from "@/app/components/ChatHeader";
import LoaderBubble from "../components/loader";
import { toast } from "sonner";

export default function Page() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "model"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesStartRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setLoading(true);

    const systemPrompt = `You are an AI instructor representing ZtudyLock — a platform dedicated to focused academic support. Your role is to help users with study-related topics such as subjects, concepts, assignments, exam preparation, and learning strategies. If the user asks something unrelated to academics (e.g., entertainment or personal questions), try to redirect them back to a relevant learning topic. If that's not possible, politely decline and explain that ZtudyLock focuses only on academic help. 
    Keep it concise when possible, but give longer answers when necessary.
    Avoid markdown that doesn't render well (like tables or raw LaTeX) also check my previous message for reference.`;

    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      ...messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      {
        role: "user",
        parts: [{ text: input }],
      },
    ];

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contents }),
      });

      const raw = await res.clone().text();
      if (!res.ok) {
        if (res.status === 429) {
          toast.error("You’ve hit your API usage limit");
        } else if (res.status === 403) {
          toast.error("Invalid API key or access denied");
        } else {
          toast.error("Error fetching response");
        }
        console.error("API error:", raw);
        return;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        toast.error("Unexpected response format.");
        console.error("Malformed response:", raw);
        return;
      }

      const botReply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm not sure how to respond to that.";
      setMessages((prev) => [...prev, { role: "model", content: botReply }]);
    } catch (err) {
      toast.error("🔌 Network or server error.");
      console.error("Caught error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
  messagesStartRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

  return (
    <main
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/assets/websitebg.jpg')" }}
    >
      <Header />

      <section className="flex justify-center items-center p-4 pt-0">
        <div
          className="w-[95vw] max-w-[900px] h-[540px] lg:h-[600px] md:h-[600px] mt-0 mx-auto 
                    bg-[radial-gradient(circle,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_100%)] 
                    shadow-[inset_-5px_-5px_250px_rgba(255,255,255,0.03)] 
                    backdrop-blur-[15px] rounded-[10px] p-10 
                    border border-[rgba(255,255,255,0.5)] 
                    flex flex-col justify-between"
        >
          <ChatHeader onClear={() => setMessages([])} />
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {messages.length === 0 && !loading ? (
              <div className="text-white px-4 justify-center md:justify-start">
                <h2 className="text-xl lg:text-3xl md:text-3xl font-semibold mb-2 pt-12 text-center md:text-start" >
                  Hello there,<br />How can I help you?
                </h2>
                <div className="flex flex-col justify-center gap-2 pt-2 md:flex-row md:flex-wrap md:justify-start">
                  {[
                    "Smart Daily Study Habits",
                    "Exam Revision Strategies",
                    "High-Impact Study Techniques",
                  ].map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(rec)}
                      className="text-white text-base px-4 py-2 rounded-[10px] border border-white/20 bg-white/5 hover:bg-white/10 hover:scale-101 transition duration-200 cursor-pointer"
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
            ) : 
            (
              
              messages.map((msg, idx) => (
                <ChatMessage key={idx} role={msg.role} content={msg.content} />
              ))
            )}

            {loading && <LoaderBubble />}
            <div ref={messagesStartRef} />
          </div>
          <div className="lg:mt-3">
            <InputBox
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              handleKeyDown={handleKeyDown}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
