import React, { useState, useRef, useEffect } from "react";
import { initTokenField, renderTokenField } from "./controls/tokenfield";
import { renderMapper, renderMapperDialog } from "./controls/mapper";
// Import Leaflet Core

declare namespace L {
  export const map: any;
  export const tileLayer: any;
  export const Polygon: any;
  export const polyline: any;
  export const Polyline: any;
  export const circle: any;
  export const Circle: any;
  export const rectangle: any;
  export const Rectangle: any;
  export const latLng: any;
  export const LatLng: any;
  export const Draw: any;
  export const LeafletEvent: any;
  export const LeafletMouseEvent: any;
  export const DrawEvents: any;
  export const marker: any;
  export const Marker: any;
  export const icon: any;
  export const latLngBounds: any;
}

//Mapper
const glbMapperJS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const glbMapperCSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const glbColors = {
  polygon: "#0074D9",
  line: "#FF851B",
  rectangle: "#2ECC40",
  circle: "#FF4136",
  marker: "#85144b"
};
const glbMarkerIcon = {
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // Replace with your marker icon if necessary
  iconSize: [20, 20],
  iconAnchor: [5, 20],
  popupAnchor: [0, -20],
  shadowUrl: null, // Remove shadow
  className: "custom-leaflet-marker", // Add a custom class
}

interface TableColumn {
  type: "dialog_field" | "action" | "custom";
  dialog_field_id?: string;
  caption: string;
  render?: (item: any) => React.ReactNode; // Custom render function for "custom" type
  width?: string | number; // Add optional width property
}

interface DialogField {
  id: string;
  caption: string;
  type: "input" | "select" | "file" | "option" | "textarea" | "mapper" | "tokenfield";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  accept?: string;
  show?: boolean;
  note?: string;
  dataSource?: string | { id: number; name: string }[];
  download?: boolean;
  onChange?: (
    e: React.ChangeEvent<any> | { target: { value: any } },
    formData?: any | null,
    setFormData?: React.Dispatch<React.SetStateAction<any>> | null,
    currentDialogFields?: DialogField[] | null,
    setDialogFields?: React.Dispatch<React.SetStateAction<DialogField[]>> | null
  ) => void;
}

interface ContentRepeaterProps {
  id: string;
  dnd_order?: boolean; // Enable/disable drag-and-drop
  base_path?: string;
  table_columns?: TableColumn[];
  dialog_fields?: DialogField[];
  data?: any[];
  onChange: (items: any[]) => void;
  save_path_temp: string;
  api_upload_url: string;
  debug?: boolean;
  file_viewer_temp_url?: string;
  file_viewer_url?: string;
  mapper_preview?: boolean;
}

const loadLeaflet = (() => {
  let isLoaded = false;

  return () => {
    if (!isLoaded) {
      // Load Leaflet CSS
      const leafletCSS = document.createElement("link");
      leafletCSS.rel = "stylesheet";
      leafletCSS.href = glbMapperCSS;
      document.head.appendChild(leafletCSS);

      // Load Leaflet JavaScript
      const leafletJS = document.createElement("script");
      leafletJS.src = glbMapperJS;
      leafletJS.async = true;
      leafletJS.onload = () => {
        // Load Leaflet.draw CSS
        const leafletDrawCSS = document.createElement("link");
        leafletDrawCSS.rel = "stylesheet";
        leafletDrawCSS.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css";
        document.head.appendChild(leafletDrawCSS);

        // Load Leaflet.draw JavaScript
        const leafletDrawJS = document.createElement("script");
        leafletDrawJS.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js";
        leafletDrawJS.async = true;
        leafletDrawJS.onload = () => {
          console.log("Leaflet and Leaflet.draw loaded successfully.");
        };
        document.head.appendChild(leafletDrawJS);

        // Add inline CSS override for Leaflet SVG
        const style = document.createElement("style");
        style.type = "text/css";
        style.innerHTML = `
          .leaflet-container svg {
            width: auto !important;
            height: auto !important;
          }

          .leaflet-marker-icon {
            width: 10px !important;
            height: 10px !important;
            margin-left: -5px !important; /* Half of the new width */
            margin-top: -5px !important; /* Half of the new height */
          }

          .custom-leaflet-marker {
            width: 20px !important;
            height: 20px !important;
            margin-left: -5px !important; /* Half of width */
            margin-top: -20px !important; /* Height for bottom alignment */
          }

          .content-repeater-mapper {
            position: fixed;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0;
            border: none;
            background-color: white;
            z-index: 9999;
            max-width: none !important;
            max-height: none !important;
          }
        `;
        document.head.appendChild(style);
      };
      document.head.appendChild(leafletJS);

      isLoaded = true;
    }
  };
})();

export const ContentRepeater: React.FC<ContentRepeaterProps> = ({
  id,
  dnd_order = false,
  base_path = "",
  table_columns = [],
  dialog_fields = [],
  data = [],
  onChange,
  save_path_temp,
  api_upload_url = "/api/content-repeater-upload",
  debug = false,
  file_viewer_temp_url = "",
  file_viewer_url = "",
  mapper_preview = false,
}) => {
  const [items, setItems] = useState<Record<string, any>>(() => {
    const initialState: Record<string, any> = {};
    data.forEach((item) => {
      initialState[item.id] = item;
    });
    return initialState;
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogMapOpen, setIsDialogMapOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formData, setFormData] = useState<any>({});
  const [currentDialogFields, setDialogFields] = useState<DialogField[]>(dialog_fields);
  const fileInputRefs = useRef<{ [key: string]: React.RefObject<HTMLInputElement> }>({});
  const tokenfieldRefs = useRef<{ [key: string]: React.RefObject<HTMLInputElement> }>({});
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    setDialogFields(dialog_fields);
  }, [dialog_fields]);

  // useEffect(() => {
  //   const refs: { [key: string]: React.RefObject<HTMLInputElement> } = {};
  //   dialog_fields.forEach((field) => {
  //     if (field.type === "file") {
  //       refs[field.id] = React.createRef<HTMLInputElement>();
  //     }
  //   });
  //   fileInputRefs.current = refs;
  // }, [dialog_fields]);

  useEffect(() => {
    const fileRefs: { [key: string]: React.RefObject<HTMLInputElement> } = {};
    const tokenfieldRefsLocal: { [key: string]: React.RefObject<HTMLInputElement> } = {};
  
    dialog_fields.forEach((field) => {
      if (field.type === "file") {
        fileRefs[field.id] = React.createRef<HTMLInputElement>();
      } else if (field.type === "tokenfield") {
        tokenfieldRefsLocal[field.id] = React.createRef<HTMLInputElement>();
      }
    });

    fileInputRefs.current = fileRefs;
    tokenfieldRefs.current = tokenfieldRefsLocal;
  }, [dialog_fields]);

  useEffect(() => {
    const hasMapperField = dialog_fields.some((field) => field.type === "mapper");
  
    if (hasMapperField) {
      loadLeaflet();
    } else {
      if (debug) console.log("No 'mapper' type found in dialog_fields. Leaflet will not be loaded.");
    }
  }, [dialog_fields]);  

  const openDialog = (item: any = null, dialogRef: any = null) => {
    const initialFormData = item
      ? { ...item }
      : dialog_fields.reduce<Record<string, any>>((acc, field) => {
        if (field.type === "select" && field.options?.length) {
          acc[field.id] = field.options[0];
        } else if (field.type === "option" && field.options?.length) {
          acc[field.id] = field.options[0];
        } else if (field.type === "input" || field.type === "textarea") {
          acc[field.id] = "";
        }
        return acc;
      }, {});

    Object.values(fileInputRefs.current).forEach((ref) => {
      if (ref.current) {
        ref.current.value = "";
      }
    });

    const dialogFieldsWithDOM = dialog_fields.map((field) => ({
      ...field,
      domElement: document.getElementById(`${id}_${field.id}`), // Attach DOM element
    }));
    
    dialog_fields.forEach((field: DialogField) => {
      const element = document.getElementById(`${id}_${field.id}`);
      if (field.type === "tokenfield" && element) {
        // Initialize tokenfield on the element
        initTokenField(
          initialFormData[field.id] || "[]", // Pass current value or an empty array
          element as HTMLInputElement,
          Array.isArray(field?.dataSource) ? field.dataSource : [],
          field,
          handleFieldChange
        );
      }
    });

    dialog_fields.forEach((field: DialogField) => {
      if ((field.type === "tokenfield" || field.type === "select" || field.type === "option") && field.onChange) {
        const initialValue = initialFormData[field.id];
        field.onChange(
          { target: { value: initialValue } },
          dialogFieldsWithDOM, // Pass updated dialog fields with DOM references
          null,
          null,
          null
        );
      }
    });

    const errorDiv = dialogRef.current?.querySelector(".dts-alert.dts-alert--error") as HTMLElement;
    if (errorDiv) {
      errorDiv.style.display = "none";
    }

    setEditingItem(item);
    setFormData(initialFormData);
    setDialogFields(dialogFieldsWithDOM); // Update dialog fields with DOM references
    setIsDialogOpen(true);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    // Reset form data, including tokenfield values
    setFormData({}); // Clears all field values
    setEditingItem(null); // Clear editing state

    // Clear tokenfields
    Object.values(tokenfieldRefs.current).forEach((ref) => {
        if (ref.current) {
            // Clear the hidden textarea value
            ref.current.value = "";

            // Clear the UI tokens (assumes tokens are wrapped in a container)
            const tokenContainer = ref.current.parentElement?.querySelector(".custom-tokenfield-tokens");
            if (tokenContainer) {
                tokenContainer.innerHTML = ""; // Remove all tokens
            }
        }
    });

    setIsDialogOpen(false);
    dialogRef.current?.close();
  };

  const dialogMapRef = useRef<HTMLDialogElement>(null);
  const mapRef = useRef<any>(null);
  const state = useRef<{
    mode: string;
    polygon: any | null;
    polyline: any | null;
    circle: any | null;
    rectangle: any | null;
    points: any[];
    wasPolygonized: boolean;
    circleHandle: {
      disable: () => {},
      enable: () => {}, // Placeholder enable method
    } | null,
    rectangleHandle: {
      disable: () => {},
      enable: () => {}, // Placeholder enable method
    } | null,
    marker: any[]; // Add marker as an array of Leaflet markers
    startMarker: any | null; // Add startMarker as a single Leaflet marker
  }>({
    mode: "moveMap",
    polygon: null,
    polyline: null,
    circle: null,
    rectangle: null,
    points: [],
    wasPolygonized: false,
    circleHandle: null,
    rectangleHandle: null,
    marker: [], // Initialize as an empty array
    startMarker: null, // Initialize as null
  });    
  type InitialDataType = object | null;
  const initializeMap = (initialData: InitialDataType) => {
    const L = (window as any).L || null;

    if (!mapRef.current && L) {
      if (debug) console.log(`${id}_mapper_modeSelect`);

      let getHeight =
      ((document.querySelector(
        `#${dialogMapRef.current?.getAttribute('id')} .dts-dialog__content`
      ) as HTMLElement)?.offsetHeight || 0) -
      ((document.querySelector(
        `#${dialogMapRef.current?.getAttribute('id')} .dts-dialog__header`
      ) as HTMLElement)?.offsetHeight || 0) -
      ((document.querySelector(
        `#${dialogMapRef.current?.getAttribute('id')} .mapper-menu`
      ) as HTMLElement)?.offsetHeight || 0);
    
      if (getHeight !== undefined) {
        if (dialogMapRef.current) {
          const mapContainer = document.getElementById(`${dialogMapRef.current.getAttribute('id')}_container`); //dialogMapRef.current?.querySelector('.mapper-holder .leaflet-container');
          if (mapContainer) {
            getHeight = getHeight - 10;
            if (debug) console.log('Map container:', getHeight)
            mapContainer.style.height = `${getHeight}px`;
          }
        }
      }

      const mapperSearch = document.getElementById(`${id}_mapper_search`) as HTMLInputElement;
      if (mapperSearch) mapperSearch.value = '';
  
      // Initialize the map
      mapRef.current = L.map(`${id}_mapper_container`, { dragging: true }).setView([43.833, 87.616], 2); // Urumqi center
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapRef.current);
  
      // Handle map click events
      mapRef.current.on("click", (e: any) => {
        const latLng = e.latlng;
  
        switch (state.current.mode) {
          case "autoPolygon":
            handlePolygonMode(latLng);
            break;
          case "drawLines":
            handleLineMode(latLng);
            break;
          case "drawRectangle":
            //handleRectangleMode(latLng);
            break;
          case "drawCircle":
            //handleCircleMode(latLng);
            break;
          case "placeMarker":
            handleMarkerMode(latLng);
            break;
          default:
            //console.warn(`Unhandled mode: ${state.current.mode}`);
        }
      });
  
      if (debug) console.log("Initial Data:", initialData);
  
      // Process initial data for rendering shapes
      if (initialData) {
        try {
          processInitialData(initialData);
        } catch (error) {
          console.error("Error processing initialData:", (error as any)?.message || "Unknown error");
        }
      }
  
      // Remove Ukrainian Flag
      document.querySelector('.leaflet-control-attribution.leaflet-control a')?.remove();
  
      // Reset the mode select dropdown
      const modeSelect = document.getElementById(`${id}_mapper_modeSelect`) as HTMLSelectElement;
      if (modeSelect) modeSelect.selectedIndex = 0;
  
      if (debug) console.log("Map initialized");
    }
  };
  
  // Helper functions for handling specific modes
  const normalizeLongitude = (lng: number): number => ((lng + 180) % 360 + 360) % 360 - 180;

  type LatLng = { lat: number; lng: number };

  const handlePolygonMode = (latLng: any) => {
    const L = (window as any).L || null;

    state.current.mode = "autoPolygon";
  
    state.current.points.push([latLng.lat, latLng.lng]);
  
    if (state.current.polygon) {
      mapRef.current.removeLayer(state.current.polygon);
    }
  
    // Add the polygon to the map
    state.current.polygon = L.polygon(state.current.points, { color: glbColors.polygon }).addTo(mapRef.current);
  
    // Enable editing on the polygon
    if (state.current.polygon) state.current.polygon.editing.enable();
  
    // Add event listeners to capture edits
    state.current.polygon.on('edit', () => {
      const updatedLatLngs = state.current.polygon.getLatLngs()[0];
      state.current.points = updatedLatLngs.map((point: LatLng) => [
        point.lat,
        normalizeLongitude(point.lng), // Normalize longitude
      ]);
      if (debug) console.log("Polygon updated points (normalized):", state.current.points);
    });
  
    state.current.polygon.on('dragend', () => {
      const updatedLatLngs = state.current.polygon.getLatLngs()[0];
      state.current.points = updatedLatLngs.map((point: LatLng) => [
        point.lat,
        normalizeLongitude(point.lng), // Normalize longitude
      ]);
      if (debug) console.log("Polygon drag ended with points (normalized):", state.current.points);
    });
  
    if (debug) console.log("Polygon Points:", state.current.points);
  };  
  
  const handleLineMode = (latLng: any) => {
    const L = (window as any).L || null;

    state.current.mode = "drawLines";
  
    const newPoint = [latLng.lat, latLng.lng];
  
    // Initialize starting marker and clear previous line
    if (state.current.points.length === 0) {
      if (state.current.startMarker) mapRef.current.removeLayer(state.current.startMarker);
      if (state.current.polyline) mapRef.current.removeLayer(state.current.polyline);
  
      state.current.startMarker = L.circleMarker(newPoint, {
        color: "blue",
        radius: 1,
      }).addTo(mapRef.current);
    }
  
    // Add the new point to the line
    state.current.points.push(newPoint);
  
    // Remove the previous polyline if it exists
    if (state.current.polyline) {
      mapRef.current.removeLayer(state.current.polyline);
    }
  
    // Add the polyline to the map
    state.current.polyline = L.polyline(state.current.points, { color: glbColors.line }).addTo(mapRef.current);
  
    // Enable editing on the polyline
    if (state.current.polyline) state.current.polyline.editing.enable();
  
    // Add event listeners to capture edits
    state.current.polyline.on('edit', () => {
      const updatedLatLngs = state.current.polyline.getLatLngs();
      state.current.points = updatedLatLngs.map((point: LatLng) => [
        point.lat,
        normalizeLongitude(point.lng), // Normalize longitude
      ]);
      if (debug) console.log("Polyline updated points (normalized):", state.current.points);
    });
  
    state.current.polyline.on('dragend', () => {
      const updatedLatLngs = state.current.polyline.getLatLngs();
      state.current.points = updatedLatLngs.map((point: LatLng) => [
        point.lat,
        normalizeLongitude(point.lng), // Normalize longitude
      ]);
      if (debug) console.log("Polyline drag ended with points (normalized):", state.current.points);
    });
  
    if (debug) console.log("Polyline Points:", state.current.points);
  };
  
  const handleRectangleMode = () => {
    const L = (window as any).L || null;

    if (!L.Draw || !L.Draw.Rectangle) {
      console.error("Leaflet.draw is not loaded or Rectangle is undefined.");
      return;
    }
  
    state.current.mode = "drawRectangle";
  
    state.current.rectangleHandle = new L.Draw.Rectangle(mapRef.current, {
      shapeOptions: { color: glbColors.rectangle },
    });
  
    if (state.current.rectangleHandle) state.current.rectangleHandle.enable();
  
    // Ensure no lingering CREATED event listeners
    mapRef.current.off(L.Draw.Event.CREATED);
  
    const onRectangleCreated = (event: any) => {
      const layer = event.layer;
  
      // Add the rectangle to the map
      layer.addTo(mapRef.current);
  
      // Save the layer reference for resetting
      state.current.rectangle = layer;
  
      // Save the rectangle bounds
      const bounds = layer.getBounds();
      state.current.points = [
        { lat: bounds.getNorthWest().lat, lng: bounds.getNorthWest().lng },
        { lat: bounds.getSouthEast().lat, lng: bounds.getSouthEast().lng },
      ];
  
      if (debug) console.log("Rectangle Data (Bounds):", state.current.points);
  
      // Enable editing mode for the rectangle
      layer.editing.enable();
  
      // Prevent map dragging while dragging the rectangle
      layer.on("dragstart", () => disableDragging());
      layer.on("dragend", () => enableDragging());
  
      // Clean up
      if (state.current.rectangleHandle) state.current.rectangleHandle.disable();
      mapRef.current.off(L.Draw.Event.CREATED); // Explicit cleanup
      enableDragging(); // Re-enable dragging for the map
    };
  
    mapRef.current.on(L.Draw.Event.CREATED, onRectangleCreated);
  };
  
  const handleCircleMode = () => {
    const L = (window as any).L || null;

    if (!L.Draw || !L.Draw.Circle) {
      console.error("Leaflet.draw is not loaded or Circle is undefined.");
      return;
    }
  
    state.current.mode = "drawCircle";
  
    state.current.circleHandle = new L.Draw.Circle(mapRef.current, {
      shapeOptions: { color: glbColors.circle },
    });
  
    if (state.current.circleHandle) state.current.circleHandle.enable();
  
    // Ensure no lingering CREATED event listeners
    mapRef.current.off(L.Draw.Event.CREATED);
  
    const onCircleCreated = (event: any) => {
      const layer = event.layer;
  
      // Add the circle to the map
      layer.addTo(mapRef.current);
  
      // Save the layer reference for resetting
      state.current.circle = layer;
  
      // Save the circle center and radius
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      state.current.points = [{ lat: center.lat, lng: center.lng }, radius];
  
      if (debug) console.log("Circle Data:", state.current.points);
  
      // Enable editing mode for the circle
      layer.editing.enable();
  
      // Prevent map dragging while dragging the circle
      layer.on("dragstart", () => disableDragging());
      layer.on("dragend", () => enableDragging());
  
      // Clean up
      if (state.current.circleHandle) state.current.circleHandle.disable();
      mapRef.current.off(L.Draw.Event.CREATED); // Explicit cleanup
      enableDragging(); // Re-enable dragging for the map
    };
  
    mapRef.current.on(L.Draw.Event.CREATED, onCircleCreated);
  };

  const handleMarkerMode = (latLng: any) => {
    const L = (window as any).L || null;

    state.current.mode = "placeMarker";
  
    // Ensure state.current.marker is an array
    state.current.marker = state.current.marker || []; // Initialize as an array if undefined
  
    // Define a custom icon for the marker
    const customIcon = L.icon({
      iconUrl: glbMarkerIcon.iconUrl,
      iconSize: glbMarkerIcon.iconSize,
      iconAnchor: glbMarkerIcon.iconAnchor,
      popupAnchor: glbMarkerIcon.popupAnchor,
      shadowUrl: glbMarkerIcon.shadowUrl,
      className: glbMarkerIcon.className,
    });
  
    // Create and add a new marker
    const newMarker = L.marker(latLng, {
      icon: customIcon,
      draggable: true,
    }).addTo(mapRef.current);
  
    // Add the new marker to the array
    state.current.marker.push(newMarker);
  
    // Add dragend event
    newMarker.on("dragend", (event: any) => {
      const updatedLatLng = event.target.getLatLng();
      const markerIndex = state.current.marker.indexOf(newMarker);
      if (markerIndex !== -1) {
        state.current.points[markerIndex] = [updatedLatLng.lat, normalizeLongitude(updatedLatLng.lng)];
      }
  
      if (debug) console.log("Marker moved to:", updatedLatLng);
    });
  
    // Update points array
    state.current.points.push([latLng.lat, normalizeLongitude(latLng.lng)]);
  
    if (debug) console.log("Marker added:", { lat: latLng.lat, lng: latLng.lng });
  };

  // Enable/disable dragging dynamically
  const disableDragging = () => {
    if (mapRef?.current) mapRef.current.dragging.disable();
  };
  
  const enableDragging = () => {
    if (mapRef?.current) mapRef.current.dragging.enable();
  };
  
  // Process initial data for drawing shapes
  const processInitialData = (data: any) => {
    const L = (window as any).L || null;

    if (data.mode) {
      const { mode, coordinates, center, radius } = data;

      if (mode === "polygon" && Array.isArray(coordinates)) {
        // Process polygon data
        state.current.points = coordinates;
        state.current.polygon = L.polygon(coordinates, { color: glbColors.polygon }).addTo(mapRef.current);
        if (state.current.polygon) state.current.polygon.editing.enable(); // Enable editing
        mapRef.current.fitBounds(state.current.polygon.getBounds());

        // Update state on edit
        state.current.polygon.on("edit", () => {
          state.current.points = state.current.polygon
            .getLatLngs()[0]
            .map((latLng: any) => [latLng.lat, latLng.lng]);
          if (debug) console.log("Polygon updated points:", state.current.points);
        });

        const selectElement = dialogMapRef.current?.querySelector('select');
        if (selectElement) {
          selectElement.setAttribute('last_mode', 'autoPolygon');
        }
      } else if (mode === "lines" && Array.isArray(coordinates)) {
        // Process line data
        state.current.points = coordinates;
        state.current.polyline = L.polyline(coordinates, { color: glbColors.line }).addTo(mapRef.current);
        if (state.current.polyline) state.current.polyline.editing.enable(); // Enable editing
        mapRef.current.fitBounds(state.current.polyline.getBounds());

        // Update state on edit
        state.current.polyline.on("edit", () => {
          state.current.points = state.current.polyline
            .getLatLngs()
            .map((latLng: any) => [latLng.lat, latLng.lng]);
          if (debug) console.log("Polyline updated points:", state.current.points);
        });
        const selectElement = dialogMapRef.current?.querySelector('select');
        if (selectElement) {
          selectElement.setAttribute('last_mode', 'drawLines');
        }
      } else if (mode === "rectangle" && Array.isArray(coordinates)) {
        // Process rectangle data
        const bounds = L.latLngBounds(
          L.latLng(coordinates[0][0], coordinates[0][1]),
          L.latLng(coordinates[1][0], coordinates[1][1])
        );
        state.current.rectangle = L.rectangle(bounds, { color: glbColors.rectangle }).addTo(mapRef.current);
        if (state.current.rectangle) state.current.rectangle.editing.enable(); // Enable editing
        mapRef.current.fitBounds(bounds);

        // Initialize points
        state.current.points = [
          [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
          [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
        ];

        // Update state on edit
        state.current.rectangle.on("edit", () => {
          const updatedBounds = state.current.rectangle.getBounds();
          state.current.points = [
            [updatedBounds.getNorthWest().lat, updatedBounds.getNorthWest().lng],
            [updatedBounds.getSouthEast().lat, updatedBounds.getSouthEast().lng],
          ];
          if (debug) console.log("Rectangle updated bounds:", state.current.points);
        });
        const selectElement = dialogMapRef.current?.querySelector('select');
        if (selectElement) {
          selectElement.setAttribute('last_mode', 'drawRectangle');
        }
      } else if (mode === "circle" && Array.isArray(center) && typeof radius === "number") {
        // Process circle data
        const circleCenter = L.latLng(center[0], center[1]);
        state.current.circle = L.circle(circleCenter, {
          color: "purple",
          radius: radius,
        }).addTo(mapRef.current);
        if (state.current.circle) state.current.circle.editing.enable(); // Enable editing
        mapRef.current.fitBounds(state.current.circle.getBounds());

        // Initialize points
        state.current.points = [{ lat: center[0], lng: center[1] }, radius];

        // Update state on edit
        state.current.circle.on("edit", () => {
          const updatedCenter = state.current.circle.getLatLng();
          const updatedRadius = state.current.circle.getRadius();
          state.current.points = [{ lat: updatedCenter.lat, lng: updatedCenter.lng }, updatedRadius];
          if (debug) console.log("Circle updated data:", state.current.points);
        });
        const selectElement = dialogMapRef.current?.querySelector('select');
        if (selectElement) {
          selectElement.setAttribute('last_mode', 'drawCircle');
        }
      } else if (mode === "markers" && Array.isArray(coordinates)) {
        // Process marker data
        state.current.points = [];
        state.current.marker = [];
        
        // Create bounds object to fit all markers
        const markerBounds = L.latLngBounds();

        coordinates.forEach(([lat, lng]) => {
          const customIcon = L.icon({
            iconUrl: glbMarkerIcon.iconUrl,
            iconSize: glbMarkerIcon.iconSize,
            iconAnchor: glbMarkerIcon.iconAnchor,
            popupAnchor: glbMarkerIcon.popupAnchor,
            shadowUrl: glbMarkerIcon.shadowUrl,
            className: glbMarkerIcon.className,
          });

          const marker = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(mapRef.current);

          state.current.marker.push(marker);
          state.current.points.push([lat, lng]);

          // Extend the bounds to include this marker
          markerBounds.extend([lat, lng]);

          // Add dragend event to update state
          marker.on("dragend", (event: any) => {
            const updatedLatLng = event.target.getLatLng();
            const markerIndex = state.current.marker.indexOf(marker);
            if (markerIndex !== -1) {
              state.current.points[markerIndex] = [updatedLatLng.lat, normalizeLongitude(updatedLatLng.lng)];
            }
            if (debug) console.log("Marker updated:", state.current.points);
          });
        });

        // Fit map view to marker bounds
        if (markerBounds.isValid()) {
          mapRef.current.fitBounds(markerBounds);
        }

        if (debug) console.log("Markers initialized:", state.current.points);

        const selectElement = dialogMapRef.current?.querySelector('select');
        if (selectElement) {
          selectElement.setAttribute('last_mode', 'placeMarker');
        }
      } else {
        console.warn("Unsupported or invalid mode in initialData:", mode);
      }
    } else {
      console.warn("Invalid initialData format. Expected object with 'mode' and related data.");
    }
  };
 
  const closeMapDialog = () => {
    if (debug) console.log('Unload: ', (`${id}_mapper_container`));
    setIsDialogMapOpen(false);
    dialogMapRef.current?.close();

    document.getElementById(`${id}_mapper_container`)?.remove();

    if (mapRef.current) {
      mapRef.current.off("click");
      mapRef.current.remove();
      mapRef.current = null;
      state.current.mode = "moveMap";
      state.current.polygon = null;
      state.current.polyline = null;
      state.current.rectangle = null;
      state.current.circle = null;
      state.current.points = [];
      state.current.wasPolygonized = false;
      state.current.rectangleHandle = null;
      state.current.circleHandle = null;
      state.current.marker = [];
    }

    // Dynamically append a div to the target container
    const container = document.querySelector(`#${id}_mapper .dts-form__body .mapper-holder`);
    if (container) {
      const mapperContainer = document.createElement("div");
      mapperContainer.id = `${id}_mapper_container`;
      mapperContainer.style.flex = "1";
      mapperContainer.style.width = "100%";
      mapperContainer.style.height = "500px";
      container.appendChild(mapperContainer);
    } else {
      console.error(`Container not found for selector: ${id}_mapper .dts-form__body`);
    }
  }
  const isConnectedToStart = (newPoint: any, startPoint: any) => {
    const distance = mapRef.current.distance(newPoint, startPoint); // Use Leaflet's distance method
    return distance < 10; // Close if within 10 meters
  };
  type Point = [number, number];
  const doLinesIntersect = (p1: Point, p2: Point, p3: Point, p4: Point) => {
    const det = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (det === 0) return false; // Lines are parallel
  
    const lambda =
      ((p4[1] - p3[1]) * (p4[0] - p1[0]) + (p3[0] - p4[0]) * (p4[1] - p1[1])) / det;
    const gamma =
      ((p1[1] - p2[1]) * (p4[0] - p1[0]) + (p2[0] - p1[0]) * (p4[1] - p1[1])) / det;
  
    return 0 < lambda && lambda < 1 && 0 < gamma && gamma < 1;
  };
  const resetDrawing = () => {
    const L = (window as any).L || null;

    if (state.current.polygon) {
      mapRef.current.removeLayer(state.current.polygon);
    }
    if (state.current.polyline) {
      mapRef.current.removeLayer(state.current.polyline);
    }
    if (state.current.rectangle) {
      mapRef.current.removeLayer(state.current.rectangle);
    }
    if (state.current.circle) {
      mapRef.current.removeLayer(state.current.circle);
    }
    // Remove all markers
    if (Array.isArray(state.current.marker)) {
      state.current.marker.forEach((marker) => {
        mapRef.current.removeLayer(marker);
      });
    }
    // Reset marker array
    state.current.marker = [];

    // Remove the starting marker if it exists
    if (state.current.startMarker) {
      mapRef.current.removeLayer(state.current.startMarker);
      state.current.startMarker = null; // Reset the marker reference
    }
  
    // Reset the state
    state.current.polygon = null;
    state.current.polyline = null;
    state.current.circle = null;
    state.current.rectangle = null;
    state.current.points = [];
    state.current.wasPolygonized = false;
    state.current.rectangleHandle = null;
    state.current.circleHandle = null;
  
    // Disable any active drawing tools
    if (state.current.mode === "drawRectangle" && L.Draw.Rectangle) {
      const drawRectangle = new L.Draw.Rectangle(mapRef.current);
      drawRectangle.disable();
    } else if (state.current.mode === "drawCircle" && L.Draw.Circle) {
      const drawCircle = new L.Draw.Circle(mapRef.current);
      drawCircle.disable();
    }
  
    if (debug) console.log("Drawing state reset.");
  };
  const handlePreviewMap = () => {
    const newTab = window.open("", "_blank");
  
    if (!newTab) {
      alert("Popup blocker is preventing the map from opening.");
      return;
    }
  
    newTab.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Map Preview</title>
        <link rel="stylesheet" href="${glbMapperCSS}" />
        <style>
          #map {
            position: relative;
            display: block;
            width: 100%;
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="${glbMapperJS}"></script>
<script>
  const adjustZoomBasedOnDistance = (map, bounds, centers) => {
    console.log(bounds);

    let maxDistance = 0;

    if (centers.length === 1) {
      // Calculate maxDistance for a single shape based on its bounds
      const singleShapeBounds = bounds.isValid() ? bounds : null;

      if (singleShapeBounds) {
        maxDistance = singleShapeBounds.getNorthEast().distanceTo(singleShapeBounds.getSouthWest());
      } else {
        console.warn("No valid bounds available for the single shape.");
        map.setView(centers[0], 14); // Default zoom for a single center if no bounds
        return;
      }
    } else {
      // Calculate the maximum distance between all centers
      for (let i = 0; i < centers.length; i++) {
        for (let j = i + 1; j < centers.length; j++) {
          const distance = centers[i].distanceTo(centers[j]);
          maxDistance = Math.max(maxDistance, distance);
        }
      }
    }

    // Define zoom level thresholds based on distances
    const globalLevelDistance = 10000000; // ~10,000km
    const regionalLevelDistance = 5000000; // ~5,000km
    const countryLevelDistance = 1000000; // ~1,000km
    const cityLevelDistance = 100000; // ~100km
    const townLevelDistance1 = 20000; // ~20km
    const townLevelDistance2 = 15000; // ~15km
    const townLevelDistance3 = 10000; // ~10km
    const townLevelDistance4 = 5000; // ~5km

    let calculatedZoom;

    // Adjust zoom based on maximum distance
    if (maxDistance > globalLevelDistance) {
      calculatedZoom = 2; // Minimum zoom for global scale
    } else if (maxDistance > regionalLevelDistance) {
      calculatedZoom = 4; // Regional scale
    } else if (maxDistance > countryLevelDistance) {
      calculatedZoom = 7; // Country-level zoom
    } else if (maxDistance > cityLevelDistance) {
      calculatedZoom = 10; // City-level zoom
    } else if (maxDistance > townLevelDistance1) {
      calculatedZoom = 11; // Town-level zoom
    } else if (maxDistance > townLevelDistance2) {
      calculatedZoom = 12; // Town-level zoom
    } else if (maxDistance > townLevelDistance3) {
      calculatedZoom = 13; // Town-level zoom
    } else if (maxDistance > townLevelDistance4) {
      calculatedZoom = 14; // Town-level zoom
    } else {
      calculatedZoom = 17; // Local zoom for nearby shapes
    }

    console.log("maxDistance:", maxDistance);
    console.log("calculatedZoom:", calculatedZoom);

    // Fit bounds first with padding
    map.fitBounds(bounds, {
      padding: [50, 50],
    });

    // Set the zoom level dynamically
    map.setZoom(Math.min(map.getZoom(), calculatedZoom));
  };

  window.onload = () => {
    document.getElementById("map").style.height = "${window.outerHeight - 100}px";

    const map = L.map("map").setView([43.833, 87.616], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const items = ${JSON.stringify(Object.values(items))};
    const boundsArray = [];
    const centers = []; // Store the center points of all shapes

    items.forEach((item) => {
      const mapCoords = JSON.parse(item.map_coords);

      switch (mapCoords.mode) {
        case "lines":
          const polyline = L.polyline(mapCoords.coordinates, {
            color: "${glbColors.line}",
          }).addTo(map);
          boundsArray.push(...mapCoords.coordinates);
          centers.push(polyline.getBounds().getCenter());
          break;
        case "polygon":
          const polygon = L.polygon(mapCoords.coordinates, {
            color: "${glbColors.polygon}",
          }).addTo(map);
          boundsArray.push(...mapCoords.coordinates);
          centers.push(polygon.getBounds().getCenter());
          break;
        case "rectangle":
          const rectangle = L.rectangle(mapCoords.coordinates, {
            color: "${glbColors.rectangle}",
          }).addTo(map);
          boundsArray.push(rectangle.getBounds().getSouthWest());
          boundsArray.push(rectangle.getBounds().getNorthEast());
          centers.push(rectangle.getBounds().getCenter());
          break;
        case "circle":
          const circleCenter = L.latLng(mapCoords.center[0], mapCoords.center[1]);
          const circle = L.circle(circleCenter, {
            radius: mapCoords.radius,
            color: "${glbColors.circle}",
          }).addTo(map);
          const circleBounds = circle.getBounds();
          boundsArray.push(circleBounds.getSouthWest());
          boundsArray.push(circleBounds.getNorthEast());
          centers.push(circleCenter);
          break;
        case "markers":
          mapCoords.coordinates.forEach((coord) => {
            const marker = L.marker(coord, {
              icon: L.icon(${JSON.stringify(glbMarkerIcon)}),
            }).addTo(map);
            boundsArray.push(coord);
            centers.push(L.latLng(coord[0], coord[1]));
          });
          break;
        default:
          console.warn("Unsupported mode:", mapCoords.mode);
      }
    });

    if (boundsArray.length > 0) {
      const bounds = L.latLngBounds(boundsArray);
      adjustZoomBasedOnDistance(map, bounds, centers);
    } else {
      console.warn("No valid bounds available for fitting the map.");
    }
  };
</script>

      </body>
      </html>
    `);
  
    newTab.document.close();
  };
  
  const handleSave = () => {
    // Find missing required fields
    const missingFields = dialog_fields
      .filter((field) => field.required) // Only check fields marked as required
      .filter((field) => {
        const fieldValue = formData[field.id]; // Get value from formData by id
        return !fieldValue || !fieldValue.trim(); // Check if the value is empty or only whitespace
      });

    // Access the error message container
    const errorDiv = dialogRef.current?.querySelector(".dts-alert.dts-alert--error") as HTMLElement;

    if (missingFields.length > 0) {
      // Construct the error message
      const errorMessage = `Please fill out the following required fields: ${missingFields
        .map((field) => field.caption)
        .join(", ")}`;

      // Display the error message in the error div
      if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = "block";
      }
      return; // Stop saving if validation fails
    }

    if (editingItem) {
      setItems((prevItems: Record<string, any>) => ({
        ...prevItems,
        [editingItem.id]: { ...prevItems[editingItem.id], ...formData },
      }));
    } else {
      const newId = Date.now().toString();
      setItems((prevItems: Record<string, any>) => ({
        ...prevItems,
        [newId]: { id: newId, ...formData },
      }));
    }

    onChange(Object.values(items));
    closeDialog();
  };

  const handleFileUpload = async (file: File, previousHref: string | null): Promise<{ name: string; content_type: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("save_path_temp", `${save_path_temp}`);
    formData.append("temp_filename", `${Date.now()}_${file.name}`);
    formData.append("filename", `${file.name}`);
    formData.append("file_viewer_temp_url", `${file_viewer_temp_url}`);
    formData.append("file_viewer_url", `${file_viewer_url}`);
  
    if (previousHref) {
      formData.append("temp_filename_prev", previousHref);
    }
  
    const response = await fetch(`${base_path}${api_upload_url}`, {
      method: "POST",
      body: formData,
    });
  
    if (!response.ok) {
      const errorResponse = await response.json();
      const errorMessage = errorResponse.error || "File upload failed due to an unknown error.";
      throw new Error(errorMessage);
    }
  
    return await response.json();
  };  

  const handleDelete = (itemId: string) => {
    setItems((prevItems: Record<string, any>) => {
      const updatedItems = { ...prevItems };
      delete updatedItems[itemId];
      return updatedItems;
    });
    onChange(Object.values(items));
  };

  const handleFieldChange = (field: DialogField, value: any) => {
    if (debug) console.log(`handleFieldChange triggered!`, field);
    setFormData((prev: Record<string, any>) => ({ ...prev, [field.id]: value }));
    if (field.onChange) {
      field.onChange(
        { target: { value } },
        formData,
        setFormData,
        currentDialogFields,
        setDialogFields
      );
    }
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    const draggedIndex = dragIndex.current;
    if (draggedIndex === null || draggedIndex === index) return;

    const itemsArray = Object.values(items);
    const [movedItem] = itemsArray.splice(draggedIndex, 1);
    itemsArray.splice(index, 0, movedItem);

    const reorderedItems: Record<string, any> = {};
    itemsArray.forEach((item) => {
      reorderedItems[item.id] = item;
    });

    setItems(reorderedItems);
    onChange(itemsArray);
    dragIndex.current = null;
  };

  return (
    <div id={id} className="content-repeater">
      <table className="dts-table" style={{ background: "#ffffff" }}>
        <thead>
          <tr>
            {table_columns.map((column, index) => {
              if (column.type === "action") {
                return <th key={index} style={{textAlign: "right", width: (column.width) ? column.width : 'auto'}}>{column.caption}</th>
              } else {
                return <th key={index} style={{width: (column.width) ? column.width : 'auto'}}>{column.caption}</th>
              }
            })}
          </tr>
        </thead>
        <tbody>
          {Object.values(items).map((item, index) => (
            <tr
              key={item.id}
              draggable={dnd_order}
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
            >
            {table_columns.map((column, colIndex) => {
              if (column.type === "dialog_field" && column.dialog_field_id) {
                // Safely access the value or provide a fallback
                const value = item[column.dialog_field_id] ?? "N/A"; // Default to "N/A" if undefined
                return <td key={colIndex} style={{width: (column.width) ? column.width : 'auto'}}>{typeof value === "object" ? value?.name : value}</td>;
              } else if (column.type === "custom" && typeof column.render === "function") {
                // Call the render function for custom column type
                return <td key={colIndex}>{column.render(item)}</td>;
              } else if (column.type === "action") {
                // Render action buttons
                return (
                  <td key={colIndex} style={{textAlign: "right", width: (column.width) ? column.width : 'auto'}}>
                    <a
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(item.id);
                      }}
                    >
                      Delete
                    </a>{" "}
                    |{" "}
                    <a
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openDialog(item, dialogRef);
                      }}
                    >
                      Edit
                    </a>
                  </td>
                );
              }
              return null; // Fallback for unhandled column types
            })}
            </tr>
          ))}
        </tbody>
      </table>

      <textarea
        id={id}
        name={id}
        className="dts-hidden-textarea"
        style={{ display: "none" }}
        value={JSON.stringify(Object.values(items))}
        readOnly
      ></textarea>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: "1rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1.6rem",
          background: "#F2F2F2",
        }}
      >
        <li>
          <a
            type="button"
            className="mg-button mg-button-system"
            style={{ width: "fit-content" }}
            onClick={(e) => {
              e.preventDefault();
              openDialog(null, dialogRef);
            }}
          >
            Add
          </a>
        </li>

        {mapper_preview && (
          <li>
            <a
              type="button"
              className="mg-button mg-button-system"
              style={{ width: "fit-content" }}
              onClick={(e) => {
                e.preventDefault();
                handlePreviewMap();
                //console.log("JSON Data:", Object.values(items));
                //console.log(JSON.stringify(Object.values(items)));
              }}
            >
              Preview Map
            </a>
          </li>
        )}

        {debug && (
          <li>
            <a
              type="button"
              className="mg-button mg-button-system"
              style={{ width: "fit-content" }}
              onClick={(e) => {
                e.preventDefault();
                if (debug) console.log("JSON Data:", Object.values(items));
              }}
            >
              Console Log Data
            </a>
          </li>
        )}
      </ul>

      {
          renderMapperDialog(
            id,
            dialogMapRef,
            mapRef,
            base_path,
            closeMapDialog,
            state,
            resetDrawing,
            enableDragging,
            disableDragging,
            handleRectangleMode,
            handleCircleMode,
            handleFieldChange,
            debug
          )
      }

      <dialog ref={dialogRef} className="dts-dialog" {...(isDialogOpen ? { open: true } : {})}>
        <div className="dts-dialog__content">
          <div className="dts-dialog__header">
            <a type="button" aria-label="Close dialog" onClick={closeDialog} style={{ color: "#000" }}>
              <svg aria-hidden="true" focusable="false" role="img">
                <use href={`${base_path}/assets/icons/close.svg#close`}></use>
              </svg>
            </a>
          </div>
          <div>
            <div className="dts-form__intro">
              <h2 className="dts-heading-2">{editingItem ? "Edit Item" : "Add New Item"}</h2>
            </div>
            <div className="dts-form__body">
              <div className="dts-alert dts-alert--error" style={{display: "none"}}></div>
              {currentDialogFields.map((field, index) => {
                const fieldId = `${id}_${field.id}`;
                const value = formData[field.id] || "";

                return (
                  <div
                    className="dts-form-component"
                    key={index}
                    style={{ display: field.show === false ? "none" : "block" }}
                  >
                    <label {...(field.type !== "option" ? { htmlFor: fieldId } : {})}>
                      <div className="dts-form-component__label">
                        <span>{field.caption}</span>
                      </div>
                      {
                        field.type == "tokenfield" && (
                          renderTokenField(field, fieldId, value, tokenfieldRefs, handleFieldChange)
                        )
                      }
                      {field.type === "input" && (
                        <>
                        <input
                          id={fieldId}
                          type="text"
                          placeholder={field.placeholder || ""}
                          value={value}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                        />
                        {field.note && (
                          <div style={{fontSize: "0.8em", marginTop: "0.1rem", color: "#777"}}>{field.note}</div>
                        )}
                        </>
                      )}
                      {field.type === "textarea" && (
                        <>
                        <textarea
                          id={fieldId}
                          placeholder={field.placeholder || ""}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          style={{ marginBottom: "2rem" }}
                          value={value}
                        ></textarea>
                        {field.note && (
                          <div style={{fontSize: "0.8em", marginTop: "0.1rem", color: "#777"}}>{field.note}</div>
                        )}
                        </>
                      )}
                      {field.type === "mapper" && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1%' }}>
                            <div
                              id={`${id}_${fieldId}`}
                              style={{
                                position: "relative",
                                width: "100%",
                                padding: '0.4rem 0.8rem',
                                backgroundColor: 'white',
                                border: '1px solid #cccccc',
                                borderRadius: '6px',
                                color: '#999',
                                minHeight: '3.5rem',
                                overflow: 'hidden',
                                cursor: "pointer",
                              }}
                            >  
                              <a 
                                style={{
                                  width: "auto",
                                  zIndex: "1000",
                                  textAlign: "center",
                                  padding: "0.7rem 0.8rem",
                                  color: "#000",
                                  textDecoration: "none",
                                  borderRadius: "4px",
                                  display: "inline-flex", // Use inline-flex for centering inline content
                                  alignItems: "center",   // Vertically center items
                                  justifyContent: "center", // Optional: Center items horizontally
                                  backgroundColor: "#cccccc",
                                  position: "absolute", top: "-2px", right: "-2px"
                                }}
                                onClick={() => {
                                  setIsDialogMapOpen(true);
                                  if (dialogMapRef.current) {
                                    const dialogElement = dialogMapRef.current as HTMLDialogElement & { mapperField?: any };
                                    dialogElement.showModal();
                                    dialogElement.mapperField = field;
                                  }
                                  initializeMap(value ? JSON.parse(value) : null);
                                }}
                              >
                                <img 
                                  src={`${base_path}/assets/icons/globe.svg`}
                                  alt="Globe SVG File" 
                                  title="Globe SVG File" 
                                  style={{ width: "20px", height: "20px", marginRight: "0.5rem" }} // Adjust size and spacing
                                /> 
                                Open Map
                              </a>                    
                              {value &&
                              (() => {
                                try {
                                  const parsedValue = JSON.parse(value); // Parse JSON object
                                  if (parsedValue && parsedValue.mode) {
                                    const { mode, coordinates, center, radius } = parsedValue;

                                    const title = `Shape: ${mode.toUpperCase()}`;

                                    if (mode === "circle" && center && radius) {
                                      // Handle circle mode
                                      return (
                                        <div
                                          style={{
                                            fontSize: "1rem",
                                            margin: "0.5rem",
                                            padding: "1rem",
                                            position: "relative",
                                            border: "1px solid #ddd",
                                            borderRadius: "5px",
                                          }}
                                          title={title}
                                          onClick={() => {
                                            const newWindow = window.open();
                                            if (newWindow) {
                                              newWindow.document.write(
                                                `<pre>${JSON.stringify(parsedValue, null, 2)}</pre>`
                                              );
                                              newWindow.document.close();
                                            }
                                          }}
                                        >
                                          <h4>{title}</h4>
                                          <ul>
                                            <li>
                                              Center: Lat {center[0]}, Lng {center[1]}
                                            </li>
                                            <li>Radius: {radius.toFixed(2)} meters</li>
                                          </ul>
                                        </div>
                                      );
                                    } else if (Array.isArray(coordinates)) {
                                      // Handle polygons, rectangles, or lines
                                      return (
                                        <div
                                          style={{
                                            fontSize: "1rem",
                                            margin: "0.5rem",
                                            padding: "1rem",
                                            position: "relative",
                                            border: "1px solid #ddd",
                                            borderRadius: "5px",
                                          }}
                                          title={title}
                                          onClick={() => {
                                            const newWindow = window.open();
                                            if (newWindow) {
                                              newWindow.document.write(
                                                `<pre>${JSON.stringify(parsedValue, null, 2)}</pre>`
                                              );
                                              newWindow.document.close();
                                            }
                                          }}
                                        >
                                          <h4>{title}</h4>
                                          <ul>
                                            {coordinates.map((coordinate, index) => (
                                              <li key={index}>
                                                Lat: {coordinate[0]}, Lng: {coordinate[1]}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      );
                                    }
                                  }

                                  return <pre>{value}</pre>; // Fallback for invalid structures
                                } catch (err) {
                                  console.error("Failed to parse value:", err);
                                  return <pre>Invalid data</pre>;
                                }
                              })()}
                            </div>
                            {field.note && (
                              <div style={{fontSize: "0.8em", marginTop: "0.1rem", color: "#777"}}>{field.note}</div>
                            )}
                            <textarea
                              id={fieldId}
                              name={fieldId}
                              className="dts-hidden-textarea"
                              style={{ display: "none" }}
                              value={value}
                              onChange={(e) => handleFieldChange(field, e.target.value)}
                            ></textarea>
                          </div>
                        </div>
                      )}
                      {field.type === "select" && (
                        <>
                        <select
                          id={fieldId}
                          value={value}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                        >
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {field.note && (
                          <div style={{fontSize: "0.8em", marginTop: "0.1rem", color: "#777"}}>{field.note}</div>
                        )}
                        </>
                      )}
                      {field.type === "option" && (
                        <div>
                          <div id={fieldId} className="mg-grid mg-grid__col-auto">
                            {field.options?.map((option, i) => (
                              <label htmlFor={`${fieldId}_${i}`} key={i} style={{ display: "block", marginBottom: "0.5rem" }}>
                                <div className="dts-form-component__field--horizontal">
                                  <input
                                    type="radio"
                                    id={`${fieldId}_${i}`}
                                    name={fieldId}
                                    value={option}
                                    checked={value === option}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                  />
                                  <span>{option}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                          {field.note && (
                            <div style={{fontSize: "0.8em", marginTop: "0.1rem", color: "#777"}}>{field.note}</div>
                          )}
                        </div>
                      )}
                      {field.type === "file" && (
                        <div>
                          <div 
                            id={`file-link-loading-${field.id}`}
                            style={{
                              display: 'none',
                              width: '100%',
                              padding: '0.4rem 0.8rem',
                              backgroundColor: 'white',
                              border: '1px solid #cccccc',
                              borderRadius: '6px',
                              marginBottom: '1rem',
                              color: '#999'
                            }}   
                          >Uploading, please wait...</div>
                          {formData[field.id]?.name && (
                            <a
                              id={`file-link-${field.id}`}
                              href={`${base_path}${(formData[field.id]?.view) ? formData[field.id]?.view : ((file_viewer_url) ? `${file_viewer_url}/?name=${formData[field.id]?.name.split("/").slice(-2).join("/")}${(field.download) ? '&download=true' : ''}` : formData[field.id]?.name)}`}
                              target={!field.download ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-block",
                                width: "100%",
                                padding: "0.4rem 0.8rem",
                                backgroundColor: "white",
                                border: "1px solid #cccccc",
                                borderRadius: "6px",
                                marginBottom: "1rem",
                              }}
                            >
                              {formData[field.id]?.name.split("/").pop()}
                            </a>
                          )}
                          <input
                            id={fieldId}
                            type="file"
                            ref={fileInputRefs.current[field.id]} // Attach the correct ref
                            accept={field.accept ? field.accept.split("|").map((ext) => `.${ext}`).join(",") : undefined}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const extension = file.name.split(".").pop()?.toLowerCase();
                                const allowedExtensions = field.accept?.split("|");
                                
                                // Client-side validation for file types
                                if (allowedExtensions && !allowedExtensions.includes(extension || "")) {
                                  //alert(`Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`);
                                  const errorDiv = dialogRef.current?.querySelector(".dts-alert.dts-alert--error") as HTMLElement;
                                  if (errorDiv) {
                                    errorDiv.style.display = "block";
                                    errorDiv.textContent = `Invalid file type`;
                                  }
                                  return;
                                }

                                try {
                                  const fileLinkLoading = document.getElementById(`file-link-loading-${field.id}`);
                                  if (fileLinkLoading) fileLinkLoading.style.display = 'block';

                                  const fileLinkElement = document.getElementById(`file-link-${field.id}`) as HTMLElement;
                                  if (fileLinkElement) fileLinkElement.style.display = 'none';

                                  const previousHrefElement = document.getElementById(`file-link-${field.id}`);
                                  const previousHref = previousHrefElement?.getAttribute("href") || null;

                                  const fileData = await handleFileUpload(file, previousHref);
                                  handleFieldChange(field, fileData);

                                  // Reset the file input after upload
                                  if (fileInputRefs.current[field.id]?.current) {
                                    fileInputRefs.current[field.id].current!.value = "";
                                    const element = document.getElementById(`file-link-loading-${field.id}`);
                                    if (element) {
                                      element.style.display = 'none';
                                    }
                                    const fileLinkElement = document.getElementById(`file-link-${field.id}`) as HTMLElement;
                                    if (fileLinkElement) fileLinkElement.style.display = 'block';
                                  }
                                } catch (error) {
                                  // Enhanced error handling and user notification
                                  console.error("File upload failed:", error);

                                  // Display an error message to the user
                                  const errorMessage =
                                    error instanceof Error ? error.message : "An unknown error occurred during the file upload.";
                                  //alert(`Error: ${errorMessage}`);

                                  const errorDiv = dialogRef.current?.querySelector(".dts-alert.dts-alert--error") as HTMLElement;
                                  if (errorDiv) {
                                    const errorDivStyle = errorDiv.style;
                                    if (errorDivStyle) errorDiv.style.display = "block";
                                    errorDiv.textContent = `${errorMessage}`;
                                  }

                                  const dtsAlert = document.querySelector('.dts-alert.dts-alert--error') as HTMLElement;
                                  if (dtsAlert) dtsAlert.style.display = 'block';

                                  // Optionally toggle UI elements back
                                  document.getElementById(`file-link-loading-${field.id}`)!.style.display = "none";
                                  const fileLinkElement = document.getElementById(`file-link-${field.id}`);
                                  if (fileLinkElement) fileLinkElement.style.display = "block";

                                  const fileInput = document.getElementById(`${id}_file`) as HTMLInputElement;
                                  if (fileInput) {
                                    fileInput.value = '';
                                  }
                                }
                              }
                            }}
                          />
                          {field.note && (
                            <div style={{fontSize: "0.8em", marginTop: "1rem", color: "#777"}}>{field.note}</div>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="dts-form__actions">
              <a type="submit" className="mg-button mg-button-primary" onClick={handleSave}>
                Apply
              </a>
              <a type="button" className="mg-button mg-button-outline" onClick={closeDialog}>
                Cancel
              </a>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
};
