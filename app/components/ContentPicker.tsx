import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";

const injectStyles = (appendCss?: string) => {
    const styleLayout = [
            `
            .content-picker .select {
                display: inline-block;
                background-color: buttonface;
                padding: 4px 8px 1px 8px;
                border: 1px solid #000;
                border-radius: 5px;
                white-space: nowrap;
            }

            .content-picker .dts-dialog {
                max-width: 50vw;
                max-width: none !important;
                max-height: none !important;
            }
            .content-picker .dts-dialog .dts-form__body {
                position: relative;
                overflow: scroll;
                // height: 500px;
                border-bottom: 1px dotted #979797 !important;
            }
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
    dataSources: any;
    table_columns: any[];
    caption?: string;
    defaultText?: string;
    buttonSelectEnabled?: boolean;
    appendCss?: string;
    base_path?: string;
}

export const ContentPicker = forwardRef<HTMLDivElement, ContentPickerProps>(
    ({ dataSources = "" as string | any[], table_columns = [], caption = "", defaultText = "", appendCss = "", base_path = "" }, ref) => {
      const dialogRef = useRef<HTMLDialogElement>(null);
      const [tableData, setTableData] = useState<any[]>([]);
      const [searchQuery, setSearchQuery] = useState(""); // Search query state
      const [currentPage, setCurrentPage] = useState(1);
      const [totalPages, setTotalPages] = useState(1);
      const itemsPerPage = 10; // Number of items per page
  
      useEffect(() => {
          injectStyles(appendCss);
      }, []);
  
      // Fetch data if `dataSources` is an API URL
      const fetchTableData = async (query = "", page = 1) => {
        if (Array.isArray(dataSources)) {
            // Perform client-side pagination & filtering
            const filteredData = (dataSources ?? []).filter((row) =>
                (table_columns ?? []).some(
                    (col) =>
                        col.column_type === "db" &&
                        col.searchable &&
                        row[col.column_field]?.toString().toLowerCase().includes(query.toLowerCase())
                )
            );
    
            const totalPagesCalc = Math.ceil(filteredData.length / itemsPerPage);
            setTotalPages(totalPagesCalc);
            setTableData(filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage));
            return;
        }
    
        if (!dataSources) return;
    
        try {
            const response = await fetch(`${dataSources}?query=${query}&page=${page}&limit=${itemsPerPage}`);
            if (!response.ok) throw new Error("Failed to fetch data");
    
            const { data = [], totalRecords = 0 } = await response.json();
            const totalPagesCalc = Math.ceil(totalRecords / itemsPerPage); // ✅ Correctly calculate total pages
    
            setTableData(data);
            setTotalPages(totalPagesCalc); // ✅ Ensure total pages is updated
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };
    
  
      // Handle search input change
      const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1);
          fetchTableData(e.target.value, 1);
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
          if (dialogRef.current) {
              const dtsFormBody = dialogRef.current.querySelector(".dts-form__body") as HTMLElement | null;
              if (dtsFormBody) {
                  dtsFormBody.style.height = "auto";
              }
  
              const cpContainer = dialogRef.current.querySelector(".cp-container") as HTMLElement | null;
              if (cpContainer) {
                  cpContainer.style.display = "none";
              }
          }
      };
  
      const discardPicker = (e?: any) => {
          if (e) {
              e.preventDefault();
          }
  
          if (dialogRef.current) dialogRef.current.close();
          clearPicker();
      };
  
      return (
          <>
              <div className="content-picker">
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
                                              {(tableData ?? []).length > 0 ? (
                                                  (tableData ?? []).map((row, rowIndex) => (
                                                      <tr key={rowIndex}>
                                                          {(table_columns ?? []).map((col, colIndex) => (
                                                              <td key={colIndex}>
                                                                  {col.column_type === "db"
                                                                      ? row[col.column_field] || "N/A"
                                                                      : <a href="#">Select</a>}
                                                              </td>
                                                          ))}
                                                      </tr>
                                                  ))
                                              ) : (
                                                  <tr>
                                                      <td colSpan={(table_columns ?? []).length} style={{ textAlign: "center" }}>No results found.</td>
                                                  </tr>
                                              )}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                              <div className="cp-footer"
                                  style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "10px 15px",
                                      fontSize: "14px",
                                      color: "#333",
                                  }}
                              >
                                  <span>Page {currentPage} of {totalPages} | Showing {(tableData ?? []).length} items</span>
                                  <div
                                      style={{
                                          display: "flex",
                                          gap: "10px",
                                      }}
                                  >
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
  
                  <div
                      style={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid #ccc",
                          borderRadius: "0.25rem",
                          overflow: "hidden",
                          width: "fit-content",
                          backgroundColor: "#fff"
                      }}
                  >
                      <div
                          style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 8px",
                              margin: "2px",
                              flex: 1,
                          }}
                      >
                          <span>{defaultText !== "" ? defaultText : caption}</span>
                      </div>
  
                      <div
                          style={{
                              backgroundColor: "#e9ecef",
                              border: "none",
                              padding: "0.8rem 1rem",
                              cursor: "pointer",
                              borderLeft: "1px solid #ced4da",
                          }}
                          onClick={openPicker}
                      >
                          🔍
                      </div>
                  </div>
              </div>
          </>
      );
  });
  
  