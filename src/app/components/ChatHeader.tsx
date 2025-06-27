"use client";

import Image from "next/image";

interface ChatHeaderProps {
  onClear: () => void;
}

export default function ChatHeader({ onClear }: ChatHeaderProps) {
  return (
    <div className="flex justify-between mb-4 ">
      <h1 className="text-lg text-white font-light">
        Chatwith<span className="font-bold">AI</span>
      </h1>
      <button
        onClick={onClear}
        className="flex items-center justify-center gap-1 px-[6px] py-[6px] w-[90px] min-w-[90px] text-[10px] text-white font-poppins 
                    border border-white/50 rounded-full 
                    backdrop-blur-[275px] 
                    bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_100%)] 
                    shadow-[inset_-5px_-5px_250px_rgba(255,255,255,0.08)] 
                    transition duration-200 ease-in-out 
                    hover:brightness-110 hover:scale-105"
        >
        <Image src="/assets/XCircle.png" alt="X" width={16} height={16} />
        Clear Chat
        </button>
    </div>
  );
}
