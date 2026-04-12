import type { GHLPuller } from "./types";
import { MockPuller } from "./mock-puller";

export function createPuller(): GHLPuller {
  return new MockPuller();
}

export type { GHLPuller, GHLRawData, DateRange } from "./types";
