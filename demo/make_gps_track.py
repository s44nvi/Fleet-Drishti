"""
Build a SIMULATED GPS track for a demo clip.

Finds the BEST route LineString nearest to the clip's geotag, starts at the
nearest point on it and moves along the line at a constant speed for the
clip duration. If no route is within --max-km of the geotag (or there is no
geotag), the route nearest Andheri station is used instead.

The output is a JSON list of {"t", "lat", "lng"} points for GPS_TRACK_FILE.
This is simulated movement along a real route shape, not a GPS recording.
"""
import argparse
import json
import math
import re

ANDHERI = (19.1197, 72.8464)
EARTH_M = 6371000.0


def parse_iso6709(text: str):
    match = re.match(r"([+-]\d+\.\d+)([+-]\d+\.\d+)", text)

    if not match:
        raise ValueError(f"Cannot parse geotag: {text}")

    return float(match.group(1)), float(match.group(2))


def to_xy(lat, lng, lat0):
    return (
        math.radians(lng) * EARTH_M * math.cos(math.radians(lat0)),
        math.radians(lat) * EARTH_M,
    )


def nearest_on_line(coords, lat, lng):
    """Return (distance_m, segment_index, fraction) of the nearest point."""
    px, py = to_xy(lat, lng, lat)
    best = (float("inf"), 0, 0.0)

    for index in range(len(coords) - 1):
        ax, ay = to_xy(coords[index][1], coords[index][0], lat)
        bx, by = to_xy(coords[index + 1][1], coords[index + 1][0], lat)
        dx, dy = bx - ax, by - ay
        length_sq = dx * dx + dy * dy
        fraction = (
            0.0
            if length_sq == 0
            else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
        )
        distance = math.hypot(px - (ax + fraction * dx), py - (ay + fraction * dy))

        if distance < best[0]:
            best = (distance, index, fraction)

    return best


def haversine_m(a, b):
    lat1, lng1, lat2, lng2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    )

    return 2 * EARTH_M * math.asin(math.sqrt(h))


def walk(coords, index, fraction, distance_m):
    """Yield points along the line, starting at (index, fraction)."""
    start = (
        coords[index][1] + fraction * (coords[index + 1][1] - coords[index][1]),
        coords[index][0] + fraction * (coords[index + 1][0] - coords[index][0]),
    )
    points = [start]
    travelled = 0.0
    previous = start

    for next_index in range(index + 1, len(coords)):
        target = (coords[next_index][1], coords[next_index][0])
        step = haversine_m(previous, target)

        if step > 0 and travelled + step >= distance_m:
            ratio = (distance_m - travelled) / step
            points.append(
                (
                    previous[0] + ratio * (target[0] - previous[0]),
                    previous[1] + ratio * (target[1] - previous[1]),
                )
            )
            return points, True

        travelled += step
        previous = target
        points.append(target)

    return points, False


def resample(points, duration, speed_mps):
    """Points at 1 s intervals along the polyline at constant speed."""
    cumulative = [0.0]

    for a, b in zip(points, points[1:]):
        cumulative.append(cumulative[-1] + haversine_m(a, b))

    track = []

    for second in range(int(math.ceil(duration)) + 1):
        target = min(second * speed_mps, cumulative[-1])

        for i in range(1, len(points)):
            if cumulative[i] >= target:
                span = cumulative[i] - cumulative[i - 1]
                ratio = 0.0 if span == 0 else (target - cumulative[i - 1]) / span
                a, b = points[i - 1], points[i]
                track.append(
                    {
                        "t": float(second),
                        "lat": round(a[0] + ratio * (b[0] - a[0]), 7),
                        "lng": round(a[1] + ratio * (b[1] - a[1]), 7),
                    }
                )
                break

    return track


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--geojson", required=True)
    parser.add_argument("--geotag", help="ISO6709 string, e.g. +19.1304+072.8968+028.763/")
    parser.add_argument("--duration", type=float, required=True)
    parser.add_argument("--speed-kmh", type=float, default=25.0)
    parser.add_argument("--max-km", type=float, default=2.0)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    with open(args.geojson) as geojson:
        features = json.load(geojson)["features"]

    lat, lng = parse_iso6709(args.geotag) if args.geotag else ANDHERI
    used_fallback = False

    def best_route(lat, lng):
        return min(
            (
                (*nearest_on_line(f["geometry"]["coordinates"], lat, lng), f)
                for f in features
                if len(f["geometry"]["coordinates"]) >= 2
            ),
            key=lambda item: item[0],
        )

    distance, index, fraction, feature = best_route(lat, lng)

    if distance > args.max_km * 1000:
        used_fallback = True
        lat, lng = ANDHERI
        distance, index, fraction, feature = best_route(lat, lng)

    coords = feature["geometry"]["coordinates"]
    needed = args.speed_kmh / 3.6 * args.duration
    points, complete = walk(coords, index, fraction, needed)

    if not complete:
        # Not enough line ahead: walk the reversed line from the same spot.
        reversed_coords = coords[::-1]
        r_distance, r_index, r_fraction = nearest_on_line(reversed_coords, lat, lng)
        alt_points, alt_complete = walk(reversed_coords, r_index, r_fraction, needed)

        if alt_complete or len(alt_points) > len(points):
            points = alt_points

    track = resample(points, args.duration, args.speed_kmh / 3.6)

    with open(args.out, "w") as out:
        json.dump(track, out)

    props = feature["properties"]
    print(
        json.dumps(
            {
                "SIMULATED": True,
                "geotag_used": [lat, lng],
                "fallback_andheri": used_fallback,
                "route": props.get("route_id"),
                "route_name": props.get("route_name"),
                "distance_geotag_to_route_m": round(distance, 1),
                "speed_kmh": args.speed_kmh,
                "points": len(track),
                "start": track[0],
                "end": track[-1],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
