import { describe, it, expect } from 'vitest';
import { navigationIntentProps } from './navigationIntent';

describe('navigation intent helpers', () => {
  it('prepares a route from hover, focus, and pointer-down intent', () => {
    const props = navigationIntentProps('/student/quizzes');
    const events = ['onMouseEnter', 'onFocus', 'onPointerDown'];

    events.forEach((event) => expect(props[event]).toEqual(expect.any(Function)));
  });
});
