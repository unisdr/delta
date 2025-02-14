import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config-tree";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { useLoaderData } from "@remix-run/react";

// Loader to Fetch & Transform Data
export const loader = async () => {
    const selectedDisplay = await contentPickerConfig.selectedDisplay(dr, "1302020201");
    return { selectedDisplay };
};

// React Component to Render Tree
export default function Page() {
    const { selectedDisplay } = useLoaderData<{ selectedDisplay: string }>();

    return (
        <>
            <div className="dts-page-header">
                <header className="dts-page-title">
                    <div className="mg-container">
                        <h1 className="dts-heading-1">ContentPicker using TreeView Example</h1>
                    </div>
                </header>
            </div>
            <section>
                <div className="mg-container">
                    <form>
                        <div className="fields">
                            <div className="form-field">
                                <label>
                                    <div>
                                    <ContentPicker {...contentPickerConfig} value="1302020201" displayName={selectedDisplay} />
                                    </div>
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}