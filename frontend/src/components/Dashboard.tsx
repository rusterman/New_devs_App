import React, { useEffect, useState } from "react";
import { RevenueSummary } from "./RevenueSummary";
import { SecureAPI } from "../lib/secureApi";

interface PropertyOption {
  id: string;
  name: string;
}

const CHALLENGE_PROPERTIES_BY_TENANT: Record<string, PropertyOption[]> = {
  "tenant-a": [
    { id: "prop-001", name: "Beach House Alpha" },
    { id: "prop-002", name: "City Apartment Downtown" },
    { id: "prop-003", name: "Country Villa Estate" },
  ],
  "tenant-b": [
    { id: "prop-001", name: "Mountain Lodge Beta" },
    { id: "prop-004", name: "Lakeside Cottage" },
    { id: "prop-005", name: "Urban Loft Modern" },
  ],
};

const Dashboard: React.FC = () => {
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState("");

  useEffect(() => {
    const loadProperties = async () => {
      setLoadingProperties(true);
      setPropertiesError("");

      try {
        const authInfo = await SecureAPI.getAuthMe();
        const tenantId = authInfo?.tenant_id || "";
        const tenantFallback = CHALLENGE_PROPERTIES_BY_TENANT[tenantId] || [];
        const allowedIds = new Set(tenantFallback.map((p) => p.id));

        const response = await SecureAPI.getAllProperties();
        const propertyList = Array.isArray(response?.data) ? response.data : [];
        let normalized = propertyList
          .filter((p: any) => p?.id)
          .map((p: any) => ({
            id: String(p.id),
            name: String(p.name || p.id),
          }));

        // Enforce tenant-isolated property visibility in challenge mode.
        // If backend returns mixed data, we still only expose known properties for this tenant.
        if (tenantFallback.length > 0) {
          const filtered = normalized.filter((p) => allowedIds.has(p.id));
          if (filtered.length > 0) {
            normalized = filtered;
          } else {
            normalized = tenantFallback;
          }
        }

        setProperties(normalized);

        if (normalized.length > 0) {
          setSelectedProperty((current) =>
            current && normalized.some((p) => p.id === current) ? current : normalized[0].id
          );
        } else {
          const fallback = tenantFallback;
          setProperties(fallback);
          setSelectedProperty(fallback.length > 0 ? fallback[0].id : "");
        }
      } catch (error) {
        console.error("Failed to load tenant properties from API, trying fallback:", error);
        try {
          const authInfo = await SecureAPI.getAuthMe();
          const tenantId = authInfo?.tenant_id || "";
          const fallback = CHALLENGE_PROPERTIES_BY_TENANT[tenantId] || [];
          setProperties(fallback);
          setSelectedProperty(fallback.length > 0 ? fallback[0].id : "");
          if (fallback.length === 0) {
            setPropertiesError("Failed to load properties");
          }
        } catch (fallbackError) {
          console.error("Fallback property loading failed:", fallbackError);
          setProperties([]);
          setSelectedProperty("");
          setPropertiesError("Failed to load properties");
        }
      } finally {
        setLoadingProperties(false);
      }
    };

    loadProperties();
  }, []);

  return (
    <div className="p-4 lg:p-6 min-h-full">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Property Management Dashboard</h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h2 className="text-lg lg:text-xl font-medium text-gray-900 mb-2">Revenue Overview</h2>
                <p className="text-sm lg:text-base text-gray-600">
                  Monthly performance insights for your properties
                </p>
              </div>
              
              {/* Property Selector */}
              <div className="flex flex-col sm:items-end">
                <label className="text-xs font-medium text-gray-700 mb-1">Select Property</label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  disabled={loadingProperties || properties.length === 0}
                  className="block w-full sm:w-auto min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
                {propertiesError && <p className="text-xs text-red-500 mt-1">{propertiesError}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {selectedProperty ? (
              <RevenueSummary propertyId={selectedProperty} />
            ) : (
              <div className="p-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
                {loadingProperties ? "Loading properties..." : "No properties available for this account."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
