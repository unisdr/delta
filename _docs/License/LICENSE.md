# UNDRR Disaster Tracking System (DTS) – License (Draft Under Review)

## License Status  
This software is an open source platform developed by UNDRR for country-level disaster tracking systems. The licensing model is currently under evaluation to ensure alignment with the needs of country-level deployments, open-source community engagement, and compatibility with included dependencies.

The two primary options under consideration are:
- **MIT License**
- **Apache License 2.0**

A detailed comparison of these licenses, including their features, DPG compliance considerations, and suitability for UN projects, can be found in [License-comparison.md](./License-comparison.md).

The final selection will be based on compatibility, legal clarity, and alignment with similar open-source projects across the UN system.

## License Goals  
Whichever license is selected, it must:
- Allow countries to deploy and customize their own DTS instances  
- Enable contributions from the open-source community  
- Ensure legal clarity around third-party dependencies  
- Maintain permissive terms while protecting the integrity of the platform  


## Third-Party Dependency Overview
The DTS platform includes multiple third-party components, each governed by permissive open-source licenses:

| Dependency                    | License          |
|-------------------------------|------------------|
| React (`react`, `react-dom`)  | MIT              |
| Remix (`@remix-run/*`)        | MIT              |
| TypeScript (`typescript`)     | Apache 2.0       |
| PostgreSQL (`pg`, `postgres`) | PostgreSQL (MIT-like) |
| UNDP Icon Set (`react-icons`) | MIT              |
| JSZip (`jszip`)               | MIT (dual-licensed with GPLv3, using MIT) |
| Drizzle (`drizzle-orm`, `drizzle-kit`) | Apache 2.0       |
| XLSX (`xlsx`)                 | Apache 2.0       |
| Leaflet (`leaflet`)           | BSD-2-Clause     |
| OpenLayers (`ol`)             | BSD-2-Clause     |
| Dotenv (`dotenv`)             | BSD-2-Clause     |
| Other Libraries               | MIT, Apache 2.0, ISC, BSD-2-Clause |

**Notes**:
- The "Other Libraries" row covers remaining dependencies with the following distribution (based on `license-report.json`):
  - MIT License: 624 packages (majority)
  - ISC License: 87 packages (e.g., `geojson-vt`, `minimatch`, `split2`)
  - Apache-2.0: 20 packages
  - BSD-3-Clause: 10 packages (e.g., `ieee754`)
  - BSD-2-Clause: 7 packages (e.g., `dotenv`, `leaflet`, `ol`)
  - Other OSI-approved: Unlicense, CC0-1.0 (minimal usage)
  See [license-report.json](./license-report.json) for the complete list.

These licenses are generally compatible with both MIT and Apache 2.0 options. They:
- Allow reuse in commercial or proprietary systems  
- Require attribution but no source disclosure (non-copyleft)  
- Impose minimal legal restrictions  

## Country-Level Deployment Terms  
Each country instance may be subject to local terms and conditions. The selected license will include clear guidance for:
- Customization rights  
- Redistribution of modified versions  
- Contribution pathways back to the main codebase  

## Important Notes (Pre-Finalization)
- This file is a draft pending final license selection.  
- Use of this platform is subject to UNDRR authorization until the license is finalized.  
- Final documentation will reflect the selected license and attribution obligations.  
- Contributors should follow guidance in the [CONTRIBUTING.md] TODO once published.

## Next Steps  
- Legal review of MIT vs Apache 2.0 licenses  
- Approval of final license by project stakeholders  
- Publication of definitive LICENSE.md and CONTRIBUTING.md files  

For legal inquiries, please contact the UNDRR.