import { KpiTile } from "./KpiTile";
import type { KpiTile as KpiTileData } from "../../types";

interface KpiStripProps {
  tiles: KpiTileData[];
  /** Column count at the md+ breakpoint. Defaults to 4 (Command Center /
   * Analytics). Road Issues' 5-metric summary row passes 5. */
  columns?: 4 | 5;
}

const MD_COLUMNS: Record<4 | 5, string> = {
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};

// One instrument panel, N stat columns divided by hairlines — not separate
// shadowed cards. Keep each usage to the essential top-level numbers; it is
// not meant to grow past a handful of columns.
export function KpiStrip({ tiles, columns = 4 }: KpiStripProps) {
  return (
    <section
      className={`bg-surface-card rounded-lg border border-border-slate shadow-sm w-full grid grid-cols-2 ${MD_COLUMNS[columns]} divide-y divide-border-slate md:divide-y-0 md:divide-x px-space-md`}
    >
      {tiles.map((tile) => (
        <KpiTile key={tile.id} {...tile} />
      ))}
    </section>
  );
}
