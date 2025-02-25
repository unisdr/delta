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
 * 
 * 4. FAO Damage and Loss Assessment Methodology for Agriculture
 *    https://www.fao.org/resilience/resources/resources-detail/en/c/1273007/
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
 * FAO-specific agricultural sector assessment types
 * Based on FAO's D&L methodology for agriculture
 */
export type FaoAgriSubsector = 'crops' | 'livestock' | 'forestry' | 'aquaculture' | 'fisheries';

/**
 * FAO-specific damage categories for agricultural assets
 */
export interface FaoAgriculturalDamage {
    /** Damage to agricultural assets and infrastructure */
    assets: {
        machinery: number;
        equipment: number;
        facilities: number;
        irrigation: number;
        storage: number;
    };
    
    /** Damage to agricultural resources */
    resources: {
        crops: number;
        livestock: number;
        fishStock: number;
        forestResources: number;
    };
}

/**
 * FAO-specific loss categories for agricultural production
 */
export interface FaoAgriculturalLoss {
    /** Production losses */
    production: {
        cropYieldDecline: number;
        livestockProductivity: number;
        fisheryOutput: number;
        forestryYield: number;
    };

    /** Income losses */
    income: {
        marketAccess: number;
        priceChanges: number;
        tradingDisruption: number;
    };

    /** Additional costs */
    additionalCosts: {
        cleanup: number;
        replanting: number;
        restocking: number;
        diseaseControl: number;
    };
}

/**
 * FAO-specific metadata for agricultural assessments
 */
export interface FaoAssessmentMetadata extends DisasterImpactMetadata {
    /** Agricultural subsector being assessed */
    subsector: FaoAgriSubsector;
    
    /** Pre-disaster baseline data reference period */
    baselinePeriod: string;
    
    /** Post-disaster assessment period */
    assessmentPeriod: string;
    
    /** Local agricultural season/calendar reference */
    seasonalContext?: string;
}

/**
 * Complete FAO agricultural disaster impact assessment
 */
export interface FaoAgriculturalImpact {
    /** Detailed damage breakdown following FAO methodology */
    damage: FaoAgriculturalDamage;
    
    /** Detailed loss breakdown following FAO methodology */
    loss: FaoAgriculturalLoss;
    
    /** FAO-specific assessment metadata */
    metadata: FaoAssessmentMetadata;
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
