import { differenceInSeconds, format } from "date-fns";
import type {
  FormatterCallbackFunction,
  PlotLineOrBand,
  Point,
} from "highcharts";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import highchartsAnnotations from "highcharts/modules/annotations";
import _first from "lodash/first";
import _last from "lodash/last";
import _merge from "lodash/merge";
import type { FC } from "react";
import { useContext, useState } from "react";
import { useMemo } from "react";
import colors from "../../../colors";
import LabelText from "../../../components/TextsNext/LabelText";
import WidgetErrorBoundary from "../../../components/WidgetErrorBoundary";
import { WidgetBackground } from "../../../components/WidgetSubcomponents";
import { FeatureFlagsContext } from "../../../feature-flags";
import {
  formatPercentFiveDecimalsSigned,
  formatPercentThreeDecimalsSigned,
  formatTwoDigit,
  formatTwoDigitsSigned,
  formatZeroDecimals,
} from "../../../format";
import { O, pipe } from "../../../fp";
import type { DateTimeString } from "../../../time";
import type {
  SupplySeriesCollection,
  SupplySeriesCollections,
} from "../../api/supply-over-time";
import { useSupplySeriesCollections } from "../../api/supply-over-time";
import { LONDON_TIMESTAMP } from "../../hardforks/london";
import { MERGE_BLOCK_NUMBER, MERGE_TIMESTAMP } from "../../hardforks/paris";
import type { SupplyPoint } from "../../sections/SupplyDashboard";
import type { TimeFrame } from "../../time-frames";
import SimulateProofOfWork from "../SimulateProofOfWork";
import TimeFrameIndicator from "../TimeFrameIndicator";
import UpdatedAgo from "../UpdatedAgo";

// Somehow resolves an error thrown by the annotation lib
if (typeof window !== "undefined") {
  // Initialize highchats annotations module (only on browser, doesn't work on server)
  highchartsAnnotations(Highcharts);
}

const SUPPLY_SINCE_MERGE_SERIES_ID = "supply-since-merge-series";
const SUPPLY_SINCE_MERGE_POW_SERIES_ID = "supply-since-merge-pow-series";
const BITCOIN_SUPPLY_ID = "bitcoin-supply-since-merge-series";

const baseOptions: Highcharts.Options = {
  accessibility: { enabled: false },
  chart: {
    marginLeft: 0,
    marginRight: 72,
    marginTop: 10,
    backgroundColor: "transparent",
    showAxes: false,
    zooming: {
      type: "x",
      resetButton: {
        position: {
          x: 0,
          y: 10,
        },
        theme: {
          fill: colors.slateus600,
          style: {
            opacity: 0.8,
            fontSize: "12",
            fontFamily: "Inter",
            fontWeight: "300",
            color: colors.white,
            textTransform: "lowercase",
            border: `1px solid ${colors.slateus400}`,
          },
          r: 4,
          states: { hover: { fill: "#343C56" } },
        },
      },
    },
  },
  title: undefined,
  yAxis: {
    title: { text: undefined },
    labels: {
      enabled: true,
    },
    gridLineWidth: 0,
  },
  xAxis: {
    type: "datetime",
    lineWidth: 0,
    labels: {
      style: { color: colors.slateus400 },
      enabled: false,
    },
    tickWidth: 0,
    minPadding: 0.06,
    maxPadding: 0.06,
  },
  legend: {
    enabled: true,
    useHTML: true,
    symbolWidth: 0,
    labelFormatter: function () {
      const color =
        this.visible === false
          ? "bg-slateus-400 opacity-60"
          : this.index === 0
          ? "bg-[#62A2F3]"
          : this.index === 1
          ? "bg-[#FF891D]"
          : "bg-[#DEE2F1]";
      return `
        <div class="flex flex-row gap-x-2 items-center">
          <div class="w-2 h-2 ${color} rounded-full"></div>
          <div class="
            text-xs font-normal font-roboto text-slateus-200
            ${this.visible ? "" : "opacity-60"}
          ">
            ${this.name}
          </div>
        </div>
      `;
    },
  },
  tooltip: {
    backgroundColor: "transparent",
    useHTML: true,
    borderWidth: 4,
    shadow: false,
  },
  credits: { enabled: false },
  plotOptions: {
    series: {
      marker: {
        lineColor: "white",
        radius: 3,
        symbol: "circle",
      },
    },
  },
};

type PointMap = Record<number, number>;

const getTooltip = (
  type: "pos" | "pow" | "bitcoin",
  series: SupplyPoint[] | undefined,
  pointMap: PointMap | undefined,
  simulateProofOfWork: boolean,
): FormatterCallbackFunction<Point> =>
  function () {
    if (series === undefined || pointMap === undefined) {
      return "";
    }

    const x = typeof this.x === "number" ? this.x : undefined;
    if (x === undefined) {
      return "";
    }

    const firstPoint = _first(series);
    if (firstPoint === undefined) {
      return "";
    }
    const firstSupply = firstPoint[1];
    const total = pointMap[x];
    if (total === undefined) {
      return "";
    }

    const dt = new Date(x);
    const formattedDate = format(dt, "iii MMM dd");
    const formattedTime = format(dt, "HH:mm:ss 'UTC'x");

    const supplyDelta = total - firstSupply;

    const supplyDeltaFormatted =
      supplyDelta !== undefined
        ? formatTwoDigitsSigned(supplyDelta)
        : undefined;

    const gradientCss =
      supplyDelta !== undefined && supplyDelta <= 0
        ? "from-orange-400 to-yellow-300"
        : "from-cyan-300 to-indigo-500";

    const title = type === "pos" ? "ETH" : type === "pow" ? "ETH (PoW)" : "BTC";
    const unit = type === "bitcoin" ? "BTC" : "ETH";

    const supplyDeltaPercent =
      supplyDelta === undefined
        ? undefined
        : formatPercentFiveDecimalsSigned(supplyDelta / total);

    // z-10 does not work without adjusting position to !static.
    return `
      <div class="relative z-10 p-4 rounded-lg border-2 font-roboto bg-slateus-700 border-slateus-400">
        ${
          !simulateProofOfWork
            ? ""
            : `<div class="mb-2 text-slateus-200">${title}</div>`
        }
        <div class="text-right text-slateus-400">${formattedDate}</div>
        <div class="text-right text-slateus-400">${formattedTime}</div>
        <div class="flex flex-col items-end mt-2">
          <div class="text-white">
            ${formatTwoDigit(total)}
            <span class="text-slateus-400"> ${unit}</span>
          </div>
          <div class="
            text-transparent bg-clip-text bg-gradient-to-r
            ${gradientCss}
            ${supplyDelta === undefined ? "hidden" : ""}
          ">
            ${supplyDeltaFormatted}
            <span class="text-slateus-400"> ${unit}</span>
          </div>
          <div class="
            text-transparent bg-clip-text bg-gradient-to-r
            ${gradientCss}
            ${supplyDeltaPercent === undefined ? "hidden" : ""}
          ">
            (${supplyDeltaPercent})
          </div>
        </div>
      </div>
    `;
  };

const YEAR_IN_SECONDS = 365.25 * 24 * 60 * 60;

const getSupplyChangeLabel = (
  points: SupplyPoint[],
): FormatterCallbackFunction<PlotLineOrBand> =>
  function () {
    const firstPoint = _first(points);
    const lastPoint = _last(points);
    if (firstPoint === undefined || lastPoint === undefined) {
      return "";
    }

    const secondsDelta = differenceInSeconds(lastPoint[0], firstPoint[0]);
    const supplyDelta = lastPoint[1] - firstPoint[1];
    const yearlyDelta = (supplyDelta / secondsDelta) * YEAR_IN_SECONDS;
    const yearlySupplyDeltaPercent = formatPercentThreeDecimalsSigned(
      yearlyDelta / firstPoint[1],
    );

    return `
      <span class="text-xs font-normal font-roboto text-slateus-400">
        <span class="text-white">${yearlySupplyDeltaPercent}</span>/y
      </span>
    `;
  };
const deltaLegendLableStyle = {
  fontSize: "12",
  fontFamily: "Roboto mono",
  fontWeight: "300",
  color: colors.slateus400,
};

const optionsFromSupplySeriesCollection = (
  supplySeriesCollection: SupplySeriesCollection,
  simulateProofOfWork: boolean,
  timeFrame: TimeFrame,
  enableSupplyLegendClick: boolean,
  posVisible: boolean,
  powVisible: boolean,
  btcVisible: boolean,
  onPosVisibilityChange: (visible: boolean) => void,
  onPowVisibilityChange: (visible: boolean) => void,
  onBtcVisibilityChange: (visible: boolean) => void,
): Highcharts.Options => {
  const { posSeries, powSeries, btcSeriesScaled, btcSeries } =
    supplySeriesCollection;

  const lastPointPos = _last(posSeries);
  const lastPointPow = _last(powSeries);
  const lastPointBtc = _last(btcSeriesScaled);

  const ethPosPointMap = Object.fromEntries(new Map(posSeries ?? []).entries());

  const ethPowPointMap = Object.fromEntries(new Map(powSeries ?? []).entries());

  const bitcoinPointMap = Object.fromEntries(
    new Map(btcSeries ?? []).entries(),
  );

  const dynamicOptions: Highcharts.Options = {
    legend: {
      enabled: simulateProofOfWork,
    },
    yAxis: {
      plotLines: [
        {
          id: "supply-at-start",
          value: posSeries?.[0]?.[1],
          color: colors.slateus400,
          width: 1,
          label: {
            x: 32,
            y: 4,
            style: { color: colors.slateus400 },
          },
        },
        {
          id: "bitcoin-issuance",
          value:
            !simulateProofOfWork || lastPointBtc === undefined
              ? undefined
              : lastPointBtc[1],
          width: 0,
          label: {
            style: deltaLegendLableStyle,
            align: "right",
            x: 72,
            y: timeFrame === "since_burn" ? -6 : 2,
            useHTML: true,
            formatter:
              btcSeries === undefined || !btcVisible
                ? undefined
                : getSupplyChangeLabel(btcSeries),
          },
        },
        {
          id: "eth-issuance-pos",
          value:
            lastPointPos === undefined || !posVisible
              ? undefined
              : lastPointPos[1],
          width: 0,
          label: {
            style: deltaLegendLableStyle,
            align: "right",
            x: 72,
            y: timeFrame === "since_burn" ? 8 : 2,
            useHTML: true,
            formatter:
              posSeries === undefined
                ? undefined
                : getSupplyChangeLabel(posSeries),
          },
        },
        {
          id: "eth-issuance-pow",
          value:
            !simulateProofOfWork || lastPointPow === undefined
              ? undefined
              : lastPointPow[1],
          width: 0,
          label: {
            style: deltaLegendLableStyle,
            align: "right",
            x: 72,
            y: 2,
            useHTML: true,
            formatter:
              powSeries === undefined
                ? undefined
                : getSupplyChangeLabel(powSeries),
          },
        },
      ],
    },
    xAxis: {
      plotLines: [
        {
          id: "merge-plotline",
          value: MERGE_TIMESTAMP.getTime(),
          color: colors.slateus400,
          width: 1,
          label: {
            x: 10,
            y: 54,
            style: { color: colors.slateus400 },
            align: "center",
            useHTML: true,
            formatter: () => `
                <div class="flex">
                  <a class="hover:underline" href="https://etherscan.io/block/15537394" target="_blank">
                    <div class="font-light font-roboto text-slateus-300">
                    #${formatZeroDecimals(MERGE_BLOCK_NUMBER)}
                    </div>
                  </a>
                  <img
                    class="ml-2 w-4 h-4"
                    src="/panda-own.svg"
                  />
                </div>
              `,
          },
        },
        {
          id: "burn-plotline",
          value: LONDON_TIMESTAMP.getTime(),
          color: colors.slateus400,
          width: 1,
          label: {
            x: 10,
            y: 54,
            style: { color: colors.slateus400 },
            align: "center",
            useHTML: true,
            formatter: () => `
                <div class="flex">
                  <a class="hover:underline" href="https://etherscan.io/block/12965000" target="_blank">
                    <div class="font-light font-roboto text-slateus-300">
                    #${formatZeroDecimals(12965000)}
                    </div>
                  </a>
                  <img
                    class="ml-2 w-4 h-4"
                    src="/fire-own.svg"
                  />
                </div>
              `,
          },
        },
      ],
    },
    series: [
      {
        id: SUPPLY_SINCE_MERGE_SERIES_ID,
        type: "spline",
        name: "ETH",
        visible: posVisible,
        events: {
          legendItemClick: function () {
            if (!enableSupplyLegendClick) {
              return false;
            }
            onPosVisibilityChange(this.visible);
          },
        },
        data:
          lastPointPos !== undefined && posSeries !== undefined
            ? [
                ...posSeries,
                {
                  x: lastPointPos?.[0],
                  y: lastPointPos?.[1],
                  marker: {
                    symbol: `url(/graph-dot-blue.svg)`,
                    enabled: true,
                  },
                },
              ]
            : undefined,
        shadow: {
          color: "rgba(75, 144, 219, 0.2)",
          width: 15,
        },
        color: {
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 1,
            y2: 0,
          },
          stops: [
            [0, "#00FFFB"],
            [1, "#5487F4"],
          ],
        },
        tooltip: {
          pointFormatter: getTooltip(
            "pos",
            posSeries,
            ethPosPointMap,
            simulateProofOfWork,
          ),
        },
      },
      {
        color: "#FF891D",
        visible: btcVisible && simulateProofOfWork,
        enableMouseTracking: simulateProofOfWork,
        id: BITCOIN_SUPPLY_ID,
        type: "spline",
        shadow: {
          color: "#FF891D33",
          width: 15,
        },
        events: {
          legendItemClick: function () {
            if (!enableSupplyLegendClick) {
              return false;
            }
            onBtcVisibilityChange(this.visible);
          },
        },
        data:
          btcSeriesScaled === undefined
            ? undefined
            : [
                ...btcSeriesScaled,
                {
                  x: lastPointBtc?.[0],
                  y: lastPointBtc?.[1],
                  marker: {
                    symbol: `url(/graph-dot-bitcoin.svg)`,
                    enabled: true,
                  },
                },
              ],
        name: "BTC",
        showInLegend: simulateProofOfWork,
        tooltip: {
          pointFormatter: getTooltip(
            "bitcoin",
            btcSeries,
            bitcoinPointMap,
            simulateProofOfWork,
          ),
        },
      },
      {
        color: colors.slateus100,
        visible: powVisible && simulateProofOfWork,
        enableMouseTracking: simulateProofOfWork,
        id: SUPPLY_SINCE_MERGE_POW_SERIES_ID,
        name: "ETH (PoW)",
        showInLegend: simulateProofOfWork,
        type: "spline",
        events: {
          legendItemClick: function () {
            if (!enableSupplyLegendClick) {
              return false;
            }
            onPowVisibilityChange(this.visible);
          },
        },
        data:
          powSeries === undefined
            ? undefined
            : [
                ...powSeries,
                {
                  x: lastPointPow?.[0],
                  y: lastPointPow?.[1],
                  marker: {
                    symbol: `url(/graph-dot-white.svg)`,
                    enabled: true,
                  },
                },
              ],
        tooltip: {
          pointFormatter: getTooltip(
            "pow",
            powSeries,
            ethPowPointMap,
            simulateProofOfWork,
          ),
        },
      },
      {
        color: "transparent",
        visible: simulateProofOfWork && powVisible,
        type: "spline",
        data: powSeries,
        enableMouseTracking: false,
        showInLegend: false,
        states: { hover: { enabled: false } },
        shadow: {
          color: "#DEE2F133",
          width: 15,
        },
      },
    ],
    tooltip: {
      backgroundColor: "transparent",
      borderWidth: 0,
      shadow: false,
      headerFormat: "",
    },
  };

  return _merge({}, baseOptions, dynamicOptions);
};

const updatedAtFromSupplySeriesCollection = (
  supplySeriesCollections: O.Option<SupplySeriesCollections>,
  timeFrame: TimeFrame,
): DateTimeString | undefined =>
  pipe(
    supplySeriesCollections,
    O.map(
      (supplySeriesCollections) => supplySeriesCollections[timeFrame].timestamp,
    ),
    O.toUndefined,
  );

type Props = {
  onClickTimeFrame: () => void;
  onSimulateProofOfWork: () => void;
  simulateProofOfWork: boolean;
  timeFrame: TimeFrame;
};

const EthSupplyWidget: FC<Props> = ({
  onClickTimeFrame,
  onSimulateProofOfWork,
  simulateProofOfWork,
  timeFrame,
}) => {
  const [posVisible, setPosVisible] = useState(true);
  const [powVisible, setPowVisible] = useState(true);
  const [btcVisible, setBtcVisible] = useState(true);
  const { enableSupplyLegendClick } = useContext(FeatureFlagsContext);

  const supplySeriesCollections = useSupplySeriesCollections();

  const options = useMemo(
    (): Highcharts.Options =>
      pipe(
        supplySeriesCollections,
        O.map((supplySeriesCollections) => supplySeriesCollections[timeFrame]),
        O.map((supplySeriesCollections) =>
          optionsFromSupplySeriesCollection(
            supplySeriesCollections,
            simulateProofOfWork,
            timeFrame,
            enableSupplyLegendClick,
            posVisible,
            powVisible,
            btcVisible,
            setPosVisible,
            setPowVisible,
            setBtcVisible,
          ),
        ),
        O.getOrElse(() => baseOptions),
      ),
    [
      btcVisible,
      enableSupplyLegendClick,
      posVisible,
      powVisible,
      simulateProofOfWork,
      supplySeriesCollections,
      timeFrame,
    ],
  );

  return (
    <WidgetErrorBoundary title="eth supply">
      {/* We use the h-0 min-h-full trick to adopt the height of our sibling
      element. */}
      <WidgetBackground className="flex relative flex-col w-full h-full min-h-full lg:h-0">
        <div className="overflow-hidden absolute top-0 right-0 bottom-0 left-0 rounded-lg pointer-events-none">
          <div
            // will-change-transform is critical for mobile performance of
            // rendering the chart overlayed on this element.
            className={`
              absolute
              -left-[64px] -top-[64px]
              h-full
              w-full opacity-[0.20]
              blur-[120px]
              will-change-transform
              md:-left-[128px]
            `}
          >
            <div
              className={`
                absolute h-3/5
                w-4/5 rounded-[35%] bg-[#0037FA]
                lg:bottom-[3.0rem]
                lg:-right-[1.0rem]
              `}
            ></div>
          </div>
        </div>
        <div className="flex justify-between">
          <LabelText className="flex items-center">eth supply</LabelText>
          <TimeFrameIndicator
            onClickTimeFrame={onClickTimeFrame}
            timeFrame={timeFrame}
          />
        </div>
        <div
          // flex-grow fixes bug where highcharts doesn't take full width.
          className={`
            mt-4 flex h-full
            w-full select-none
            justify-center
            overflow-hidden
            [&>div]:flex-grow
          `}
        >
          {pipe(
            supplySeriesCollections,
            O.match(
              () => (
                <div className="flex justify-center items-center h-full text-center min-h-[400px] lg:min-h-[auto]">
                  <LabelText color="text-slateus-300">loading...</LabelText>
                </div>
              ),
              () => (
                <HighchartsReact highcharts={Highcharts} options={options} />
              ),
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-4 justify-between">
          <UpdatedAgo
            updatedAt={updatedAtFromSupplySeriesCollection(
              supplySeriesCollections,
              timeFrame,
            )}
          />
          <SimulateProofOfWork
            checked={simulateProofOfWork}
            onToggle={onSimulateProofOfWork}
            tooltipText="Simulate the ETH supply with proof-of-work issuance."
          />
        </div>
      </WidgetBackground>
    </WidgetErrorBoundary>
  );
};

export default EthSupplyWidget;
