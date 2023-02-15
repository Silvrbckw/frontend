export const limitedTimeFrames = ["m5", "h1", "d1", "d7", "d30"] as const;
export type LimitedTimeFrame = typeof limitedTimeFrames[number];

export const timeFramesOld = ["m5", "h1", "d1", "d7", "d30", "all"] as const;
export type TimeFrameOld = typeof timeFramesOld[number];

export const timeFramesNoMerge = [
  "m5",
  "h1",
  "d1",
  "d7",
  "d30",
  "since_burn",
] as const;
export type TimeFrameNoMerge = typeof timeFramesNoMerge[number];

export const fromOldTimeFrame = (timeFrame: TimeFrameOld): TimeFrameNoMerge =>
  timeFrame === "all" ? "since_burn" : timeFrame;

export const toOldTimeFrame = (timeFrame: TimeFrameNoMerge): TimeFrameOld =>
  timeFrame === "since_burn" ? "all" : timeFrame;

export const displayLimitedTimeFrameMap: Record<LimitedTimeFrame, string> = {
  m5: "5m",
  h1: "1h",
  d1: "1d",
  d7: "7d",
  d30: "30d",
};

export const getNextTimeFrameOld = (timeFrame: TimeFrameOld): TimeFrameOld => {
  const nextIndex =
    (timeFramesOld.indexOf(timeFrame) + 1) % timeFramesOld.length;

  // Index is checked above.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return timeFramesOld[nextIndex]!;
};

export const getNextTimeFrameNoMerge = (
  timeFrame: TimeFrameNoMerge,
): TimeFrameNoMerge => {
  const nextIndex =
    (timeFramesNoMerge.indexOf(timeFrame) + 1) % timeFramesNoMerge.length;

  // Index is checked above.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return timeFramesNoMerge[nextIndex]!;
};

export const timeFrames = [...timeFramesNoMerge, "since_merge"] as const;
export type TimeFrame = typeof timeFrames[number];
