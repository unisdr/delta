/**
 * DisasterCalculations Types
 * 
 * This module defines TypeScript interfaces for disaster impact calculations following
 * international standards and frameworks:
 * 
 * Primary References:
 * 1. Sendai Framework for Disaster Risk Reduction 2015-2030
 *    https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030
 * 
 * 2. UNDRR Technical Guidance for Monitoring and Reporting on Progress (2017)
 *    https://www.preventionweb.net/publication/technical-guidance-monitoring-and-reporting-progress
 * 
 * 3. World Bank Damage and Loss Assessment (DaLA) Methodology
 *    https://openknowledge.worldbank.org/handle/10986/2403
 */

/**
 * Assessment type classifications based on UNDRR Technical Guidance
 * Used to indicate the timing and depth of the damage/loss assessment
 */
export type AssessmentType = 'rapid' | 'detailed';

/**
 * Confidence levels for assessment data quality
 * Based on World Bank DaLA methodology criteria for data verification
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Currency validation type following ISO 4217 standards
 * Used for ensuring consistent currency reporting across assessments
 */
export type Currency = string;

/**
 * Metadata for disaster impact assessments
 * Combines multiple international standard requirements:
 * 
 * 1. Sendai Framework:
 *    - Indicators for economic loss tracking
 *    - Data disaggregation requirements
 * 
 * 2. World Bank DaLA:
 *    - Assessment methodology tracking
 *    - Data quality indicators
 * 
 * 3. UNDRR Technical Guidance:
 *    - Assessment timing classifications
 *    - Confidence level reporting
 */
export interface DisasterImpactMetadata {
    /** Type of assessment conducted (rapid or detailed) */
    assessmentType: AssessmentType;

    /** Confidence level in the assessment data */
    confidenceLevel: ConfidenceLevel;

    /** ISO 4217 currency code for monetary values */
    currency: Currency;

    /** Date when the assessment was conducted */
    assessmentDate: string;

    /** Organization or team that conducted the assessment */
    assessedBy: string;

    /** Additional notes about assessment methodology or limitations */
    notes?: string;
}

/**
 * Comprehensive disaster impact data structure
 * Following Sendai Framework's Target C indicators:
 * 
 * 1. Direct economic loss:
 *    - C-2: Agricultural sector
 *    - C-3: Other productive assets
 *    - C-4: Housing sector
 *    - C-5: Critical infrastructure
 */
export interface DisasterImpactData {
    /** Total direct economic damage (asset destruction) */
    totalDamage: number;

    /** Total economic losses (flow disruptions) */
    totalLoss: number;

    /** Breakdown by sector following Sendai categories */
    sectoralBreakdown: {
        [sectorId: string]: {
            damage: number;
            loss: number;
        };
    };

    /** Assessment metadata and quality indicators */
    metadata: DisasterImpactMetadata;
}

/**
 * Geographic impact aggregation levels
 * Based on UNDRR's guidance for spatial data reporting
 */
export interface GeographicImpactLevel {
    /** Administrative level (1=national, 2=province, etc.) */
    level: number;

    /** Geographic division identifier */
    divisionId: string;

    /** Aggregated impact data for this level */
    impactData: DisasterImpactData;
}

/**
 * Types for standardized disaster impact calculations
 * Following Sendai Framework for Disaster Risk Reduction
 */

export interface DamageCalculation {
    publicRepairCost: number;
    privateRepairCost: number;
    total: number;
    metadata: DisasterImpactMetadata;
}

export interface LossCalculation {
    publicCost: number;
    privateCost: number;
    total: number;
    metadata: DisasterImpactMetadata;
}

export interface DisasterImpactCalculation {
    damages: DamageCalculation;
    losses: LossCalculation;
    disasterId: string;
    locationId?: string;
    sectorId?: string;
    hazardId?: string;
}
