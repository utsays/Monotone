export default function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor"
      strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 27V13a6 6 0 0 1 12 0v14" />
      <path d="M17 13a6 6 0 0 1 12 0v14" />
    </svg>
  );
}
