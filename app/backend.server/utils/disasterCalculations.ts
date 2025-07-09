/**
 * Disaster Calculations Utility Functions
 *
 * This module provides standardized calculation functions following international
 * disaster assessment methodologies:
 *
 * 1. Sendai Framework for Disaster Risk Reduction 2015-2030
 *    - Target C: Direct economic loss calculation
 *    - Indicators C-2 through C-5 for sectoral losses
 *
 * 2. World Bank DaLA Methodology
 *    - Chapter 3: Damage Assessment Methods
 *    - Chapter 4: Loss Calculation Guidelines
 *
 * 3. UNDRR Technical Guidance (2017)
 *    - Section B: Economic Loss Assessment
 *    - Appendix A: Data Collection Standards
 *
 * 4. FAO Damage and Loss Assessment Methodology
 *    - Agricultural Sector Assessment Framework
 *    - Production Loss Calculation Guidelines
 */

import { SQL, sql } from "drizzle-orm";
import { dr as db } from "~/db.server";
import type {
	DisasterImpactMetadata,
	AssessmentType,
	ConfidenceLevel,
	FaoAgriSubsector,
	FaoAgriculturalDamage,
	FaoAgriculturalLoss,
	FaoAssessmentMetadata,
	FaoAgriculturalImpact,
} from "~/types/disasterCalculations";

/**
 * Calculates total damages following UNDRR and World Bank DaLA methodology:
 * - Partially damaged (PD): Assets that can be repaired
 * - Totally destroyed (TD): Assets requiring complete replacement
 *
 * Aligns with:
 * 1. UNDRR Technical Guidance for Damage Assessment
 * 2. World Bank DaLA Chapter 3.2 - Asset Damage Valuation
 * 3. Sendai Framework Indicator C-2 through C-5
 *
 * @param table - The damages database table
 * @returns SQL query for calculating total damages
 */
export const calculateDamages = (table: any): SQL => {
	return sql`COALESCE(SUM(
        COALESCE(${table}.total_repair_replacement, 0)::numeric +
        COALESCE(${table}.total_recovery, 0)::numeric
    ), 0)::numeric`;
};

/**
 * Calculates total losses following Sendai Framework Target C:
 * - Losses = Changes in economic flows from disaster
 * - Includes revenue losses and additional costs
 * - Covers both public and private sectors
 *
 * Reference: UNDRR Technical Guidance Section B.3
 *
 * @param table - The losses database table
 * @returns SQL query for calculating total losses
 */
export const calculateLosses = (table: any): SQL => {
	return sql`COALESCE(SUM(
        COALESCE(${table}.public_cost_total, 0)::numeric +
        COALESCE(${table}.private_cost_total, 0)::numeric
    ), 0)::numeric`;
};

/**
 * Creates standardized metadata for disaster impact assessments
 * Following UNDRR Technical Guidance and World Bank DaLA methodology
 *
 * @param assessmentType - Type of assessment (rapid or detailed)
 * @param confidenceLevel - Confidence level in the data
 * @returns Standardized metadata object
 */
export const createAssessmentMetadata = async (
	assessmentType: AssessmentType = "rapid",
	confidenceLevel: ConfidenceLevel = "medium"
): Promise<DisasterImpactMetadata> => {
	return {
		assessmentType,
		confidenceLevel,
		currency: "USD", // Use first configured currency or USD as fallback
		assessmentDate: new Date().toISOString(),
		assessedBy: "DTS Analytics System",
		notes: "Automatically generated assessment based on database records",
	};
};

/**
 * Validates currency codes against ISO 4217 standard
 * Used to ensure consistent monetary reporting across assessments
 *
 * @param currency - Currency code to validate
 * @returns true if valid ISO 4217 code
 */
export const validateCurrency = (currency: string): boolean => {
	const iso4217Pattern = /^[A-Z]{3}$/;
	return iso4217Pattern.test(currency);
};

/**
 * Calculates agricultural damage following FAO methodology
 * Covers damage to assets, infrastructure, and resources
 *
 * @param table - The agricultural damages database table
 * @param subsector - Agricultural subsector being assessed
 * @returns Structured agricultural damages data
 */
export const calculateFaoAgriculturalDamage = async (
	table: any,
	subsector: FaoAgriSubsector
): Promise<FaoAgriculturalDamage> => {
	type AssetDamages = {
		machinery: string;
		equipment: string;
		facilities: string;
		irrigation: string;
		storage: string;
	};

	type ResourceDamages = {
		resource_damage: string;
	};

	const defaultAssetDamages: AssetDamages = {
		machinery: "0",
		equipment: "0",
		facilities: "0",
		irrigation: "0",
		storage: "0",
	};

	const defaultResourceDamages: ResourceDamages = {
		resource_damage: "0",
	};

	const assetResults = (await db.execute(sql`
        SELECT
            COALESCE(SUM(${table}.machinery_damage), 0)::numeric as machinery,
            COALESCE(SUM(${table}.equipment_damage), 0)::numeric as equipment,
            COALESCE(SUM(${table}.facilities_damage), 0)::numeric as facilities,
            COALESCE(SUM(${table}.irrigation_damage), 0)::numeric as irrigation,
            COALESCE(SUM(${table}.storage_damage), 0)::numeric as storage
        FROM ${table}
    `)) as unknown as AssetDamages[];

	const resourceResults = (await db.execute(sql`
        SELECT
            CASE '${subsector}'
                WHEN 'crops' THEN COALESCE(SUM(${table}.crop_damage), 0)::numeric
                WHEN 'livestock' THEN COALESCE(SUM(${table}.livestock_damage), 0)::numeric
                WHEN 'fisheries' THEN COALESCE(SUM(${table}.fish_stock_damage), 0)::numeric
                WHEN 'forestry' THEN COALESCE(SUM(${table}.forest_damage), 0)::numeric
                ELSE 0
            END as resource_damage
        FROM ${table}
    `)) as unknown as ResourceDamages[];

	const assetResult = assetResults[0] || defaultAssetDamages;
	const resourceResult = resourceResults[0] || defaultResourceDamages;

	return {
		assets: {
			machinery: Number(assetResult.machinery),
			equipment: Number(assetResult.equipment),
			facilities: Number(assetResult.facilities),
			irrigation: Number(assetResult.irrigation),
			storage: Number(assetResult.storage),
		},
		resources: {
			crops: subsector === "crops" ? Number(resourceResult.resource_damage) : 0,
			livestock:
				subsector === "livestock" ? Number(resourceResult.resource_damage) : 0,
			fishStock:
				subsector === "fisheries" ? Number(resourceResult.resource_damage) : 0,
			forestResources:
				subsector === "forestry" ? Number(resourceResult.resource_damage) : 0,
		},
	};
};

/**
 * Calculates agricultural losses following FAO methodology
 * Includes production losses, income losses, and additional costs
 *
 * @param table - The agricultural losses database table
 * @param subsector - Agricultural subsector being assessed
 * @returns Structured agricultural losses data
 */
export const calculateFaoAgriculturalLoss = async (
	table: any,
	subsector: FaoAgriSubsector
): Promise<FaoAgriculturalLoss> => {
	type ProductionLosses = {
		production_loss: string;
	};

	type IncomeLosses = {
		market_access: string;
		price_changes: string;
		trading_disruption: string;
	};

	type AdditionalCosts = {
		cleanup: string;
		replanting: string;
		restocking: string;
		disease_control: string;
	};

	const defaultProductionLosses: ProductionLosses = {
		production_loss: "0",
	};

	const defaultIncomeLosses: IncomeLosses = {
		market_access: "0",
		price_changes: "0",
		trading_disruption: "0",
	};

	const defaultAdditionalCosts: AdditionalCosts = {
		cleanup: "0",
		replanting: "0",
		restocking: "0",
		disease_control: "0",
	};

	const productionResults = (await db.execute(sql`
        SELECT
            CASE '${subsector}'
                WHEN 'crops' THEN COALESCE(SUM(${table}.crop_yield_decline), 0)::numeric
                WHEN 'livestock' THEN COALESCE(SUM(${table}.livestock_productivity_loss), 0)::numeric
                WHEN 'fisheries' THEN COALESCE(SUM(${table}.fishery_output_loss), 0)::numeric
                WHEN 'forestry' THEN COALESCE(SUM(${table}.forestry_yield_loss), 0)::numeric
                ELSE 0
            END as production_loss
        FROM ${table}
    `)) as unknown as ProductionLosses[];

	const incomeResults = (await db.execute(sql`
        SELECT
            COALESCE(SUM(${table}.market_access_loss), 0)::numeric as market_access,
            COALESCE(SUM(${table}.price_change_loss), 0)::numeric as price_changes,
            COALESCE(SUM(${table}.trading_disruption_loss), 0)::numeric as trading_disruption
        FROM ${table}
    `)) as unknown as IncomeLosses[];

	const costResults = (await db.execute(sql`
        SELECT
            COALESCE(SUM(${table}.cleanup_cost), 0)::numeric as cleanup,
            COALESCE(SUM(${table}.replanting_cost), 0)::numeric as replanting,
            COALESCE(SUM(${table}.restocking_cost), 0)::numeric as restocking,
            COALESCE(SUM(${table}.disease_control_cost), 0)::numeric as disease_control
        FROM ${table}
    `)) as unknown as AdditionalCosts[];

	const productionResult = productionResults[0] || defaultProductionLosses;
	const incomeResult = incomeResults[0] || defaultIncomeLosses;
	const costsResult = costResults[0] || defaultAdditionalCosts;

	return {
		production: {
			cropYieldDecline:
				subsector === "crops" ? Number(productionResult.production_loss) : 0,
			livestockProductivity:
				subsector === "livestock"
					? Number(productionResult.production_loss)
					: 0,
			fisheryOutput:
				subsector === "fisheries"
					? Number(productionResult.production_loss)
					: 0,
			forestryYield:
				subsector === "forestry" ? Number(productionResult.production_loss) : 0,
		},
		income: {
			marketAccess: Number(incomeResult.market_access),
			priceChanges: Number(incomeResult.price_changes),
			tradingDisruption: Number(incomeResult.trading_disruption),
		},
		additionalCosts: {
			cleanup: Number(costsResult.cleanup),
			replanting: Number(costsResult.replanting),
			restocking: Number(costsResult.restocking),
			diseaseControl: Number(costsResult.disease_control),
		},
	};
};

/**
 * Calculates complete agricultural impact following FAO methodology
 * Combines damage and loss calculations with metadata
 *
 * @param damageTable - Agricultural damages table
 * @param lossTable - Agricultural losses table
 * @param subsector - Agricultural subsector
 * @param metadata - Assessment metadata
 * @returns Complete agricultural impact assessment
 */
export const calculateFaoAgriculturalImpact = async (
	damageTable: any,
	lossTable: any,
	subsector: FaoAgriSubsector,
	metadata: FaoAssessmentMetadata
): Promise<FaoAgriculturalImpact> => {
	const [damage, loss] = await Promise.all([
		calculateFaoAgriculturalDamage(damageTable, subsector),
		calculateFaoAgriculturalLoss(lossTable, subsector),
	]);

	return {
		damage,
		loss,
		metadata,
	};
};

/**
 * Creates FAO-specific metadata for agricultural assessments
 * Following FAO D&L Assessment Framework
 *
 * @param subsector - Agricultural subsector being assessed
 * @param baselinePeriod - Pre-disaster reference period
 * @param assessmentPeriod - Post-disaster assessment period
 * @param seasonalContext - Optional seasonal context
 * @returns FAO assessment metadata object
 */
export const createFaoAssessmentMetadata = async (
	subsector: FaoAgriSubsector,
	baselinePeriod: string,
	assessmentPeriod: string,
	seasonalContext?: string
): Promise<FaoAssessmentMetadata> => {
	const baseMetadata = await createAssessmentMetadata();
	return {
		...baseMetadata,
		subsector,
		baselinePeriod,
		assessmentPeriod,
		seasonalContext,
	};
};
