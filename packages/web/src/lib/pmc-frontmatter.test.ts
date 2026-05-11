import { describe, test, expect } from 'bun:test';
import { parseFrontmatter } from './pmc-frontmatter';

describe('parseFrontmatter', () => {
  test('parses flat key:value frontmatter', () => {
    const raw = '---\nname: PMC\nstatus: active\n---\n# Body\n\nhello';
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({ name: 'PMC', status: 'active' });
    expect(body).toBe('# Body\n\nhello');
  });

  test('returns empty frontmatter + raw body when no frontmatter block', () => {
    const raw = '# Heading\n\nno frontmatter here';
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe(raw);
  });

  test('strips surrounding quotes from values', () => {
    const raw = `---\ntitle: "Hello World"\nsubtitle: 'with quotes'\n---\nbody`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.title).toBe('Hello World');
    expect(frontmatter.subtitle).toBe('with quotes');
  });

  test('keeps colons after the first one in the value', () => {
    const raw = '---\ntime: 10:30 AM\n---\n';
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.time).toBe('10:30 AM');
  });

  test('handles empty frontmatter block', () => {
    const raw = '---\n\n---\nbody';
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe('body');
  });

  test('skips lines without a colon (e.g., list items)', () => {
    const raw = '---\nname: PMC\n- bullet\nstatus: active\n---\nbody';
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({ name: 'PMC', status: 'active' });
  });

  test('handles CRLF line endings', () => {
    const raw = '---\r\nname: PMC\r\nstatus: active\r\n---\r\nbody';
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({ name: 'PMC', status: 'active' });
    expect(body).toBe('body');
  });

  test('trims whitespace in keys and values', () => {
    const raw = '---\n  name  :   PMC  \n---\nbody';
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.name).toBe('PMC');
  });

  test('ignores body-only content when opening --- is missing', () => {
    const raw = 'name: PMC\n---\nbody';
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe(raw);
  });

  test('returns empty body when no content follows closing ---', () => {
    const raw = '---\nname: PMC\n---';
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({ name: 'PMC' });
    expect(body).toBe('');
  });
});
