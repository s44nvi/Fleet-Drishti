// Line-art Mumbai for the sidebar branding: Gateway of India, palms, the
// skyline, the Bandra–Worli Sea Link and a harbour ferry over reflected
// water. NOT the banner photograph (CityBanner) — this is the quiet civic
// mark. Strokes are currentColor; faces are currentColor at low opacity, so
// the parent's text colour sets the whole palette.

const W = 240;
const H = 112;
const WATER = 88; // waterline y

interface Tower {
  x: number;
  w: number;
  h: number;
  cols?: number;
  top?: "flat" | "step" | "spire";
}

// Skyline between the Gateway and the Sea Link: two tall landmark towers
// (a stepped spire and a pointed one) among mid-rise blocks.
const FRONT: Tower[] = [
  { x: 82, w: 9, h: 24, cols: 2 },
  { x: 93, w: 12, h: 62, cols: 3, top: "step" },
  { x: 107, w: 9, h: 34, cols: 2 },
  { x: 118, w: 12, h: 54, cols: 3, top: "spire" },
  { x: 132, w: 9, h: 30, cols: 2 },
  { x: 143, w: 8, h: 20, cols: 1 },
];
const BACK: Tower[] = [
  { x: 86, w: 8, h: 40 },
  { x: 102, w: 7, h: 30 },
  { x: 111, w: 8, h: 46 },
  { x: 127, w: 8, h: 42 },
  { x: 138, w: 7, h: 36 },
  { x: 152, w: 9, h: 26 },
  { x: 164, w: 8, h: 20 },
  { x: 226, w: 9, h: 13 },
];

function outline(t: Tower): string {
  const top = WATER - t.h;
  const r = t.x + t.w;
  switch (t.top) {
    case "step":
      return `M${t.x} ${WATER}V${top + 6}H${t.x + 2}V${top + 2}H${t.x + 4}V${top - 4}H${r - 4}V${top + 2}H${r - 2}V${top + 6}H${r}V${WATER}Z`;
    case "spire": {
      const cx = t.x + t.w / 2;
      return `M${t.x} ${WATER}V${top + 6}L${cx} ${top - 10}L${r} ${top + 6}V${WATER}Z`;
    }
    default:
      return `M${t.x} ${WATER}V${top}H${r}V${WATER}Z`;
  }
}

function windows(t: Tower): string {
  if (!t.cols) return "";
  const top = WATER - t.h + (t.top ? 8 : 4);
  const parts: string[] = [];
  for (let c = 1; c <= t.cols; c++) {
    const x = t.x + (t.w / (t.cols + 1)) * c;
    parts.push(`M${x.toFixed(1)} ${top}V${WATER - 3}`);
  }
  for (let y = top + 3; y < WATER - 3; y += 3.2) parts.push(`M${t.x + 1.5} ${y.toFixed(1)}H${t.x + t.w - 1.5}`);
  return parts.join("");
}

/** A palm: curved trunk and five fronds, base at the waterline. */
function palm(x: number, h: number, lean: number): string {
  const tx = x + lean;
  const ty = WATER - h;
  return [
    `M${x} ${WATER}Q${x + lean * 0.2} ${WATER - h / 2} ${tx} ${ty}`,
    `M${tx} ${ty}Q${tx - 4} ${ty - 3} ${tx - 8} ${ty + 2}`,
    `M${tx} ${ty}Q${tx - 3} ${ty - 5} ${tx - 5} ${ty - 6}`,
    `M${tx} ${ty}Q${tx + 1} ${ty - 6} ${tx + 3} ${ty - 7}`,
    `M${tx} ${ty}Q${tx + 4} ${ty - 4} ${tx + 8} ${ty - 2}`,
    `M${tx} ${ty}Q${tx + 4} ${ty - 1} ${tx + 7} ${ty + 4}`,
  ].join("");
}

// Sea Link: the deck rises gently to the right edge; twin slender pylons,
// tips apart, legs flaring to the deck and meeting in a V below it.
const DECK_START = 132;
const deckY = (x: number) => 76 - ((x - DECK_START) / (W - DECK_START)) * 6;
const PYLON = { x: 206, top: 10, tipGap: 4.5, spread: 8 };
const CABLES_LEFT = [142, 151, 160, 169, 178, 186, 193];
const CABLES_RIGHT = [214, 219, 225, 231, 237];

export function MumbaiLineArt({ className }: { className?: string }) {
  const dy = (x: number) => deckY(x).toFixed(1);
  const pylonBase = deckY(PYLON.x);

  return (
    <svg viewBox={`-5 0 ${W + 5} ${H}`} preserveAspectRatio="xMidYMax meet" fill="none" className={className} aria-hidden="true" focusable="false">
      {/* Sky: pale sun disc, clouds, birds */}
      <circle cx="112" cy="30" r="13" fill="currentColor" fillOpacity="0.07" />
      <g fill="currentColor" fillOpacity="0.1">
        <path d="M14 22c0-2.6 2.1-4.4 4.6-4.4 1.6 0 3 .8 3.7 2 .5-.2 1-.3 1.6-.3 2.1 0 3.7 1.4 3.7 2.7H14z" />
        <path d="M154 34c0-2.2 1.8-3.8 4-3.8 1.4 0 2.6.7 3.2 1.7.4-.2.9-.3 1.4-.3 1.8 0 3.2 1.2 3.2 2.4H154z" />
        <path d="M216 16c0-2.4 1.9-4.1 4.3-4.1 1.5 0 2.8.7 3.5 1.9.5-.2 1-.3 1.5-.3 2 0 3.5 1.3 3.5 2.5H216z" />
      </g>
      <g stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M150 16l2.4 1.5 2.4-1.5" />
        <path d="M160 11l2.8 1.7 2.8-1.7" />
        <path d="M168 20l2 1.2 2-1.2" />
      </g>

      {/* Hazy back row */}
      <g fill="currentColor" fillOpacity="0.1">
        {BACK.map((t, i) => (
          <path key={i} d={outline(t)} />
        ))}
      </g>

      {/* Gateway of India */}
      <g stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round">
        <g fill="currentColor" fillOpacity="0.06">
          {/* Outer corner turrets */}
          <path d="M8 88V50H15V88Z" />
          <path d="M65 88V50H72V88Z" />
          {/* Main body and raised centre */}
          <path d="M15 88V58H65V88Z" />
          <path d="M24 58V48H56V58Z" />
          {/* Inner turrets flanking the arch */}
          <path d="M22 58V40H28V58Z" />
          <path d="M52 58V40H58V58Z" />
        </g>
        {/* Domes and finials */}
        <path d="M8 50Q11.5 44 15 50M11.5 44V41" />
        <path d="M65 50Q68.5 44 72 50M68.5 44V41" />
        <path d="M22 40Q25 34 28 40M25 34V31" />
        <path d="M52 40Q55 34 58 40M55 34V31" />
        {/* Great central arch and its frame */}
        <path d="M33 88V67Q40 55 47 67V88" fill="#ffffff" fillOpacity="0.9" />
        <path d="M30 88V65Q40 50 50 65V88" strokeWidth="0.6" />
        {/* Side arched windows */}
        <path d="M17.5 82V73Q20 69 22.5 73V82Z" strokeWidth="0.6" />
        <path d="M57.5 82V73Q60 69 62.5 73V82Z" strokeWidth="0.6" />
        {/* Cornice bands and parapet lattice */}
        <path d="M15 62H30M50 62H65M24 52H56" strokeWidth="0.45" />
        <path d="M28 48V52M32 48V52M36 48V52M40 48V52M44 48V52M48 48V52M52 48V52" strokeWidth="0.4" />
        {/* Plinth */}
        <path d="M5 88V85H75V88" strokeWidth="0.7" />
      </g>

      {/* Skyline */}
      <g stroke="currentColor" strokeWidth="0.85" strokeLinejoin="round">
        {FRONT.map((t, i) => (
          <g key={i}>
            <path d={outline(t)} fill="currentColor" fillOpacity="0.06" />
            <path d={windows(t)} strokeWidth="0.35" opacity="0.8" />
          </g>
        ))}
      </g>

      {/* Palms */}
      <g stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
        <path d={palm(3, 20, 1.5)} />
        <path d={palm(76, 18, -1.5)} />
        <path d={palm(148, 14, 1)} />
      </g>

      {/* Sea Link */}
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <g strokeWidth="0.4" opacity="0.9">
          {CABLES_LEFT.map((x, i) => (
            <path key={`l${i}`} d={`M${PYLON.x - PYLON.tipGap} ${PYLON.top + 5 + i * 2.4}L${x} ${dy(x)}`} />
          ))}
          {CABLES_RIGHT.map((x, i) => (
            <path key={`r${i}`} d={`M${PYLON.x + PYLON.tipGap} ${PYLON.top + 5 + i * 2.4}L${x} ${dy(x)}`} />
          ))}
        </g>
        <path d={`M${DECK_START} ${dy(DECK_START)}L${W} ${dy(W)}`} strokeWidth="1.1" />
        <path d={`M${DECK_START} ${(deckY(DECK_START) + 2.4).toFixed(1)}L${W} ${(deckY(W) + 2.4).toFixed(1)}`} strokeWidth="0.6" />
        <g strokeWidth="0.8">
          {[150, 164, 178, 192, 220, 234].map((x) => (
            <path key={x} d={`M${x} ${(deckY(x) + 2.4).toFixed(1)}V${WATER}`} />
          ))}
        </g>
        <g strokeWidth="0.9" fill="currentColor" fillOpacity="0.1">
          {[-1, 1].map((side) => {
            const tip = PYLON.x + side * PYLON.tipGap;
            const foot = PYLON.x + side * PYLON.spread;
            return (
              <path
                key={side}
                d={`M${tip + side * 0.9} ${PYLON.top}L${foot + side * 1.2} ${pylonBase}L${PYLON.x} ${WATER}L${foot - side * 0.8} ${pylonBase}L${tip - side * 0.9} ${PYLON.top}Z`}
              />
            );
          })}
        </g>
      </g>

      {/* Waterline, ferry, reflections */}
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M2 ${WATER}H${W - 2}`} strokeWidth="0.9" />
        {/* Harbour ferry */}
        <g strokeWidth="0.8">
          <path d="M97 99L101 103H125L129 99Z" fill="currentColor" fillOpacity="0.1" />
          <path d="M103 99V95H121V99" fill="#ffffff" />
          <path d="M106 95V93.5H116V95M110 93.5V90" />
          <path d="M106 97H108M110 97H112M114 97H116M118 97H119.5" strokeWidth="0.6" />
        </g>
        <g strokeWidth="0.55" opacity="0.45">
          <path d="M8 92H72M86 92H140M152 92H238" />
          <path d="M16 96H62M136 96H198M208 96H232" />
          <path d="M28 100H56M138 100H182M196 100H220" />
          <path d="M92 106H134M160 104H200" />
        </g>
        {/* Faint mirrored Gateway arch and pylon */}
        <g strokeWidth="0.45" opacity="0.28">
          <path d="M34 90V95Q40 101 46 95V90" />
          <path d="M206 90V104M203 92V100M209 92V100" />
        </g>
      </g>
    </svg>
  );
}
