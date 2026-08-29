import { Home, TrendingUp, Users, Settings, Sparkles } from "lucide-react-native";

/**
 * One nav definition, two shells.
 *
 * The phone tab bar and the desktop sidebar are rendered from this list rather
 * than each declaring its own. Two lists drift — a section added to one and not
 * the other is invisible on that platform, and nobody notices because nobody
 * tests both widths on every change.
 */
export interface NavItem {
  name: string;
  label: string;
  icon: typeof Home;
  /** Shown in the phone tab bar. The sidebar shows everything. */
  inTabBar: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { name: "Home", label: "Home", icon: Home, inTabBar: true },
  { name: "Progress", label: "Progress", icon: TrendingUp, inTabBar: true },
  { name: "Children", label: "Children", icon: Users, inTabBar: true },
  { name: "Settings", label: "Settings", icon: Settings, inTabBar: true },
];

/** Sections the sidebar can reach that are not tab-bar destinations. */
export const SECONDARY_ITEMS: NavItem[] = [
  { name: "AddChild", label: "Add a child", icon: Sparkles, inTabBar: false },
];

/**
 * Screens the back affordance treats as a landing point — nothing sits behind
 * them, so they get no back link.
 */
export const LANDING_SCREENS = new Set(NAV_ITEMS.map((i) => i.name));
