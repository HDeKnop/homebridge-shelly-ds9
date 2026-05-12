import { describe, it, expect } from 'vitest';

import { Ability, ServiceClass } from '../../src/abilities/base.js';

/**
 * Test subclass exposing `sanitizeName` for direct unit testing.
 * sanitizeName is the function HAP relies on to keep characteristic Names
 * within the alphanumeric / space / apostrophe charset.
 */
class TestAbility extends Ability {
  protected get serviceClass(): ServiceClass {
    return {} as ServiceClass;
  }

  protected initialize(): void {}

  detach(): void {}

  public sanitize(name: string): string {
    return this.sanitizeName(name);
  }
}

const sanitize = (s: string): string => new TestAbility().sanitize(s);

describe('Ability.sanitizeName', () => {
  it('passes through valid alphanumeric strings', () => {
    expect(sanitize('Hello World')).toBe('Hello World');
  });

  it('preserves apostrophes', () => {
    expect(sanitize('Herman\'s Room')).toBe('Herman\'s Room');
  });

  it('replaces non-allowed characters with spaces', () => {
    expect(sanitize('Light-1/Kitchen')).toBe('Light 1 Kitchen');
  });

  it('collapses consecutive whitespace', () => {
    expect(sanitize('A    B')).toBe('A B');
  });

  it('trims leading non-alphanumeric characters', () => {
    expect(sanitize('   --leading')).toBe('leading');
  });

  it('trims trailing non-alphanumeric characters', () => {
    expect(sanitize('trailing--   ')).toBe('trailing');
  });

  it('returns empty string when input has no alphanumerics', () => {
    expect(sanitize('!!!---!!!')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitize('')).toBe('');
  });

  it('handles unicode by replacing it with spaces', () => {
    expect(sanitize('Café Lumière')).toBe('Caf Lumi re');
  });

  it('handles a single character', () => {
    expect(sanitize('a')).toBe('a');
  });

  it('handles whitespace-only input', () => {
    expect(sanitize('   ')).toBe('');
  });
});
