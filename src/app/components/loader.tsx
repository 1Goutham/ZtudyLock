"use client";

import Image from "next/image";

export default function LoaderBubble() {
  return (
    <div className="flex mb-3" role="status" aria-label="AI is typing...">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mr-2">
        <Image src="/assets/airesponse.png" alt="AI avatar" width={32} height={32} />
      </div>

      {/* Message Bubble */}
      <div className="relative overflow-hidden bg-white/10 backdrop-blur-md text-white text-sm py-2 px-3 rounded-lg max-w-[80%] min-h-[40px] flex items-center">
        {/* Optional shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
        
        {/* Typing Dots */}
        <div className="relative flex space-x-1">
          <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-150" />
          <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-300" />
        </div>
      </div>
    </div>
  );
}
