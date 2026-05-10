import type { AISearchSectionModel } from "./storyModel";
import { StoryAISearchPipelineMock } from "./StoryMockViews";

type AISearchSectionProps = {
  section: AISearchSectionModel;
  className?: string;
  headingLevel?: "h2" | "h3";
};

/**
 * AISearchSection keeps the post-enrichment AI-search narrative isolated from
 * the page shell so it can live inside the architecture band now and move into
 * its own view later without rewriting the content module.
 *
 * Layout: compact header (eyebrow + title + footnote pill) above the full-width
 * animated pipeline mock. Text blocks are intentionally dropped — the pipeline
 * carries the narrative visually.
 */
export function AISearchSection({
  section,
  className,
  headingLevel = "h2",
}: AISearchSectionProps) {
  const HeadingTag = headingLevel;
  const classes = ["story-ai-search-module", className].filter(Boolean).join(" ");

  return (
    <article className={classes} data-reveal="fade-up">
      <header className="ai-pipeline-header">
        <p className="eyebrow">{section.eyebrow}</p>
        <HeadingTag className="ai-pipeline-title">{section.title}</HeadingTag>
        <span className="ai-pipeline-footnote-pill">{section.footnote}</span>
      </header>
      <StoryAISearchPipelineMock
        stages={section.stages}
        examples={section.examples}
      />
    </article>
  );
}
