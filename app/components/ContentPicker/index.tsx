import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import "./assets/content-picker.css";

const injectStyles = (appendCss?: string) => {
    const styleLayout = [
        `
            ${appendCss}
        `
    ];

    const styleId = "ContentPicker";

    // Check if the style is already in the document
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.type = "text/css";
        style.id = styleId; // Assign a unique ID
        style.innerHTML = styleLayout[0]; // Change index to switch between styles
        document.head.appendChild(style);
    }
};

interface ContentPickerProps {
    id: string;
    dataSources: any;
    table_columns: any[];
    caption?: string;
    defaultText?: string;
    buttonSelectEnabled?: boolean;
    appendCss?: string;
    base_path?: string;
    selectedValue?: string;
    required?: boolean;
}

export const ContentPicker = forwardRef<HTMLDivElement, ContentPickerProps>(
    ({ id = "", dataSources = "" as string | any[], table_columns = [], caption = "", defaultText = "", appendCss = "", base_path = "", selectedValue = "", required = true }, ref) => {
      const dialogRef = useRef<HTMLDialogElement>(null);
      const componentRef = useRef<HTMLDivElement>(null);
      const [tableData, setTableData] = useState<any[]>([]);
      const [searchQuery, setSearchQuery] = useState(""); // Search query state
      const [debouncedQuery, setDebouncedQuery] = useState(searchQuery); // New debounced state
      const [currentPage, setCurrentPage] = useState(1);
      const [totalPages, setTotalPages] = useState(1);
      const itemsPerPage = 10; // Number of items per page
      const [loading, setLoading] = useState(false);
      const [selectedItem, setSelectedItem] = useState("");
  
      useEffect(() => {
          injectStyles(appendCss);
      }, []);
  
      // Fetch data if `dataSources` is an API URL
      const fetchTableData = async (query = "", page = 1) => {
        setLoading(true); // Start loading
    
        if (Array.isArray(dataSources)) {
            const filteredData = (dataSources ?? []).filter((row) =>
                (table_columns ?? []).some(
                    (col) =>
                        col.column_type === "db" &&
                        col.searchable &&
                        row[col.column_field]?.toString().toLowerCase().includes(query.toLowerCase())
                )
            );
    
            setTotalPages(Math.ceil(filteredData.length / itemsPerPage));
            setTableData(filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage));
            setLoading(false); // Stop loading
            return;
        }
    
        if (!dataSources) {
            setLoading(false);
            return;
        }
    
        try {
            const response = await fetch(`${dataSources}?query=${query}&page=${page}&limit=${itemsPerPage}`);
            if (!response.ok) throw new Error("Failed to fetch data");
    
            const { data = [], totalRecords = 0 } = await response.json();
            setTotalPages(Math.ceil(totalRecords / itemsPerPage));
            setTableData(data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false); // Ensure loading is set to false after data is fetched
        }
    };
    
    // Debounce logic using useEffect
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500); // Wait 500ms before setting debouncedQuery

        return () => {
            clearTimeout(handler); // Clear timeout if user types again before 500ms
        };
    }, [searchQuery]); // Run only when `searchQuery` changes

    // Fetch data when debouncedQuery changes (prevents excessive API calls)
    useEffect(() => {
        fetchTableData(debouncedQuery, 1);
    }, [debouncedQuery]); // Runs only when `debouncedQuery` updates
  
      // Handle search input change
      const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value); // Update state immediately
        setCurrentPage(1); // Reset to first page
      };
  
      // Pagination navigation handlers
      const goToNextPage = (e?: any) => {
            if (e) {
                e.preventDefault();
            }
            //alert(`currentPage: ${currentPage} | totalPages: ${totalPages}`);
          if (currentPage < totalPages) {
              setCurrentPage((prev) => prev + 1);
              fetchTableData(searchQuery, currentPage + 1);
          }
      };
  
      const goToPreviousPage = (e?: any) => {
        if (e) {
            e.preventDefault();
        }

          if (currentPage > 1) {
              setCurrentPage((prev) => prev - 1);
              fetchTableData(searchQuery, currentPage - 1);
          }
      };
  
      const openPicker = (e?: any) => {
          if (e) {
              e.preventDefault();
          }
  
          if (dialogRef.current) {
              dialogRef.current.showModal();

              let contHeight = [] as number[];
              contHeight[0] = (dialogRef.current.querySelector(".dts-dialog__content") as HTMLElement | null)?.offsetHeight || 0;
              contHeight[1] = (dialogRef.current.querySelector(".dts-dialog__header") as HTMLElement | null)?.offsetHeight || 0;
              contHeight[2] = (dialogRef.current.querySelector(".cp-filters") as HTMLElement | null)?.offsetHeight || 0;
              contHeight[3] = (dialogRef.current.querySelector(".cp-footer") as HTMLElement | null)?.offsetHeight || 0;
              let getHeight = contHeight[0] - contHeight[1] - contHeight[2] - contHeight[3];
              getHeight += 240;
  
              const dtsFormBody = dialogRef.current.querySelector(".dts-form__body") as HTMLElement | null;
              if (dtsFormBody) {
                  dtsFormBody.style.height = `${window.innerHeight - getHeight}px`;
  
                  const cpContainer = dialogRef.current.querySelector(".cp-container") as HTMLElement | null;
                  if (cpContainer) {
                      cpContainer.style.display = "block";
                  }
              }

              fetchTableData(); // Fetch initial data
          }
      };
  
      const clearPicker = () => {
        if (!dialogRef.current) return;
    
        // Reset styles
        const dtsFormBody = dialogRef.current.querySelector(".dts-form__body") as HTMLElement | null;
        if (dtsFormBody) {
            dtsFormBody.style.height = "auto";
            dtsFormBody.scrollTop = 0; // Reset scrolling
        }
    
        const cpContainer = dialogRef.current.querySelector(".cp-container") as HTMLElement | null;
        if (cpContainer) {
            cpContainer.style.display = "none";
        }
    
        setTableData([]); // Ensure React state is cleared
        setSearchQuery(""); // Clear search input
        setCurrentPage(1); // Reset pagination
        setTotalPages(1); // Reset total pages
    };
  
      const discardPicker = (e?: any) => {
          if (e) {
              e.preventDefault();
          }
  
          if (dialogRef.current) dialogRef.current.close();
          clearPicker();
      };

      const selectItem = (e: any) => {
        e.preventDefault();
    
        const rowId = e.target.dataset.id;
    
        // Ensure we get a valid primary column, fallback to the first column
        const primaryColumn = table_columns.find((col) => col.is_primary_id) || table_columns[0];
    
        if (!primaryColumn) {
            console.error("No primary column found in table_columns");
            return;
        }
    
        const selectedRow = tableData.find((row: any) => row[primaryColumn.column_field] === rowId);

        // Extract all fields marked with `is_selected_field: true`
        /*const selectedFields = table_columns
        .filter((col) => col.is_selected_field)
        .reduce((acc, col) => {
            acc[col.column_field] = selectedRow[col.column_field] || "N/A";
            return acc;
        }, {} as Record<string, any>); // Ensuring correct type
        */

        const selectedValues = table_columns
        .filter((col) => col.is_selected_field)
        .map((col) => selectedRow[col.column_field] || "N/A") // Get values only
        .join(", "); // Convert array to comma-separated string
    
        //console.log("Selected item:", selectedRow);
        //console.log("Selected Fields (is_selected_field):", selectedValues);

        // Update the hidden input value
        //const hiddenInput = document.querySelector(`input[name="${id}"]`) as HTMLInputElement | null;

        if (componentRef.current) {
            const hiddenInput = componentRef.current.querySelector(`#${id}`) as HTMLInputElement | null;
            //console.log("hiddenInput:", hiddenInput);
            if (hiddenInput) {
                //alert(selectedValues)
                //hiddenInput.defaultValue = selectedValues;

                setSelectedItem(selectedValues);
            }   
        }

        if (dialogRef.current) {
            dialogRef.current.close();
        }
        
        clearPicker();
    };

    const removeItem = (e: any) => {
        e.preventDefault();
        setSelectedItem("");
    }
    

      useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Escape" && dialogRef.current?.open) {
            //console.log("Escape key pressed! Closing dialog...");
            dialogRef.current.close();
            clearPicker();
          }
        };
    
        document.addEventListener("keydown", handleKeyDown);

        if (selectedValue !== "") {
            setSelectedItem(selectedValue);
        }

        const handleFormSubmit = (e: Event) => {
            const inputElement = document.querySelector(`input[name="${id}"]`) as HTMLInputElement;
            if (inputElement && inputElement.value.trim() === "") {

                const cpInputContainer = (inputElement?.closest('.cp-input-container') as HTMLElement) || null;
                if (cpInputContainer) {
                    const cpUnselected = (cpInputContainer?.querySelector(".cp-unselected") as HTMLElement) || null;
                    if (cpUnselected) cpUnselected?.focus()
                } 

                const cpValidationPopUp = (inputElement?.closest(".cp-input-container")?.querySelector(".cp-validation-popup") as HTMLElement) || null;
                if (cpValidationPopUp) {
                    cpValidationPopUp.style.display = "block";

                    const clientHeight = inputElement.closest(".cp-input-container")?.clientHeight || 0;
                    cpValidationPopUp.style.bottom = `-${clientHeight+6}px`;
              
                    // Hide after 3 seconds
                    setTimeout(() => {
                        cpValidationPopUp.style.display = "none";
                    }, 3000);
                }
                e.preventDefault(); // Prevent form submission
            }
        };
    
        if (required) {
            const formElement = document.querySelector("form");
            if (formElement) {
                formElement.addEventListener("submit", handleFormSubmit);
            }
        }

        return () => {
          document.removeEventListener("keydown", handleKeyDown);
        };
      }, []);
  
      return (
          <>
              <div className="content-picker" ref={componentRef}>
                  <dialog ref={dialogRef} className="dts-dialog">
                      <div className="dts-dialog__content">
                          <div className="dts-dialog__header" style={{ justifyContent: "space-between" }}>
                              <h2 className="dts-heading-2">{caption}</h2>
                              <a type="button" aria-label="Close dialog" onClick={discardPicker}>
                                  <svg aria-hidden="true" focusable="false" role="img">
                                      <use href={`${base_path}/assets/icons/close.svg#close`}></use>
                                  </svg>
                              </a>
                          </div>
                          <div>
                              <div className="cp-filter">
                                  <input
                                      type="text"
                                      placeholder="Search..."
                                      value={searchQuery}
                                      onChange={handleSearch}
                                  />
                              </div>
                              <div className="dts-form__body">
                                  <div className="cp-container" style={{ display: "none" }}>
                                      <table className="dts-table">
                                          <thead>
                                              <tr>
                                                  {(table_columns ?? []).map((col, index) => (
                                                      <th key={index}>{col.column_title}</th>
                                                  ))}
                                              </tr>
                                          </thead>
                                          <tbody>
                                          {loading ? (
                                                <tr>
                                                    <td colSpan={(table_columns ?? []).length} style={{ textAlign: "center" }}>
                                                        Loading data...
                                                    </td>
                                                </tr>
                                            ) : tableData.length > 0 ? (
                                                tableData.map((row, rowIndex) => {
                                                    const primaryColumn = table_columns.find((col) => col.is_primary_id);
                                                    return (
                                                        <tr key={rowIndex}>
                                                            {table_columns.map((col, colIndex) => (
                                                                <td key={colIndex}>
                                                                    {col.column_type === "db" ? (
                                                                        row[col.column_field] || "N/A"
                                                                    ) : (
                                                                        <a href={primaryColumn ? `#${row[primaryColumn.column_field]}` : "#"} data-id={primaryColumn ? `${row[primaryColumn.column_field]}` : ""} onClick={selectItem}>Select</a>
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={(table_columns ?? []).length} style={{ textAlign: "center" }}>
                                                        No results found.
                                                    </td>
                                                </tr>
                                            )}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                              <div className="cp-footer">
                                  <span>Page {currentPage} of {totalPages} | Showing {(tableData ?? []).length} items</span>
                                  <div className="cp-page-nav">
                                    <button onClick={goToPreviousPage} disabled={currentPage <= 1}>
                                        ◀ Previous
                                    </button>
                                    <button onClick={goToNextPage} disabled={currentPage >= totalPages}>
                                        Next ▶
                                    </button>

                                  </div>
                              </div>
                          </div>
                      </div>
                  </dialog>
  
                  <div className="cp-input-container">
                        {(selectedItem === "") && (
                        <div className="cp-unselected" tabIndex={0}>
                          <span>{defaultText !== "" ? defaultText : caption}</span>
                        </div>
                        )}

                        {(selectedItem !== "") && (
                            <div className="cp-selected">
                            <span>{selectedItem}</span><span className="cp-remove-item" onClick={removeItem}>×</span>
                            </div>
                        )}
                      <div className="cp-search" onClick={openPicker}>
                        <svg aria-hidden="true" focusable="false" role="img"></svg>
                        <input type="hidden" id={id} name={id} value={selectedItem} />
                      </div>
                      <div className="cp-validation-popup">⚠️ Please fill out this field.</div>
                  </div>
              </div>
          </>
      );
});