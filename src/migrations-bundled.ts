// Bundled Drizzle migrations for single-binary builds
// These imports ensure Bun embeds the SQL files into the executable.
// Order matters: keep in incremental order.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Bun import attributes
import mig0000 from "../drizzle/0000_friendly_millenium_guard.sql" with {
	type: "file",
};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Bun import attributes
import mig0001 from "../drizzle/0001_stale_sentinels.sql" with { type: "file" };
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Bun import attributes
import mig0002 from "../drizzle/0002_graceful_caretaker.sql" with {
    type: "file",
};

export const bundledMigrations: Array<{ name: string; path: string }> = [
    { name: "0000_friendly_millenium_guard.sql", path: mig0000 },
    { name: "0001_stale_sentinels.sql", path: mig0001 },
    { name: "0002_graceful_caretaker.sql", path: mig0002 },
];
