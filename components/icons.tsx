import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const ArrowIcon = (props: Props) => <svg {...base} {...props}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const UploadIcon = (props: Props) => <svg {...base} {...props}><path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4" /></svg>;
export const ShieldIcon = (props: Props) => <svg {...base} {...props}><path d="M12 3l7 3v5c0 4.7-2.8 8.3-7 10-4.2-1.7-7-5.3-7-10V6l7-3z" /><path d="M9 12l2 2 4-5" /></svg>;
export const SparkIcon = (props: Props) => <svg {...base} {...props}><path d="M12 3l1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8L12 3zM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15zM19 13l.6 1.9 1.9.6-1.9.6L19 18l-.6-1.9-1.9-.6 1.9-.6L19 13z" /></svg>;
export const SearchIcon = (props: Props) => <svg {...base} {...props}><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>;
export const DownloadIcon = (props: Props) => <svg {...base} {...props}><path d="M12 4v11m0 0l-4-4m4 4 4-4M5 19h14" /></svg>;
export const CopyIcon = (props: Props) => <svg {...base} {...props}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>;
export const CheckIcon = (props: Props) => <svg {...base} {...props}><path d="M5 12l4 4L19 6" /></svg>;
export const FileIcon = (props: Props) => <svg {...base} {...props}><path d="M6 3h8l4 4v14H6V3z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
export const LayersIcon = (props: Props) => <svg {...base} {...props}><path d="M12 3L3 8l9 5 9-5-9-5z" /><path d="M3 12l9 5 9-5M3 16l9 5 9-5" /></svg>;
export const MenuIcon = (props: Props) => <svg {...base} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const CloseIcon = (props: Props) => <svg {...base} {...props}><path d="M5 5l14 14M19 5L5 19" /></svg>;
export const TrashIcon = (props: Props) => <svg {...base} {...props}><path d="M4 7h16M9 7V4h6v3m3 0l-1 14H7L6 7M10 11v6M14 11v6" /></svg>;
