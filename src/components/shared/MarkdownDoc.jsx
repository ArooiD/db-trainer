import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const LINK_SAFE = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
);
const IMG_LAZY = ({ src, alt }) => (
  <img className="md-media" src={src} alt={alt || ""} loading="lazy" />
);
const COMPONENTS = { a: LINK_SAFE, img: IMG_LAZY };

export function MarkdownBody({ content, className = "md-body" }) {
  return (
    <div className={className}>
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>{content}</Markdown>
    </div>
  );
}

// Split a Markdown string into slides on horizontal-rule lines (`---`), then
// render one slide at a time with prev/next controls. The controls are icon-only
// (arrows + counter) so no localized copy is required here.
export function SlideDeck({ content, className = "md-body" }) {
  const slides = useMemo(
    () => content.split(/^\s*(?:---|\*\*\*)\s*$/m).map((s) => s.trim()).filter(Boolean),
    [content]
  );
  const [index, setIndex] = useState(0);
  const total = Math.max(slides.length, 1);
  const current = slides[Math.min(index, total - 1)] || "";
  return (
    <div className="slide-deck">
      <div className="slide-stage">
        <div className={`${className} slide-active`}>
          <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>{current}</Markdown>
        </div>
      </div>
      <div className="slide-nav">
        <button className="slide-btn" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>←</button>
        <span className="slide-counter">{Math.min(index + 1, total)} / {total}</span>
        <button className="slide-btn" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} disabled={index >= total - 1}>→</button>
      </div>
    </div>
  );
}
