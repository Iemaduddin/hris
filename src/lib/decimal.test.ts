import { decimalKeNumber } from "./decimal";

describe("decimalKeNumber", () => {
	it("null/undefined -> null", () => {
		expect(decimalKeNumber(null)).toBeNull();
		expect(decimalKeNumber(undefined)).toBeNull();
	});

	it("number valid", () => {
		expect(decimalKeNumber(12)).toBe(12);
		expect(decimalKeNumber(0)).toBe(0);
	});

	it("string numerik & objek ala Prisma Decimal", () => {
		expect(decimalKeNumber("3.5")).toBe(3.5);
		expect(decimalKeNumber({ valueOf: () => "7.25" })).toBe(7.25);
	});

	it("non-numerik -> null", () => {
		expect(decimalKeNumber("abc")).toBeNull();
		expect(decimalKeNumber(NaN)).toBeNull();
		expect(decimalKeNumber(Infinity)).toBeNull();
		expect(decimalKeNumber({})).toBeNull();
	});
});
