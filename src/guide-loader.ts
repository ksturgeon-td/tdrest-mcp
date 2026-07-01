import fs from "fs";
import path from "path";
import { UsageGuideRegistry, UsageGuide } from "./usage-guide.js";

interface GuideFrontmatter {
  title?: string;
  description?: string;
  tags?: string[];
}

export function loadGuidesFromDirectory(
  guideDir: string
): UsageGuideRegistry {
  const registry = new UsageGuideRegistry();

  if (!fs.existsSync(guideDir)) {
    return registry;
  }

  try {
    const files = fs.readdirSync(guideDir);
    const markdownFiles = files.filter((f) => f.endsWith(".md"));

    for (const file of markdownFiles) {
      const filePath = path.join(guideDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      const guide = parseGuideMarkdown(file, content);
      if (guide) {
        registry.register(guide);
      }
    }
  } catch (error) {
    // Guides directory may not exist in some deployments
  }

  return registry;
}

function parseGuideMarkdown(fileName: string, content: string): UsageGuide | null {
  const name = fileName.replace(/\.md$/, "");

  // Parse YAML frontmatter if present
  let frontmatter: GuideFrontmatter = {};
  let markdownContent = content;

  if (content.startsWith("---")) {
    const endIndex = content.indexOf("---", 3);
    if (endIndex !== -1) {
      const fmText = content.substring(3, endIndex).trim();
      frontmatter = parseFrontmatter(fmText);
      markdownContent = content.substring(endIndex + 3).trim();
    }
  }

  const title = frontmatter.title || formatTitleFromName(name);
  const description =
    frontmatter.description || extractFirstParagraph(markdownContent);
  const tags = frontmatter.tags || [];

  return {
    name,
    title,
    description,
    tags,
    content: markdownContent,
  };
}

function parseFrontmatter(fmText: string): GuideFrontmatter {
  const frontmatter: GuideFrontmatter = {};

  const lines = fmText.split("\n");
  for (const line of lines) {
    if (line.startsWith("title:")) {
      frontmatter.title = line.substring(6).trim().replace(/^["']|["']$/g, "");
    } else if (line.startsWith("description:")) {
      frontmatter.description = line
        .substring(12)
        .trim()
        .replace(/^["']|["']$/g, "");
    } else if (line.startsWith("tags:")) {
      const tagsStr = line.substring(5).trim();
      frontmatter.tags = tagsStr
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((t) => t.trim().replace(/^["']|["']$/g, ""));
    }
  }

  return frontmatter;
}

function formatTitleFromName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractFirstParagraph(content: string): string {
  const lines = content.split("\n");
  let paragraph = "";

  for (const line of lines) {
    if (line.trim() === "") {
      if (paragraph) break;
    } else if (!line.startsWith("#")) {
      paragraph += line + " ";
    }
  }

  return paragraph.trim().substring(0, 100) + (paragraph.length > 100 ? "..." : "");
}
