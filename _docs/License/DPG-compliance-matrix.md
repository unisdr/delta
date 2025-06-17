# UNDRR Disaster Tracking System (DTS) - Digital Public Goods Standard Compliance Matrix

## Executive Summary

The UNDRR Disaster Tracking System (DTS) is a comprehensive platform designed to support country-level disaster tracking and management. This document assesses DTS's compliance with the Digital Public Goods (DPG) Standard version 1.1.4, which establishes the baseline requirements for recognition as a digital public good.

**Current Compliance Status**: DTS is **partially compliant** with the DPG Standard, meeting 5 out of 9 indicators fully, with 4 indicators requiring additional actions to achieve full compliance.

**Overall Compliance Score**: 67% (6/9 indicators fully or partially compliant)

**Key Strengths**:
- Strong relevance to SDGs (particularly SDG 11 and 13)
- Well-documented architecture and technical implementation
- Clear platform independence
- Strong adherence to privacy and applicable laws
- Robust "do no harm" design principles

**Primary Gaps**:
- Pending license implementation (recommended Apache License 2.0)
- Incomplete documentation for country-level deployment
- Limited data extraction mechanisms for non-technical users
- Incomplete documentation of standards compliance

This matrix provides a roadmap for achieving full DPG compliance, with prioritized action items and target completion dates to support DTS's application to the DPG Registry.

## DPG Standard Overview

The Digital Public Goods Standard is a set of specifications and guidelines designed to determine whether a digital solution conforms to the definition of a digital public good as established by the UN Secretary-General's Roadmap for Digital Cooperation. According to this definition, digital public goods must be:

1. Open source software, open data, open AI models, open standards, or open content
2. Adhere to privacy and applicable best practices
3. Do no harm by design
4. Demonstrate relevance to the Sustainable Development Goals

The DPG Standard consists of 9 indicators that establish the baseline requirements for recognition as a digital public good:

1. **Relevance to Sustainable Development Goals**
2. **Use of Approved Open Licenses**
3. **Clear Ownership**
4. **Platform Independence**
5. **Documentation**
6. **Mechanism for Extracting Data and Content**
7. **Adherence to Privacy and Applicable Laws**
8. **Adherence to Standards & Best Practices**
9. **Do No Harm By Design**
   - 9a) Data Privacy & Security
   - 9b) Inappropriate & Illegal Content
   - 9c) Protection from Harassment

## Detailed Compliance Matrix

| DPG Indicator | Indicator Name | Compliance Status | Evidence/Documentation | Gap Analysis | Action Items | Priority Level | Target Completion Date |
|---------------|----------------|-------------------|------------------------|--------------|--------------|---------------|------------------------|
| **1** | **Relevance to Sustainable Development Goals** | **Compliant** | - DTS directly supports SDG 11 (Sustainable Cities and Communities) and SDG 13 (Climate Action)<br>- Platform enables disaster risk reduction through data collection, analysis, and reporting<br>- Supports evidence-based policy decisions for disaster resilience | None | - Document specific SDG targets supported by DTS<br>- Create impact measurement framework | Low | 2025-08-30 |
| **2** | **Use of Approved Open Licenses** | **Non-Compliant** | - Currently marked as "UNLICENSED" in package.json<br>- Recommendation for Apache License 2.0 exists<br>- All dependencies use compatible licenses (MIT, ISC, Apache-2.0, BSD) | - No OSI-approved license currently implemented<br>- Required for DPG compliance | - Implement Apache License 2.0 as recommended<br>- Update package.json<br>- Add LICENSE file to repository<br>- Update documentation with license information | High | 2025-07-15 |
| **3** | **Clear Ownership** | **Compliant** | - UNDRR clearly identified as owner in documentation<br>- Copyright notices present in codebase<br>- UN ownership clearly established | None | - Add explicit copyright statements to all source files<br>- Create NOTICE file with ownership information | Medium | 2025-07-30 |
| **4** | **Platform Independence** | **Compliant** | - All dependencies use permissive licenses<br>- No mandatory dependencies with restrictive licenses<br>- Clean architecture with clear separation of concerns | None | - Document dependency management strategy<br>- Create dependency review process for future additions | Low | 2025-08-15 |
| **5** | **Documentation** | **Partially Compliant** | - Technical documentation exists<br>- Architecture documentation available<br>- API documentation incomplete<br>- User guides available | - Incomplete API documentation<br>- Limited country-level deployment guides<br>- Missing contributor guidelines | - Complete API documentation<br>- Create comprehensive deployment guide for country instances<br>- Develop contributor guidelines<br>- Create user manuals for all user roles | High | 2025-07-30 |
| **6** | **Mechanism for Extracting Data and Content** | **Partially Compliant** | - API endpoints for data access exist<br>- CSV export functionality available<br>- Database backup procedures documented | - Limited user-friendly export options<br>- Incomplete documentation of data formats<br>- No standardized data exchange protocols | - Implement comprehensive data export functionality<br>- Document all data formats and schemas<br>- Create data exchange documentation<br>- Implement bulk export capabilities | Medium | 2025-08-15 |
| **7** | **Adherence to Privacy and Applicable Laws** | **Compliant** | - Privacy policy documented<br>- GDPR compliance features implemented<br>- Data protection measures in place<br>- User consent mechanisms implemented | - Limited documentation of compliance with local laws in deployment countries | - Create country-specific compliance guidelines<br>- Develop privacy impact assessment template<br>- Document data retention policies | Medium | 2025-08-30 |
| **8** | **Adherence to Standards & Best Practices** | **Partially Compliant** | - Follows software development best practices<br>- Uses industry-standard frameworks (React, TypeScript)<br>- Implements security best practices | - Limited documentation of specific standards followed<br>- No formal standards compliance statement<br>- Incomplete accessibility compliance | - Document all standards followed (W3C, WCAG, etc.)<br>- Implement accessibility improvements<br>- Create standards compliance documentation<br>- Conduct standards compliance audit | Medium | 2025-08-30 |
| **9** | **Do No Harm By Design** | **Compliant** | - **9a) Data Privacy & Security**: Robust data protection measures implemented<br>- **9b) Inappropriate & Illegal Content**: Content moderation policies in place<br>- **9c) Protection from Harassment**: User protection mechanisms implemented | - Limited documentation of harm prevention strategies<br>- No formal risk assessment framework | - Create comprehensive risk assessment framework<br>- Document harm prevention strategies<br>- Implement additional security measures<br>- Develop incident response procedures | Medium | 2025-08-15 |

## Compliance Score Calculation

| Compliance Category | Count | Percentage |
|--------------------|-------|------------|
| Fully Compliant | 5 | 56% |
| Partially Compliant | 3 | 33% |
| Non-Compliant | 1 | 11% |
| **Overall Compliance** | **5 + (3 × 0.5) = 6.5/9** | **72%** |

## Roadmap to Full Compliance

### Phase 1: Critical Compliance (Target: 2025-07-15)
- Implement Apache License 2.0
- Update package.json license field
- Add LICENSE file to repository
- Create initial CONTRIBUTING.md guidelines

### Phase 2: Documentation Enhancement (Target: 2025-07-30)
- Complete API documentation
- Create comprehensive deployment guide for country instances
- Develop contributor guidelines
- Document specific SDG targets supported by DTS

### Phase 3: Technical Compliance (Target: 2025-08-15)
- Implement comprehensive data export functionality
- Document all data formats and schemas
- Create data exchange documentation
- Document dependency management strategy
- Create comprehensive risk assessment framework

### Phase 4: Standards and Impact (Target: 2025-08-30)
- Document all standards followed (W3C, WCAG, etc.)
- Implement accessibility improvements
- Create country-specific compliance guidelines
- Create impact measurement framework
- Submit application to DPG Registry

## Evidence Checklist

### Indicator 1: Relevance to SDGs
- [ ] SDG relevance documentation
- [ ] Impact measurement framework
- [ ] Case studies of DTS implementation
- [ ] Alignment with UN disaster risk reduction frameworks

### Indicator 2: Open Licensing
- [ ] Implemented Apache License 2.0
- [ ] Updated package.json
- [ ] LICENSE file in repository
- [ ] NOTICE file with attribution
- [ ] CONTRIBUTING.md guidelines

### Indicator 3: Clear Ownership
- [ ] Copyright statements in source files
- [ ] Trademark documentation
- [ ] UNDRR ownership documentation
- [ ] Contributor License Agreement (if applicable)

### Indicator 4: Platform Independence
- [ ] Dependency review documentation
- [ ] Compatibility statement
- [ ] Alternative component options
- [ ] Deployment flexibility documentation

### Indicator 5: Documentation
- [ ] Technical documentation
- [ ] API documentation
- [ ] User manuals
- [ ] Deployment guides
- [ ] Administrator guides
- [ ] Developer documentation

### Indicator 6: Data Extraction
- [ ] API documentation
- [ ] Export functionality documentation
- [ ] Data format documentation
- [ ] Bulk export capabilities
- [ ] Data exchange protocols

### Indicator 7: Privacy and Laws
- [ ] Privacy policy
- [ ] GDPR compliance documentation
- [ ] Data protection measures
- [ ] User consent mechanisms
- [ ] Country-specific compliance guidelines

### Indicator 8: Standards Compliance
- [ ] Standards compliance documentation
- [ ] Accessibility compliance (WCAG)
- [ ] Security standards compliance
- [ ] Industry best practices documentation
- [ ] Code quality standards

### Indicator 9: Do No Harm
- [ ] Risk assessment framework
- [ ] Data security measures
- [ ] Content moderation policies
- [ ] User protection mechanisms
- [ ] Incident response procedures

## Risk Assessment

| Risk Area | Risk Level | Potential Impact | Mitigation Strategy |
|-----------|------------|------------------|---------------------|
| **License Implementation** | High | - Inability to qualify as DPG<br>- Legal uncertainty for deployments<br>- Limited community engagement | - Prioritize Apache License 2.0 implementation<br>- Seek legal review<br>- Create clear attribution guidelines |
| **Documentation Gaps** | Medium | - Deployment challenges<br>- Limited adoption<br>- Support burden | - Create comprehensive documentation plan<br>- Prioritize user-facing documentation<br>- Implement documentation review process |
| **Data Extraction Limitations** | Medium | - Limited data interoperability<br>- User frustration<br>- Reduced utility | - Implement comprehensive export functionality<br>- Document all data formats<br>- Create data exchange standards |
| **Standards Compliance** | Medium | - Accessibility issues<br>- Interoperability challenges<br>- Compliance concerns | - Conduct standards audit<br>- Document all standards followed<br>- Implement compliance improvements |
| **Privacy Compliance** | Low | - Legal issues in certain jurisdictions<br>- User trust concerns<br>- Regulatory challenges | - Create country-specific compliance guidelines<br>- Implement robust privacy controls<br>- Regular privacy impact assessments |

## Templates for Missing Documentation

### 1. LICENSE File Template (Apache License 2.0)

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   Copyright 2025 United Nations Office for Disaster Risk Reduction (UNDRR)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

### 2. CONTRIBUTING.md Template

```markdown
# Contributing to UNDRR Disaster Tracking System

Thank you for your interest in contributing to the UNDRR Disaster Tracking System (DTS)!

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct.

## How to Contribute

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Development Setup

[Development environment setup instructions]

## Coding Standards

[Coding standards and guidelines]

## Pull Request Process

[Pull request process details]

## License

By contributing to this project, you agree that your contributions will be licensed under the Apache License 2.0.
```

### 3. Standards Compliance Documentation Template

```markdown
# Standards Compliance Documentation

## Web Standards
- W3C HTML5
- CSS3
- ECMAScript 2022
- WCAG 2.1 AA

## Security Standards
- OWASP Top 10 (2021)
- NIST Cybersecurity Framework
- ISO 27001

## Data Standards
- ISO 8601 for dates and times
- GeoJSON for spatial data
- CSV RFC 4180 for tabular data exports

## Accessibility Standards
- WCAG 2.1 Level AA
- WAI-ARIA 1.1

## Disaster Management Standards
- Sendai Framework for Disaster Risk Reduction
- UNDRR Disaster Loss Accounting Standards
```

### 4. SDG Alignment Documentation Template

```markdown
# Sustainable Development Goals Alignment

The UNDRR Disaster Tracking System directly contributes to the following Sustainable Development Goals:

## SDG 11: Sustainable Cities and Communities
- **Target 11.5**: By 2030, significantly reduce the number of deaths and the number of people affected and substantially decrease the direct economic losses relative to global gross domestic product caused by disasters, including water-related disasters, with a focus on protecting the poor and people in vulnerable situations.
- **Target 11.b**: By 2020, substantially increase the number of cities and human settlements adopting and implementing integrated policies and plans towards inclusion, resource efficiency, mitigation and adaptation to climate change, resilience to disasters, and develop and implement, in line with the Sendai Framework for Disaster Risk Reduction 2015-2030, holistic disaster risk management at all levels.

## SDG 13: Climate Action
- **Target 13.1**: Strengthen resilience and adaptive capacity to climate-related hazards and natural disasters in all countries.
- **Target 13.3**: Improve education, awareness-raising and human and institutional capacity on climate change mitigation, adaptation, impact reduction and early warning.

## Impact Measurement Framework
[Details of how DTS measures impact against these SDG targets]
```

### 5. Data Extraction Documentation Template

```markdown
# Data Extraction Mechanisms

## API Access
- RESTful API endpoints
- Authentication requirements
- Rate limiting
- Example requests and responses

## Export Formats
- CSV
- JSON
- GeoJSON
- Excel

## Bulk Export Capabilities
- Full dataset exports
- Filtered exports
- Scheduled exports

## Data Exchange Protocols
- Webhook integration
- SFTP transfers
- Secure email delivery
```
