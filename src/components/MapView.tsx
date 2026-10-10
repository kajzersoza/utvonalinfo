import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { RoadHazard, GPSState, HazardType, OSMFeature, OSMFeatureVisibility } from '../types';
import { getCardinalDirectionShort } from '../services/geoService';
import { fetchOSMRoadInfo } from '../services/osmService';
import {
  Layers,
  Crosshair,
  ChevronDown,
  Check,
  Move,
  Plus,
  Trash2,
  Edit2,
  List,
  X,
  Search,
  MapPin,
  Compass,
} from 'lucide-react';

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
  osmFeatures: OSMFeature[];
  osmFeatureVisibility: OSMFeatureVisibility;
  onToggleOsmFeatureVisibility: (key: keyof OSMFeatureVisibility) => void;
  onAddHazardAtLocation: (lat: number, lon: number, heading: number) => void;
  onSaveHazard?: (hazard: RoadHazard) => void;
  onEditHazard: (hazard: RoadHazard) => void;
  onDeleteHazard: (id: string) => void;
  onUpdateHazardPosition: (id: string, lat: number, lon: number) => void;
  onUpdateHazardHeading: (id: string, heading: number) => void;
  theme: 'light' | 'dark';
}

const HAZARD_LABELS: Record<string, { label: string; icon: string }> = {
  pothole: { label: 'Kátyú', icon: '🕳️' },
  manhole: { label: 'Csatornafedél', icon: '🔘' },
  rutting: { label: 'Nyomvályú', icon: '〰️' },
  crack: { label: 'Repedés', icon: '⚡' },
  subsidence: { label: 'Útsüllyedés', icon: '📉' },
  debris: { label: 'Akadály / Törmelék', icon: '⚠️' },
  speedbump: { label: 'Fekvőrendőr', icon: '🚧' },
  other: { label: 'Egyéb úthiba', icon: '❓' },
};

function getHazardEmoji(type: HazardType): string {
  return HAZARD_LABELS[type]?.icon || '⚠️';
}

function getHazardLabel(type: HazardType): string {
  return HAZARD_LABELS[type]?.label || type;
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
  osmFeatures,
  osmFeatureVisibility,
  onToggleOsmFeatureVisibility,
  onAddHazardAtLocation,
  onSaveHazard,
  onEditHazard,
  onDeleteHazard,
  onUpdateHazardPosition,
  onUpdateHazardHeading,
  theme,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const osmFeaturesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const isUserInteractingRef = useRef(false);

  // Map of markers by hazard ID to avoid unnecessary destroy/rebuild
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Active layer state
  const [selectedLayerId, setSelectedLayerId] = useState<MapLayerId>(() => {
    const saved = localStorage.getItem('utinfo_selected_map_layer');
    if (saved && MAP_LAYERS.some((l) => l.id === saved)) {
      return saved as MapLayerId;
    }
    return theme === 'dark' ? 'osm-dark' : 'osm-standard';
  });

  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isOsmFilterMenuOpen, setIsOsmFilterMenuOpen] = useState(false);
  const [isListPanelOpen, setIsListPanelOpen] = useState(false);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [listTypeFilter, setListTypeFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Filtered hazards for map side panel
  const filteredHazards = useMemo(() => {
    return hazards.filter((h) => {
      const q = listSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (h.roadName || '').toLowerCase().includes(q) ||
        (h.city || '').toLowerCase().includes(q) ||
        (h.roadNumber || '').toLowerCase().includes(q) ||
        (h.notes || '').toLowerCase().includes(q);
      const matchType = listTypeFilter === 'all' || h.hazardType === listTypeFilter;
      return matchSearch && matchType;
    });
  }, [hazards, listSearch, listTypeFilter]);

  // Create custom marker icon
  const createMarkerIcon = (hazard: RoadHazard) => {
    const emoji = getHazardEmoji(hazard.hazardType);
    const color = getSeverityColor(hazard.severity);

    const markerHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: grab;" title="${hazard.roadName}">
        <!-- Direction arrow ring -->
        <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; border: 2.5px dashed ${color}; transform: rotate(${hazard.heading}deg); pointer-events: none;">
          <div style="position: absolute; top: -6px; left: 17px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid ${color};"></div>
        </div>
        <!-- Badge bubble -->
        <div style="width: 32px; height: 32px; background: #18181b; border: 2.5px solid ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
          ${emoji}
        </div>
      </div>
    `;

    return L.divIcon({
      html: markerHtml,
      className: 'hazard-marker-custom',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  };

  // Create Popup DOM Element with safe event isolation
  const createPopupContent = (hazard: RoadHazard, marker: L.Marker) => {
    const emoji = getHazardEmoji(hazard.hazardType);
    const typeLabel = getHazardLabel(hazard.hazardType);
    const color = getSeverityColor(hazard.severity);
    const cardinal = getCardinalDirectionShort(hazard.heading);

    const latText =
      hazard.lateralPosition === 'left'
        ? 'Bal oldal (szél)'
        : hazard.lateralPosition === 'right'
        ? 'Jobb oldal (padka)'
        : 'Közép';

    const container = document.createElement('div');
    container.className = 'p-1 text-zinc-900 font-sans select-none';
    container.style.minWidth = '240px';

    // Disable click & scroll bubbling to map
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    container.innerHTML = `
      <div style="font-family: inherit;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 20px;">${emoji}</span>
            <strong style="font-size: 14px;">${typeLabel}</strong>
          </div>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 6px; background: ${color}20; color: ${color}; font-weight: bold; border: 1px solid ${color};">
            ${hazard.severity.toUpperCase()}
          </span>
        </div>

        <div style="font-size: 12px; margin-bottom: 6px; color: #4b5563;">
          <strong>${hazard.roadNumber ? `[${hazard.roadNumber}] ` : ''}${hazard.roadName || 'Út'}</strong>
          <div>${hazard.city} ${hazard.postcode ? `(${hazard.postcode})` : ''}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; background: #f3f4f6; padding: 6px; border-radius: 8px; margin-bottom: 6px;">
          <div><strong>Sávok:</strong> ${hazard.laneCount} (${hazard.laneNumber}. sáv)</div>
          <div><strong>Pozíció:</strong> ${latText}</div>
        </div>

        <!-- LIVE ROTATION CONTROLS -->
        <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 8px; border-radius: 8px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: bold; color: #92400e;">Haladási irány:</span>
            <span id="heading-label-${hazard.id}" style="font-size: 12px; font-weight: bold; color: #b45309; font-family: monospace;">${hazard.heading}° (${cardinal})</span>
          </div>
          <input
            id="slider-heading-${hazard.id}"
            type="range"
            min="0"
            max="359"
            value="${hazard.heading}"
            style="width: 100%; margin: 4px 0; accent-color: #d97706; cursor: pointer;"
          />
          <div style="display: flex; gap: 4px; justify-content: space-between; margin-top: 4px;">
            <button id="btn-rot-minus-${hazard.id}" type="button" style="padding: 3px 6px; background: white; border: 1px solid #d97706; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">
              ⟲ -15°
            </button>
            <button id="btn-rot-180-${hazard.id}" type="button" style="padding: 3px 6px; background: white; border: 1px solid #d97706; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">
              180° Megfordítás
            </button>
            <button id="btn-rot-plus-${hazard.id}" type="button" style="padding: 3px 6px; background: white; border: 1px solid #d97706; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">
              ⟳ +15°
            </button>
          </div>
          <div style="font-size: 10px; color: #78350f; margin-top: 4px; text-align: center;">
            🖐️ Húzással áthelyezhető
          </div>
        </div>

        ${hazard.notes ? `<div style="font-size: 11px; font-style: italic; color: #374151; margin-bottom: 8px; background: #fffbeb; padding: 4px 6px; border-radius: 6px; border-left: 3px solid #f59e0b;">"${hazard.notes}"</div>` : ''}

        <div style="display: flex; gap: 6px; margin-top: 4px;">
          <button id="btn-edit-${hazard.id}" type="button" style="flex: 1; padding: 7px 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">
            ✏️ Szerkesztés
          </button>
          <button id="btn-del-${hazard.id}" type="button" style="padding: 7px 12px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">
            🗑️ Törlés
          </button>
        </div>
      </div>
    `;

    // Wire up events directly on the newly created elements
    const slider = container.querySelector<HTMLInputElement>(`#slider-heading-${hazard.id}`);
    const btnMinus = container.querySelector<HTMLButtonElement>(`#btn-rot-minus-${hazard.id}`);
    const btnPlus = container.querySelector<HTMLButtonElement>(`#btn-rot-plus-${hazard.id}`);
    const btn180 = container.querySelector<HTMLButtonElement>(`#btn-rot-180-${hazard.id}`);
    const editBtn = container.querySelector<HTMLButtonElement>(`#btn-edit-${hazard.id}`);
    const delBtn = container.querySelector<HTMLButtonElement>(`#btn-del-${hazard.id}`);
    const headingLabel = container.querySelector<HTMLSpanElement>(`#heading-label-${hazard.id}`);

    const updateHeadingLocal = (newHeading: number) => {
      const normalized = (newHeading % 360 + 360) % 360;
      if (slider) slider.value = String(normalized);
      if (headingLabel) {
        headingLabel.textContent = `${normalized}° (${getCardinalDirectionShort(normalized)})`;
      }
      onUpdateHazardHeading(hazard.id, normalized);
    };

    if (slider) {
      slider.oninput = (e) => {
        e.stopPropagation();
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        updateHeadingLocal(val);
      };
    }

    if (btnMinus) {
      btnMinus.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        updateHeadingLocal(hazard.heading - 15);
      };
    }

    if (btnPlus) {
      btnPlus.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        updateHeadingLocal(hazard.heading + 15);
      };
    }

    if (btn180) {
      btn180.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        updateHeadingLocal(hazard.heading + 180);
      };
    }

    if (editBtn) {
      editBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        marker.closePopup();
        onEditHazard(hazard);
      };
    }

    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        marker.closePopup();
        // Remove from map layer group and map ref immediately
        if (hazardsLayerGroupRef.current) {
          hazardsLayerGroupRef.current.removeLayer(marker);
        }
        markersMapRef.current.delete(hazard.id);
        onDeleteHazard(hazard.id);
        showToast('🗑️ Úthiba sikeresen törölve!');
      };
    }

    return container;
  };

  // 1. Initialize Map
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

      // Layer groups
      const hazardGroup = L.layerGroup().addTo(map);
      hazardsLayerGroupRef.current = hazardGroup;

      const osmGroup = L.layerGroup().addTo(map);
      osmFeaturesLayerGroupRef.current = osmGroup;

      // Add initial tile layer
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

      // Handle map click to show interactive "Place hazard here?" popup
      map.on('click', async (e: L.LeafletMouseEvent) => {
        // Stop if user was clicking a marker
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;

        // Create interactive prompt popup at click location
        const promptDiv = document.createElement('div');
        promptDiv.className = 'p-2 text-zinc-900 font-sans';
        promptDiv.style.minWidth = '250px';
        L.DomEvent.disableClickPropagation(promptDiv);
        L.DomEvent.disableScrollPropagation(promptDiv);

        promptDiv.innerHTML = `
          <div style="font-family: inherit;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 20px;">📍</span>
              <strong style="font-size: 14px; color: #111827;">Új Úthiba Elhelyezése</strong>
            </div>

            <div style="background: #f3f4f6; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px; font-size: 11px;">
              <div id="osm-addr-text" style="font-weight: bold; color: #1f2937;">📍 Cím lekérdezése az OSM-ből...</div>
              <div style="color: #6b7280; font-family: monospace; font-size: 10px; margin-top: 2px;">
                ${lat.toFixed(5)}, ${lon.toFixed(5)}
              </div>
            </div>

            <div style="display: flex; gap: 6px;">
              <button id="btn-quick-place" type="button" style="flex: 1; padding: 7px 10px; background: #dc2626; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                ⚡ Gyors Rögzítés
              </button>
              <button id="btn-detail-place" type="button" style="flex: 1; padding: 7px 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">
                ✏️ Részletek
              </button>
            </div>
          </div>
        `;

        const promptPopup = L.popup({
          offset: [0, -10],
          closeButton: true,
          autoClose: true,
        })
          .setLatLng([lat, lon])
          .setContent(promptDiv)
          .openOn(map);

        // Fetch reverse geocoded address asynchronously for accuracy
        let roadName = 'Kijelölt útszakasz';
        let roadNumber = '';
        let city = 'Térképről rögzítve';
        let postcode = '';
        let lanes = 2;

        try {
          const osm = await fetchOSMRoadInfo(lat, lon);
          if (osm.roadName) roadName = osm.roadName;
          if (osm.roadNumber) roadNumber = osm.roadNumber;
          if (osm.city) city = osm.city;
          if (osm.postcode) postcode = osm.postcode;
          if (osm.lanes) lanes = osm.lanes;

          const addrElem = promptDiv.querySelector('#osm-addr-text');
          if (addrElem) {
            addrElem.textContent = `${roadNumber ? `[${roadNumber}] ` : ''}${roadName}, ${city}`;
          }
        } catch {
          const addrElem = promptDiv.querySelector('#osm-addr-text');
          if (addrElem) {
            addrElem.textContent = `${roadName}, ${city}`;
          }
        }

        // Quick Place handler: immediately saves to list and map
        const btnQuick = promptDiv.querySelector<HTMLButtonElement>('#btn-quick-place');
        if (btnQuick) {
          btnQuick.onclick = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            map.closePopup(promptPopup);

            const newHazard: RoadHazard = {
              id: `hazard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              timestamp: Date.now(),
              latitude: lat,
              longitude: lon,
              heading: Math.round(gps.heading || 0),
              speed: 0,
              accuracy: 5,
              roadNumber,
              roadName,
              city,
              postcode,
              laneCount: lanes,
              lateralPosition: 'center',
              laneNumber: 1,
              hazardType: 'pothole',
              severity: 'medium',
              notes: 'Térképen rögzítve',
            };

            if (onSaveHazard) {
              onSaveHazard(newHazard);
            }
            showToast(`✅ Úthiba rögzítve: ${roadName} (${city})! Megjelenik a listában és a térképen.`);
          };
        }

        // Detailed Place handler: opens HazardModal
        const btnDetail = promptDiv.querySelector<HTMLButtonElement>('#btn-detail-place');
        if (btnDetail) {
          btnDetail.onclick = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            map.closePopup(promptPopup);
            onAddHazardAtLocation(lat, lon, gps.heading || 0);
          };
        }
      });

      map.on('movestart', () => {
        isUserInteractingRef.current = true;
      });

      mapInstanceRef.current = map;

      // Invalidate sizes
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

  // 2. Update Tile Layer on selectedLayerId change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layerConfig = MAP_LAYERS.find((l) => l.id === selectedLayerId) || MAP_LAYERS[0];

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    if (mapContainerRef.current) {
      if (layerConfig.isDarkFilter) {
        mapContainerRef.current.classList.add('leaflet-dark-mode');
      } else {
        mapContainerRef.current.classList.remove('leaflet-dark-mode');
      }
    }

    const newTile = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
      subdomains: layerConfig.subdomains || ['a', 'b', 'c'],
    }).addTo(map);

    currentTileLayerRef.current = newTile;
    localStorage.setItem('utinfo_selected_map_layer', selectedLayerId);
    map.invalidateSize();
  }, [selectedLayerId]);

  // 3. Window resize handler and ResizeObserver
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

  // 4. Update Vehicle Marker
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

  // 5. Synchronize Hazard Markers without destroying open popups
  useEffect(() => {
    const hazardGroup = hazardsLayerGroupRef.current;
    if (!hazardGroup) return;

    const currentMap = markersMapRef.current;
    const activeIds = new Set(hazards.map((h) => h.id));

    // Remove deleted markers
    currentMap.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        hazardGroup.removeLayer(marker);
        currentMap.delete(id);
      }
    });

    // Update existing markers or add new ones
    hazards.forEach((hazard) => {
      const existing = currentMap.get(hazard.id);
      const icon = createMarkerIcon(hazard);

      if (existing) {
        // Update position if changed
        const currentLatLng = existing.getLatLng();
        if (
          Math.abs(currentLatLng.lat - hazard.latitude) > 0.00001 ||
          Math.abs(currentLatLng.lng - hazard.longitude) > 0.00001
        ) {
          existing.setLatLng([hazard.latitude, hazard.longitude]);
        }
        // Update icon (for heading or color change)
        existing.setIcon(icon);

        // Update popup content without closing it
        const popupContent = createPopupContent(hazard, existing);
        existing.setPopupContent(popupContent);
      } else {
        // Create new marker
        const marker = L.marker([hazard.latitude, hazard.longitude], {
          icon,
          draggable: true,
        });

        // Dragend handler
        marker.on('dragend', (e) => {
          const newPos = (e.target as L.Marker).getLatLng();
          onUpdateHazardPosition(hazard.id, newPos.lat, newPos.lng);
          showToast(`📍 Pozíció áthelyezve: ${hazard.roadName}`);
        });

        // Click handler: stop DOM event from bubbling to map click
        marker.on('click', (e) => {
          if (e.originalEvent) {
            e.originalEvent.stopPropagation();
          }
        });

        const popupDiv = createPopupContent(hazard, marker);
        marker.bindPopup(popupDiv, { maxWidth: 300 });

        hazardGroup.addLayer(marker);
        currentMap.set(hazard.id, marker);
      }
    });
  }, [hazards, onUpdateHazardPosition, onUpdateHazardHeading, onEditHazard, onDeleteHazard]);

  // 6. Update OSM Features Layer
  useEffect(() => {
    const osmGroup = osmFeaturesLayerGroupRef.current;
    if (!osmGroup) return;

    osmGroup.clearLayers();

    osmFeatures.forEach((feat) => {
      if (feat.type === 'crossing' && !osmFeatureVisibility.showCrossings) return;
      if (feat.type === 'railway' && !osmFeatureVisibility.showRailways) return;
      if (feat.type === 'traffic_signals' && !osmFeatureVisibility.showTrafficSignals) return;
      if (feat.type === 'traffic_sign' && !osmFeatureVisibility.showTrafficSigns) return;

      const icon =
        feat.type === 'crossing'
          ? '🚶'
          : feat.type === 'railway'
          ? '🚂'
          : feat.type === 'traffic_signals'
          ? '🚦'
          : '🛑';

      const borderColor =
        feat.type === 'crossing'
          ? '#3b82f6'
          : feat.type === 'railway'
          ? '#eab308'
          : feat.type === 'traffic_signals'
          ? '#10b981'
          : '#ef4444';

      const osmIconHtml = `
        <div style="width: 28px; height: 28px; background: #18181b; border: 2px solid ${borderColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); cursor: pointer;" title="${feat.name}">
          ${icon}
        </div>
      `;

      const osmIcon = L.divIcon({
        html: osmIconHtml,
        className: 'osm-feature-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([feat.latitude, feat.longitude], { icon: osmIcon });

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 18px;">${icon}</span>
            <strong style="font-size: 13px;">${feat.name}</strong>
          </div>
          <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">
            ${feat.description || 'OpenStreetMap közlekedési elem'}
          </div>
          ${feat.speedLimit ? `<div style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block;">Sebességkorlát: ${feat.speedLimit} km/h</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      osmGroup.addLayer(marker);
    });
  }, [osmFeatures, osmFeatureVisibility]);

  // Recenter map on vehicle
  const handleRecenter = () => {
    isUserInteractingRef.current = false;
    if (mapInstanceRef.current && gps.latitude && gps.longitude) {
      mapInstanceRef.current.setView([gps.latitude, gps.longitude], 16, { animate: true });
    }
  };

  // Zoom to a specific hazard from the side panel
  const handleZoomToHazard = (hazard: RoadHazard) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([hazard.latitude, hazard.longitude], 17, { animate: true });
      const marker = markersMapRef.current.get(hazard.id);
      if (marker) {
        setTimeout(() => marker.openPopup(), 300);
      }
    }
  };

  const currentLayer = MAP_LAYERS.find((l) => l.id === selectedLayerId) || MAP_LAYERS[0];

  return (
    <div
      className="relative w-full h-full min-h-[500px] flex-1 rounded-3xl overflow-hidden border border-zinc-700/60 shadow-xl bg-zinc-950 flex flex-col"
      style={{ minHeight: '500px' }}
    >
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full flex-1 min-h-[500px] z-0 ${isPlacementMode ? 'cursor-crosshair' : ''}`}
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
      />

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Left: Status & Instructions */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-[280px] sm:max-w-none">
        <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>{currentLayer.name}</span>
          <span className="text-zinc-400 font-normal">({hazards.length} rögzített hiba)</span>
        </div>

        <div className="bg-zinc-900/85 backdrop-blur-md border border-zinc-700/80 px-3 py-1.5 rounded-xl text-[11px] text-zinc-300 shadow">
          {isPlacementMode ? (
            <span className="text-amber-400 font-bold animate-pulse">
              🎯 Kattints a térképre a kívánt helyre az úthiba elhelyezéséhez!
            </span>
          ) : (
            <span>🖐️ Kattints a térképre új hiba lehelyezéséhez! A meglévő hibák húzhatók és forgathatók.</span>
          )}
        </div>
      </div>

      {/* Top Right Controls Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Placement Mode Toggle Button */}
        <button
          type="button"
          onClick={() => setIsPlacementMode(!isPlacementMode)}
          className={`backdrop-blur-md border px-3 py-2 rounded-2xl shadow-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
            isPlacementMode
              ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-500/50'
              : 'bg-zinc-900/95 hover:bg-zinc-800 text-white border-zinc-700'
          }`}
          title="Új úthiba lehelyezése a térképre"
        >
          <Plus className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Úthiba lehelyezése</span>
        </button>

        {/* Hazards List Panel Toggle Button ("nem jelenik meg a listában" - direct in-map list) */}
        <button
          type="button"
          onClick={() => setIsListPanelOpen(!isListPanelOpen)}
          className={`backdrop-blur-md border px-3 py-2 rounded-2xl shadow-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
            isListPanelOpen
              ? 'bg-blue-600 text-white border-blue-400'
              : 'bg-zinc-900/95 hover:bg-zinc-800 text-white border-zinc-700'
          }`}
          title="Térképi úthiba lista megjelenítése"
        >
          <List className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Hibák listája</span>
          <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
            {hazards.length}
          </span>
        </button>

        {/* OSM Features Toggle Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOsmFilterMenuOpen(!isOsmFilterMenuOpen)}
            className="bg-zinc-900/95 hover:bg-zinc-800 text-white backdrop-blur-md border border-zinc-700 px-3 py-2 rounded-2xl shadow-xl flex items-center gap-1.5 text-xs font-bold transition-all"
            title="OSM elemek bejelölése"
          >
            <span>🚦</span>
            <span className="hidden sm:inline">OSM Elemek</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOsmFilterMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOsmFilterMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900/98 border border-zinc-700 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-md space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 mb-1">
                OSM Elemek megjelenítése
              </div>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer">
                <span className="flex items-center gap-2 font-medium">
                  <span>🚶</span>
                  <span>Gyalogátkelőhelyek</span>
                </span>
                <input
                  type="checkbox"
                  checked={osmFeatureVisibility.showCrossings}
                  onChange={() => onToggleOsmFeatureVisibility('showCrossings')}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer">
                <span className="flex items-center gap-2 font-medium">
                  <span>🚦</span>
                  <span>Jelzőlámpák</span>
                </span>
                <input
                  type="checkbox"
                  checked={osmFeatureVisibility.showTrafficSignals}
                  onChange={() => onToggleOsmFeatureVisibility('showTrafficSignals')}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer">
                <span className="flex items-center gap-2 font-medium">
                  <span>🚂</span>
                  <span>Vasúti átjárók</span>
                </span>
                <input
                  type="checkbox"
                  checked={osmFeatureVisibility.showRailways}
                  onChange={() => onToggleOsmFeatureVisibility('showRailways')}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer">
                <span className="flex items-center gap-2 font-medium">
                  <span>🛑</span>
                  <span>Közlekedési táblák</span>
                </span>
                <input
                  type="checkbox"
                  checked={osmFeatureVisibility.showTrafficSigns}
                  onChange={() => onToggleOsmFeatureVisibility('showTrafficSigns')}
                  className="w-4 h-4 accent-red-600 rounded"
                />
              </label>
            </div>
          )}
        </div>

        {/* Map Layer Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className="bg-zinc-900/95 hover:bg-zinc-800 text-white backdrop-blur-md border border-zinc-700 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all"
            title="Térképréteg választása"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Térkép</span>
            <span className="text-base">{currentLayer.icon}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLayerMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900/98 border border-zinc-700 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-md space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 mb-1">
                Válassz térképnézetet
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

      {/* Floating Hazards List Panel (Direct in-map List View!) */}
      {isListPanelOpen && (
        <div className="absolute top-16 right-3 bottom-16 z-30 w-80 sm:w-96 bg-zinc-900/98 backdrop-blur-xl border border-zinc-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm">
                Úthibák Listája <span className="text-xs text-zinc-400">({hazards.length})</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsListPanelOpen(false)}
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filters */}
          <div className="p-3 border-b border-zinc-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Keresés út, utca, város..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Type Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() => setListTypeFilter('all')}
                className={`px-2 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                  listTypeFilter === 'all' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Összes
              </button>
              {Object.entries(HAZARD_LABELS).map(([tId, info]) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => setListTypeFilter(tId)}
                  className={`px-2 py-1 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    listTypeFilter === tId ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hazards Scrollable Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredHazards.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">
                <p>Nincs megjeleníthető úthiba a szűrő alapján.</p>
                <p className="mt-1 text-[11px] text-zinc-600">Kattints a térképre új hiba lehelyezéséhez!</p>
              </div>
            ) : (
              filteredHazards.map((hazard) => {
                const color = getSeverityColor(hazard.severity);
                const isConfirming = deleteConfirmId === hazard.id;

                return (
                  <div
                    key={hazard.id}
                    className="p-3 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 rounded-2xl space-y-2 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getHazardEmoji(hazard.hazardType)}</span>
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5 flex-wrap">
                            {hazard.roadNumber && (
                              <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] font-black">
                                {hazard.roadNumber}
                              </span>
                            )}
                            <span>{hazard.roadName}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {hazard.city} {hazard.postcode ? `(${hazard.postcode})` : ''}
                          </div>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0"
                        style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
                      >
                        {hazard.severity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-700/50">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3 h-3 text-amber-400" />
                        {hazard.heading}° ({getCardinalDirectionShort(hazard.heading)})
                      </span>
                      <span>{hazard.laneCount} sáv ({hazard.laneNumber}. sáv)</span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleZoomToHazard(hazard)}
                        className="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="Térképen ráugrás"
                      >
                        <MapPin className="w-3 h-3 text-blue-400" />
                        Ugrás
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onEditHazard(hazard);
                            setIsListPanelOpen(false);
                          }}
                          className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Szerkesztés
                        </button>

                        {isConfirming ? (
                          <div className="flex items-center gap-1 bg-red-950 p-0.5 rounded-lg border border-red-500/50">
                            <span className="text-[10px] font-bold text-red-300 px-1">Törlöd?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteHazard(hazard.id);
                                setDeleteConfirmId(null);
                                showToast('🗑️ Úthiba sikeresen törölve a listából!');
                              }}
                              className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded"
                            >
                              Igen
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] rounded"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(hazard.id)}
                            className="p-1 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Törlés"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
        <div className="text-amber-400 font-semibold flex items-center gap-1">
          <Move className="w-3 h-3" />
          Húzható & Forgatható
        </div>
      </div>
    </div>
  );
};
