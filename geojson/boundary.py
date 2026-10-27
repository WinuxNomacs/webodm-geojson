"""
The polygons the GeoJSON plugin saves, checked the way ODM reads a task's `boundary` option (modules/boundary.py in
ODM): one feature, a Polygon, of which only the outer ring is used. A file is stored normalized, as a FeatureCollection
of one Polygon Feature with its corners in lon/lat rounded to 9 decimals (terra-draw refuses more).
"""
import math

from pyproj import Geod

DECIMALS = 9
WGS84_CRS_NAMES = ("urn:ogc:def:crs:OGC:1.3:CRS84", "urn:ogc:def:crs:OGC::CRS84", "EPSG:4326", "urn:ogc:def:crs:EPSG::4326")

GEOD = Geod(ellps="WGS84")


class BoundaryError(ValueError):
    pass


def polygon_geometry(data):
    """The Polygon geometry in a GeoJSON object: a bare geometry, a Feature or a FeatureCollection of one"""
    if not isinstance(data, dict):
        raise BoundaryError("This is not GeoJSON: expected an object with a \"type\"")
    crs = (data.get("crs") or {}).get("properties", {}).get("name") if isinstance(data.get("crs"), dict) else None
    if crs and crs not in WGS84_CRS_NAMES:
        raise BoundaryError("The coordinates must be longitude and latitude (WGS 84), not %s" % crs)

    kind = data.get("type")
    if kind == "FeatureCollection":
        features = data.get("features")
        if not isinstance(features, list) or len(features) != 1:
            raise BoundaryError("A boundary is a single polygon: this file has %s features"
                                % (len(features) if isinstance(features, list) else "no"))
        data, kind = features[0], (features[0] or {}).get("type") if isinstance(features[0], dict) else None
    if kind == "Feature":
        data = data.get("geometry")
        kind = data.get("type") if isinstance(data, dict) else None

    if kind == "MultiPolygon":
        parts = data.get("coordinates")
        if isinstance(parts, list) and len(parts) == 1:
            return {"type": "Polygon", "coordinates": parts[0]}
        raise BoundaryError("A boundary is a single polygon: this MultiPolygon has %s parts"
                            % (len(parts) if isinstance(parts, list) else "no"))
    if kind != "Polygon":
        raise BoundaryError("A boundary must be a polygon, not %s" % (kind or "an empty geometry"))
    return data


def outer_ring(geometry):
    """The polygon's corners as [[lon, lat], ...], rounded, without the closing corner or repeated corners"""
    rings = geometry.get("coordinates")
    if not isinstance(rings, list) or not rings:
        raise BoundaryError("The polygon has no corners")
    if len(rings) > 1:
        raise BoundaryError("The polygon has holes: ODM uses only its outline, so draw it without them")

    ring = []
    for p in rings[0] if isinstance(rings[0], list) else []:
        if not isinstance(p, (list, tuple)) or len(p) < 2:
            raise BoundaryError("A corner is not a [longitude, latitude] pair")
        try:
            lon, lat = float(p[0]), float(p[1])
        except (TypeError, ValueError):
            raise BoundaryError("A corner is not a [longitude, latitude] pair")
        if not (math.isfinite(lon) and math.isfinite(lat)) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise BoundaryError("A corner is outside longitude -180..180, latitude -90..90: [%s, %s]" % (p[0], p[1]))
        corner = [round(lon, DECIMALS), round(lat, DECIMALS)]
        if not ring or ring[-1] != corner:
            ring.append(corner)
    if len(ring) > 1 and ring[0] == ring[-1]:
        ring.pop()
    if len(ring) < 3:
        raise BoundaryError("A polygon needs at least 3 different corners")
    return ring


def ring_area(ring):
    """The area inside the ring in square meters, on the WGS 84 ellipsoid"""
    area, _ = GEOD.polygon_area_perimeter([p[0] for p in ring], [p[1] for p in ring])
    return abs(area)


def flat_area(ring):
    """The ring's area in square degrees: zero when its corners are on one line on the map"""
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))) / 2


def normalize(data):
    """(the boundary as stored, its area in m²) for a GeoJSON object, or BoundaryError saying what is wrong with it"""
    ring = outer_ring(polygon_geometry(data))
    area = ring_area(ring)
    # A geodesic between corners on one map line bends away from it, so the ellipsoid gives such a ring a sliver of area
    if area <= 0 or flat_area(ring) < 1e-14:
        raise BoundaryError("The polygon has no area: its corners are on one line")
    return {"type": "FeatureCollection", "features": [{
        "type": "Feature", "properties": {},
        "geometry": {"type": "Polygon", "coordinates": [ring + [ring[0]]]},
    }]}, area
