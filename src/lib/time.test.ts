import {
	addDays,
	dateOnlyInput,
	dayName,
	fromTimeValue,
	minutesToTimeLabel,
	startOfDay,
	timeToMinutes,
	toDbDate,
	toTimeValue,
} from "./time";

describe("toTimeValue", () => {
	it("mem-parsing HH:MM valid", () => {
		const d = toTimeValue("08:30");
		expect(d).not.toBeNull();
		expect(d!.getHours()).toBe(8);
		expect(d!.getMinutes()).toBe(30);
	});

	it("mendukung jam 1 digit dan detik", () => {
		const d = toTimeValue("8:05:09");
		expect(d!.getHours()).toBe(8);
		expect(d!.getMinutes()).toBe(5);
		expect(d!.getSeconds()).toBe(9);
	});

	it("menolak input kosong/invalid/di luar rentang", () => {
		expect(toTimeValue(null)).toBeNull();
		expect(toTimeValue(undefined)).toBeNull();
		expect(toTimeValue("")).toBeNull();
		expect(toTimeValue("pagi")).toBeNull();
		expect(toTimeValue("24:00")).toBeNull();
		expect(toTimeValue("12:60")).toBeNull();
	});

	it("round-trip dengan fromTimeValue", () => {
		expect(fromTimeValue(toTimeValue("08:05"))).toBe("08:05");
		expect(fromTimeValue(null)).toBe("");
	});
});

describe("timeToMinutes & minutesToTimeLabel", () => {
	it("konversi menit bolak-balik", () => {
		expect(timeToMinutes(toTimeValue("08:30"))).toBe(510);
		expect(timeToMinutes(null)).toBeNull();
		expect(minutesToTimeLabel(90)).toBe("01:30");
	});

	it("normalisasi melewati batas hari", () => {
		expect(minutesToTimeLabel(-30)).toBe("23:30");
		expect(minutesToTimeLabel(1440)).toBe("00:00");
	});
});

describe("helper tanggal", () => {
	it("dateOnlyInput format YYYY-MM-DD", () => {
		expect(dateOnlyInput(new Date(2026, 9, 12))).toBe("2026-10-12");
		expect(dateOnlyInput(null)).toBe("");
	});

	it("toDbDate selalu UTC-midnight", () => {
		expect(toDbDate("2026-10-12").toISOString()).toBe("2026-10-12T00:00:00.000Z");
		expect(toDbDate(new Date(2026, 9, 12, 15, 30)).toISOString()).toBe("2026-10-12T00:00:00.000Z");
	});

	it("startOfDay & addDays", () => {
		const awal = startOfDay(new Date(2026, 9, 12, 15, 30));
		expect([awal.getHours(), awal.getMinutes(), awal.getSeconds()]).toEqual([0, 0, 0]);
		expect(addDays(new Date(Date.UTC(2026, 9, 12)), 5).toISOString().slice(0, 10)).toBe("2026-10-17");
	});

	it("dayName 12 Okt 2026 = SENIN", () => {
		expect(dayName(new Date(2026, 9, 12))).toBe("SENIN");
	});
});
