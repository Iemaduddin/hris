import type { Config } from "jest";

const config: Config = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/*.test.ts"],
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{ tsconfig: { module: "commonjs", moduleResolution: "node", strict: true, esModuleInterop: true } },
		],
	},
};

export default config;
