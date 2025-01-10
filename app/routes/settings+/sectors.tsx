import { authLoader, authLoaderGetAuth } from "~/util/auth";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

export const loader = authLoader(async (loaderArgs) => {
  const { user } = authLoaderGetAuth(loaderArgs);

  return { message: `Hello ${user.email}` };
});

export default function Settings() {
  return (
    <MainContainer title="Sectors" headerExtra={<NavSettings />}>
      {/* Scoped Inline Styles */}
      <style>
        {`
		.table-styled {
		  width: 100%;
		  border-collapse: collapse;
		  margin-top: 20px;
		  font-size: 14px;
		}

		.table-styled th,
		.table-styled td {
		  padding: 12px 15px;
		  border: 1px solid #ddd;
		  text-align: left;
		}

		.table-styled th {
		  background-color: #f4f4f4;
		  font-weight: bold;
		}

		.filter-icon {
		  position: absolute;
		  right: 10px;
		  top: 50%;
		  transform: translateY(-50%);
		  cursor: pointer;
		}

		.table-styled tr:nth-child(even) {
		  background-color: #f9f9f9;
		}`}
      </style>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <strong>
          <p>Sector access</p>
        </strong>
        <table
          className="table-styled"
          style={{ marginTop: "0px", width: "100%" }}
        >
          <thead>
            <tr>
              <th>
                <div style={{ display: "flex", gap: "5px" }}>
                  Level 1?
                  <button>
                    <img src="/assets/icons/filter-solid.svg" alt="Filter" />
                  </button>
                </div>
              </th>
              <th>
                <div style={{ display: "flex", gap: "5px" }}>
                  Level 2?
                  <button>
                    <img src="/assets/icons/filter-solid.svg" alt="Filter" />
                  </button>
                </div>
              </th>
              <th>
                <div style={{ display: "flex", gap: "5px" }}>
                  Level 3?
                  <button>
                    <img src="/assets/icons/filter-solid.svg" alt="Filter" />
                  </button>
                </div>
              </th>
              <th>
                <div style={{ display: "flex", gap: "5px" }}>
                  Level 4?
                  <button>
                    <img src="/assets/icons/filter-solid.svg" alt="Filter" />
                  </button>
                </div>
              </th>
              <th>Modified</th>
              <th>
                <img src="/assets/icons/edit.svg" alt="Edit" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sector 1</td>
              <td></td>
              <td></td>
              <td></td>
              <td>31-10-2026</td>
              <td>
                <button className="icon-button">
                  <img src="/assets/icons/edit.svg" alt="Edit" />
                </button>
              </td>
            </tr>
            <tr>
              <td>Sector 1</td>
              <td>Sector 2</td>
              <td></td>
              <td></td>
              <td>31-10-2026</td>
              <td>
                <button className="icon-button">
                  <img src="/assets/icons/edit.svg" alt="Edit" />
                </button>
              </td>
            </tr>
            <tr>
              <td>Sector 1</td>
              <td>Sector 2</td>
              <td>Sector 3</td>
              <td></td>
              <td>31-10-2026</td>
              <td>
                <button className="icon-button">
                  <img src="/assets/icons/edit.svg" alt="Edit" />
                </button>
              </td>
            </tr>
            <tr>
              <td>Sector 1</td>
              <td>Sector 2</td>
              <td>Sector 3</td>
              <td>Sector 4</td>
              <td>31-10-2026</td>
              <td>
                <button className="icon-button">
                  <img src="/assets/icons/edit.svg" alt="Edit" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            style={{
              margin: "10px",
              padding: "10px 15px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              backgroundColor: "#004f91",
              color: "white",
              border: "none",
            }}
          >
            Save changes
          </button>
        </div>
      </div>
    </MainContainer>
  );
}
