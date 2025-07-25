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
<div className="flex w-full max-w-full flex-nowrap rounded-full bg-[#303030] p-1 items-center gap-1 overflow-hidden">
  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    className="flex-grow min-w-0 px-4 py-2 text-white bg-transparent outline-none"
    placeholder="Write a message"
  />
  <button
    onClick={sendMessage}
    className="bg-[#d2a89d] text-black px-4 py-2 rounded-full flex items-center gap-1 whitespace-nowrap shrink-0"
  >
    Send
    <Image src="/assets/PaperPlaneTilt.png" alt="send" width={16} height={16} />
  </button>
</div>
  );
}