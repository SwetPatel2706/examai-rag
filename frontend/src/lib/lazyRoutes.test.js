import { describe, it, expect } from 'vitest';
import { getRouteParams } from './lazyRoutes';

describe('lazy route metadata', () => {
  it('extracts concrete parameters for dynamic subject and quiz routes', () => {
    expect(getRouteParams('/student/subject/algorithms')).toEqual({ id: 'algorithms' });
    expect(getRouteParams('/student/quiz/q-1/results')).toEqual({ id: 'q-1' });
    expect(getRouteParams('/student/quiz/q-1')).toEqual({ id: 'q-1' });
  });

  it('does not match unrelated paths', () => {
    expect(getRouteParams('/student/not-a-route')).toBeNull();
  });
});
