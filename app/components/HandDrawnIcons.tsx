// 手書き風SVGアイコンコンポーネント
export const HandDrawnPostIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M3 5.5C3 5 3.5 4 5 4h14c1 0 2 0.5 2 1.5v13c0 1-1 1.5-2 1.5H5c-1.5 0-2-0.5-2-1.5z" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path 
      d="M7 9h10M7 13h7M7 17h8" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
    />
  </svg>
);

export const HandDrawnTopicIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M12 3l9 6v9l-9 5-9-5V9z" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle 
      cx="12" 
      cy="12" 
      r="3" 
      stroke="currentColor" 
      strokeWidth="2.5"
      fill="none"
    />
  </svg>
);

export const HandDrawnPeopleIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle 
      cx="9" 
      cy="7" 
      r="3.5" 
      stroke="currentColor" 
      strokeWidth="2.5"
      fill="none"
    />
    <path 
      d="M3 21c0-4 2.5-7 6-7s6 3 6 7" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
      fill="none"
    />
    <circle 
      cx="17" 
      cy="7" 
      r="2.5" 
      stroke="currentColor" 
      strokeWidth="2.5"
      fill="none"
    />
    <path 
      d="M21 21c0-3-1.5-5-4-5" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const HandDrawnSettingsIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle 
      cx="12" 
      cy="12" 
      r="3" 
      stroke="currentColor" 
      strokeWidth="2.5"
      fill="none"
    />
    <path 
      d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.5 4.5l-2 2M6.5 17.5l-2 2M19.5 19.5l-2-2M6.5 6.5l-2-2" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
    />
  </svg>
);

export const HandDrawnPlusIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M12 5v14M5 12h14" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HandDrawnHeartIcon = ({ size = 24, className = "", filled = false }: { size?: number; className?: string; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} className={className}>
    <path 
      d="M12 21s-8-5-8-11c0-3 2-5 4.5-5 1.5 0 3 1 3.5 2.5C12.5 6 14 5 15.5 5c2.5 0 4.5 2 4.5 5 0 6-8 11-8 11z" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HandDrawnCommentIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M4 6c0-1 1-2 2-2h12c1 0 2 1 2 2v9c0 1-1 2-2 2H9l-5 4v-4c-1 0-1-1-1-2V6z" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M8 10h8M8 14h5" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round"
    />
  </svg>
);
