export interface UsageGuide {
  name: string;
  title: string;
  description: string;
  tags: string[];
  content: string;
}

export class UsageGuideRegistry {
  private guides: Map<string, UsageGuide> = new Map();

  register(guide: UsageGuide): void {
    this.guides.set(guide.name, guide);
  }

  getGuide(name: string): UsageGuide | undefined {
    return this.guides.get(name);
  }

  searchGuides(query: string): UsageGuide[] {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery === "list" || lowerQuery === "") {
      return Array.from(this.guides.values());
    }

    return Array.from(this.guides.values()).filter((guide) => {
      const matchesName = guide.name.toLowerCase().includes(lowerQuery);
      const matchesTitle = guide.title.toLowerCase().includes(lowerQuery);
      const matchesDesc = guide.description
        .toLowerCase()
        .includes(lowerQuery);
      const matchesTags = guide.tags.some((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );

      return matchesName || matchesTitle || matchesDesc || matchesTags;
    });
  }

  getAllGuides(): UsageGuide[] {
    return Array.from(this.guides.values());
  }

  formatGuidesList(): string {
    const guides = this.getAllGuides();

    if (guides.length === 0) {
      return "No usage guides available.";
    }

    let text = `Available Usage Guides (${guides.length} total):\n\n`;

    for (const guide of guides) {
      text += `### ${guide.title}\n`;
      text += `**Name:** \`${guide.name}\`\n`;
      text += `**Description:** ${guide.description}\n`;
      text += `**Tags:** ${guide.tags.join(", ")}\n\n`;
    }

    text += `Use \`get_usage_guide("<name>")\` to view a specific guide.`;
    return text;
  }

  formatGuide(guide: UsageGuide): string {
    return `# ${guide.title}\n\n**Tags:** ${guide.tags.join(", ")}\n\n${guide.content}`;
  }
}
