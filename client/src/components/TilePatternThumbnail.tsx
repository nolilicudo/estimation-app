/**
 * TilePatternThumbnail
 * Renders a small SVG preview (48×48) for each of the 19 tile lay patterns.
 * The pattern key matches the slug stored in dp_bathroom_tile_patterns.
 *
 * All nested map() calls use flatMap() with composite keys to avoid duplicate
 * React key warnings when multiple thumbnails render in the same tree.
 */

interface Props {
  patternKey: string;
  size?: number;
  className?: string;
}

export function TilePatternThumbnail({ patternKey, size = 48, className = "" }: Props) {
  const s = size;
  const stroke = "#b5a89a";
  const fill = "#f5f0eb";
  const fillAlt = "#e8dfd6";

  // Helper: flat grid of rects
  const grid = (xs: number[], ys: number[], w: number, h: number, prefix: string, offsetX = 0, offsetY = 0) =>
    xs.flatMap((x) =>
      ys.map((y) => (
        <rect key={`${prefix}-${x}-${y}`} x={x + offsetX + 1} y={y + offsetY + 1} width={w} height={h} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
      ))
    );

  const renderers: Record<string, () => React.ReactNode> = {
    // ── Straight / Grid ──────────────────────────────────────────────────────
    straight_set: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {grid([0, 16, 32], [0, 16, 32], 14, 14, "ss")}
      </svg>
    ),

    // ── 1/3 Offset (running bond horizontal) ────────────────────────────────
    one_third_offset: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 16, 32].flatMap((y, row) =>
          [-5, 11, 27, 43].map((x) => (
            <rect key={`oto-${x}-${y}`} x={x + (row % 2) * 5 + 1} y={y + 1} width={14} height={14} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
          ))
        )}
      </svg>
    ),

    // ── 1/2 Offset (brick / running bond) ───────────────────────────────────
    half_offset: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 16, 32].flatMap((y, row) =>
          [-8, 8, 24, 40].map((x) => (
            <rect key={`ho-${x}-${y}`} x={x + (row % 2) * 8 + 1} y={y + 1} width={14} height={14} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
          ))
        )}
      </svg>
    ),

    // ── Vertical Stack ───────────────────────────────────────────────────────
    vertical_stack: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {grid([0, 16, 32], [0, 12, 24, 36], 14, 10, "vs")}
      </svg>
    ),

    // ── Horizontal Stack ─────────────────────────────────────────────────────
    horizontal_stack: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {grid([0, 12, 24, 36], [0, 16, 32], 10, 14, "hs")}
      </svg>
    ),

    // ── 45° Diagonal ─────────────────────────────────────────────────────────
    diagonal_45: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        <g transform="rotate(45 24 24)">
          {[-8, 8, 24, 40].flatMap((x) =>
            [-8, 8, 24, 40].map((y) => (
              <rect key={`d45-${x}-${y}`} x={x + 1} y={y + 1} width={14} height={14} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
            ))
          )}
        </g>
      </svg>
    ),

    // ── Herringbone ──────────────────────────────────────────────────────────
    herringbone: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 16, 32].flatMap((y) =>
          [0, 16, 32].map((x) => (
            <rect key={`hbh-${x}-${y}`} x={x + 1} y={y + 1} width={13} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
          ))
        )}
        {[8, 24, 40].flatMap((y) =>
          [8, 24, 40].map((x) => (
            <rect key={`hbv-${x}-${y}`} x={x - 7} y={y - 7} width={6} height={13} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
          ))
        )}
      </svg>
    ),

    // ── 45° Herringbone ──────────────────────────────────────────────────────
    herringbone_45: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        <g transform="rotate(45 24 24)">
          {[0, 16, 32].flatMap((y) =>
            [0, 16, 32].map((x) => (
              <rect key={`h45h-${x}-${y}`} x={x + 1} y={y + 1} width={13} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
            ))
          )}
          {[8, 24, 40].flatMap((y) =>
            [8, 24, 40].map((x) => (
              <rect key={`h45v-${x}-${y}`} x={x - 7} y={y - 7} width={6} height={13} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
            ))
          )}
        </g>
      </svg>
    ),

    // ── Basketweave ──────────────────────────────────────────────────────────
    basketweave: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 24].flatMap((bx) =>
          [0, 24].flatMap((by) => [
            <rect key={`bwh1-${bx}-${by}`} x={bx + 1} y={by + 1} width={10} height={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`bwh2-${bx}-${by}`} x={bx + 1} y={by + 7} width={10} height={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`bwv1-${bx}-${by}`} x={bx + 13} y={by + 1} width={5} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`bwv2-${bx}-${by}`} x={bx + 19} y={by + 1} width={5} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`bwh3-${bx}-${by}`} x={bx + 13} y={by + 13} width={10} height={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`bwh4-${bx}-${by}`} x={bx + 13} y={by + 19} width={10} height={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`bwv3-${bx}-${by}`} x={bx + 1} y={by + 13} width={5} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`bwv4-${bx}-${by}`} x={bx + 7} y={by + 13} width={5} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
          ])
        )}
      </svg>
    ),

    // ── Pinwheel ─────────────────────────────────────────────────────────────
    pinwheel: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 24].flatMap((bx) =>
          [0, 24].flatMap((by) => [
            <rect key={`pw1-${bx}-${by}`} x={bx + 1} y={by + 1} width={9} height={9} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`pw2-${bx}-${by}`} x={bx + 12} y={by + 1} width={9} height={9} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`pw3-${bx}-${by}`} x={bx + 1} y={by + 12} width={9} height={9} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`pw4-${bx}-${by}`} x={bx + 12} y={by + 12} width={9} height={9} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`pwc-${bx}-${by}`} x={bx + 10} y={by + 10} width={4} height={4} fill={stroke} stroke={stroke} strokeWidth="0.5" />,
          ])
        )}
      </svg>
    ),

    // ── Windmill ─────────────────────────────────────────────────────────────
    windmill: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 24].flatMap((bx) =>
          [0, 24].flatMap((by) => [
            <rect key={`wm1-${bx}-${by}`} x={bx + 1} y={by + 1} width={10} height={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`wm2-${bx}-${by}`} x={bx + 13} y={by + 1} width={5} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`wm3-${bx}-${by}`} x={bx + 7} y={by + 13} width={10} height={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`wm4-${bx}-${by}`} x={bx + 1} y={by + 7} width={5} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />,
            <rect key={`wmc-${bx}-${by}`} x={bx + 7} y={by + 7} width={5} height={5} fill={stroke} stroke={stroke} strokeWidth="0.5" />,
          ])
        )}
      </svg>
    ),

    // ── Versailles / French Pattern ──────────────────────────────────────────
    versailles: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        <rect key="vl" x={1} y={1} width={18} height={18} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vm" x={21} y={1} width={12} height={12} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vs1" x={21} y={15} width={6} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vs2" x={29} y={15} width={6} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vs3" x={35} y={1} width={6} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vs4" x={35} y={9} width={6} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vt1" x={1} y={21} width={8} height={18} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vt2" x={11} y={21} width={8} height={18} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vh1" x={21} y={23} width={18} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vh2" x={21} y={33} width={18} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="vb" x={1} y={41} width={38} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
      </svg>
    ),

    // ── Hopscotch ────────────────────────────────────────────────────────────
    hopscotch: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        <rect key="hpl1" x={1} y={1} width={16} height={16} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps1" x={19} y={1} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps2" x={29} y={1} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps3" x={39} y={1} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps4" x={19} y={11} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hpl2" x={29} y={11} width={16} height={16} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hpl3" x={1} y={19} width={16} height={16} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps5" x={19} y={21} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps6" x={1} y={37} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps7" x={11} y={37} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps8" x={19} y={31} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hpl4" x={29} y={29} width={16} height={16} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps9" x={39} y={11} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps10" x={19} y={41} width={8} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps11" x={39} y={21} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps12" x={39} y={31} width={8} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
        <rect key="hps13" x={39} y={41} width={8} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.8" />
      </svg>
    ),

    // ── Cobblestone ──────────────────────────────────────────────────────────
    cobblestone: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 12, 24, 36].flatMap((y, row) =>
          [-6, 6, 18, 30, 42].map((x) => (
            <rect key={`cb-${x}-${y}`} x={x + (row % 2) * 6 + 1} y={y + 1} width={10} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
          ))
        )}
      </svg>
    ),

    // ── Ashlar / Random ──────────────────────────────────────────────────────
    ashlar: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        <rect key="ar1" x={1} y={1} width={20} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar2" x={23} y={1} width={12} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar3" x={37} y={1} width={10} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar4" x={1} y={13} width={10} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar5" x={13} y={13} width={16} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar6" x={31} y={13} width={16} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar7" x={1} y={25} width={14} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar8" x={17} y={25} width={10} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar9" x={29} y={25} width={18} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar10" x={1} y={37} width={18} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar11" x={21} y={37} width={14} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
        <rect key="ar12" x={37} y={37} width={10} height={10} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
      </svg>
    ),

    // ── Subway / Brick ───────────────────────────────────────────────────────
    subway: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 10, 20, 30, 40].flatMap((y, row) =>
          [-12, 0, 12, 24, 36, 48].map((x) => (
            <rect key={`sub-${x}-${y}`} x={x + (row % 2) * 6 + 1} y={y + 1} width={10} height={8} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
          ))
        )}
      </svg>
    ),

    // ── Large Format ─────────────────────────────────────────────────────────
    large_format: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {grid([0, 24], [0, 24], 22, 22, "lf")}
      </svg>
    ),

    // ── Plank / Linear ───────────────────────────────────────────────────────
    plank: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 8, 16, 24, 32, 40].flatMap((y, row) =>
          [-16, 0, 16, 32, 48].map((x) => (
            <rect key={`pl-${x}-${y}`} x={x + (row % 2) * 8 + 1} y={y + 1} width={14} height={6} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
          ))
        )}
      </svg>
    ),

    // ── Chevron ──────────────────────────────────────────────────────────────
    chevron: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 12, 24, 36].flatMap((y) => [
          <rect key={`cvL-${y}`} x={1} y={y + 1} width={20} height={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7"
            transform={`rotate(-30 11 ${y + 3.5})`} />,
          <rect key={`cvR-${y}`} x={25} y={y + 1} width={20} height={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7"
            transform={`rotate(30 35 ${y + 3.5})`} />,
        ])}
      </svg>
    ),

    // ── Arabesque / Moroccan ─────────────────────────────────────────────────
    arabesque: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[0, 16, 32].flatMap((bx) =>
          [0, 16, 32].map((by) => (
            <polygon key={`ar-${bx}-${by}`}
              points={`${bx + 5},${by + 1} ${bx + 11},${by + 1} ${bx + 15},${by + 5} ${bx + 15},${by + 11} ${bx + 11},${by + 15} ${bx + 5},${by + 15} ${bx + 1},${by + 11} ${bx + 1},${by + 5}`}
              fill={fillAlt} stroke={stroke} strokeWidth="0.7"
            />
          ))
        )}
        {[8, 24, 40].flatMap((bx) =>
          [8, 24, 40].map((by) => (
            <polygon key={`ard-${bx}-${by}`}
              points={`${bx},${by - 3} ${bx + 3},${by} ${bx},${by + 3} ${bx - 3},${by}`}
              fill={stroke} stroke={stroke} strokeWidth="0.5"
            />
          ))
        )}
      </svg>
    ),

    // ── Penny Round ──────────────────────────────────────────────────────────
    penny_round: () => (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {[6, 18, 30, 42].flatMap((cy, row) =>
          [-6, 6, 18, 30, 42, 54].map((cx) => (
            <circle key={`pr-${cx}-${cy}`} cx={cx + (row % 2) * 6} cy={cy} r={5} fill={fillAlt} stroke={stroke} strokeWidth="0.7" />
          ))
        )}
      </svg>
    ),
  };

  const render = renderers[patternKey];
  if (!render) {
    // Fallback: generic grid
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" className={className}>
        <rect width="48" height="48" fill={fill} />
        {grid([0, 16, 32], [0, 16, 32], 14, 14, `fb-${patternKey}`)}
      </svg>
    );
  }

  return <>{render()}</>;
}
