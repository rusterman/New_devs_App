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

## Outcome

Main issue was in the **cache layer**.  
Service and API hardening fixes prevent cross-tenant fallback leakage and reduce cent-level precision drift.
