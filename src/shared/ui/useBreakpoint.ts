import { useWindowDimensions } from "react-native";
import { breakpoints, layout } from "../designSystem";

/**
 * One source of truth for "narrow vs wide".
 *
 * Every screen in this app renders on a phone AND in a browser window, so each
 * one needs the same answer to that question. Without this hook each screen
 * hardcodes its own threshold and the shell disagrees with its contents at some
 * width nobody tested.
 */
export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isPhone: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < layout.wideBreakpoint,
    /** At/above this the desktop sidebar shell replaces the phone tab bar. */
    isWide: width >= layout.wideBreakpoint,
    isXWide: width >= breakpoints.xl,
    /** Page gutter: 28 on a desktop, 20 on a phone. */
    gutter:
      width >= layout.wideBreakpoint
        ? layout.screenPadding
        : layout.screenPaddingPhone,
  };
}

/**
 * Control height by input device.
 *
 * A pointer wants a compact 42px control; a thumb wants Apple's 44pt floor and
 * comfortably more. Neither number is right for both, so the component asks
 * rather than shipping one compromise that is slightly wrong everywhere.
 */
export function useControlHeight() {
  const { isWide } = useBreakpoint();
  return isWide ? layout.controlHeight : layout.controlHeightPhone;
}
