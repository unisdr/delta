export function AttachmentsView({
    id="",
    initialData = [],
    file_viewer_url = "",
    location=""
  }: {
    id: string;
    initialData: any[];
	  file_viewer_url: string;
    location?: string;
  }) {
    if (initialData) {
        return (
            <>
							<p>Attachments:</p>
							{(() => {
								try {
									let attachments: any[] = []; // Ensure it's always an array

                  if (Array.isArray(initialData)) {
                    attachments = initialData;
                  } else if (typeof initialData === "string") {
                    try {
                      const parsed = JSON.parse(initialData);
                      attachments = Array.isArray(parsed) ? parsed : [];
                    } catch (error) {
                      console.error("Invalid JSON in attachments:", error);
                      attachments = [];
                    }
                  } else {
                    console.warn("Unexpected type for attachments:", typeof initialData);
                    attachments = [];
                  }

									return attachments.length > 0 ? (
										<table style={{border: '1px solid #ddd', width: '100%', borderCollapse: 'collapse', marginBottom: '2rem'}}>
											<thead>
												<tr style={{backgroundColor: '#f2f2f2'}}>
													<th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal'}}>Title</th>
													<th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal'}}>Tags</th>
													<th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal'}}>File/URL</th>
												</tr>
											</thead>
											<tbody>
												{(attachments).map((attachment: any) => {
													const tags = attachment.tag
														? (attachment.tag).map((tag: any) => tag.name).join(", ")
														: "N/A";
													const fileOrUrl =
														attachment.file_option === "File" && attachment.file
															? (
																<a href={`${file_viewer_url}/?name=${id}/${attachment.file.name.split("/").pop()}&loc=${location}`} target="_blank" rel="noopener noreferrer">
																	{attachment.file.name.split("/").pop()}
																</a>
															)
															: attachment.file_option === "Link"
																? <a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.url}</a>
																: "N/A";

													return (
														<tr key={attachment.id} style={{borderBottom: '1px solid gray'}}>
															<td style={{border: '1px solid #ddd', padding: '8px'}}>{attachment.title || "N/A"}</td>
															<td style={{border: '1px solid #ddd', padding: '8px'}}>{tags}</td>
															<td style={{border: '1px solid #ddd', padding: '8px'}}>{fileOrUrl}</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									) : (<></>);
								} catch (error) {
									console.error("Error processing attachments:", error);
									return <p>Error loading attachments.</p>;
								}
							})()}
            </>
        );
    } else {
        return  (<></>)
    }
}