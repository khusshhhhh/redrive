import { Fragment } from "react";

/**
 * Splits a string into word spans that each carry `.hover-word`, so hovering a
 * heading nudges individual words. Spaces are real text nodes between the
 * inline-block words so the gap renders normally.
 */
export default function SplitText({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="hover-word">{word}</span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
