import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { authorTokens, fitAuthorIndices } from '../../lib/publication-authors.mjs';
import { renderAbstract } from '../../lib/publication-abstract.mjs';

const authors = (highlighted = []) => ['Alice', 'Bob', 'Clara', 'David', 'Eve', 'Frank'].map((name, index) => ({ name, memberId: highlighted.includes(index) ? name : null }));
const preview = (people, indices) => authorTokens(indices, people.length).map(index => index === null ? '\u2026' : people[index].name).join(', ');
const fit = (people, length, selected = '') => fitAuthorIndices(people, indices => preview(people, indices).length <= length, selected);
const nodes = root => [root, ...(root.childNodes ?? []).flatMap(nodes)];

test('author previews retain the complete comma-separated list whenever it fits', () => {
  const people = authors([0]);
  assert.equal(preview(people, fit(people, 100)), 'Alice, Bob, Clara, David, Eve, Frank');
});

test('a highlighted first author keeps the original order with a trailing ellipsis', () => {
  const people = authors([0]);
  assert.equal(preview(people, fit(people, 17)), 'Alice, Bob, \u2026');
});

test('multiple highlighted authors survive while intermediate names become one ellipsis', () => {
  const people = authors([0, 5]);
  const indices = fit(people, 20);
  assert.equal(preview(people, indices), 'Alice, Bob, \u2026, Frank');
  assert.ok(indices.includes(0) && indices.includes(5));
});

test('space is reclaimed from unhighlighted names before any group member', () => {
  const people = authors([2, 5]);
  const indices = fit(people, 20);
  assert.ok(indices.includes(2) && indices.includes(5));
  assert.deepEqual(indices, [...indices].sort((a, b) => a - b));
  assert.ok(preview(people, indices).length <= 20);
});

test('very narrow layouts prioritise the selected member and resizing restores the full list', () => {
  const people = authors([0, 5]);
  assert.equal(preview(people, fit(people, 10, 'Frank')), '\u2026, Frank');
  assert.equal(preview(people, fit(people, 100, 'Frank')), 'Alice, Bob, Clara, David, Eve, Frank');
  assert.deepEqual(authorTokens([], people.length), [null]);
});

test('abstracts render inline and display math using all common delimiters', () => {
  const html = renderAbstract('Inline $x_{t+1}$ and \\(y^2\\). Display $$E=mc^2$$ and \\[z=3\\].');
  const elements = nodes(parseFragment(html));
  assert.equal(elements.filter(node => node.tagName === 'math').length, 4);
  assert.equal(elements.filter(node => node.tagName === 'math' && node.attrs.some(a => a.name === 'display' && a.value === 'block')).length, 2);
  assert.ok(elements.some(node => node.tagName === 'msub'));
  assert.ok(elements.some(node => node.tagName === 'msup'));
});

test('nested math inside a bold text group preserves the full formula', () => {
  const html = renderAbstract('$\\textbf{225 consecutive $\\mathbf{180^\\circ}$ rotations at $\\sim0.36 \\;\\text{rot/s}$}$');
  const elements = nodes(parseFragment(html));
  assert.equal(elements.filter(node => node.tagName === 'math').length, 1);
  assert.ok(html.includes('225'));
  assert.ok(html.includes('180'));
  assert.ok(!html.includes('katex-error'));
});

test('LaTeX prose commands become formatted text and citation keys stay readable', () => {
  const html = renderAbstract('A \\textit{Fermat} state in \\texttt{roto 2.0}; \\textbf{bold \\emph{words}}. See \\citep{paper2024,other2025}.');
  assert.equal(html, 'A <em>Fermat</em> state in <code>roto 2.0</code>; <strong>bold <em>words</em></strong>. See [paper2024, other2025].');
});

test('escaped symbols, currency and incomplete formulas remain readable', () => {
  assert.equal(renderAbstract('Costs \\$20; 90\\% success & accuracy.'), 'Costs $20; 90% success &amp; accuracy.');
  assert.equal(renderAbstract('Costs $10 and $20.'), 'Costs $10 and $20.');
  assert.equal(renderAbstract('An incomplete $x_{t} expression'), 'An incomplete $x_{t} expression');
  assert.equal(renderAbstract('$\\unknowncommand{x}$'), '$\\unknowncommand{x}$');
});

test('abstract rendering escapes HTML and disables trusted LaTeX extensions', () => {
  const html = renderAbstract('<script>alert(1)</script><img src=x onerror=alert(1)> $\\href{javascript:alert(1)}{click}$');
  const elements = nodes(parseFragment(html));
  assert.equal(elements.filter(node => ['script', 'img', 'a'].includes(node.tagName)).length, 0);
  assert.ok(!elements.some(node => node.attrs?.some(attr => /^on/i.test(attr.name))));
  assert.ok(html.includes('&lt;script&gt;'));
});
