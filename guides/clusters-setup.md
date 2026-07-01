---
title: Creating and Managing Clusters
description: Step-by-step guide to provisioning and managing compute engine clusters
tags: [clusters, compute, setup, provisioning]
---

# Creating and Managing Clusters

This guide walks you through the complete lifecycle of managing compute engine clusters.

## Prerequisites

- Valid Bearer token authentication
- A config ID for your cluster (get list from `/configs`)
- Access to Teradata Global Compute API

## Step 1: List Available Configurations

First, see what configurations are available:

```
GET /configs?site_id=TDICAM33431DV45
```

This returns all available compute engine configurations for your site.

**Example Response:**
```json
{
  "data": {
    "items": [
      {
        "compute_engine_config_id": "CEAMGPSCTEAM0006U",
        "name": "standard-config",
        "description": "Standard compute engine config",
        "state": "ACTIVE"
      }
    ]
  }
}
```

## Step 2: Create a Cluster

Once you have a config ID, create a cluster:

```
POST /clusters
{
  "config_id": "CEAMGPSCTEAM0006U"
}
```

The API returns **202 Accepted** (asynchronous operation).

**Response includes:**
- `component_id` — Unique cluster identifier
- `status` — Current status (usually "PROVISIONING")
- `links` — Links to monitor progress

## Step 3: Monitor Provisioning

Check cluster status with:

```
GET /clusters/{component_id}
```

The cluster will progress through states:
1. **PROVISIONING** — Infrastructure being created
2. **RUNNING** — Ready to use
3. **STOPPING** — Shutdown in progress
4. **STOPPED** — Offline

Poll this endpoint until `status` equals "RUNNING".

## Step 4: List All Clusters

See all clusters for a site:

```
GET /clusters?site_id=TDICAM33431DV45
```

Supports filtering by:
- `name` — Cluster name
- `status` — Current status
- `desired_status` — Target status
- `pooling` — Filter by pool/dedicated

## Step 5: Delete a Cluster

When done, delete the cluster:

```
DELETE /clusters/{component_id}
```

Returns **202 Accepted**. Deletion is asynchronous and may take several minutes.

## Common Errors

### 409 Conflict — "Component name already exists"
**Cause:** Cluster name is not unique  
**Solution:** Use a different name or wait for old cluster to fully delete

### 404 Not Found — "Metadata config not found"
**Cause:** Invalid config_id  
**Solution:** Verify config_id exists with `GET /configs`

### 403 Forbidden — "Permission denied"
**Cause:** Bearer token lacks permissions  
**Solution:** Check token has appropriate roles/scopes

## Best Practices

1. **Monitor provisioning** — Don't assume cluster is ready immediately
2. **Use meaningful names** — Include environment/project in cluster name
3. **Set up auto-suspend** — Configure idle timeout to save costs
4. **Tag resources** — Use labels/metadata for cost tracking
5. **Clean up** — Delete clusters you're no longer using
