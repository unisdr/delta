# Third-Party Dependencies License Review

This document provides a detailed review of all third-party dependencies used in the UNDRR DTS platform, including their licenses, compatibility, and specific considerations.

## License Distribution Summary

Based on our dependency analysis:
- MIT: Majority of dependencies (668 packages)
- ISC: 87 packages
- Apache-2.0: 22 packages
- BSD-3-Clause: 10 packages
- BSD-2-Clause: 7 packages
- Dual/Multiple Licensed:
  - type-fest: MIT OR CC0-1.0
  - zstddec: MIT AND BSD-3-Clause
  - @zxing/text-encoding: Unlicense OR Apache-2.0
  - jszip: MIT OR GPLv3
- Other licenses: 
  - Unlicense: robust-predicates
  - CC0-1.0: (as alternative in type-fest)

## 1. Core Framework Dependencies

### React Ecosystem (MIT License)
- react: Core UI framework
- react-dom: DOM rendering
- react-router-dom: Routing
- remix: Full-stack framework
- remix-utils: Utility functions
License Compliance: All MIT licensed, fully compatible with our project

### TypeScript and Build Tools (Mixed Licenses)
- typescript: Apache-2.0
- @babel/* packages: MIT
- esbuild: MIT
License Compliance: Mix of MIT and Apache-2.0, all permissive and compatible

## 2. Database and Data Management

### PostgreSQL Stack
- postgres (v3.4.5): Unlicense
- pg-protocol: MIT
- drizzle-orm: MIT
- postgres-array: MIT (v2.0.0, v3.0.0)
- postgres-bytea: MIT (v1.0.0, v3.0.0)
- postgres-date: MIT (v1.0.7, v2.1.0)
- postgres-interval: MIT (v1.2.0, v3.0.0)
- postgres-range: MIT
License Compliance: All permissively licensed (MIT or more permissive)

### Data Processing and Streaming
- csv-parse: MIT
- csv-stringify: MIT
- stream-transform: MIT
- pump: MIT (v2.0.1, v3.0.2)
- pumpify: MIT
- ieee754: BSD-3-Clause
- qs: BSD-3-Clause
License Compliance: All permissively licensed (MIT and BSD-3-Clause), suitable for data handling

## 3. Mapping and Geospatial

### OpenLayers and Turf.js
- ol (OpenLayers): BSD-2-Clause
- @turf/* packages: MIT
License Compliance: Mix of BSD and MIT, all permissive

### Leaflet
- leaflet: BSD-2-Clause
License Compliance: BSD licensed, permissive

## 4. Utility Libraries

### Core Utilities
- date-fns: MIT
- jszip: MIT (dual-licensed with GPLv3)
- marked: MIT
- nodemailer: MIT

### Security
- bcryptjs: MIT
- otpauth: MIT

## 5. Development Dependencies

### Testing and Build Tools
- cross-env: MIT
- dotenv: MIT
- express: MIT

## License Compatibility Analysis

1. **MIT License Dependencies**
   - Majority of our dependencies
   - Most permissive
   - Compatible with all other licenses used

2. **Apache-2.0 Dependencies**
   - Small number of core dependencies
   - Compatible with MIT
   - Includes patent protection

3. **BSD Licensed Dependencies**
   - Used by some mapping libraries
   - Compatible with MIT and Apache-2.0
   - Similar permissive terms

4. **Dual-Licensed Dependencies**
   - JSZip (MIT/GPLv3): Using MIT version
   - All dual-licensed packages allow MIT usage

## Compliance Requirements

1. **Attribution Requirements**
   - Maintain LICENSE files
   - Include copyright notices
   - Document all third-party licenses

2. **Notice Files**
   - Keep NOTICE files where required
   - Maintain attribution in documentation
   - Include license texts in distribution

3. **Usage Requirements**
   - No copyleft restrictions
   - Commercial use allowed
   - Modification permitted
   - Distribution allowed

## Risk Assessment

1. **License Conflicts**: None identified
   - All licenses are permissive
   - No GPL/AGPL dependencies
   - Clear compatibility chain

2. **Compliance Requirements**
   - Minimal requirements
   - Attribution-based
   - No share-alike terms

3. **Future Considerations**
   - Monitor dependency updates
   - Review license changes
   - Track version changes
  - Routing
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

### Zod (MIT License)
- Version: ^3.24.2
- Purpose: Runtime type checking
- License: MIT
- Key Features:
  - Runtime type validation
  - TypeScript integration
  - Error handling
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

## 2. Database and ORM

### PostgreSQL (PostgreSQL License)
- Version: ^16.0
- Purpose: Database
- License: PostgreSQL License (similar to MIT)
- Key Features:
  - Open source database
  - Strong community
  - Enterprise features
- Compatibility:
  - Compatible with Apache 2.0
  - Permissive terms

### Postgres (MIT License)
- Version: ^3.4.5
- Purpose: PostgreSQL client
- License: MIT
- Key Features:
  - PostgreSQL connection
  - Query execution
  - Transaction support
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms
  - No copyleft requirements

### Drizzle ORM (MIT License)
- Version: ^0.40.1
- Purpose: Database ORM
- License: MIT
- Key Features:
  - Type-safe queries
  - Zero runtime dependencies
  - SQL generation
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

## 3. UI Components and Libraries

### @floating-ui/dom (MIT License)
- Version: ^1.6.13
- Purpose: Floating UI components
- License: MIT
- Key Features:
  - Positioning utilities
  - Popover components
  - Menu components
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

### @turf/turf (MIT License)
- Version: ^7.2.0
- Purpose: Geospatial analysis
- License: MIT
- Key Features:
  - Geospatial operations
  - GIS functionality
  - Data transformation
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

### Leaflet (MIT License)
- Version: ^1.9.4
- Purpose: Mapping library
- License: MIT
- Key Features:
  - Interactive maps
  - Geospatial visualization
  - Layer management
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

### OpenLayers (BSD 2-Clause License)
- Version: ^10.2.1
- Purpose: Mapping library
- License: BSD 2-Clause
- Key Features:
  - Advanced mapping
  - Vector layers
  - Raster layers
- Compatibility:
  - Compatible with Apache 2.0
  - Permissive terms
  - No copyleft requirements

## 4. Data Processing

### csv-parse (MIT License)
- Version: ^5.6.0
- Purpose: CSV parsing
- License: MIT
- Key Features:
  - CSV parsing
  - Data transformation
  - Streaming support
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

### xlsx (MIT License)
- Version: ^0.18.5
- Purpose: Excel file handling
- License: MIT
- Key Features:
  - Excel file reading/writing
  - Data manipulation
  - Spreadsheet operations
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

## 5. Authentication and Security

### bcryptjs (MIT License)
- Version: ^3.0.2
- Purpose: Password hashing
- License: MIT
- Key Features:
  - Password hashing
  - Security utilities
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

### jwt-decode (MIT License)
- Version: ^4.0.0
- Purpose: JWT token decoding
- License: MIT
- Key Features:
  - Token decoding
  - Security utilities
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

## 6. Development Tools

### TypeScript (Apache 2.0 License)
- Version: ^5.8.2
- Purpose: Type checking
- License: Apache 2.0
- Key Features:
  - Type checking
  - Code quality
  - Development tools
- Compatibility:
  - Compatible with Apache 2.0
  - Explicit patent protection
  - Clear contribution terms

### Vite (MIT License)
- Version: ^6.2.2
- Purpose: Build tool
- License: MIT
- Key Features:
  - Development server
  - Build optimization
  - Hot module replacement
- Compatibility:
  - Compatible with Apache 2.0
  - No copyleft requirements
  - Permissive terms

## License Compatibility Summary

### MIT License (Majority of Dependencies)
- Key Dependencies: React, Remix, Leaflet, xlsx
- Compatibility: Compatible with Apache 2.0
- Restrictions: None
- Attribution: Simple attribution required

### Apache 2.0 License (TypeScript)
- Key Dependencies: TypeScript
- Compatibility: Compatible with MIT
- Restrictions: Patent protection
- Attribution: Detailed attribution required

### PostgreSQL License
- Key Dependencies: PostgreSQL
- Compatibility: Compatible with both MIT and Apache 2.0
- Restrictions: None
- Attribution: Simple attribution required

### BSD 2-Clause License (OpenLayers)
- Key Dependencies: OpenLayers
- Compatibility: Compatible with both MIT and Apache 2.0
- Restrictions: None
- Attribution: Simple attribution required

## Key Observations

1. **License Compatibility**
   - All licenses are compatible with each other
   - No copyleft licenses present
   - No license conflicts

2. **Patent Protection**
   - Only TypeScript has explicit patent protection
   - Other licenses rely on implied patent protection
   - No known patent issues

3. **Attribution Requirements**
   - Most licenses require simple attribution
   - Apache 2.0 requires more detailed attribution
   - PostgreSQL requires attribution in documentation

4. **Contribution Model**
   - MIT licenses have simple contribution terms
   - Apache 2.0 has more structured terms
   - All licenses allow for contributions



## Conclusion

After thorough analysis of all project dependencies, there are no license conflicts regardless of whether MIT or Apache-2.0 is chosen for the project. Here's the detailed breakdown:

### License Distribution
- MIT: Majority of dependencies (624 packages)
- ISC: 87 packages (similar to MIT, very permissive)
- Apache-2.0: 20 packages (compatible with both MIT and other Apache-2.0)
- BSD (2-Clause and 3-Clause): 17 packages total (very permissive, compatible with both)
- Unlicense: Most permissive, places code in public domain
- CC0-1.0: Extremely permissive (public domain dedication)

### Dual-Licensed Packages
- type-fest: MIT OR CC0-1.0 (both permissive)
- JSZip: Using MIT option (not GPLv3)
- @zxing/text-encoding: Using Unlicense option
- zstddec: MIT AND BSD-3-Clause (both permissive)

### Key Compatibility Points
- MIT can be used with Apache-2.0 code
- Apache-2.0 can be used with MIT code
- All BSD variants are compatible with both
- ISC is effectively identical to MIT
- Unlicense and CC0-1.0 can be used with anything

This comprehensive analysis confirms that the DTS platform has complete license compatibility across all its dependencies, providing flexibility in choosing either MIT or Apache-2.0 as the main project license. The high prevalence of MIT licenses (624 packages) suggests strong community alignment, while the presence of Apache-2.0 in key components like TypeScript provides additional patent protections when needed.
