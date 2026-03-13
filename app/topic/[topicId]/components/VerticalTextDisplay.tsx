"use client";

interface VerticalTextDisplayProps {
  postId: string;
  body: string;
  scrollingPostId: string | null;
  showHorizontalHint: boolean;
  onScroll: (postId: string) => void;
  onDismissHint: () => void;
  className?: string;
  textClassName?: string;
  hintClassName?: string;
}

export function VerticalTextDisplay({
  postId,
  body,
  scrollingPostId,
  showHorizontalHint,
  onScroll,
  onDismissHint,
  className = "mb-4 overflow-x-auto border border-gray-200 chrome:border-green-700 rounded-lg p-4 bg-slate-50 chrome:bg-gray-950 relative group",
  textClassName = "text-default-900 chrome:text-green-200 whitespace-pre-wrap font-semibold",
  hintClassName = "hidden group-hover:flex absolute top-2 left-2 bg-blue-600 chrome:bg-green-600 text-white chrome:text-black text-xs px-3 py-1 rounded-md pointer-events-none z-10 font-black uppercase",
}: VerticalTextDisplayProps) {
  return (
    <div
      className={className}
      onScroll={() => onScroll(postId)}
      onWheel={(event) => {
        if (event.shiftKey && showHorizontalHint) {
          onDismissHint();
        }
      }}
      style={{ direction: "rtl" }}
    >
      {showHorizontalHint && scrollingPostId !== postId && (
        <div className={hintClassName}>
          Shift + スクロールで横スクロールできます
        </div>
      )}
      <p
        className={textClassName}
        style={{
          writingMode: "vertical-rl",
          height: "400px",
          minWidth: "fit-content",
          direction: "ltr",
        }}
      >
        {body}
      </p>
    </div>
  );
}
