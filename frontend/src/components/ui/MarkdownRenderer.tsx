import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Tokenizes inline markdown into React nodes:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `inline code`
 * - [link](url)
 * - ~~strikethrough~~
 */
export function renderInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  // Regex to match inline patterns: code, bold, italic, link, strikethrough
  const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+?\*(?!\*)|(?<!_)_[^_]+?_(?!_)|\[[^\]]+\]\([^)]+\)|~~[^~]+~~)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `inline-${lastIndex}-${match.index}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      const code = token.slice(1, -1);
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-academic-navy-900 font-mono text-[12px] font-semibold"
        >
          {code}
        </code>
      );
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      const inner = token.slice(2, -2);
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900">
          {renderInlineMarkdown(inner)}
        </strong>
      );
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      const inner = token.slice(1, -1);
      nodes.push(
        <em key={key} className="italic text-slate-800">
          {renderInlineMarkdown(inner)}
        </em>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      const inner = token.slice(2, -2);
      nodes.push(
        <del key={key} className="line-through text-slate-400">
          {renderInlineMarkdown(inner)}
        </del>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        const [, linkText, href] = linkMatch;
        nodes.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-academic-navy-800 hover:text-academic-gold-600 underline font-medium transition"
          >
            {linkText}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(token);
    }

    lastIndex = inlineRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

interface Block {
  type: 'heading' | 'paragraph' | 'bullet-list' | 'ordered-list' | 'code-block' | 'blockquote' | 'table' | 'hr';
  level?: number;
  content?: string;
  items?: string[];
  lang?: string;
  headers?: string[];
  rows?: string[][];
}

/**
 * Parses raw markdown text into structural blocks
 */
export function parseMarkdownBlocks(markdown: string): Block[] {
  if (!markdown) return [];

  const rawLines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    // Fenced Code Block (```lang)
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push({
        type: 'code-block',
        lang: lang || 'text',
        content: codeLines.join('\n'),
      });
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings: #, ##, ###, ####, #####, ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        content: quoteLines.join('\n'),
      });
      continue;
    }

    // Unordered List (*, -, +)
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < rawLines.length && /^\s*[-*+]\s+/.test(rawLines[i])) {
        const itemText = rawLines[i].replace(/^\s*[-*+]\s+/, '').trim();
        items.push(itemText);
        i++;
      }
      blocks.push({
        type: 'bullet-list',
        items,
      });
      continue;
    }

    // Ordered List (1., 2., etc.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < rawLines.length && /^\s*\d+\.\s+/.test(rawLines[i])) {
        const itemText = rawLines[i].replace(/^\s*\d+\.\s+/, '').trim();
        items.push(itemText);
        i++;
      }
      blocks.push({
        type: 'ordered-list',
        items,
      });
      continue;
    }

    // Table: starts with | and next row has | --- |
    if (line.includes('|') && i + 1 < rawLines.length && /^\s*\|?\s*[-:]+[-| :]*\|?\s*$/.test(rawLines[i + 1])) {
      const parseRow = (rowStr: string) =>
        rowStr
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseRow(line);
      i += 2; // skip header and delimiter row
      const rows: string[][] = [];

      while (i < rawLines.length && rawLines[i].includes('|') && rawLines[i].trim().length > 0) {
        rows.push(parseRow(rawLines[i]));
        i++;
      }

      blocks.push({
        type: 'table',
        headers,
        rows,
      });
      continue;
    }

    // Regular paragraph (group contiguous non-empty lines)
    const paraLines: string[] = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().startsWith('```') &&
      !rawLines[i].trim().startsWith('#') &&
      !rawLines[i].trim().startsWith('>') &&
      !/^\s*[-*+]\s+/.test(rawLines[i]) &&
      !/^\s*\d+\.\s+/.test(rawLines[i]) &&
      !/^(\*\*\*|---|___)$/.test(rawLines[i].trim())
    ) {
      paraLines.push(rawLines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: paraLines.join(' '),
      });
    }
  }

  return blocks;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-3 font-sans text-sm leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const headingContent = renderInlineMarkdown(block.content || '');
            if (block.level === 1) {
              return (
                <h1
                  key={idx}
                  className="text-lg md:text-xl font-bold text-academic-navy-950 mt-3.5 mb-1.5 pb-1 border-b border-slate-200"
                >
                  {headingContent}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={idx}
                  className="text-base md:text-lg font-bold text-academic-navy-900 mt-3 mb-1.5"
                >
                  {headingContent}
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3
                  key={idx}
                  className="text-sm md:text-base font-bold text-academic-navy-900 mt-2.5 mb-1 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-3.5 bg-academic-gold-500 rounded-sm inline-block"></span>
                  <span>{headingContent}</span>
                </h3>
              );
            }
            return (
              <h4
                key={idx}
                className="text-xs md:text-sm font-semibold uppercase tracking-wide text-slate-800 mt-2 mb-1"
              >
                {headingContent}
              </h4>
            );
          }

          case 'paragraph': {
            return (
              <p key={idx} className="text-slate-800 leading-relaxed">
                {renderInlineMarkdown(block.content || '')}
              </p>
            );
          }

          case 'bullet-list': {
            return (
              <ul key={idx} className="space-y-1.5 my-2 pl-1">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start text-slate-800 gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-academic-gold-500 shrink-0 mt-2"></span>
                    <span className="leading-relaxed flex-1">
                      {renderInlineMarkdown(item)}
                    </span>
                  </li>
                ))}
              </ul>
            );
          }

          case 'ordered-list': {
            return (
              <ol key={idx} className="space-y-1.5 my-2 pl-1">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start text-slate-800 gap-2">
                    <span className="font-semibold text-academic-navy-900 text-xs shrink-0 w-4 pt-0.5">
                      {itemIdx + 1}.
                    </span>
                    <span className="leading-relaxed flex-1">
                      {renderInlineMarkdown(item)}
                    </span>
                  </li>
                ))}
              </ol>
            );
          }

          case 'code-block': {
            return (
              <div
                key={idx}
                className="my-3 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 shadow-sm"
              >
                {block.lang && (
                  <div className="bg-slate-800/80 px-3.5 py-1 text-[11px] font-mono text-slate-400 border-b border-slate-700/60 flex items-center justify-between">
                    <span>{block.lang}</span>
                    <span className="text-[10px] text-slate-500">UAMS Code Snippet</span>
                  </div>
                )}
                <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed">
                  <code>{block.content}</code>
                </pre>
              </div>
            );
          }

          case 'blockquote': {
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-academic-gold-500 bg-academic-gold-500/10 px-3.5 py-2 rounded-r-lg my-2 text-slate-700 text-xs italic"
              >
                {renderInlineMarkdown(block.content || '')}
              </blockquote>
            );
          }

          case 'table': {
            return (
              <div key={idx} className="my-3 overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                <table className="min-w-full text-xs divide-y divide-slate-200">
                  {block.headers && block.headers.length > 0 && (
                    <thead className="bg-slate-50">
                      <tr>
                        {block.headers.map((h, hIdx) => (
                          <th
                            key={hIdx}
                            className="px-3 py-2 text-left font-semibold text-academic-navy-900 uppercase tracking-wider text-[11px]"
                          >
                            {renderInlineMarkdown(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {block.rows?.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/60">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-slate-700">
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case 'hr': {
            return <hr key={idx} className="my-3 border-t border-slate-200" />;
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
export default MarkdownRenderer;
