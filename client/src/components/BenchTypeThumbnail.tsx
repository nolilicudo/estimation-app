/**
 * BenchTypeThumbnail — small SVG previews for shower bench types.
 * Renders a simple isometric-style sketch of each bench style.
 */

interface BenchTypeThumbnailProps {
  optionKey: string; // "floating", "floor_mounted", "corner"
  size?: number;
}

export function BenchTypeThumbnail({ optionKey, size = 52 }: BenchTypeThumbnailProps) {
  const key = optionKey.toLowerCase().replace(/[\s-]/g, "_");

  // Shared style tokens
  const wallFill = "#e8e0d5";
  const wallStroke = "#9c8c7a";
  const benchFill = "#c8b89a";
  const benchStroke = "#7a6a58";
  const tileFill = "#f5f0ea";
  const tileStroke = "#d0c4b4";
  const bracketFill = "#a09080";
  const bracketStroke = "#6a5a4a";

  const renderFloating = () => (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back wall */}
      <rect x="2" y="2" width="48" height="38" rx="1" fill={wallFill} stroke={wallStroke} strokeWidth="1.2" />
      {/* Wall tiles */}
      {[0,1,2,3].map(col => [0,1,2].map(row => (
        <rect key={`wt-${col}-${row}`}
          x={3 + col * 12} y={3 + row * 12}
          width={11} height={11}
          fill={tileFill} stroke={tileStroke} strokeWidth="0.5" />
      )))}
      {/* Floating bench slab */}
      <rect x="6" y="28" width="40" height="7" rx="1" fill={benchFill} stroke={benchStroke} strokeWidth="1.2" />
      {/* Bench top highlight */}
      <rect x="7" y="29" width="38" height="2" rx="0.5" fill="rgba(255,255,255,0.35)" />
      {/* Wall brackets (2) */}
      <rect x="11" y="35" width="4" height="8" rx="0.5" fill={bracketFill} stroke={bracketStroke} strokeWidth="0.8" />
      <rect x="37" y="35" width="4" height="8" rx="0.5" fill={bracketFill} stroke={bracketStroke} strokeWidth="0.8" />
      {/* Floor line */}
      <line x1="2" y1="44" x2="50" y2="44" stroke={wallStroke} strokeWidth="1.2" />
      {/* Floor */}
      <rect x="2" y="44" width="48" height="6" rx="1" fill={wallFill} stroke={wallStroke} strokeWidth="1" />
    </svg>
  );

  const renderFloorMounted = () => (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back wall */}
      <rect x="2" y="2" width="48" height="38" rx="1" fill={wallFill} stroke={wallStroke} strokeWidth="1.2" />
      {/* Wall tiles */}
      {[0,1,2,3].map(col => [0,1,2].map(row => (
        <rect key={`wt-${col}-${row}`}
          x={3 + col * 12} y={3 + row * 12}
          width={11} height={11}
          fill={tileFill} stroke={tileStroke} strokeWidth="0.5" />
      )))}
      {/* Bench legs */}
      <rect x="9" y="30" width="5" height="14" rx="0.5" fill={bracketFill} stroke={bracketStroke} strokeWidth="0.8" />
      <rect x="38" y="30" width="5" height="14" rx="0.5" fill={bracketFill} stroke={bracketStroke} strokeWidth="0.8" />
      {/* Bench slab */}
      <rect x="6" y="25" width="40" height="7" rx="1" fill={benchFill} stroke={benchStroke} strokeWidth="1.2" />
      {/* Bench top highlight */}
      <rect x="7" y="26" width="38" height="2" rx="0.5" fill="rgba(255,255,255,0.35)" />
      {/* Floor line */}
      <line x1="2" y1="44" x2="50" y2="44" stroke={wallStroke} strokeWidth="1.2" />
      {/* Floor */}
      <rect x="2" y="44" width="48" height="6" rx="1" fill={wallFill} stroke={wallStroke} strokeWidth="1" />
    </svg>
  );

  const renderCorner = () => (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back wall (right side) */}
      <rect x="24" y="2" width="26" height="42" rx="1" fill={wallFill} stroke={wallStroke} strokeWidth="1.2" />
      {/* Right wall tiles */}
      {[0,1].map(col => [0,1,2].map(row => (
        <rect key={`rwt-${col}-${row}`}
          x={25 + col * 12} y={3 + row * 12}
          width={11} height={11}
          fill={tileFill} stroke={tileStroke} strokeWidth="0.5" />
      )))}
      {/* Left wall */}
      <rect x="2" y="2" width="24" height="42" rx="1" fill={wallFill} stroke={wallStroke} strokeWidth="1.2" />
      {/* Left wall tiles */}
      {[0,1].map(col => [0,1,2].map(row => (
        <rect key={`lwt-${col}-${row}`}
          x={3 + col * 10} y={3 + row * 12}
          width={9} height={11}
          fill={tileFill} stroke={tileStroke} strokeWidth="0.5" />
      )))}
      {/* Corner bench — triangular/L-shape top view rendered as isometric wedge */}
      {/* Main slab along right wall */}
      <rect x="24" y="28" width="26" height="8" rx="1" fill={benchFill} stroke={benchStroke} strokeWidth="1.2" />
      {/* Slab along left wall */}
      <rect x="2" y="28" width="24" height="8" rx="1" fill={benchFill} stroke={benchStroke} strokeWidth="1.2" />
      {/* Highlight */}
      <rect x="3" y="29" width="22" height="2" rx="0.5" fill="rgba(255,255,255,0.3)" />
      <rect x="25" y="29" width="24" height="2" rx="0.5" fill="rgba(255,255,255,0.3)" />
      {/* Floor line */}
      <line x1="2" y1="44" x2="50" y2="44" stroke={wallStroke} strokeWidth="1.2" />
      {/* Floor */}
      <rect x="2" y="44" width="48" height="6" rx="1" fill={wallFill} stroke={wallStroke} strokeWidth="1" />
    </svg>
  );

  if (key === "floating") return renderFloating();
  if (key === "floor_mounted") return renderFloorMounted();
  if (key === "corner") return renderCorner();

  // Fallback generic bench icon
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="48" height="48" rx="4" fill={wallFill} stroke={wallStroke} strokeWidth="1.2" />
      <rect x="6" y="28" width="40" height="8" rx="1" fill={benchFill} stroke={benchStroke} strokeWidth="1.2" />
    </svg>
  );
}
