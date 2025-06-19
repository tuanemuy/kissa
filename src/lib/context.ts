import { getContext } from "@/actions/context";
import type { Context } from "@/core/application/context";

export function getAppContext(): Context {
  return getContext();
}

export function createContext(): Context {
  return getContext();
}
