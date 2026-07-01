---
title: Error Handling and Troubleshooting
description: Common API errors, how to interpret them, and how to fix them
tags: [errors, troubleshooting, debugging]
---

# Error Handling and Troubleshooting

Understanding API errors helps you debug issues quickly.

## Error Response Structure

All error responses follow a standard format:

```json
{
  "error_code": "BAD_REQUEST",
  "error_instance_id": "8f6cde41-ed16-4cb4-b686-6dd4adb615d0",
  "message": "Invalid request",
  "title": "Invalid Request",
  "resolution": "Verify request parameters and try again",
  "severity": "low"
}
```

**Fields:**
- `error_code` — Machine-readable error type
- `error_instance_id` — Unique ID for debugging (save this!)
- `message` — What went wrong
- `title` — Human-readable summary
- `resolution` — Suggested fix
- `severity` — How serious (low/medium/high)

## Common HTTP Status Codes

### 400 Bad Request
**Cause:** Invalid request body or parameters  
**Example:** Missing required field, wrong data type

**Fix:**
```
1. Check parameter names are spelled correctly
2. Verify all required fields are present
3. Confirm data types match schema (string vs number)
4. Use get_syntax_help to see exact parameter requirements
```

### 401 / 403 Forbidden
**Cause:** Authentication failed or permissions insufficient  
**Example:** Expired token, missing scopes

**Fix:**
```
1. Verify Bearer token is valid: set_auth { type: "bearer", token: "..." }
2. Check token hasn't expired
3. Confirm token has required scopes for the API
4. Try: set_auth again with a fresh token
```

### 404 Not Found
**Cause:** Resource doesn't exist  
**Example:** Invalid config_id, nonexistent cluster

**Fix:**
```
1. Verify the resource ID exists (list endpoints to find IDs)
2. Check spelling of IDs (case-sensitive!)
3. Ensure resource hasn't been deleted
4. Confirm you're using the correct site_id
```

### 409 Conflict
**Cause:** Resource state conflict  
**Example:** Name already exists, resource in wrong state

**Fix:**
```
1. Use a unique name/identifier
2. Check resource current status (may need to complete previous operation)
3. Wait for async operations to complete before retrying
4. Don't create duplicates of in-use resources
```

### 422 Unprocessable Entity
**Cause:** Request valid but semantically incorrect  
**Example:** Invalid enum value, constraint violation

**Fix:**
```
1. Check enum values match allowed options
2. Verify constraints are met (size limits, naming conventions)
3. Use get_syntax_help to see valid enum values
4. Example: compute size must be 1x, 2x, 4x, 8x, 16x (not "large")
```

### 500 Internal Server Error
**Cause:** Server-side failure  
**Example:** Infrastructure issue, temporary outage

**Fix:**
```
1. Save the error_instance_id (report to support)
2. Wait a few seconds and retry
3. Check service status page
4. If persists, contact support with error_instance_id
```

### 503 Service Unavailable
**Cause:** Service temporarily offline  
**Example:** Maintenance, overload

**Fix:**
```
1. Wait and retry (exponential backoff: 1s, 2s, 4s, 8s)
2. Check status page for estimated recovery time
3. Implement retry logic in your automation
```

## Debugging Strategies

### 1. Enable Full Responses
```
execute_rest_call {
  url: "...",
  method: "GET",
  validateStatus: false  // Returns all responses, not just 2xx
}
```

### 2. Check Request Syntax
```
get_syntax_help {
  query: "clusters"  // See exact parameters for POST /clusters
}
```

### 3. Inspect Error Details
```
Look for error_details field which may contain:
- field_name: validation errors
- constraint: what was violated
- allowed_values: for enum errors
```

### 4. Test with Minimal Request
Start simple, add complexity:
```
❌ Complex: POST /clusters with 10 fields
✅ Simple: POST /clusters with just config_id
   (If it works, add one field at a time)
```

## Rate Limiting

If you get **429 Too Many Requests**:

```
1. Implement exponential backoff
2. Start with 1 second delay
3. Double on each retry: 1s → 2s → 4s → 8s...
4. Don't retry more than 5-10 times
5. Check if you're making parallel requests (reduce concurrency)
```

## Authentication Troubleshooting

### Token Expired
```
Error: 401 Unauthorized
Fix: set_auth { type: "bearer", token: "<new-token>" }
```

### Invalid Credentials
```
Error: 403 Permission denied
Fix: Verify token, check user roles, verify scopes
```

### Token Missing
```
Error: Missing authorization header
Fix: Call set_auth before making REST calls
```

## Support

When reporting issues, include:
- `error_instance_id` from response
- Request URL and method
- Request body (sanitized, no secrets)
- Expected vs actual response
- Steps to reproduce
