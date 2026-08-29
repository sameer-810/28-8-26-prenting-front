import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

/**
 * Navigation from outside a component.
 *
 * Used when a session dies: the auth store cannot call a hook, but it still has
 * to get the parent to the login screen. Deliberately narrow — everything else
 * navigates through `useAppNavigation`, because imperative navigation scattered
 * through services is how a route graph becomes untraceable.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateRoot<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T],
) {
  if (!navigationRef.isReady()) return;
  /**
   * Dispatched as a CommonAction rather than through `ref.navigate`. The
   * ref's overload is a variadic tuple that will not accept a generic
   * (name, params) pair without casting both to `never` — which would silence
   * the very checking the generic exists to provide. The action form is
   * properly typed and is the documented way to navigate from outside React.
   */
  navigationRef.dispatch(CommonActions.navigate({ name, params }));
}
