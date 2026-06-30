import fs from "fs";
import path from "path";
import { globSync } from "glob";

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  isDirectory: boolean;
}

export interface DirectoryListing {
  directory: string;
  files: FileInfo[];
  subdirectories: FileInfo[];
  total: number;
}

// Expand glob patterns to file paths
export function expandGlob(pattern: string): string[] {
  // Expand ~ to home directory
  const expandedPattern = pattern.startsWith("~")
    ? pattern.replace("~", process.env.HOME || "")
    : pattern;

  try {
    const matches = globSync(expandedPattern, {
      nodir: true, // Only return files, not directories
    });

    if (matches.length === 0) {
      throw new Error(`No files matching pattern: ${pattern}`);
    }

    return matches;
  } catch (error) {
    throw new Error(`Invalid glob pattern '${pattern}': ${String(error)}`);
  }
}

// List files in a directory
export function listDirectory(dir: string, recursive = false): DirectoryListing {
  // Expand ~ to home directory
  const expandedDir = dir.startsWith("~")
    ? dir.replace("~", process.env.HOME || "")
    : dir;

  // Validate directory exists
  if (!fs.existsSync(expandedDir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  const stats = fs.statSync(expandedDir);
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${dir}`);
  }

  const entries = fs.readdirSync(expandedDir, { withFileTypes: true });

  const files: FileInfo[] = [];
  const subdirectories: FileInfo[] = [];

  for (const entry of entries) {
    const fullPath = path.join(expandedDir, entry.name);
    const stat = fs.statSync(fullPath);

    const fileInfo: FileInfo = {
      path: fullPath,
      name: entry.name,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      isDirectory: stat.isDirectory(),
    };

    if (entry.isDirectory()) {
      if (recursive) {
        subdirectories.push(fileInfo);
      } else {
        subdirectories.push(fileInfo);
      }
    } else {
      files.push(fileInfo);
    }
  }

  // Sort files by name
  files.sort((a, b) => a.name.localeCompare(b.name));
  subdirectories.sort((a, b) => a.name.localeCompare(b.name));

  return {
    directory: expandedDir,
    files,
    subdirectories,
    total: files.length + subdirectories.length,
  };
}

// Validate that a file exists and is readable
export function validateFile(filePath: string): FileInfo {
  // Expand ~ to home directory
  const expandedPath = filePath.startsWith("~")
    ? filePath.replace("~", process.env.HOME || "")
    : filePath;

  if (!fs.existsSync(expandedPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(expandedPath);

  if (!stat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  // Check read permission
  try {
    fs.accessSync(expandedPath, fs.constants.R_OK);
  } catch {
    throw new Error(`No read permission: ${filePath}`);
  }

  return {
    path: expandedPath,
    name: path.basename(expandedPath),
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    isDirectory: false,
  };
}

// Get human-readable file size
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Filter files by extension
export function filterByExtension(files: FileInfo[], extensions: string[]): FileInfo[] {
  const lowerExtensions = extensions.map((ext) =>
    ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`
  );

  return files.filter((file) => {
    const ext = path.extname(file.name).toLowerCase();
    return lowerExtensions.includes(ext);
  });
}
