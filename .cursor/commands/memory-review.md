Audit code for potential memory leaks or uncontrolled memory growth.

Instructions:
- First, list all issues found, ranked by severity. Reference file and line.
- Focus on leaks: survivors (references, listeners, store state, timers) beyond screen/component lifetime.
- Scrutinize `useEffect`, navigation handlers, and subscriptions—ensure proper cleanup on unmount/exit.
- Check zustand/global stores: are transient states and controllers reset after screen exit?
- Watch for lingering logs, un-cleared timers, stale refs, or retained closures—especially dev-only artifacts.
- Confirm that navigation exit reliably destroys video/audio objects and progress observers.
- For every confirmed or suspected issue, prescribe at least two battle-tested remediation paths (framework patterns, platform APIs, or architectural fixes) and note trade-offs.

Output format:
1. Ordered findings by severity, file:line.
2. Explicitly mark confirmed leaks, missing teardown, or suspected issues (with evidence requests for unclear cases).
3. Omit filler. Be blunt, technical, and unforgiving when calling out missed cleanup or risk.

End review after comprehensive, severity-ranked list.