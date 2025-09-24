import { useState, useEffect } from "react";
import { Field } from "~/frontend/form";

interface Organization {
  id: string;
  name: string;
}

interface OrganizationAutocompleteProps {
  selectedOrganization?: string;
  organizations: Organization[];
  label?: string;
  id?: string;
}

/**
 * Organization autocomplete component for selecting from a predefined list
 * Includes an "Other" option and supports filtering by text input
 */
export function OrganizationAutocomplete({
  selectedOrganization = "",
  organizations = [],
  label = "Recording organization",
  id = "recordingOrganization"
}: OrganizationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(selectedOrganization);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>(organizations);
  
  // Add "Other" option to the organizations list if not already present
  const orgsWithOther = [...organizations];
  if (!orgsWithOther.some(org => org.id === "other")) {
    orgsWithOther.push({ id: "other", name: "Other" });
  }

  // Filter organizations based on input value
  useEffect(() => {
    if (inputValue.trim() === "") {
      setFilteredOrganizations(orgsWithOther);
    } else {
      const filtered = orgsWithOther.filter(org => 
        org.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOrganizations(filtered);
    }
  }, [inputValue, organizations]);

  // Handle selection of an organization
  const handleSelect = (org: Organization) => {
    setInputValue(org.name);
    setIsOpen(false);
  };

  return (
    <div className="dts-form-component">
      <Field label={label}>
        <div className="dts-autocomplete">
          <input
            type="text"
            name={id}
            id={id}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              // Delay closing to allow for click on options
              setTimeout(() => setIsOpen(false), 200);
            }}
            aria-label={label}
            aria-autocomplete="list"
            aria-controls={`${id}-list`}
            aria-expanded={isOpen}
          />
          {isOpen && filteredOrganizations.length > 0 && (
            <ul 
              className="dts-autocomplete__list" 
              id={`${id}-list`}
              role="listbox"
            >
              {filteredOrganizations.map(org => (
                <li 
                  key={org.id}
                  onClick={() => handleSelect(org)}
                  role="option"
                  aria-selected={inputValue === org.name}
                >
                  {org.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>
    </div>
  );
}
