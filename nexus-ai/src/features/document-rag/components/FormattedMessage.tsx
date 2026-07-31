import type { ReactNode } from "react";

type FormattedMessageProps = {
  content: string;
};

type MessageBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] };

export function FormattedMessage({ content }: FormattedMessageProps) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 text-sm leading-6">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return (
            <h3
              className="text-[15px] font-semibold leading-6 text-slate-950"
              key={`heading-${blockIndex}`}
            >
              {renderInline(block.text)}
            </h3>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul className="space-y-2 pl-1" key={`list-${blockIndex}`}>
              {block.items.map((item, itemIndex) => (
                <li
                  className="grid grid-cols-[0.4rem_1fr] items-start gap-2.5"
                  key={`${item}-${itemIndex}`}
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.65rem] size-1.5 rounded-full bg-cyan-500"
                  />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol className="space-y-2" key={`list-${blockIndex}`}>
              {block.items.map((item, itemIndex) => (
                <li
                  className="grid grid-cols-[1.5rem_1fr] items-start gap-2"
                  key={`${item}-${itemIndex}`}
                >
                  <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                    {itemIndex + 1}
                  </span>
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p className="whitespace-pre-wrap" key={`paragraph-${blockIndex}`}>
            {block.lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function parseBlocks(content: string): MessageBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MessageBlock[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", text: heading[1] });
      continue;
    }

    const unorderedItem = line.match(/^[-*•]\s+(.+)$/);
    if (unorderedItem) {
      flushParagraph();
      const previous = blocks.at(-1);
      if (previous?.type === "unordered-list") {
        previous.items.push(unorderedItem[1]);
      } else {
        blocks.push({ type: "unordered-list", items: [unorderedItem[1]] });
      }
      continue;
    }

    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedItem) {
      flushParagraph();
      const previous = blocks.at(-1);
      if (previous?.type === "ordered-list") {
        previous.items.push(orderedItem[1]);
      } else {
        blocks.push({ type: "ordered-list", items: [orderedItem[1]] });
      }
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

function renderInline(value: string): ReactNode[] {
  const tokens = value.split(/(\*\*.+?\*\*|`.+?`|\[Nguồn\s+\d+\])/g);

  return tokens
    .filter(Boolean)
    .map((token, index) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        return (
          <strong className="font-semibold text-slate-950" key={`${token}-${index}`}>
            {token.slice(2, -2)}
          </strong>
        );
      }

      if (token.startsWith("`") && token.endsWith("`")) {
        return (
          <code
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-700"
            key={`${token}-${index}`}
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      if (/^\[Nguồn\s+\d+\]$/.test(token)) {
        return (
          <span
            className="mx-0.5 inline-flex rounded-full bg-cyan-50 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-cyan-700"
            key={`${token}-${index}`}
          >
            {token.slice(1, -1)}
          </span>
        );
      }

      return token;
    });
}
