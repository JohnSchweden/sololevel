# TanStack Query: Refetch-on-Focus Best Practices

## Problem
Manual `refetch()` calls in `useFocusEffect` bypass TanStack Query's `staleTime`, causing unnecessary network requests even when data is fresh.

## Solution
**Use TanStack Query's built-in `refetchOnFocus` instead of manual refetch calls.**

### Before (Anti-pattern)
```tsx
// ❌ Manual refetch bypasses staleTime
useFocusEffect(
  React.useCallback(() => {
    refetch() // Always refetches, ignoring 5-minute staleTime
  }, [refetch])
)
```

### After (Best Practice)
```tsx
// ✅ Let TanStack Query handle focus refetching
useQuery({
  queryKey: ['history', 'completed', limit],
  refetchOnFocus: true, // Respects staleTime (5min)
  staleTime: 5 * 60 * 1000,
  // ... other options
})
```

## Battle-Tested Best Practices

### 1. **Stale-While-Revalidate Pattern**
- TanStack Query's `refetchOnFocus` respects `staleTime`
- Fresh data (< 5min) → No refetch
- Stale data (> 5min) → Background refetch, show cached data immediately

### 2. **Don't Bypass the Cache**
- ❌ Manual `refetch()` ignores `staleTime`
- ✅ `refetchOnFocus: true` respects cache freshness
- ✅ Use `invalidateQueries()` if you need to force refetch

### 3. **Let the Library Handle It**
- TanStack Query v5 automatically integrates with React Navigation focus events
- No manual `useFocusEffect` needed for data refetching
- The library optimizes refetch timing based on app state

### 4. **Configuration Per Query**
- Global defaults in `QueryClient` defaultOptions
- Override per-query with `refetchOnFocus`, `refetchOnMount`, `refetchOnReconnect`
- Use `staleTime` to control cache freshness thresholds

## When to Use Manual Refetch
Only use manual `refetch()` when:
- User explicitly triggers refresh (pull-to-refresh)
- Mutations need to invalidate specific queries
- Conditional refetching based on complex business logic

## References
- [TanStack Query Refetching](https://tanstack.com/query/latest/docs/framework/react/guides/refetching)
- [React Navigation Integration](https://tanstack.com/query/latest/docs/framework/react/plugins/react-native)
