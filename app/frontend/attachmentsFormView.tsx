import { useRef, useEffect } from "react";
import { ContentRepeater } from "~/components/ContentRepeater";

export function AttachmentsFormView({
  initialData,
  save_path_temp,
  file_viewer_temp_url,
  file_viewer_url,
  api_upload_url,
  onChange
}: {
  initialData: any;
  save_path_temp: string;
  file_viewer_temp_url: string;
  file_viewer_url: string;
  api_upload_url: string;
  onChange?: (items: any) => void;
}) {
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
            id="attachments"
            caption="Attachments"
            dnd_order={true}
            save_path_temp={save_path_temp}
            file_viewer_temp_url={file_viewer_temp_url}
            file_viewer_url={file_viewer_url}
            api_upload_url={api_upload_url}
            table_columns={[
                {type: "dialog_field", dialog_field_id: "title", caption: "Title"},
                {
                    type: "custom", caption: "Tags",
                    render: (item: any) => {
                        try {
                            if (!item.tag) {
                                return "N/A"; // Return "N/A" if no tags exist
                            }

                            const tags = (item.tag); // Parse the JSON string
                            if (Array.isArray(tags) && tags.length > 0) {
                                // Map the names and join them with commas
                                return tags.map(tag => tag.name).join(", ");
                            }
                            return "N/A"; // If no tags exist
                        } catch (error) {
                            console.error("Failed to parse tags:", error);
                            return "N/A"; // Return "N/A" if parsing fails
                        }
                    }
                },
                {
                    type: "custom",
                    caption: "File/URL",
                    render: (item) => {
                        let strRet = "N/A"; // Default to "N/A"		

                        const fileOption = item?.file_option || "";

                        if (fileOption === "File") {
                            // Get the file name or fallback to URL
                            const fullFileName = item.file?.name ? item.file.name.split('/').pop() : item.url;

                            // Truncate long file names while preserving the file extension
                            const maxLength = 30; // Adjust to fit your design
                            strRet = fullFileName;

                            if (fullFileName && fullFileName.length > maxLength) {
                                const extension = fullFileName.includes('.')
                                    ? fullFileName.substring(fullFileName.lastIndexOf('.'))
                                    : '';
                                const baseName = fullFileName.substring(0, maxLength - extension.length - 3); // Reserve space for "..."
                                strRet = `${baseName}...${extension}`;
                            }
                        } else if (fileOption === "Link") {
                            strRet = item.url || "N/A";
                        }

                        return strRet || "N/A"; // Return the truncated name or fallback to "N/A"
                    },
                },
                {type: "action", caption: "Action"},
            ]}
            dialog_fields={[
                {id: "title", caption: "Title", type: "input"},
                {id: "tag", caption: "Tags", type: "tokenfield", dataSource: "/api/disaster-event/tags-sectors"},
                {
                    id: "file_option",
                    caption: "Option",
                    type: "option",
                    options: ["File", "Link"],
                    onChange: (e) => {
                        const value = e.target.value;
                        const fileField = document.getElementById("attachments_file") as HTMLInputElement;
                        const urlField = document.getElementById("attachments_url") as HTMLInputElement;

                        if (fileField && urlField) {
                            const fileDiv = fileField.closest(".dts-form-component") as HTMLElement;
                            const urlDiv = urlField.closest(".dts-form-component") as HTMLElement;

                            if (value === "File") {
                                fileDiv?.style.setProperty("display", "block");
                                urlDiv?.style.setProperty("display", "none");
                            } else if (value === "Link") {
                                fileDiv?.style.setProperty("display", "none");
                                urlDiv?.style.setProperty("display", "block");
                            }
                        }
                    },
                },
                {id: "file", caption: "File Upload", type: "file"},
                {id: "url", caption: "Link", type: "input", placeholder: "Enter URL"},
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
    </>
  );
}