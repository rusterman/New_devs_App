# Property Revenue Dashboard - Findings

## Problem Summary

- Same `property_id` could show identical revenue across different clients (tenant leak risk).
- Finance reported occasional cent-level mismatches.

## Assumptions During Investigation

- Overlapping property IDs across tenants in `database/seed.sql` are intentional.
- SQL aggregation is expected to isolate by `tenant_id`.

## Root Causes

1. `backend/app/services/cache.py` used cache key `revenue:{property_id}` (missing tenant scope).
2. `backend/app/services/reservations.py` DB-fallback mock values were keyed only by `property_id`.
3. `backend/app/api/v1/dashboard.py` converted totals directly to float.

## Fixes Implemented

- **Cache isolation**: changed key to `revenue:{tenant_id}:{property_id}`.
- **Tenant-safe fallback**: fallback mock data now keyed by `(tenant_id, property_id)`.
- **Precision hardening**: dashboard totals quantized to 2 decimals using `Decimal(..., ROUND_HALF_UP)`.
- **Safety check**: dashboard now requires tenant context instead of silently using a default tenant.
- **Tenant-scoped property selector**: replaced hardcoded property list in `frontend/src/components/Dashboard.tsx` with `SecureAPI.getAllProperties()` data.
- **Monthly revenue implementation**: replaced placeholder `0` in `calculate_monthly_revenue()` with real tenant-scoped SQL aggregation using property-local timezone month boundaries.

## How We Found Extra Issues (Short)

- **Property list issue**: both users saw same dropdown options; code review showed hardcoded `PROPERTIES` array in dashboard.
- **Monthly revenue issue**: service review showed `calculate_monthly_revenue()` returned constant `0`, not DB data.
- **Timezone boundary validation**: `res-tz-1` (`2024-02-29 23:30:00+00`) becomes `2024-03-01 00:30:00` in `Europe/Paris`; March total for `tenant-a/prop-001` is `2250.000` with local-time filtering vs `1000.000` with naive UTC filtering.

## Outcome

Main issue was in the **cache layer**.  
Service, API, and frontend fixes now enforce tenant isolation across dashboard data and property selection, with monthly totals no longer hardcoded to zero.
