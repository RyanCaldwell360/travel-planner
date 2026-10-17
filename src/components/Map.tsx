import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { destinations } from '../core/destinations';
export function DestinationMap({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.CircleMarker>());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const m = L.map(el.current!, {
      center: [27, -25],
      zoom: 2,
      minZoom: 1,
      maxZoom: 7,
      zoomControl: true,
      attributionControl: true,
    });
    map.current = m;
    m.attributionControl.addAttribution(
      '<a href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth · public domain</a>',
    );
    fetch('/world.geojson')
      .then((r) => r.json())
      .then((data) => {
        if (map.current === m)
          L.geoJSON(data, {
            style: { fillColor: '#e8e6d8', fillOpacity: 1, color: '#b9c8b9', weight: 0.6 },
          })
            .addTo(m)
            .bringToBack();
      })
      .catch(() => setFailed(true));
    for (const d of destinations) {
      const mark = L.circleMarker([d.lat, d.lon], {
        radius: 7,
        color: '#fff',
        weight: 3,
        fillColor: '#b66c48',
        fillOpacity: 1,
      })
        .addTo(m)
        .bindTooltip(d.name, { direction: 'top' })
        .on('click', () => onSelect(d.id));
      markers.current.set(d.id, mark);
    }
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current!);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      markers.current.clear();
    };
  }, []);
  useEffect(() => {
    for (const [id, m] of markers.current)
      m.setStyle({
        fillColor: id === selected ? '#244d43' : '#b66c48',
        radius: id === selected ? 10 : 6,
      });
    const d = destinations.find((d) => d.id === selected);
    if (d)
      map.current?.panTo([d.lat, d.lon], {
        animate: false,
      });
  }, [selected]);
  return (
    <div className="map-wrap">
      <div
        ref={el}
        className="destination-map"
        aria-label="Interactive destination map. Use the adjacent destination list for keyboard selection."
      />
      {failed && (
        <p className="map-fallback">
          Map geography unavailable. All places remain available in the list.
        </p>
      )}
      <span className="map-caption">A little perspective. A world of possibilities.</span>
    </div>
  );
}
