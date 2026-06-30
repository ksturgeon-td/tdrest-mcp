import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  expandGlob,
  listDirectory,
  validateFile,
  formatFileSize,
  filterByExtension,
} from "./file-utils.js";

const TEST_DIR = "/tmp/tdrest-test";
const TEST_PDF = path.join(TEST_DIR, "test.pdf");
const TEST_CSV = path.join(TEST_DIR, "data.csv");
const TEST_SUBDIR = path.join(TEST_DIR, "subdir");
const TEST_TXT = path.join(TEST_SUBDIR, "notes.txt");

beforeAll(() => {
  // Create test directory structure
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR);
  }
  if (!fs.existsSync(TEST_SUBDIR)) {
    fs.mkdirSync(TEST_SUBDIR);
  }

  // Create test files
  fs.writeFileSync(TEST_PDF, "fake pdf content");
  fs.writeFileSync(TEST_CSV, "id,name\n1,test");
  fs.writeFileSync(TEST_TXT, "test notes");
});

afterAll(() => {
  // Clean up test directory
  if (fs.existsSync(TEST_TXT)) {
    fs.unlinkSync(TEST_TXT);
  }
  if (fs.existsSync(TEST_SUBDIR)) {
    fs.rmdirSync(TEST_SUBDIR);
  }
  if (fs.existsSync(TEST_PDF)) {
    fs.unlinkSync(TEST_PDF);
  }
  if (fs.existsSync(TEST_CSV)) {
    fs.unlinkSync(TEST_CSV);
  }
  if (fs.existsSync(TEST_DIR)) {
    fs.rmdirSync(TEST_DIR);
  }
});

describe("expandGlob", () => {
  it("expands glob patterns to file paths", () => {
    const pattern = path.join(TEST_DIR, "*.pdf");
    const matches = expandGlob(pattern);
    expect(matches).toContain(TEST_PDF);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("throws error for non-matching patterns", () => {
    const pattern = path.join(TEST_DIR, "*.nonexistent");
    expect(() => expandGlob(pattern)).toThrow();
  });
});

describe("listDirectory", () => {
  it("lists files in a directory", () => {
    const listing = listDirectory(TEST_DIR);
    expect(listing.directory).toBe(TEST_DIR);
    expect(listing.files.length).toBeGreaterThanOrEqual(2);
    expect(listing.files.some((f) => f.name === "test.pdf")).toBe(true);
  });

  it("separates files from subdirectories", () => {
    const listing = listDirectory(TEST_DIR);
    expect(listing.subdirectories.length).toBeGreaterThanOrEqual(1);
    expect(listing.subdirectories.some((d) => d.name === "subdir")).toBe(true);
  });

  it("throws error for non-existent directory", () => {
    expect(() => listDirectory("/nonexistent/path")).toThrow();
  });
});

describe("validateFile", () => {
  it("validates and returns file info", () => {
    const info = validateFile(TEST_PDF);
    expect(info.path).toBe(TEST_PDF);
    expect(info.name).toBe("test.pdf");
    expect(info.size).toBeGreaterThan(0);
    expect(info.isDirectory).toBe(false);
  });

  it("throws error for non-existent file", () => {
    expect(() => validateFile("/nonexistent/file.txt")).toThrow();
  });

  it("throws error for directory", () => {
    expect(() => validateFile(TEST_SUBDIR)).toThrow();
  });
});

describe("formatFileSize", () => {
  it("formats bytes correctly", () => {
    expect(formatFileSize(0)).toBe("0.0 B");
    expect(formatFileSize(512)).toBe("512.0 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});

describe("filterByExtension", () => {
  it("filters files by extension", () => {
    const allFiles = listDirectory(TEST_DIR).files;
    const pdfs = filterByExtension(allFiles, [".pdf"]);
    expect(pdfs.some((f) => f.name === "test.pdf")).toBe(true);
    expect(pdfs.every((f) => f.name.endsWith(".pdf"))).toBe(true);
  });

  it("handles extensions with or without dot", () => {
    const allFiles = listDirectory(TEST_DIR).files;
    const withDot = filterByExtension(allFiles, [".csv"]);
    const withoutDot = filterByExtension(allFiles, ["csv"]);
    expect(withDot.length).toBe(withoutDot.length);
  });
});
