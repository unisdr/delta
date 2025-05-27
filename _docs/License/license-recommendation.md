# UNDRR DTS License Recommendation Document

## Executive Summary

The UNDRR Disaster Tracking System (DTS) currently has an "UNLICENSED" status in its package.json, which limits its ability to function as a Digital Public Good (DPG) and restricts broader adoption. After thorough analysis of the project's requirements, dependency landscape, and international usage context, we **recommend the Apache License 2.0** for the DTS platform. This license provides superior patent protection, better alignment with international deployment needs, stronger governance framework for country-level implementations, and full compatibility with all existing dependencies while meeting DPG compliance requirements.

## 1. Current Situation Analysis

### License Status Assessment

The DTS platform is currently marked as "UNLICENSED" in package.json with the "private" flag set to true. This configuration:

- Prevents legal redistribution of the codebase
- Blocks contributions from the open-source community
- Creates uncertainty around deployment rights for country-level instances
- Fails to meet DPG compliance requirements
- Limits the project's potential impact as a global public good

### Impact of Unlicensed Status

The absence of a proper open-source license has several negative consequences:

- **Deployment Barriers**: Countries cannot legally deploy their own instances without explicit permission
- **Contribution Obstacles**: External developers cannot contribute improvements
- **Compliance Failure**: The project cannot qualify as a Digital Public Good
- **Limited Collaboration**: UN agencies and NGOs cannot easily integrate or extend the platform
- **Sustainability Risks**: Long-term maintenance depends solely on UNDRR resources

### Urgency of License Selection

Selecting an appropriate license is a critical priority because:

1. The DPG application process (GitHub issue #159) requires a compliant open-source license
2. Country-level deployments need clear legal terms for implementation
3. The international disaster response community needs certainty about usage rights
4. The development community requires clear contribution guidelines
5. The project's sustainability depends on broader adoption and contribution

## 2. License Comparison Summary

| Feature | MIT License | Apache License 2.0 |
|---------|------------|-------------------|
| **Length & Complexity** | ~150 words, very simple | ~1000 words, more structured |
| **Patent Protection** | No explicit protection | Explicit grant and termination provisions |
| **Attribution Requirements** | Simple (copyright + license) | More detailed (notices, NOTICE file) |
| **Trademark Protection** | None | Explicit provisions |
| **Contribution Framework** | Minimal | Well-defined |
| **Modification Terms** | Basic | Structured with clear guidelines |
| **DPG Compliance** | Meets minimum requirements | Meets requirements with enhanced protections |
| **International Deployment** | Basic framework | Better suited for government implementations |
| **Dependency Compatibility** | Compatible with all project dependencies | Compatible with all project dependencies |
| **Community Adoption** | Very widespread (624 packages) | Less common but used by key components (TypeScript) |

## 3. Recommendation and Rationale

### Recommendation: Apache License 2.0

After careful analysis, we recommend adopting the **Apache License 2.0** for the UNDRR Disaster Tracking System (DTS) platform. This recommendation is based on the following key factors:

### Key Justifications

1. **Superior Patent Protection**
   - Apache 2.0 includes explicit patent grants and termination provisions
   - Protects country implementations from potential patent litigation
   - Provides greater legal certainty for international deployments
   - Safeguards the technology as it scales across multiple jurisdictions
   - Critical for government-level implementations with higher legal scrutiny

2. **International Deployment Framework**
   - Better structured for government and institutional adoption
   - Provides clearer terms for country-level customizations
   - More aligned with public sector legal requirements
   - Offers stronger protection for international collaborations
   - Supports the UN's global mission and multi-stakeholder engagement

3. **Digital Public Goods Alignment**
   - Exceeds minimum DPG requirements with enhanced protections
   - Better supports sustainable development goals through stronger governance
   - Provides clearer framework for public infrastructure deployment
   - Enhances protection for public good aspects of the technology
   - Aligns with other major digital public infrastructure initiatives

4. **Dependency Compatibility**
   - Fully compatible with all existing project dependencies
   - Already used by TypeScript, a core project dependency
   - No conflicts with MIT, ISC, BSD, or other permissive licenses
   - Provides seamless integration with the existing technology stack
   - Maintains legal clarity across the entire dependency tree

5. **Governance and Sustainability**
   - Provides stronger framework for long-term governance
   - Better supports multi-stakeholder contributions
   - Clearer terms for modifications and derivative works
   - Enhanced protection for the project's integrity
   - More structured approach to community development

6. **UN System Alignment**
   - Better aligned with UN's intellectual property policies
   - More suitable for international public sector deployment
   - Provides stronger protection for UN-developed technology
   - Better supports the UN's mission of global public goods
   - Enhanced framework for international collaboration

## 4. Risk Assessment

### Potential Risks of Apache 2.0

1. **Complexity**
   - Apache 2.0 is longer and more complex than MIT
   - May require more legal review by adopting countries
   - **Mitigation**: Provide simplified guidance documentation for implementers

2. **Contribution Barriers**
   - More detailed contribution requirements
   - May deter casual contributors
   - **Mitigation**: Create clear contribution guidelines with templates

3. **Compliance Overhead**
   - Requires maintaining NOTICE files
   - More detailed attribution requirements
   - **Mitigation**: Implement automated compliance checking in CI/CD

4. **Community Familiarity**
   - Less commonly used than MIT in JavaScript ecosystem
   - May require additional explanation
   - **Mitigation**: Provide clear documentation on license implications

### Alternative Scenario

If Apache 2.0 is not accepted, MIT License would be the recommended alternative because:
- It meets minimum DPG requirements
- It's compatible with all dependencies
- It's widely understood in the developer community
- It provides basic open-source protections
- It has minimal compliance overhead

However, MIT would lack the patent protections, governance framework, and international deployment protections that make Apache 2.0 more suitable for this project.

## 5. Appendices

### Appendix A: License Compatibility Matrix

| License | Compatible with Apache 2.0 | Notes |
|---------|----------------------------|-------|
| MIT | Yes | No conflicts |
| ISC | Yes | Similar to MIT |
| BSD-2-Clause | Yes | No conflicts |
| BSD-3-Clause | Yes | No conflicts |
| Unlicense | Yes | Public domain |
| CC0-1.0 | Yes | Public domain dedication |

### Appendix B: DPG Compliance Verification

The Apache License 2.0:
- Is OSI-approved (DPG requirement)
- Allows free redistribution (DPG requirement)
- Permits modifications (DPG requirement)
- Enables commercial use (DPG requirement)
- Provides non-discrimination (DPG requirement)
- Supports technology neutrality (DPG requirement)

### Appendix C: Implementation Resources

- [Apache License 2.0 Text](https://www.apache.org/licenses/LICENSE-2.0.txt)
- [Apache License 2.0 How-to](https://www.apache.org/dev/apply-license.html)
- [SPDX License Identifier](https://spdx.org/licenses/Apache-2.0.html)
- [GitHub License Selection](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [DPG License Requirements](https://digitalpublicgoods.net/standard/)
