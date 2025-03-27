import { useRef, useEffect } from "react";
import { ContentRepeater } from "~/components/ContentRepeater";
import { previewGeoJSON } from "~/components/ContentRepeater/controls/mapper";
import { TreeView } from "~/components/TreeView";
import { rewindGeoJSON } from "~/utils/spatialUtils";

export function SpatialFootprintFormView({
  divisions,
  ctryIso3,
  treeData,
  initialData,
  onChange
}: {
  divisions: any;
  ctryIso3: string;
  treeData: any[];
  initialData: any;
  onChange?: (items: any) => void;
}) {
  const dialogTreeViewRef = useRef<any>(null);
  const treeViewRef = useRef<any>(null);
  const contentRepeaterRef = useRef<any>(null);

  const treeViewDiscard = (e?: any) => {
    if (e) e.preventDefault();
    dialogTreeViewRef.current?.close();
    treeViewRef.current?.treeViewClear();
  };

  const treeViewOpen = (e: any) => {
    e.preventDefault();
    dialogTreeViewRef.current?.showModal();

    const contHeight = [
      dialogTreeViewRef.current?.querySelector(".dts-dialog__content")?.offsetHeight || 0,
      dialogTreeViewRef.current?.querySelector(".dts-dialog__header")?.offsetHeight || 0,
      dialogTreeViewRef.current?.querySelector(".tree-filters")?.offsetHeight || 0,
      dialogTreeViewRef.current?.querySelector(".tree-footer")?.offsetHeight || 0,
    ];
    const getHeight = contHeight[0] - contHeight[1] - contHeight[2] - 100;
    const dtsFormBody = dialogTreeViewRef.current?.querySelector(".dts-form__body");

    if (dtsFormBody) {
      dtsFormBody.style.height = `${getHeight - (window.innerHeight - getHeight)}px`;
    }
  };

  const parsedData = (() => {
    try {
      if (Array.isArray(initialData)) return initialData;
      if (typeof initialData === "string") return JSON.parse(initialData) || [];
      return [];
    } catch {
      return [];
    }
  })();

  return (
    <>
        <ContentRepeater
            divisions={divisions}
            ctryIso3={ctryIso3}
            caption="Spatial Footprint"
            ref={contentRepeaterRef}
            id="spatialFootprint"
            mapper_preview={true}
            table_columns={[
                {type: "dialog_field", dialog_field_id: "title", caption: "Title", width: "40%"},
                {
                    type: "custom",
                    caption: "Option",
                    render: (item) => {
                        if (item.map_option === "Map Coordinates") {
                            return (
                                <>
                                    <span>Map Coordinates</span>
                                </>
                            );
                        } else if (item.map_option === "Geographic Level") {
                            return (
                                <>
                                    <span>Geographic Level</span>
                                </>
                            );
                        }
                    },
                    width: "40%",
                },
                {type: "action", caption: "Action", width: "20%"},
            ]}
            dialog_fields={[
                {id: "title", caption: "Title", type: "input", required: true},
                {
                    id: "map_option",
                    caption: "Option",
                    type: "option",
                    options: ["Map Coordinates", "Geographic Level"],
                    onChange: (e: any) => {
                        const value = e.target.value;

                        const mapsCoordsField = document.getElementById("spatialFootprint_map_coords") as HTMLInputElement;
                        const geoLevelField = document.getElementById("spatialFootprint_geographic_level") as HTMLInputElement;
                        const mapsCoordsFieldComponent = mapsCoordsField.closest(".dts-form-component") as HTMLElement;
                        const geoLevelFieldComponent = geoLevelField.closest(".dts-form-component") as HTMLElement;
                        if (value === "Map Coordinates") {
                            mapsCoordsFieldComponent.style.setProperty("display", "block");
                            geoLevelFieldComponent.style.setProperty("display", "none");
                        } else if (value === "Geographic Level") {
                            mapsCoordsFieldComponent.style.setProperty("display", "none");
                            geoLevelFieldComponent.style.setProperty("display", "block");
                        }
                    },
                    show: true
                },
                {id: "map_coords", caption: "Map Coordinates", type: "mapper", placeholder: "", mapperGeoJSONField: "geojson"},
                {
                    id: "geographic_level", caption: "Geographic Level", type: "custom",
                    render: (data: any, _handleFieldChange: any, formData: any) => {
                        return (
                            <>
                                <div className="input-group">
                                    <div id="spatialFootprint_geographic_level_container" className="wrapper">
                                        <span onClick={() => {previewGeoJSON(formData['geojson'])}}>{data}</span>
                                        <a href="#" className="btn" onClick={treeViewOpen}><img src="/assets/icons/globe.svg" alt="Globe SVG File" title="Globe SVG File" />Select</a>
                                    </div>
                                    <textarea id="spatialFootprint_geographic_level" name="spatialFootprint_geographic_level" className="dts-hidden-textarea" style={{display: "none"}}></textarea>
                                </div>
                            </>
                        );
                    }
                },
                {id: "geojson", caption: "Map Coordinates / Geographic Level", type: "hidden", required: true},
            ]}
            data={parsedData}
            onChange={(items: any) => {
                try {
                    const parsedItems = Array.isArray(items) ? items : (items);
                } catch {
                    console.error("Failed to process items.");
                }
            }}
        />
        <dialog ref={dialogTreeViewRef} className="dts-dialog tree-dialog">
            <div className="dts-dialog__content">
                <div className="dts-dialog__header" style={{justifyContent: "space-between"}}>
                    <h2 className="dts-heading-2" style={{marginBottom: "0px"}}>Select Geographic level</h2>
                    <a type="button" aria-label="Close dialog" onClick={treeViewDiscard}>
                        <svg aria-hidden="true" focusable="false" role="img">
                            <use href={`/assets/icons/close.svg#close`}></use>
                        </svg>
                    </a>
                </div>
                <TreeView
                    dialogMode={false}
                    ref={treeViewRef}
                    treeData={treeData ?? []}
                    caption="Select Geographic level"
                    rootCaption="Geographic levels"
                    onApply={
                        (selectedItems: any) => {
                            if (contentRepeaterRef.current.getDialogRef()) {
                                contentRepeaterRef.current.getDialogRef().querySelector('#spatialFootprint_geographic_level_container span').textContent = selectedItems.names;
                                selectedItems.data.map((item: any) => {
                                    if (item.id == selectedItems.selectedId) {
                                        let geometry = JSON.parse(item.geojson);
                                        let arrValue = {
                                            type: "Feature",
                                            geometry: geometry,
                                            properties: {
                                                division_id: selectedItems.selectedId || null,
                                                division_ids: selectedItems.dataIds ? selectedItems.dataIds.split(',') : [],
                                                import_id: (item?.importId || null) ? JSON.parse(item.importId) : null,
                                                level: (item?.level || null) ? JSON.parse(item.level) : null,
                                                name: (item?.name || null) ? JSON.parse(item.name) : null,
                                                national_id: (item?.nationalId || null) ? JSON.parse(item.nationalId) : null,
                                            }
                                        };
                                        arrValue = rewindGeoJSON(arrValue);
                                        contentRepeaterRef.current.getDialogRef().querySelector('#spatialFootprint_geographic_level').value = JSON.stringify(arrValue);
                                        const setField = {id: "geojson", value: arrValue};
                                        contentRepeaterRef.current.handleFieldChange(setField, arrValue);
                                        const setFieldGoeLevel = {id: "geographic_level", value: selectedItems.names};
                                        contentRepeaterRef.current.handleFieldChange(setFieldGoeLevel, selectedItems.names);
                                    }
                                });
                                treeViewDiscard();
                            }
                        }
                    }
                    onClose={
                        () => {
                            treeViewDiscard();
                        }
                    }
                    onRenderItemName={
                        (item: any) => {
                            return (typeof (item.hiddenData.geojson) == "object") ? {disable: "false"} : {disable: "true"};
                        }
                    }
                    appendCss={
                        `
                            ul.tree li div[disable="true"] {
                                color: #ccc;
                            }
                            ul.tree li div[disable="true"] .btn-face.select {
                                display: none;
                            }
                        `
                    }
                    disableButtonSelect={true}
                    showActionFooter={true}
                />
            </div>
        </dialog>
    </>
  );
}