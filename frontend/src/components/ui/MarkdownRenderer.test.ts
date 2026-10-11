import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseMarkdownBlocks, renderInlineMarkdown } from './MarkdownRenderer';

describe('MarkdownRenderer parser and tokenizer', () => {
  test('correctly parses headings with different levels', () => {
    const raw = '# Institutional Overview\n## Academic Standing\n### Good Day!\n#### Detailed Notice';
    const blocks = parseMarkdownBlocks(raw);

    assert.strictEqual(blocks.length, 4);
    assert.strictEqual(blocks[0].type, 'heading');
    assert.strictEqual(blocks[0].level, 1);
    assert.strictEqual(blocks[0].content, 'Institutional Overview');

    assert.strictEqual(blocks[1].type, 'heading');
    assert.strictEqual(blocks[1].level, 2);
    assert.strictEqual(blocks[1].content, 'Academic Standing');

    assert.strictEqual(blocks[2].type, 'heading');
    assert.strictEqual(blocks[2].level, 3);
    assert.strictEqual(blocks[2].content, 'Good Day!');

    assert.strictEqual(blocks[3].type, 'heading');
    assert.strictEqual(blocks[3].level, 4);
    assert.strictEqual(blocks[3].content, 'Detailed Notice');
  });

  test('groups bullet list items and ordered list items correctly', () => {
    const raw = `
* Course Registration
* Exam Clearance
* Hostel Allocation

1. Verify Fee Balance
2. Apply for Clearance
3. Download Exam Card
`;
    const blocks = parseMarkdownBlocks(raw);
    assert.strictEqual(blocks.length, 2);

    assert.strictEqual(blocks[0].type, 'bullet-list');
    assert.deepStrictEqual(blocks[0].items, [
      'Course Registration',
      'Exam Clearance',
      'Hostel Allocation',
    ]);

    assert.strictEqual(blocks[1].type, 'ordered-list');
    assert.deepStrictEqual(blocks[1].items, [
      'Verify Fee Balance',
      'Apply for Clearance',
      'Download Exam Card',
    ]);
  });

  test('parses the exact AI Advisor prompt message reported by user', () => {
    const userMessage = `### Good Day!

I'm your UAMS Institutional AI Advisor. I'm here to help you navigate through your academic journey at the University Administration Management System.

Before we begin, I'd like to confirm a few details about you:

* **Your Role**: STUDENT
* **Your Name**: Student (I don't have your full name, please feel free to share it if you'd like)

What would you like to discuss today? Would you like guidance on:
* **Course Registration**?
* **Exam Clearance**?
* **GPA Standing**?
* **Hostel Allocation**?
* **Digital Library Loans**?
* **Something else**?

Please let me know, and I'll do my best to assist you!`;

    const blocks = parseMarkdownBlocks(userMessage);

    // Block 0: heading ### Good Day!
    assert.strictEqual(blocks[0].type, 'heading');
    assert.strictEqual(blocks[0].level, 3);
    assert.strictEqual(blocks[0].content, 'Good Day!');

    // Block 1: Paragraph
    assert.strictEqual(blocks[1].type, 'paragraph');
    assert.match(blocks[1].content || '', /Institutional AI Advisor/);

    // Block 2: Paragraph
    assert.strictEqual(blocks[2].type, 'paragraph');
    assert.match(blocks[2].content || '', /confirm a few details/);

    // Block 3: Bullet list with details
    assert.strictEqual(blocks[3].type, 'bullet-list');
    assert.strictEqual(blocks[3].items?.length, 2);
    assert.strictEqual(blocks[3].items?.[0], '**Your Role**: STUDENT');

    // Block 4: Paragraph
    assert.strictEqual(blocks[4].type, 'paragraph');
    assert.match(blocks[4].content || '', /What would you like to discuss today\?/);

    // Block 5: Bullet list with options
    assert.strictEqual(blocks[5].type, 'bullet-list');
    assert.strictEqual(blocks[5].items?.length, 6);
    assert.strictEqual(blocks[5].items?.[0], '**Course Registration**?');

    // Block 6: Final paragraph
    assert.strictEqual(blocks[6].type, 'paragraph');
    assert.match(blocks[6].content || '', /Please let me know/);
  });

  test('parses code blocks, blockquotes, horizontal rules, and tables', () => {
    const raw = `
> Institutional Advisory Notice

---

\`\`\`json
{ "status": "approved", "role": "STUDENT" }
\`\`\`

| Semester | Units | GPA |
| --- | --- | --- |
| Year 1 Sem 1 | 18 | 3.85 |
| Year 1 Sem 2 | 21 | 3.92 |
`;
    const blocks = parseMarkdownBlocks(raw);

    assert.strictEqual(blocks[0].type, 'blockquote');
    assert.strictEqual(blocks[0].content, 'Institutional Advisory Notice');

    assert.strictEqual(blocks[1].type, 'hr');

    assert.strictEqual(blocks[2].type, 'code-block');
    assert.strictEqual(blocks[2].lang, 'json');
    assert.strictEqual(blocks[2].content, '{ "status": "approved", "role": "STUDENT" }');

    assert.strictEqual(blocks[3].type, 'table');
    assert.deepStrictEqual(blocks[3].headers, ['Semester', 'Units', 'GPA']);
    assert.strictEqual(blocks[3].rows?.length, 2);
    assert.deepStrictEqual(blocks[3].rows?.[0], ['Year 1 Sem 1', '18', '3.85']);
  });

  test('tokenizes inline bold, italic, code, and links without crashing', () => {
    const nodes = renderInlineMarkdown('Please verify **Fee Balance** and `MATH101` at [Portal](https://uams.edu)');
    assert.ok(Array.isArray(nodes));
    assert.ok(nodes.length >= 4);
  });
});
