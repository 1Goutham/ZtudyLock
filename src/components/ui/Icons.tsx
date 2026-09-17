/** The few icons ZtudyLock allows itself. Everything else is type. */
import { cx } from "@/lib/utils";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, className, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cx("shrink-0", className)} aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconArrowUpRight = (p: IconProps) => <Svg {...p}><path d="M7 17 17 7M8 7h9v9" /></Svg>;
export const IconArrowRight = (p: IconProps) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const IconArrowLeft = (p: IconProps) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const IconArrowUp = (p: IconProps) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
export const IconChevron = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const IconX = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconCheck = (p: IconProps) => <Svg {...p}><path d="m5 12 4.5 4.5L19 7" /></Svg>;
export const IconPlus = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconUpload = (p: IconProps) => <Svg {...p}><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></Svg>;
export const IconStop = (p: IconProps) => <Svg {...p}><rect x="7" y="7" width="10" height="10" rx="1.5" /></Svg>;
