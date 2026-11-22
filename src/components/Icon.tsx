const icons: Record<string, string> = {
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  book: "M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-3H4z M13 6a3 3 0 0 1 3-3h5v15h-4a4 4 0 0 0-4 3",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  arrow: "M7 17 17 7 M7 7h10v10",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  calendar: "M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16",
  plus: "M12 5v14 M5 12h14",
  wallet: "M3 5h16v15H3z M3 8h18v9h-6V8",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  chart: "M4 20V10 M10 20V4 M16 20v-8 M22 20H2",
  shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6z M8 12l3 3 5-6",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  filter: "M4 5h16l-6 7v7l-4 2v-9z",
  more: "M5 12h.1 M12 12h.1 M19 12h.1",
  logout: "M9 4H3v16h6 M10 12h11 m-5-5 5 5-5 5",
  flag: "M5 22V3h14l-3 5 3 5H5",
  heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 8 15 8 15S25 10 20 5",
  mail: "M3 5h18v14H3z m0 0 9 8 9-8",
  close: "m6 6 12 12 M6 18 18 6",
};
export default function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icons[name] || icons.grid} />
    </svg>
  );
}
