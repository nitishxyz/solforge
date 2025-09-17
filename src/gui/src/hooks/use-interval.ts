import { useEffect, useRef } from "react";

// Minimal interval hook to avoid stale closures
export function useInterval(callback: () => void, delay: number | null) {
	const savedCallback = useRef(callback);

	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	useEffect(() => {
		if (delay === null) return undefined;
		const tick = () => savedCallback.current();
		const id = setInterval(tick, delay);
		return () => clearInterval(id);
	}, [delay]);
}
