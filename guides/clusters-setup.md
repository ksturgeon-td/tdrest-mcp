---
title: Creating and Managing Clusters
description: Understand configs vs clusters and manage the full lifecycle
tags: [clusters, compute, setup, provisioning, configs]
---

# Creating and Managing Clusters

This guide explains the key distinction between **configs** (reusable templates) and **clusters** (active instances), and walks you through managing both.

## Architecture Overview

**Configs** (`/configs`) are templates/blueprints defining compute specifications:
- CPU, memory, storage specifications (1x, 2x, 4x, etc.)
- Resource type: DEDICATED or POOLED
- Networking configuration (Internet, PrivateLink, etc.)
- Auto-suspend policies and auto-scaling settings
- IDP/authentication settings
- Can be created once and reused for many clusters
- Updated via PATCH, removed via DELETE

**Clusters** (`/clusters`) are active running instances spawned from configs:
- Created by POSTing a `config_id` to `/clusters`
- Each cluster gets a unique `component_id`
- Multiple clusters can run from the same config simultaneously
- Lifecycle: PROVISIONING → RUNNING → STOPPING → STOPPED
- Stopped clusters can be restarted without recreating
- "Delete" a cluster to stop it (asynchronous shutdown)

## Part 1: Managing Configurations (Templates)

### List Available Configs

See all available config templates:

```
GET /configs?site_id=TDICAM33431DV45
```

**Example Response:**
```json
{
  "data": {
    "items": [
      {
        "compute_engine_config_id": "CEAMGPSCTEAM0006U",
        "name": "standard-config",
        "description": "Standard compute engine config",
        "state": "ACTIVE",
        "compute": {
          "type": "DEDICATED",
          "size": "2x"
        }
      }
    ]
  }
}
```

### Create a New Config

Define a reusable template for launching clusters:

```
POST /configs
{
  "name": "my-project-config",
  "site_id": "TDICAM33431DV45",
  "org_name": "GPSCTEAM",
  "description": "Config for my-project team",
  "compute": {
    "type": "DEDICATED",
    "size": "4x",
    "enable_telemetry": true
  },
  "auto_suspend": {
    "enabled": true,
    "idle_timeout_minutes": 30
  }
}
```

Returns the new `compute_engine_config_id` for use in cluster creation.

### Update a Config

Modify an existing template (affects new clusters, not running ones):

```
PATCH /configs/{config_id}
{
  "description": "Updated description",
  "auto_suspend": {
    "enabled": false
  }
}
```

### Delete a Config

Remove a template (doesn't affect already-running clusters):

```
DELETE /configs/{config_id}
```

## Part 2: Managing Clusters (Active Instances)

### Launch a Cluster from a Config

Spawn an active instance:

```
POST /clusters
{
  "config_id": "CEAMGPSCTEAM0006U"
}
```

Returns **202 Accepted** (asynchronous provisioning).

**Response includes:**
- `component_id` — Unique cluster ID (e.g., `comp_Abc123...`)
- `status` — Current status (usually "PROVISIONING")
- `links` — Links for monitoring, rollback, etc.

### Monitor Cluster Provisioning

Poll the cluster status until ready:

```
GET /clusters/{component_id}
```

Expected progression:
1. **PROVISIONING** — Infrastructure being created
2. **RUNNING** — Ready to accept workloads
3. **STOPPING** (optional) — Graceful shutdown in progress
4. **STOPPED** — Instance offline (can be restarted)

**Continue polling until `status` = "RUNNING"**

### List All Clusters

See all active instances for a site:

```
GET /clusters?site_id=TDICAM33431DV45
```

Supports filtering by:
- `name` — Cluster name
- `status` — Current status (RUNNING, STOPPED, etc.)
- `desired_status` — Target status
- `pooling` — Filter by pool/dedicated

### Stop a Cluster

Gracefully shut down the instance (preserves it for restart):

```
DELETE /clusters/{component_id}
```

Returns **202 Accepted**. The cluster state transitions to STOPPING then STOPPED over several minutes. Poll status to confirm shutdown.

## Complete Workflow Example

```
Step 1: List available configs
   GET /configs?site_id=TDICAM33431DV45
   → Found config: CEAMGPSCTEAM0006U

Step 2: Launch a cluster instance
   POST /clusters
   { "config_id": "CEAMGPSCTEAM0006U" }
   → Got component_id: comp_Abc123...

Step 3: Monitor provisioning
   GET /clusters/comp_Abc123...
   (poll every 5 seconds until status = "RUNNING")

Step 4: Use the cluster
   (Run queries, workloads, etc.)

Step 5: Stop the cluster
   DELETE /clusters/comp_Abc123...
   (poll until status = "STOPPED")

Step 6: (Optional) Launch another from same config
   POST /clusters
   { "config_id": "CEAMGPSCTEAM0006U" }
   → Got new component_id: comp_Xyz789...
```

## Key Distinctions

| What | Endpoint | Action |
|------|----------|--------|
| Create template | POST `/configs` | Define a reusable blueprint |
| Update template | PATCH `/configs/{id}` | Modify blueprint settings |
| Delete template | DELETE `/configs/{id}` | Remove blueprint (doesn't affect running clusters) |
| **Launch instance** | **POST `/clusters`** | **Spawn active cluster from template** |
| **Check instance** | **GET `/clusters/{id}`** | **Monitor running cluster health** |
| **Stop instance** | **DELETE `/clusters/{id}`** | **Gracefully shut down running cluster** |

## Common Errors

### 409 Conflict — "Component name already exists"
**Cause:** Cluster name not unique  
**Solution:** Use unique names (include timestamp, project, or ID)

### 404 Not Found — "Metadata config not found"
**Cause:** Invalid `config_id`  
**Solution:** Verify config exists with `GET /configs`

### 403 Forbidden — "Permission denied"
**Cause:** Token lacks required scopes  
**Solution:** Check token permissions and roles

## Best Practices

1. **Create configs once, launch many** — Design templates for reuse
2. **Monitor provisioning** — Always poll status; don't assume RUNNING immediately
3. **Use auto-suspend** — Saves costs by automatically stopping idle clusters
4. **Naming strategy** — Include project, environment, timestamp: `{project}-{env}-{date}`
5. **Stop before delete** — Stopping is faster and preserves the config for later use
6. **Poll aggressively during provisioning** — Check every 5-10 seconds for RUNNING state
7. **Track metadata** — Use descriptions and tags for cost allocation and governance
