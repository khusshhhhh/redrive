"use client";

const TypingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm bg-surface-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-[dotPulse_1.4s_infinite]" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-[dotPulse_1.4s_infinite]" style={{ animationDelay: "200ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-[dotPulse_1.4s_infinite]" style={{ animationDelay: "400ms" }} />
      </div>
    </div>
  );
};

export default TypingIndicator;
