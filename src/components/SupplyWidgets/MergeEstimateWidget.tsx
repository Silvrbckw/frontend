import * as DateFns from "date-fns";
import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { useMergeEstimate } from "../../api/merge-estimate";
import { O, pipe } from "../../fp";
import { useActiveBreakpoint } from "../../utils/use-active-breakpoint";
import { LabelText, TextRoboto } from "../Texts";
import Twemoji from "../Twemoji";
import { WidgetBackground } from "../WidgetSubcomponents";
import MergeEstimateTooltip from "./MergeEstimateTooltip";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const getTimeLeft = (estimatedDateTime: Date) => ({
  days: DateFns.differenceInDays(estimatedDateTime, new Date()),
  hours: DateFns.differenceInHours(estimatedDateTime, new Date()) % 24,
  minutes: DateFns.differenceInMinutes(estimatedDateTime, new Date()) % 60,
  seconds: DateFns.differenceInSeconds(estimatedDateTime, new Date()) % 60,
});

const shiftDateTimeByTimeZone = (dateTime: Date): Date =>
  new Date(dateTime.toISOString().slice(0, -1));

export const TOTAL_TERMINAL_DIFFICULTY = 58750000000;

const MergeEstimateWidget = () => {
  const mergeEstimate = useMergeEstimate();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>();
  const [isHoveringNerd, setIsHoveringNerd] = useState(false);
  const { lg, xl } = useActiveBreakpoint();

  useEffect(() => {
    if (mergeEstimate === undefined) {
      return undefined;
    }

    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(mergeEstimate.estimatedDateTime));
    }, 1000);

    return () => clearInterval(id);
  }, [mergeEstimate]);

  const mergeEstimateFormatted = pipe(
    mergeEstimate,
    O.fromNullable,
    O.map((mergeEstimate) => mergeEstimate.estimatedDateTime),
    O.map(shiftDateTimeByTimeZone),
    O.map((dateTime) => DateFns.format(dateTime, "MMM d, haaa")),
    O.toUndefined,
  );

  // If we don't have data, show a zero.
  // If we have data and we're not dealing with the two column layout on a
  // smaller screen (lg && !xl), show the full number.
  // If we are dealing with the two column layout and are on a small screen,
  // shorten the number by truncating thousands.
  const blocksToTTD =
    mergeEstimate === undefined
      ? 0
      : !(lg && !xl)
      ? mergeEstimate.blocksLeft
      : mergeEstimate.blocksLeft > 1000
      ? mergeEstimate.blocksLeft / 1e3
      : mergeEstimate.blocksLeft;
  const blocksToTTDSuffix =
    mergeEstimate === undefined
      ? false
      : !(lg && !xl)
      ? false
      : mergeEstimate.blocksLeft > 1000
      ? true
      : false;

  return (
    <>
      <WidgetBackground>
        <div className="relative flex flex-col md:flex-row justify-between gap-y-8 gap-x-2">
          <div className="flex flex-col gap-y-4">
            {/* Keeps the height of this widget equal to the adjacent one. */}
            <LabelText className="flex items-center min-h-[21px] truncate">
              {`merge estimate—${mergeEstimateFormatted} UTC`}
            </LabelText>
            {mergeEstimate !== undefined &&
            Number(mergeEstimate.totalDifficulty) / 1e12 >=
              TOTAL_TERMINAL_DIFFICULTY ? (
              <div className="flex gap-x-8 mx-auto items-center h-14">
                <Twemoji className="flex gap-x-2" imageClassName="h-10" wrapper>
                  🎉
                </Twemoji>
                <Twemoji className="flex gap-x-2" imageClassName="h-10" wrapper>
                  🦇🔊🐼
                </Twemoji>
                <Twemoji className="flex gap-x-2" imageClassName="h-10" wrapper>
                  🎉
                </Twemoji>
              </div>
            ) : (
              <div className="flex gap-x-4 md:gap-x-6 mx-auto ">
                <div className="flex flex-col items-center gap-y-2 w-[40px]">
                  <TextRoboto className="text-[1.7rem]">
                    {timeLeft?.days ?? 0}
                  </TextRoboto>
                  <LabelText className="text-slateus-400">
                    {timeLeft?.days === 1 ? "day" : "days"}
                  </LabelText>
                </div>
                <div className="flex flex-col items-center gap-y-2 w-[40px]">
                  <TextRoboto className="text-[1.7rem]">
                    {timeLeft?.hours ?? 0}
                  </TextRoboto>
                  <LabelText className="text-slateus-400">
                    {timeLeft?.hours === 1 ? "hour" : "hours"}
                  </LabelText>
                </div>
                <div className="flex flex-col items-center gap-y-2 w-[40px]">
                  <TextRoboto className="text-[1.7rem]">
                    {timeLeft?.minutes ?? 0}
                  </TextRoboto>
                  <LabelText className="text-slateus-400">
                    {timeLeft?.minutes === 1 ? "min" : "mins"}
                  </LabelText>
                </div>
                <div className="flex flex-col items-center gap-y-2 w-[40px]">
                  <TextRoboto className="text-[1.7rem]">
                    {timeLeft?.seconds ?? 0}
                  </TextRoboto>
                  <LabelText className="text-slateus-400">
                    {timeLeft?.seconds === 1 ? "sec" : "secs"}
                  </LabelText>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-y-4">
            <div
              // Uses CSS to show the tooltip.
              // Expands element invisibly using padding and negative margin to
              // keep the tooltip open.
              className={`
                flex items-center
                [&_.tooltip]:hover:block
                md:pl-5 md:-ml-5 md:pb-4 md:-mb-4 md:pt-4 md:-mt-4
                cursor-pointer
                md:justify-end
              `}
              onMouseEnter={() => setIsHoveringNerd(true)}
              onMouseLeave={() => setIsHoveringNerd(false)}
            >
              <LabelText className="truncate">blocks to ttd</LabelText>
              <img
                alt="an emoji of a nerd"
                className={`ml-2 select-none ${isHoveringNerd ? "hidden" : ""}`}
                src={`/nerd-coloroff.svg`}
              />
              <img
                alt="an colored emoji of a nerd"
                className={`ml-2 select-none ${isHoveringNerd ? "" : "hidden"}`}
                src={`/nerd-coloron.svg`}
              />
              <div
                className={`
                  tooltip hidden absolute
                  top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  w-[calc(100% + 96px)] max-w-sm
                  whitespace-nowrap
                  z-10
                  cursor-default
                `}
              >
                <MergeEstimateTooltip
                  latestBlockDifficulty={mergeEstimate?.difficulty}
                  totalDifficulty={mergeEstimate?.totalDifficulty}
                  totalTerminalDifficulty={TOTAL_TERMINAL_DIFFICULTY}
                />
              </div>
            </div>
            <div className="flex flex-col gap-y-2 md:items-center">
              <TextRoboto className="text-[1.7rem]">
                <CountUp
                  separator=","
                  end={blocksToTTD}
                  suffix={blocksToTTDSuffix ? "K" : ""}
                  preserveValue
                />
              </TextRoboto>
              <LabelText className="hidden md:block text-slateus-400">
                blocks
              </LabelText>
            </div>
          </div>
        </div>
      </WidgetBackground>
    </>
  );
};

export default MergeEstimateWidget;
