---
title: Getting Started with REST APIs
description: Quick introduction to using the REST API framework
tags: [getting-started, basics, introduction]
---

# Getting Started with REST APIs

This guide will walk you through the basics of making REST API calls using the tdrest-mcp framework.

## Authentication

First, set up your authentication credentials:

```
User: "Authenticate with my Teradata JWT token"
Claude calls: set_auth {
  type: "bearer",
  token: "eyJhbGc..."
}
```

The token is stored for the session and will be automatically included in all subsequent requests.

## Making Your First Call

Once authenticated, you can make REST calls:

```
User: "List all clusters"
Claude calls: execute_rest_call {
  url: "https://preprod.globalcompute.qateradatacloud.com/clusters",
  method: "GET"
  // auth is applied automatically
}
```

## Discovering Available Endpoints

Use `get_syntax_help` to discover what APIs are available:

```
User: "What endpoints are available?"
Claude calls: get_syntax_help {
  query: "list"
}
```

This shows all available endpoints with their parameters and requirements.

## Finding Usage Patterns

Use `get_usage_guide` to find best practices and workflows:

```
User: "How do I set up a cluster?"
Claude calls: get_usage_guide {
  query: "cluster"
}
```

## Service Configuration

Check what services are configured:

```
User: "What APIs are configured?"
Claude calls: get_service_config {}
```

This shows all base URLs and proxy settings.

## Next Steps

- Explore specific guides: `get_usage_guide("clusters-setup")`
- Learn about error handling: `get_usage_guide("error-handling")`
- Check out advanced patterns: `get_usage_guide("advanced-multi-step")`
