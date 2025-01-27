export const renderMapperDialog = (
    id: string,
    dialogMapRef: any,
    mapRef: any,
    base_path: string,
    closeMapDialog: any,
    state: any,
    resetDrawing: any,
    enableDragging: any,
    disableDragging: any,
    handleRectangleMode: any,
    handleCircleMode: any,
    handleFieldChange: any,
    debug: boolean
) => {
    return (
        <dialog
        id={`${id}_mapper`}
        ref={dialogMapRef}
        className="dts-dialog content-repeater-mapper"
      >
        <div className="dts-dialog__content" style={{overflowY: "hidden"}}>
          <div className="dts-dialog__header" style={{justifyContent: "space-between"}}>
            <h2 className="dts-heading-2" style={{marginBottom: "0px"}}>Mapper</h2>
            <a type="button" aria-label="Close dialog" onClick={closeMapDialog} style={{ color: "#000" }}>
              <svg aria-hidden="true" focusable="false" role="img">
                <use href={`${base_path}/assets/icons/close.svg#close`}></use>
              </svg>
            </a>
          </div>
          <div>
            <div className="dts-form__body">
              <div className="mapper-menu" style={{display: "flex", justifyContent: "space-between", padding: "10px", background: "#777"}}>
                <input type="text" id={`${id}_mapper_search`} style={{flex: 1, marginRight: "10px"}} 
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const query = document.getElementById(`${id}_mapper_search`).value;
                    if (!query) {
                        alert("Please enter a location to search.");
                        return;
                    }

                    fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json`)
                    .then(response => response.json())
                    .then(data => {
                      if (data.length > 0) {
                        const { lat, lon, boundingbox } = data[0];
                  
                        if (boundingbox) {
                          // Use the bounding box to fit the map to the area
                          const [latMin, latMax, lonMin, lonMax] = boundingbox.map(Number);
                          const bounds = [
                            [latMin, lonMin], // Southwest corner
                            [latMax, lonMax], // Northeast corner
                          ];
                  
                          mapRef.current.fitBounds(bounds, { padding: [50, 50] }); // Adjust padding as needed
                          if (debug) console.log(`Moved to bounds: ${JSON.stringify(bounds)}`);
                        } else {
                          // If no bounding box, fall back to a default zoom level and center on the lat/lon
                          mapRef.current.setView([lat, lon], 14);
                          if (debug) console.log(`Moved to location: ${query} (${lat}, ${lon})`);
                        }
                      } else {
                        alert("Location not found. Try a different query.");
                      }
                    })
                    .catch(err => {
                      console.error("Error fetching location:", err);
                      alert("An error occurred while searching. Please try again.");
                    });                  

                    if (debug) console.log(dialogMapRef.current.querySelector(`#${id}_mapper_container`));
                  }
                }}
                placeholder="Type location and enter" />
                <select
                  id={`${id}_mapper_modeSelect`}
                  style={{ width: "20%", marginRight: "10px" }}
                  onChange={(e) => {
                    const newMode = e.target.value;
                    const newModeText = e.target.options[e.target.selectedIndex].text; // Get the text of the selected option
                    const lastMode = e.target.getAttribute("last_mode") || "moveMap"; // Default last_mode to "moveMap" initially
                    const lastModeText = [...e.target.options].find(
                      (option) => option.value === lastMode
                    )?.text || lastMode; // Get the text of the last_mode option
                  
                    // Check if there are points in the drawing
                    const hasDrawing = state.current.points.length > 0;
                  
                    // Ensure confirmation is prompted only for valid transitions
                    if (hasDrawing && newMode !== "moveMap" && lastMode !== "moveMap" && lastMode !== newMode) {
                      const confirmMessage = `Switching from "${lastModeText}" to "${newModeText}" will clear the current drawing. Do you want to proceed?`;
                      if (!window.confirm(confirmMessage)) {
                        e.target.value = lastMode; // Revert to the previous mode
                        return;
                      }
                  
                      resetDrawing(); // Reset the map only if confirmed
                    }
                  
                    // Ensure no lingering CREATED event listeners
                    if (mapRef?.current) {
                      mapRef.current.off(L.Draw.Event.CREATED);
                    }
                  
                    // Disable and cleanup any active drawing tools
                    if (state.current.rectangleHandle) {
                      state.current.rectangleHandle.disable();
                      state.current.rectangleHandle = null;
                    }
                    if (state.current.circleHandle) {
                      state.current.circleHandle.disable();
                      state.current.circleHandle = null;
                    }
                  
                    // Clear lingering drawing interactions
                    if (mapRef?.current?.dragging) {
                      mapRef.current.dragging.enable(); // Re-enable dragging to ensure no leftover drag states
                    }
                  
                    // Update the last_mode attribute only if newMode is not "moveMap"
                    if (newMode !== "moveMap") {
                      e.target.setAttribute("last_mode", newMode);
                    }
                  
                    // Update the state with the new mode
                    state.current.mode = newMode;
                  
                    // Update map interaction behavior and cursor style dynamically
                    if (mapRef?.current) {
                      const container = mapRef.current.getContainer();
                  
                      // Handle behavior for different modes
                      if (newMode === "moveMap") {
                        enableDragging(); // Enable dragging when in "moveMap" mode
                        container.style.cursor = ""; // Reset to default cursor (grab hand for Leaflet)
                      } else if (newMode === "drawRectangle") {
                        disableDragging();
                        handleRectangleMode(); // Initialize Rectangle drawing mode
                        container.style.cursor = "crosshair"; // Set crosshair cursor for drawing mode
                      } else if (newMode === "drawCircle") {
                        disableDragging();
                        handleCircleMode(); // Initialize Circle drawing mode
                        container.style.cursor = "crosshair"; // Set crosshair cursor for drawing mode
                      } else {
                        enableDragging(); // Allow dragging for "autoPolygon" and "drawLines"
                        container.style.cursor = "crosshair"; // Default crosshair cursor for drawing
                      }
                    }
                  
                    if (debug) console.log("Mode changed to:", state.current.mode);
                  }}
                                    
                >
                  <option value="moveMap">Move Map</option>
                  <option value="autoPolygon">Polygon</option>
                  <option value="drawLines">Line(s)</option>
                  <option value="drawRectangle">Rectangle</option>
                  <option value="drawCircle">Circle</option>
                  <option value="placeMarker">Marker(s)</option>
                </select>
              <div id={`${id}_mapper_buttons`} style={{display: "flex", gap: "10px"}}>
                  <button type="button" id={`${id}_mapper_clearCoords`} 
                  className="mg-button mg-button--small mg-button-system" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    resetDrawing();
                  
                    // Reinitialize the drawing mode if rectangle or circle is active
                    if (state.current.mode === "drawRectangle") {
                      handleRectangleMode();
                    } else if (state.current.mode === "drawCircle") {
                      handleCircleMode();
                    }
                  }}
                  >Clear</button>
                  <button type="button" id={`${id}_mapper_undoAction`} 
                  className="mg-button mg-button--small mg-button-system" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    const mapperModeSelect = document.getElementById(`${id}_mapper_modeSelect`);
                    const currentMode = mapperModeSelect.getAttribute('last_mode') || "moveMap"; // Fallback to "moveMap" if undefined
                  
                    if (state.current.points.length > 0 || state.current.rectangle || state.current.circle) {
                      if (currentMode === "autoPolygon") {
                        if (state.current.polygon) mapRef.current.removeLayer(state.current.polygon);
                        if (state.current.points.length > 0) {
                          state.current.points.pop();
                          if (state.current.points.length > 0) {
                            state.current.polygon = L.polygon(state.current.points, { color: 'red' }).addTo(mapRef.current);
                          }
                        }
                      } else if (currentMode === "drawLines") {
                        if (state.current.polyline) mapRef.current.removeLayer(state.current.polyline);
                        if (state.current.points.length > 0) {
                          state.current.points.pop();
                          if (state.current.points.length > 0) {
                            state.current.polyline = L.polyline(state.current.points, { color: 'blue' }).addTo(mapRef.current);
                          }
                        }
                      } else if (currentMode === "drawRectangle") {
                        if (state.current.rectangle) {
                          mapRef.current.removeLayer(state.current.rectangle);
                          state.current.rectangle = null;
                          state.current.points = []; // Reset points

                          disableDragging();
                          handleRectangleMode();

                          if (debug) console.log("Rectangle undone!");
                        }
                      } else if (currentMode === "drawCircle") {
                        if (state.current.circle) {
                          mapRef.current.removeLayer(state.current.circle);
                          state.current.circle = null;
                          state.current.points = []; // Reset points

                          disableDragging();
                          handleCircleMode();

                          if (debug) console.log("Circle undone!");
                        }
                      } else if (currentMode === "placeMarker") {
                        if (state.current.points.length > 0) {
                          // Remove the last marker from the map
                          const lastMarker = state.current.marker.pop(); // Remove the last marker
                          if (lastMarker) {
                            mapRef.current.removeLayer(lastMarker); // Remove the marker from the map
                          }
                      
                          // Remove the corresponding coordinates from points
                          state.current.points.pop();
                      
                          if (debug) console.log("Marker undone, remaining points:", state.current.points);
                        } else {
                          if (debug) console.log("No markers to undo!");
                        }
                      }
                    } else {
                      if (debug) console.log("No actions to undo!");
                    }
                  }}                  
                  >Undo</button>
                  <button type="button" id={`${id}_mapper_getCoords`} 
                  className="mg-button mg-button--small mg-button-primary" style={{fontSize: "1.2rem", padding: "0.4rem 1.1rem"}}
                  onClick={(e) => {
                    const field = dialogMapRef.current?.mapperField;
                  
                    if (!field) {
                      console.error("Field is not set on dialogMapRef.");
                      return;
                    }
                  
                    if (debug) console.log("Field passed to dialog:", field);
                  
                    const targetElement = field.domElement;
                  
                    let updatedValue = "";
                  
                    const normalizeLongitude = (lng) =>
                      ((lng + 180) % 360 + 360) % 360 - 180; // Normalize to [-180, 180]
                  
                    if (state.current.polygon) {
                      // Convert polygon LatLng objects to plain arrays and normalize
                      const polygonCoordinates = state.current.polygon
                        .getLatLngs()[0] // Leaflet polygons are arrays of arrays
                        .map((latLng) => [latLng.lat, normalizeLongitude(latLng.lng)]);
                  
                      if (debug)
                        console.log(
                          "Polygon Coordinates (Normalized):",
                          JSON.stringify(polygonCoordinates)
                        );
                  
                      updatedValue = JSON.stringify({
                        mode: "polygon",
                        coordinates: polygonCoordinates,
                      }); // Save as JSON object
                    } else if (state.current.polyline) {
                      // Convert polyline LatLng objects to plain arrays and normalize
                      const lineCoordinates = state.current.polyline
                        .getLatLngs()
                        .map((latLng) => [latLng.lat, normalizeLongitude(latLng.lng)]);
                  
                      if (debug)
                        console.log(
                          "Line Coordinates (Normalized):",
                          JSON.stringify(lineCoordinates)
                        );
                  
                      updatedValue = JSON.stringify({
                        mode: "lines",
                        coordinates: lineCoordinates,
                      }); // Save as JSON object
                    } else if (state.current.circle) {
                      // Get circle data
                      const center = state.current.circle.getLatLng();
                      const radius = state.current.circle.getRadius();
                  
                      const circleData = {
                        mode: "circle",
                        center: [center.lat, normalizeLongitude(center.lng)],
                        radius: radius,
                      };
                  
                      if (debug) console.log("Circle Data:", JSON.stringify(circleData));
                  
                      updatedValue = JSON.stringify(circleData); // Save as JSON object
                    } else if (state.current.rectangle) {
                      // Get rectangle data
                      const bounds = state.current.rectangle.getBounds();
                  
                      const rectangleData = {
                        mode: "rectangle",
                        coordinates: [
                          [ bounds.getNorthWest().lat, normalizeLongitude(bounds.getNorthWest().lng) ],
                          [ bounds.getSouthEast().lat, normalizeLongitude(bounds.getSouthEast().lng) ],
                        ],
                      };
                  
                      if (debug) console.log("Rectangle Data:", JSON.stringify(rectangleData));
                  
                      updatedValue = JSON.stringify(rectangleData); // Save as JSON object
                    } else if (state.current.marker && Array.isArray(state.current.marker)) {
                      // Get marker data as an array of coordinates
                      const markerCoordinates = state.current.marker.map((marker) => [
                        marker.getLatLng().lat,
                        normalizeLongitude(marker.getLatLng().lng),
                      ]);
                  
                      const markerData = {
                        mode: "markers",
                        coordinates: markerCoordinates,
                      };
                  
                      if (debug)
                        console.log("Marker Data:", JSON.stringify(markerData));
                  
                      updatedValue = JSON.stringify(markerData); // Save as JSON object
                    } else {
                      if (debug) console.log("No shape created yet.");
                    }
                  
                    // Update the textarea value
                    targetElement.value = updatedValue;
                  
                    // Trigger the field's onChange handler
                    handleFieldChange(field, updatedValue);
                  
                    closeMapDialog();
                  }}                       
                  >Save Coordinates</button>
              </div>
              </div>
              <div className="mapper-holder">
                <div id={`${id}_mapper_container`} 
                style={{ flex: 1, width: "100%", height: "500px" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    )
}

export const renderMapper = (
  id: string,
  fieldId: string,
  field: any,
  value: string
) => {
  return (
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
              dialogMapRef.current?.showModal();
              dialogMapRef.current.mapperField = field;
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
      </div>  
    </div>
  )
}