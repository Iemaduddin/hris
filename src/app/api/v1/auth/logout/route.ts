import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";

export async function POST(request: NextRequest) {
	const res = await auth.api.signOut({ headers: request.headers, asResponse: true });

	const headers = new Headers();
	try {
		res.headers.forEach((value, key) => {
			if (key.toLowerCase() === "set-cookie") headers.append("set-cookie", value);
		});
	} catch {
		// abaikan
	}

	return NextResponse.json({ success: true, data: { message: "Logout berhasil." } }, { headers });
}
