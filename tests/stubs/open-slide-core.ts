// Minimal stand-in for @open-slide/core so the template module can be imported in node tests.
export const useIsActivePage = () => false;
export const useSlidePageNumber = () => ({ current: 1, total: 1 });
export type Page = () => unknown;
export type SlideMeta = { title?: string; createdAt: string };
export type DesignSystem = Record<string, unknown>;
