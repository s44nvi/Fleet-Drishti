import { KpiTile } from "./KpiTile";
import type { KpiTile as KpiTileData } from "../../types";

// One instrument, up to four tiles divided by hairlines — not four cards.
export function KpiStrip({ tiles }: { tiles: KpiTileData[] }) {
  return (
    <section
      aria-label="Key figures"
      className="grid grid-cols-2 xl:grid-cols-4 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-panel"
    >
      {tiles.slice(0, 4).map((tile) => (
        <KpiTile key={tile.id} {...tile} />
      ))}
    </section>
  );
}
