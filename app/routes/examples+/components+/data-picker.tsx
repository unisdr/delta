import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable, disasterEventTable } from "~/drizzle/schema";
import { eq, not, and, isNotNull, sql, desc } from "drizzle-orm";
import { useEffect, useState, useRef } from "react";
import { TreeView, buildTree } from "~/components/TreeView";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./data-picker-config.tsx";
import {hazardEventLink} from "~/frontend/events/hazardeventform"
import {hazardBasicInfoJoin} from "~/backend.server/models/event"
import {formatDate} from "~/util/date";



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
                        <h1 className="dts-heading-1">DataPicker Example</h1>
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