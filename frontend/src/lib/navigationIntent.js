import { preloadRoute } from './lazyRoutes';
import { markNavigationStart } from './navigationPerformance';

export function prepareNavigation(path) {
  markNavigationStart(path);
  preloadRoute(path);
}

export function navigationIntentProps(path) {
  const prepare = () => prepareNavigation(path);
  return {
    onMouseEnter: prepare,
    onFocus: prepare,
    onPointerDown: prepare,
  };
}

export function navigateWithIntent(navigate, path, options) {
  prepareNavigation(path);
  navigate(path, options);
}
