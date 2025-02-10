import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config.js";

// Loader to Fetch & Transform Data
export const loader = async () => {
    return [];
};

// React Component to Render Tree
export default function TreeViewPage() {
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
                                    <ContentPicker {...contentPickerConfig}/>
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