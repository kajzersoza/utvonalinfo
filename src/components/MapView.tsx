import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RoadHazard, GPSState, HazardType } from '../types';
import { getCardinalDirectionShort } from '../services/geoService';
import { Layers, Crosshair, ChevronDown, Check } from 'lucide-react';

export type MapLayerId =
  | 'osm-standard'
  | 'osm-hot'
  | 'esri-streets'
  | 'esri-satellite'
  | 'osm-dark'
  | 'topo';

interface MapLayerConfig {
  id: MapLayerId;
  name: string;
  icon: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  isDarkFilter?: boolean;
}

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'osm-standard',
    name: 'OpenStreetMap Alapértelmezett',
    icon: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  {
    id: 'osm-hot',
    name: 'OSM Humanitárius (HOT)',
    icon: '🏙️',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, HOT style',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
  {
    id: 'esri-streets',
    name: 'ESRI Utcatérkép (Főutak kiemelve)',
    icon: '🛣️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; World Street Map',
    maxZoom: 18,
  },
  {
    id: 'esri-satellite',
    name: 'Műholdas Térkép (Valós fotó)',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  {
    id: 'osm-dark',
    name: 'Éjszakai Sötét Térkép (Invertált)',
    icon: '🌙',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    isDarkFilter: true,
  },
  {
    id: 'topo',
    name: 'OpenTopo Domborzati Térkép',
    icon: '🏔️',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap, &copy; OpenTopoMap',
    maxZoom: 17,
    subdomains: ['a', 'b', 'c'],
  },
];

interface MapViewProps {
  gps: GPSState;
  hazards: RoadHazard[];
  onAddHazardAtLocation: (lat: number, lon: number, heading: number) => void;
  onEditHazard: (hazard: RoadHazard) => void;
  onDeleteHazard: (id: string) => void;
  theme: 'light' | 'dark';
}

function getHazardEmoji(type: HazardType): string {
  switch (type) {
    case 'pothole':
      return '🕳️';
    case 'manhole':
      return '🔘';
    case 'rutting':
      return '〰️';
    case 'crack':
      return '⚡';
    case 'subsidence':
      return '📉';
    case 'debris':
      return '⚠️';
    case 'speedbump':
      return '🚧';
    default:
      return '⚠️';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#eab308';
    default:
      return '#10b981';
  }
}

export const MapView: React.FC<MapViewProps> = ({
  gps,
  hazards,
  onAddHazardAtLocation,
  onEditHazard,
  onDeleteHazard,
  theme,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const isUserInteractingRef = useRef(false);

  // Active layer state
  const [selectedLayerId, setSelectedLayerId] = useState<MapLayerId>(() => {
    const saved = localStorage.getItem('utinfo_selected_map_layer');
    if (saved && MAP_LAYERS.some((l) => l.id === saved)) {
      return saved as MapLayerId;
    }
    return theme === 'dark' ? 'osm-dark' : 'osm-standard';
  });

  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = gps.latitude && !isNaN(gps.latitude) ? gps.latitude : 47.4762;
      const initialLon = gps.longitude && !isNaN(gps.longitude) ? gps.longitude : 19.0285;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 16,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Layer group for hazards
      const hazardGroup = L.layerGroup().addTo(map);
      hazardsLayerGroupRef.current = hazardGroup;

      // Add initial tile layer directly inside constructor
      const layerConfig = MAP_LAYERS.find((l) => l.id === selectedLayerId) || MAP_LAYERS[0];
      if (layerConfig.isDarkFilter) {
        mapContainerRef.current.classList.add('leaflet-dark-mode');
      } else {
        mapContainerRef.current.classList.remove('leaflet-dark-mode');
      }

      const tileLayer = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        maxZoom: layerConfig.maxZoom,
        subdomains: layerConfig.subdomains || ['a', 'b', 'c'],
      }).addTo(map);
      currentTileLayerRef.current = tileLayer;

      // Handle map click to add hazard
      map.on('click', (e: L.LeafletMouseEvent) => {
        onAddHazardAtLocation(e.latlng.lat, e.latlng.lng, gps.heading || 0);
      });

      map.on('movestart', () => {
        isUserInteractingRef.current = true;
      });

      mapInstanceRef.current = map;

      // Ensure proper size calculation on mount across multiple animation frames
      map.invalidateSize();
      const t1 = setTimeout(() => map.invalidateSize(), 80);
      const t2 = setTimeout(() => map.invalidateSize(), 250);
      const t3 = setTimeout(() => map.invalidateSize(), 500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }
  }, []);

  // Update Tile Layer whenever selectedLayerId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layerConfig = MAP_LAYERS.find((l) => l.id === selectedLayerId) || MAP_LAYERS[0];

    // Remove old layer
    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    // Apply dark mode CSS class
    if (mapContainerRef.current) {
      if (layerConfig.isDarkFilter) {
        mapContainerRef.current.classList.add('leaflet-dark-mode');
      } else {
        mapContainerRef.current.classList.remove('leaflet-dark-mode');
      }
    }

    // Add new Tile Layer
    const newTile = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
      subdomains: layerConfig.subdomains || ['a', 'b', 'c'],
    }).addTo(map);

    currentTileLayerRef.current = newTile;
    localStorage.setItem('utinfo_selected_map_layer', selectedLayerId);
    map.invalidateSize();
  }, [selectedLayerId]);

  // Window resize handler and ResizeObserver to ensure map canvas fits container instantly
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      observer.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, []);

  // Update Vehicle Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !gps.latitude || !gps.longitude) return;

    const headingDeg = Math.round(gps.heading || 0);

    const carIconHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; background: rgba(37, 99, 235, 0.4); border-radius: 50%;" class="car-pulse-ring"></div>
        <div style="width: 32px; height: 32px; background: #1d4ed8; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; transform: rotate(${headingDeg}deg); transition: transform 0.25s ease;">
          <svg style="width: 18px; height: 18px; fill: white;" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `;

    const carIcon = L.divIcon({
      html: carIconHtml,
      className: 'vehicle-marker-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = L.marker([gps.latitude, gps.longitude], {
        icon: carIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      vehicleMarkerRef.current.setLatLng([gps.latitude, gps.longitude]);
      vehicleMarkerRef.current.setIcon(carIcon);
    }

    if (!isUserInteractingRef.current) {
      map.panTo([gps.latitude, gps.longitude], { animate: true });
    }
  }, [gps.latitude, gps.longitude, gps.heading]);

  // Update Hazard Markers with Directional Arrows
  useEffect(() => {
    const hazardGroup = hazardsLayerGroupRef.current;
    if (!hazardGroup) return;

    hazardGroup.clearLayers();

    hazards.forEach((hazard) => {
      const emoji = getHazardEmoji(hazard.hazardType);
      const color = getSeverityColor(hazard.severity);
      const cardinal = getCardinalDirectionShort(hazard.heading);

      const markerHtml = `
        <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <!-- Direction arrow ring: defect is strictly direction specific! -->
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; border: 2.5px dashed ${color}; transform: rotate(${hazard.heading}deg); pointer-events: none;">
            <div style="position: absolute; top: -6px; left: 16px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid ${color};"></div>
          </div>
          <!-- Badge bubble -->
          <div style="width: 30px; height: 30px; background: #18181b; border: 2px solid ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            ${emoji}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'hazard-marker-custom',
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const marker = L.marker([hazard.latitude, hazard.longitude], {
        icon: customIcon,
      });

      const latText =
        hazard.lateralPosition === 'left'
          ? 'Bal oldal (szél)'
          : hazard.lateralPosition === 'right'
          ? 'Jobb oldal (padka)'
          : 'Közép';

      // Popup Content
      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-1 text-zinc-900 font-sans';
      popupDiv.innerHTML = `
        <div style="min-width: 220px; font-family: inherit;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 20px;">${emoji}</span>
              <strong style="font-size: 14px; text-transform: capitalize;">${hazard.hazardType}</strong>
            </div>
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 6px; background: ${color}20; color: ${color}; font-weight: bold; border: 1px solid ${color};">
              ${hazard.severity.toUpperCase()}
            </span>
          </div>

          <div style="font-size: 12px; margin-bottom: 4px; color: #4b5563;">
            <strong>${hazard.roadNumber ? `[${hazard.roadNumber}] ` : ''}${hazard.roadName || 'Út'}</strong>
            <div>${hazard.city} ${hazard.postcode ? `(${hazard.postcode})` : ''}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; background: #f3f4f6; padding: 6px; border-radius: 8px; margin-bottom: 8px;">
            <div><strong>Sávok:</strong> ${hazard.laneCount} sáv (${hazard.laneNumber}. sáv)</div>
            <div><strong>Pozíció:</strong> ${latText}</div>
            <div style="grid-column: span 2;"><strong>Irány:</strong> ${hazard.heading}° (${cardinal})</div>
          </div>

          ${hazard.notes ? `<div style="font-size: 11px; font-style: italic; color: #374151; margin-bottom: 8px; background: #fffbeb; padding: 4px 6px; border-radius: 6px; border-left: 3px solid #f59e0b;">"${hazard.notes}"</div>` : ''}

          <div style="display: flex; gap: 6px;">
            <button id="btn-edit-${hazard.id}" style="flex: 1; padding: 6px 10px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
              Szerkesztés
            </button>
            <button id="btn-del-${hazard.id}" style="padding: 6px 10px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
              Törlés
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupDiv);

      marker.on('popupopen', () => {
        const editBtn = document.getElementById(`btn-edit-${hazard.id}`);
        const delBtn = document.getElementById(`btn-del-${hazard.id}`);

        if (editBtn) {
          editBtn.onclick = () => {
            onEditHazard(hazard);
            marker.closePopup();
          };
        }
        if (delBtn) {
          delBtn.onclick = () => {
            if (window.confirm('Biztosan törölni szeretnéd ezt az úthibát?')) {
              onDeleteHazard(hazard.id);
            }
            marker.closePopup();
          };
        }
      });

      hazardGroup.addLayer(marker);
    });
  }, [hazards]);

  const handleRecenter = () => {
    isUserInteractingRef.current = false;
    if (mapInstanceRef.current && gps.latitude && gps.longitude) {
      mapInstanceRef.current.setView([gps.latitude, gps.longitude], 16, { animate: true });
    }
  };

  const currentLayer = MAP_LAYERS.find((l) => l.id === selectedLayerId) || MAP_LAYERS[0];

  return (
    <div
      className="relative w-full h-full min-h-[500px] flex-1 rounded-3xl overflow-hidden border border-zinc-700/60 shadow-xl bg-zinc-950 flex flex-col"
      style={{ minHeight: '500px' }}
    >
      <div
        ref={mapContainerRef}
        className="w-full h-full flex-1 min-h-[500px] z-0"
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
      />

      {/* Top Left: Status & Click Tip */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-[280px] sm:max-w-none">
        <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>{currentLayer.name}</span>
          <span className="text-zinc-400 font-normal">({hazards.length} hiba)</span>
        </div>

        <div className="bg-zinc-900/85 backdrop-blur-md border border-zinc-700/80 px-3 py-1 rounded-xl text-[11px] text-zinc-300 shadow">
          💡 Kattints a térképre bárhol új úthiba rögzítéséhez!
        </div>
      </div>

      {/* Top Right: TÉRKÉP VÁLASZTÓ (MAP LAYER SELECTOR) */}
      <div className="absolute top-3 right-3 z-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className="bg-zinc-900/95 hover:bg-zinc-800 text-white backdrop-blur-md border border-zinc-700 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all"
            title="Térképréteg választása"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Térkép választó</span>
            <span className="text-base">{currentLayer.icon}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLayerMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Layer Selection Dropdown Menu */}
          {isLayerMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900/98 border border-zinc-700 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-md space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 mb-1">
                Válassz térképnézetet (API kulcs nem szükséges)
              </div>
              {MAP_LAYERS.map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      setSelectedLayerId(layer.id);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`w-full p-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{layer.icon}</span>
                      <span>{layer.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Right: Recenter on Vehicle */}
      <div className="absolute bottom-5 right-5 z-10 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleRecenter}
          className="p-3.5 bg-zinc-900/95 hover:bg-zinc-800 text-white rounded-2xl border border-zinc-700 shadow-xl flex items-center justify-center transition-transform active:scale-95"
          title="Vissza a jármű pozíciójára"
        >
          <Crosshair className="w-5 h-5 text-blue-400" />
        </button>
      </div>

      {/* Bottom Left: Map Legend */}
      <div className="absolute bottom-5 left-5 z-10 hidden sm:flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-xl text-[11px] text-zinc-300">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Kritikus</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Súlyos</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Közepes</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Könnyű</span>
        </div>
        <div className="text-zinc-500">|</div>
        <div className="text-amber-400 font-semibold">Nyíl = Érvényes haladási irány</div>
      </div>
    </div>
  );
};
