import { useExecutiveStoryStore } from '../store/useExecutiveStoryStore';

/**
 * Backwards-compatible hook that delegates directly to Zustand store.
 * Allows components to use either `useExecutiveStory()` or `useExecutiveStoryStore()`.
 */
export const useExecutiveStory = () => {
    const store = useExecutiveStoryStore();
    return store;
};

/**
 * Provider wrapper kept for backward compatibility with existing App router tree.
 */
export const ExecutiveStoryProvider = ({ children }) => {
    return <>{children}</>;
};

export default useExecutiveStory;
