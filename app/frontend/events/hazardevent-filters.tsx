import { Form } from '@remix-run/react';
import { useState, useEffect } from 'react';

interface Organization {
	id: string;
	name: string;
}

interface HazardousEventFiltersProps {
	// Filter values
	hipHazardId?: string;
	hipClusterId?: string;
	hipTypeId?: string;
	fromDate?: string;
	toDate?: string;
	recordingOrganization?: string;
	hazardousEventStatus?: string;
	recordStatus?: string;
	viewMyRecords?: boolean;
	pendingMyAction?: boolean;
	search?: string;

	// Data for dropdowns
	hip: any;
	organizations: Organization[];

	// URL for clearing filters
	clearFiltersUrl: string;
}

// Define constant options for dropdowns
const EVENT_STATUS_OPTIONS = [
	{ value: 'forecasted', label: 'Forecasted' },
	{ value: 'ongoing', label: 'Ongoing' },
	{ value: 'passed', label: 'Passed' },
];

export const RECORD_STATUS_OPTIONS = [
	{ value: 'draft', label: 'Draft' },
	{ value: 'waiting-for-validation', label: 'Waiting for validation' },
	{ value: 'needs-revision', label: 'Needs revision' },
	{ value: 'validated', label: 'Validated' },
	{ value: 'published', label: 'Published' },
];

/**
 * Specialized filter component for hazardous events
 * Implements all required filters based on business requirements
 */
export function HazardousEventFilters({
	hipHazardId = '',
	hipClusterId = '',
	hipTypeId = '',
	fromDate = '',
	toDate = '',
	recordingOrganization = '',
	hazardousEventStatus = '',
	recordStatus = '',
	// viewMyRecords = false,
	// pendingMyAction = false,
	search = '',
	hip,
	clearFiltersUrl,
}: HazardousEventFiltersProps) {
	// State for autocomplete functionality
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedHazardId, setSelectedHazardId] = useState(hipHazardId || '');
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedTypeId, setSelectedTypeId] = useState(hipTypeId || '');
	const [selectedClusterId, setSelectedClusterId] = useState(hipClusterId || '');

	// Initialize search term with hazard name if hazard ID is provided
	useEffect(() => {
		if (hipHazardId && hip.hazards) {
			const hazard = hip.hazards.find((h: any) => h.id === hipHazardId);
			if (hazard) {
				setSearchTerm(hazard.name);
			}
		}
	}, [hipHazardId, hip.hazards]);

	// Filter hazards based on search term and selected cluster  (we only have Id, clusterId and name)
	// { id: '78470', clusterId: '1054', name: 'Rinderpest (Animal)' }
	const filteredHazards =
		hip.hazards?.filter((hazard: any) => {
			const matchesSearch =
				hazard.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				hazard.id?.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCluster = !selectedClusterId || hazard.clusterId === selectedClusterId;
			return matchesSearch && matchesCluster;
		}) || [];

	// Filter clusters based on selected type
	const filteredClusters =
		hip.clusters?.filter((cluster: any) => {
			return !selectedTypeId || cluster.typeId === selectedTypeId;
		}) || [];

	// Handle hazard selection from autocomplete
	const handleHazardSelect = (hazard: any) => {
		setSearchTerm(hazard.name);
		setSelectedHazardId(hazard.id); // Store the actual hazard ID
		setShowDropdown(false);

		// Auto-select the related cluster and type
		const relatedCluster = hip.clusters?.find((c: any) => c.id === hazard.clusterId);
		if (relatedCluster) {
			setSelectedClusterId(relatedCluster.id);
			const relatedType = hip.types?.find((t: any) => t.id === relatedCluster.typeId);
			if (relatedType) {
				setSelectedTypeId(relatedType.id);
			}
		}
	};

	return (
		<div
			style={{
				width: '100%',
				margin: '0 0 2.4rem',
				maxWidth: '100%',
				overflow: 'hidden',
			}}
		>
			<Form className="dts-form" method="get" style={{ padding: 0 }}>
				<div className="dts-form__body">
					{/* First Row: Hazard Classification - 3 columns */}
					<div className="mg-grid mg-grid__col-3">
						<div className="dts-form-component">
							<label htmlFor="hipTypeId" className="dts-form-component__label">
								Hazard type
							</label>
							<select
								id="hipTypeId"
								name="hipTypeId"
								value={selectedTypeId}
								onChange={(e) => {
									setSelectedTypeId(e.target.value);
									setSelectedClusterId(''); // Reset cluster when type changes
									setSearchTerm(''); // Reset hazard search
								}}
							>
								<option value="">All hazard types</option>
								{hip.types?.map((type: any) => (
									<option key={type.id} value={type.id}>
										{type.name}
									</option>
								))}
							</select>
						</div>

						<div className="dts-form-component">
							<label htmlFor="hipClusterId" className="dts-form-component__label">
								Cluster
							</label>
							<select
								id="hipClusterId"
								name="hipClusterId"
								value={selectedClusterId}
								onChange={(e) => {
									setSelectedClusterId(e.target.value);
									setSearchTerm(''); // Reset hazard search when cluster changes
								}}
							>
								<option value="">All clusters</option>
								{filteredClusters.map((cluster: any) => (
									<option key={cluster.id} value={cluster.id}>
										{cluster.name}
									</option>
								))}
							</select>
						</div>

						<div className="dts-form-component" style={{ position: 'relative' }}>
							<label htmlFor="hipHazardId-display" className="dts-form-component__label">
								Specific hazard
							</label>
							<input
								type="text"
								id="hipHazardId-display"
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setSelectedHazardId(''); // Clear selection when typing
									setShowDropdown(true);
								}}
								onFocus={() => setShowDropdown(true)}
								onBlur={() => {
									// Delay hiding dropdown to allow for clicks
									setTimeout(() => setShowDropdown(false), 200);
								}}
								placeholder="Enter hazard name or HIPS code..."
							/>
							{/* Hidden input that contains the actual hazard ID for form submission */}
							<input type="hidden" name="hipHazardId" value={selectedHazardId} />
							{showDropdown && searchTerm && filteredHazards.length > 0 && (
								<ul
									style={{
										position: 'absolute',
										top: '100%',
										left: 0,
										right: 0,
										backgroundColor: 'white',
										border: '1px solid #ccc',
										borderTop: 'none',
										borderRadius: '0 0 4px 4px',
										maxHeight: '200px',
										overflowY: 'auto',
										zIndex: 1000,
										listStyle: 'none',
										margin: 0,
										padding: 0,
										display: 'inline-block',
										boxShadow: '0 2px 4px rgba(9, 3, 3, 0.1)',
									}}
								>
									{filteredHazards.slice(0, 20).map((hazard: any) => (
										<li
											key={hazard.id}
											onClick={() => handleHazardSelect(hazard)}
											style={{
												padding: '5px 12px',
												margin: 0,
												cursor: 'pointer',
											}}
											onMouseEnter={(e) => {
												(e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
											}}
											onMouseLeave={(e) => {
												(e.target as HTMLElement).style.backgroundColor = 'white';
											}}
										>
											{hazard.name}
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					{/* Second Row: Date Range and Organization - 3 columns */}
					<div className="mg-grid mg-grid__col-3">
						<div className="dts-form-component">
							<label htmlFor="fromDate" className="dts-form-component__label">
								From
							</label>
							<input type="date" id="fromDate" name="fromDate" defaultValue={fromDate} />
						</div>

						<div className="dts-form-component">
							<label htmlFor="toDate" className="dts-form-component__label">
								To
							</label>
							<input type="date" id="toDate" name="toDate" defaultValue={toDate} />
						</div>

						<div className="dts-form-component">
							<label htmlFor="recordingOrganization" className="dts-form-component__label">
								Recording organization
							</label>
							<input
								type="text"
								id="recordingOrganization"
								name="recordingOrganization"
								defaultValue={recordingOrganization}
								placeholder="Search organization..."
							/>
						</div>
					</div>

					{/* Third Row: Status Dropdowns - 2 columns */}
					<div className="mg-grid mg-grid__col-2">
						<div className="dts-form-component">
							<label htmlFor="hazardousEventStatus" className="dts-form-component__label">
								Hazardous event status
							</label>
							<select
								id="hazardousEventStatus"
								name="hazardousEventStatus"
								defaultValue={hazardousEventStatus}
							>
								<option value="">All event statuses</option>
								{EVENT_STATUS_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>

						<div className="dts-form-component">
							<label htmlFor="recordStatus" className="dts-form-component__label">
								Record status
							</label>
							<select id="recordStatus" name="recordStatus" defaultValue={recordStatus}>
								<option value="">All record statuses</option>
								{RECORD_STATUS_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="dts-form__actions">
						<input type="submit" className="mg-button mg-button-primary" value="Apply filters" />
						<a href={clearFiltersUrl} className="mg-button mg-button-outline">
							Clear
						</a>
					</div>

					{/* Fourth Row: Checkboxes and Action Buttons
          <div className="dts-form__actions dts-form__actions--standalone" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div className="dts-form-component">
                <label htmlFor="viewMyRecords" className="dts-form-component__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="viewMyRecords"
                    name="viewMyRecords"
                    defaultChecked={viewMyRecords}
                  />
                  View my records
                </label>
              </div>

              <div className="dts-form-component">
                <label htmlFor="pendingMyAction" className="dts-form-component__label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="pendingMyAction"
                    name="pendingMyAction"
                    defaultChecked={pendingMyAction}
                  />
                  Pending my action
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <a href={clearFiltersUrl} className="mg-button mg-button-outline mg-button--small">
                Clear
              </a>
              <button
                type="submit"
                className="mg-button mg-button--small mg-button-primary"
              >
                Apply filters
              </button>
            </div>
          </div> */}

					{/* Hidden search field to maintain compatibility */}
					{search && <input type="hidden" name="search" value={search} />}
				</div>
			</Form>
		</div>
	);
}
