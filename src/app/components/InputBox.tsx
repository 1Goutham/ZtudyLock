import Image from "next/image";

export default function InputBox({
  input,
  setInput,
  sendMessage,
  handleKeyDown,
}: {
  input: string;
  setInput: (val: string) => void;
  sendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
<div className="mt-4 flex w-full relative">
  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="Write a message"
    className="flex-1 px-5 py-3 pr-[120px] rounded-full bg-[#303030] text-white placeholder-white/50 text-sm focus:outline-none"
  />
  <button
    onClick={sendMessage}
    className="absolute right-1 top-1 bottom-1 w-[90px] rounded-full bg-[#C3A196] text-black text-[15px] font-poppins flex items-center justify-center gap-2 shadow-md transition hover:scale-120"
  >
    Send
    <Image src="/assets/PaperPlaneTilt.png" alt="send" width={16} height={16} />
  </button>
</div>
  );
}
