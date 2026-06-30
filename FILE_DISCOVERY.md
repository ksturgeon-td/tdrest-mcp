# File Discovery & Glob Patterns

The tdrest-mcp server now includes powerful file discovery features that make it easy to work with multiple files without manually specifying each path.

## New Tools

### 1. `list_files` — List Directory Contents

Browse files in a directory with filtering support.

**Parameters:**
- `directory` (required) — Directory path (e.g., `/tmp`, `~/Documents`)
- `extension` (optional) — Filter by file extension (e.g., `.pdf`, `.csv`)
- `recursive` (optional) — Include subdirectories (default: false)

**Example:**
```
User: "What files are in ~/Documents?"

Claude calls:
  list_files {
    directory: "~/Documents"
  }

Response:
  Directory: /Users/kevin/Documents
  Total items: 5
  
  FILES:
    report.pdf (2.3 MB) - Modified: 2026-06-30T14:22:15.000Z
    data.csv (512.0 B) - Modified: 2026-06-30T14:20:00.000Z
    analysis.xlsx (1.5 MB) - Modified: 2026-06-29T10:15:00.000Z
  
  SUBDIRECTORIES:
    Archives/
    Projects/
```

**With filtering:**
```
User: "Show me all PDFs in ~/Documents"

Claude calls:
  list_files {
    directory: "~/Documents",
    extension: ".pdf"
  }

Response:
  FILES:
    report.pdf (2.3 MB) - Modified: 2026-06-30T14:22:15.000Z
    whitepaper.pdf (5.1 MB) - Modified: 2026-06-28T09:30:00.000Z
```

---

### 2. `find_files` — Find Files by Pattern

Search for files matching a glob pattern.

**Parameters:**
- `pattern` (required) — Glob pattern (e.g., `/tmp/*.pdf`, `~/data/**/*.csv`)

**Glob patterns support:**
- `*` — Match any files in the current directory
- `**` — Match directories recursively
- `?` — Match a single character
- `[...]` — Match character ranges

**Examples:**
```
User: "Find all CSV files in ~/data and subdirectories"

Claude calls:
  find_files {
    pattern: "~/data/**/*.csv"
  }

Response:
  Found 8 file(s) matching pattern: ~/data/**/*.csv
  
  /Users/kevin/data/sales/2026-q1.csv (245.3 KB)
  /Users/kevin/data/sales/2026-q2.csv (312.1 KB)
  /Users/kevin/data/inventory/current.csv (1.2 MB)
  /Users/kevin/data/inventory/archive/2025.csv (856.0 KB)
  ...
```

```
User: "Find all PDFs and Excel files in /tmp"

Claude calls:
  find_files {
    pattern: "/tmp/*.(pdf|xlsx)"
  }

Response:
  Found 6 file(s) matching pattern: /tmp/*.(pdf|xlsx)
  
  /tmp/report.pdf (2.3 MB)
  /tmp/budget.xlsx (1.5 MB)
  /tmp/analysis.pdf (4.2 MB)
  ...
```

---

## Using with `execute_rest_call`

The `filePattern` parameter allows glob expansion directly in REST calls.

### Option 1: Glob Pattern (New!)

```
User: "Upload all CSVs from ~/data to my Vector Store"

Claude calls:
  execute_rest_call {
    url: "https://api.vectorstore.com/.../ingest",
    method: "PUT",
    filePattern: "~/data/*.csv",
    formData: {
      "collection": "data_dump"
    }
  }
```

**What happens:**
1. MCP server expands `~/data/*.csv` to all matching files
2. Each file is streamed into a multipart FormData
3. All files uploaded in a single request
4. Form fields mixed in with files

### Option 2: Explicit Files (Original)

```
execute_rest_call {
  url: "...",
  method: "PUT",
  files: {
    "file1": { path: "/tmp/doc1.pdf" },
    "file2": { path: "/tmp/doc2.pdf" }
  }
}
```

### Option 3: List, Then Upload

```
User: "Show me PDFs in ~/Documents, then upload the first 3"

1. Claude calls list_files
2. Claude shows results to user
3. User confirms which files to upload
4. Claude calls execute_rest_call with those specific files
```

---

## Real-World Workflows

### Workflow 1: Bulk Document Ingestion

```
User: "Upload all research papers from ~/Papers to my Vector Store"

Claude:
  1. find_files { pattern: "~/Papers/**/*.pdf" }
  2. Shows user: "Found 24 PDF files (45.2 MB total)"
  3. User confirms: "Upload them all"
  4. execute_rest_call {
       filePattern: "~/Papers/**/*.pdf",
       url: "..../ingest",
       method: "PUT",
       formData: { "collection": "research" }
     }
```

### Workflow 2: Selective Upload

```
User: "What CSV files are in my data folder?"

Claude:
  1. list_files { directory: "~/data", extension: ".csv" }
  2. Shows:
     - sales_2026.csv (312 KB)
     - inventory_current.csv (1.2 MB)
     - budget_draft.csv (89 KB)

User: "Upload just sales_2026.csv and inventory_current.csv"

Claude:
  execute_rest_call {
    files: {
      "sales": { path: "~/data/sales_2026.csv" },
      "inventory": { path: "~/data/inventory_current.csv" }
    },
    url: "...",
    method: "PUT"
  }
```

### Workflow 3: Archive Processing

```
User: "Process all logs from this month in ~/logs/archive/**"

Claude:
  1. find_files { pattern: "~/logs/archive/2026-06-*.log" }
  2. Expands to 30 log files (450 MB)
  3. execute_rest_call {
       filePattern: "~/logs/archive/2026-06-*.log",
       url: "..../process",
       method: "POST",
       formData: { "processor": "log_analyzer" }
     }
```

---

## Features

✅ **Home Directory Expansion** — `~` expands to your home directory
✅ **Recursive Globs** — `**` matches directories recursively
✅ **Extension Filtering** — Filter results by file type
✅ **File Metadata** — Sizes, modification times shown
✅ **Validation** — Checks files exist and are readable
✅ **Readable Sizes** — Converts bytes to KB, MB, GB
✅ **Error Handling** — Clear errors for missing files/patterns

---

## Glob Pattern Syntax

| Pattern | Matches |
|---------|---------|
| `*.pdf` | All PDFs in current directory |
| `**/*.csv` | All CSVs in current directory and subdirectories |
| `*.{pdf,xlsx}` | PDFs and Excel files |
| `data_*.json` | Files starting with "data_" and ending with ".json" |
| `[abc]*.txt` | Text files starting with a, b, or c |
| `2026-06-??.log` | Log files matching "2026-06-01.log", "2026-06-15.log", etc. |

---

## Limitations & Notes

⚠️ **Glob only matches files** — Directories are excluded from glob expansion (use `list_files` to see directories)

⚠️ **Large uploads** — If a glob matches hundreds of files, the multipart request can be large. Consider filtering first.

⚠️ **Path handling** — Forward slashes work on all platforms. Paths like `~/docs` expand correctly.

⚠️ **Special characters** — If filenames have spaces or special characters, patterns may need escaping (glob handles most cases automatically).

---

## Phase 3 Enhancements (Planned)

- [ ] Exclude patterns (`!` prefix to exclude matches)
- [ ] File size filtering (`--min-size`, `--max-size`)
- [ ] Date range filtering (`--since`, `--until`)
- [ ] Symlink handling (follow vs. skip)
- [ ] Streaming large uploads (chunked multipart)

---

## Examples in Action

### Example 1: Interactive File Selection

```
User: "I want to upload some documents. Show me what's in ~/Downloads"

Claude: list_files { directory: "~/Downloads" }
Response shows 12 files with sizes

User: "How many PDFs are there?"

Claude: list_files { directory: "~/Downloads", extension: ".pdf" }
Response shows 5 PDFs

User: "Upload all 5 PDFs to my Vector Store"

Claude: execute_rest_call {
  filePattern: "~/Downloads/*.pdf",
  url: "...",
  method: "PUT"
}
```

### Example 2: Programmatic Pattern Matching

```
User: "Upload all 2026 sales data"

Claude: find_files { pattern: "~/data/**/sales_2026*.csv" }
Response shows files:
  - sales_2026_q1.csv
  - sales_2026_q2.csv
  - sales_2026_q3.csv

Claude: execute_rest_call {
  filePattern: "~/data/**/sales_2026*.csv",
  url: "...",
  method: "PUT",
  formData: { "dataset": "sales_2026" }
}
```

### Example 3: Complex Filtering

```
User: "Show me all documents modified today in my archive"

Claude: list_files { 
  directory: "~/archive",
  recursive: true
}
[Gets all files with dates]

Claude: [Shows user files from today, filters visually]
User: "Upload the PDFs and spreadsheets from the filtered results"

Claude: execute_rest_call {
  files: {
    "doc1": { path: "/full/path/report.pdf" },
    "doc2": { path: "/full/path/budget.xlsx" },
    "doc3": { path: "/full/path/summary.pdf" }
  },
  url: "...",
  method: "PUT"
}
```

---

## Error Handling

**Pattern doesn't match any files:**
```
Error: No files matching pattern: /tmp/*.nonexistent
```

**Directory doesn't exist:**
```
Error: Directory not found: /nonexistent/path
```

**File not readable:**
```
Error: No read permission: /protected/file.pdf
```

**Invalid pattern:**
```
Error: Invalid glob pattern '/tmp/[invalid': ...
```

---

For more information, see [README.md](README.md) and [CLAUDE.md](CLAUDE.md).
