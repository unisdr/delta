import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config.js";

// Loader to Fetch & Transform Data
export const loader = async () => {
    return [];
};

// React Component to Render Tree
export default function Page() {
    return (
        <>
            <div className="dts-page-header">
                <header className="dts-page-title">
                    <div className="mg-container">
                        <h1 className="dts-heading-1">ContentPicker Example</h1>
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
                                    <ContentPicker {...contentPickerConfig} value="10ce015c-9461-4641-bb6f-0024d8393f47" displayName="Disaster 4 (7 to 9 Feb 2025) - 3b37b" />
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