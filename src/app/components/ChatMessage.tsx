import Image from "next/image";
import ReactMarkdown from 'react-markdown';

export default function ChatMessage({
  role,
  content,
}: {
  role: "user" | "model";
  content: string;
}) {
  const isUser = role === "user";
  const avatarSrc = isUser ? "/assets/user-icon.png" : "/assets/airesponse.png";

  return (
    <div
      className={`flex items-start mb-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden ${
          isUser ? "ml-2" : "mr-2"
        }`}
      >
        <Image
          src={avatarSrc}
          alt={`${role} avatar`}
          width={32}
          height={32}
          priority
        />
      </div>

      <div className="bg-white/10 backdrop-blur-md text-white text-sm py-[10px] px-[10px] rounded-lg max-w-[80%]">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
