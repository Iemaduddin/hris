"use client";

export default function TombolCetak() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 print:hidden"
    >
      Cetak
    </button>
  );
}
