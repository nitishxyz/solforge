import { useMemo } from "react";

export function usePageContext<T>(
	data: T | undefined,
	transformer: (data: T) => string,
): string {
	return useMemo(() => {
		if (!data) return "";
		return transformer(data);
	}, [data, transformer]);
}
