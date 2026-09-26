import { ArrowDown, ArrowDownUp, Bus, Camera, Cpu, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { AGENCY_ROUTE_COLORS, DEFAULT_ROUTE_COLOR } from "../../lib/gisConfig";
import { TONE_CLASSES } from "../../lib/visuals";
import type { SensingBusView } from "../../lib/sensingBus";
import type { RouteGeometrySource, TransitRouteSummary } from "../../types";
import { SourceBadge } from "../ui";

// Compact map callouts (~240px) for the two things a viewer opens on a map:
// a sensing bus, and a GTFS route. They make the chain explicit —
// GTFS route → the sensing bus on it → its cameras → AI observations —
// and every field comes from GTFS or fixtures, with an honest fallback
// when a fact is missing (never an empty box).

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="-mr-1.5 -mt-1 h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
    >
      <X size={15} />
    </button>
  );
}

/**
 * Origin → destination. `directional` only when the data knows which way
 * the vehicle runs; otherwise the pair is shown as the route's terminals.
 */
function Terminals({ from, to, directional }: { from: string; to: string; directional: boolean }) {
  const Connector = directional ? ArrowDown : ArrowDownUp;
  return (
    <div className="grid grid-cols-[14px_1fr] gap-x-2 text-meta">
      <span className="mt-[5px] h-2 w-2 justify-self-center rounded-full border-2 border-ink-3 bg-surface" aria-hidden="true" />
      <p className="text-ink">{from}</p>
      <Connector size={12} className="my-0.5 justify-self-center text-ink-3" aria-hidden="true" />
      <p className="text-micro font-medium text-ink-3">{directional ? "heading to" : "route terminals"}</p>
      <span className="mt-[5px] h-2 w-2 justify-self-center rounded-full bg-ink" aria-hidden="true" />
      <p className="text-ink">{to}</p>
      <span className="sr-only">{directional ? `From ${from} to ${to}` : `Route between ${from} and ${to}`}</span>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "ok" | "watch" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro whitespace-nowrap",
        tone ? cn(TONE_CLASSES[tone].soft, TONE_CLASSES[tone].ink) : "bg-surface-2 text-ink-2",
      )}
    >
      {children}
    </span>
  );
}

export function BusCallout({ bus, onClose }: { bus: SensingBusView; onClose: () => void }) {
  const sensing = bus.status.label === "Online";
  return (
    <div className="flex w-[240px] flex-col gap-2.5 text-ink">
      <div className="flex items-start gap-2.5">
        <span
          className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white", TONE_CLASSES[bus.status.tone].solid)}
          aria-hidden="true"
        >
          <Bus size={16} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-item leading-5">{bus.busId}</p>
          <p className="text-micro font-semibold text-ink-2">
            {bus.agencyId} · Route {bus.routeShortName}
          </p>
        </div>
        <CloseButton onClose={onClose} label="Close bus details" />
      </div>

      {bus.terminals ? (
        <Terminals {...bus.terminals} />
      ) : (
        <p className="text-meta text-ink-3">Route information unavailable</p>
      )}

      <div className="flex flex-wrap gap-1.5 border-t border-line pt-2.5">
        <Chip tone={sensing ? "ok" : "watch"}>
          <span className={cn("h-1.5 w-1.5 rounded-full", sensing ? "bg-ok" : "bg-watch")} aria-hidden="true" />
          {sensing ? "Sensing" : bus.status.label}
        </Chip>
        <Chip>
          <Camera size={11} aria-hidden="true" />
          {bus.cameraCount ? `${bus.camerasOnline}/${bus.cameraCount} cameras` : "No cameras"}
        </Chip>
        <Chip tone={bus.aiActive ? "ok" : undefined}>
          <Cpu size={11} aria-hidden="true" />
          {bus.aiActive ? "AI active" : "AI idle"}
        </Chip>
      </div>
      {bus.latestObservation && (
        <p className="-mt-1 text-micro text-ink-2">
          Latest: <span className="font-semibold text-ink">{bus.latestObservation}</span>
          {bus.confidence !== null && <span className="tabular-nums"> · {bus.confidence}%</span>}
        </p>
      )}

      <p className="flex items-center gap-1.5 text-micro text-ink-3">
        <SourceBadge source={bus.positionSource === "DEMO" ? "demo" : "simulated"} />
        {bus.positionSource === "DEMO" ? "Demo bus on a real GTFS route" : "Simulated position · not GPS"}
      </p>
    </div>
  );
}

export interface RouteCalloutRoute {
  gtfsRouteId: string;
  agencyId: string;
  shortName: string;
  longName: string;
  fromStop: string;
  toStop: string;
  geometryType: RouteGeometrySource;
  repairedLegs: number;
}

export function RouteCallout({
  route,
  summary,
  indexLoaded,
  sensingBuses,
  onClose,
}: {
  route: RouteCalloutRoute;
  summary: TransitRouteSummary | undefined;
  indexLoaded: boolean;
  /** Buses whose data places them on this route (fixture route or demo placement). */
  sensingBuses: { simulated: number; demo: number };
  onClose: () => void;
}) {
  const total = sensingBuses.simulated + sensingBuses.demo;
  const fact = (value: number | undefined) => (summary ? value?.toLocaleString("en-IN") : indexLoaded ? "—" : "…");
  return (
    <div className="flex w-[240px] flex-col gap-2.5 text-ink">
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 inline-flex h-5 items-center rounded px-1.5 text-micro font-bold text-white"
          style={{ background: AGENCY_ROUTE_COLORS[route.agencyId] ?? DEFAULT_ROUTE_COLOR }}
        >
          {route.agencyId}
        </span>
        <p className="min-w-0 flex-1 text-item leading-6">Route {route.shortName}</p>
        <CloseButton onClose={onClose} label="Close route details" />
      </div>

      {route.fromStop && route.toStop ? (
        <Terminals from={route.fromStop} to={route.toStop} directional />
      ) : (
        <p className="text-meta text-ink-3">{route.longName || "Route information unavailable"}</p>
      )}

      <dl className="grid grid-cols-2 gap-2 border-t border-line pt-2.5 text-center">
        <div className="rounded-md bg-surface-2 py-1.5">
          <dd className="text-item tabular-nums">{fact(summary?.stopsServed)}</dd>
          <dt className="text-micro text-ink-3">Stops</dt>
        </div>
        <div className="rounded-md bg-surface-2 py-1.5">
          <dd className="text-item tabular-nums">{fact(summary?.tripCount)}</dd>
          <dt className="text-micro text-ink-3">Scheduled trips</dt>
        </div>
      </dl>

      <p className="text-micro text-ink-2">
        {total === 0 ? (
          "No sensing buses on this route"
        ) : (
          <>
            <span className="font-semibold text-ink">{total}</span> sensing bus{total === 1 ? "" : "es"} on this route
            <span className="text-ink-3">
              {" "}
              ({[sensingBuses.simulated && `${sensingBuses.simulated} simulated`, sensingBuses.demo && `${sensingBuses.demo} demo`].filter(Boolean).join(", ")})
            </span>
          </>
        )}
      </p>

      <p className="text-micro text-ink-3">
        {route.geometryType === "road_snapped"
          ? `Road-snapped path from GTFS stops${route.repairedLegs ? ` · ${route.repairedLegs} leg${route.repairedLegs === 1 ? "" : "s"} straight` : ""}`
          : "Schematic path — stops joined in order"}{" "}
        · community GTFS, not official
      </p>
    </div>
  );
}
