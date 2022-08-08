import * as DateFns from "date-fns";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import _ from "lodash";
import { FC, useEffect, useRef, useState } from "react";
import colors from "../../colors";
import * as Format from "../../format";
import { NEA } from "../../fp";
import { useActiveBreakpoint } from "../../utils/use-active-breakpoint";
import styles from "./EquilibriumGraph.module.scss";

export type Point = [number, number];

const baseOptions: Highcharts.Options = {
  accessibility: { enabled: false },
  chart: {
    animation: false,
    backgroundColor: "transparent",
    showAxes: false,
  },
  title: undefined,
  xAxis: {
    type: "datetime",
    tickInterval: 365.25 * 24 * 3600 * 1000, // always use 1 year intervals
    lineWidth: 0,
    labels: { enabled: false },
    tickWidth: 0,
  },
  yAxis: {
    min: 10e6,
    max: 200e6,
    tickInterval: 20e6,
    title: { text: undefined },
    labels: { enabled: false },
    gridLineWidth: 0,
    plotLines: [
      {
        id: "equilibrium",
        color: colors.spindle,
        label: {
          align: "right",
          text: "EQUILIBRIUM",
          style: { color: colors.spindle },
          y: 5,
          x: 20,
        },
        width: 2,
        zIndex: 10,
      },
      {
        id: "staking",
        color: colors.spindle,
        label: {
          align: "right",
          text: "STAKING",
          style: { color: colors.spindle },
          y: 18,
          x: 1,
        },
        width: 2,
        zIndex: 10,
      },
    ],
  },
  legend: {
    enabled: false,
  },
  tooltip: {
    backgroundColor: "transparent",
    xDateFormat: "%Y-%m-%d",
    useHTML: true,
    borderWidth: 0,
    shadow: false,
  },
  credits: { enabled: false },
  plotOptions: {
    series: {
      color: {
        linearGradient: {
          x1: 0,
          y1: 0,
          x2: 1,
          y2: 0,
        },
        stops: [
          [0, "#1FD0E1"],
          [1, "#6758F3"],
        ],
      },
      shadow: {
        color: "rgba(75, 144, 219, 0.2)",
        width: 15,
      },
      marker: {
        lineColor: "white",
        fillColor: "#4B90DB",
        radius: 5,
        symbol: "circle",
      },
    },
  },
};

type Props = {
  supplyEquilibriumSeries: NEA.NonEmptyArray<Point>;
  // A map used for fast-lookup of the Y in the series above by X.
  supplyEquilibriumMap: Record<number, number>;
  supplyEquilibrium: number;
  staking: number;
};

const EquilibriumGraph: FC<Props> = ({
  staking,
  supplyEquilibrium,
  supplyEquilibriumMap,
  supplyEquilibriumSeries,
}) => {
  const isRendering = useRef(true);
  const { lg, md, xl, xl2 } = useActiveBreakpoint();
  const width = xl2 ? 660 : xl ? 530 : lg ? 400 : md ? 570 : 280;
  const height = lg ? 333 : 200;
  const [options, setOptions] = useState<Highcharts.Options>(() =>
    _.merge({}, baseOptions, {
      chart: {
        events: {
          render: function () {
            isRendering.current = false;
          },
        },
      },
      tooltip: {
        formatter: function () {
          const x = typeof this.x === "number" ? this.x : undefined;
          if (x === undefined) {
            return;
          }

          const dt = DateFns.fromUnixTime(x);
          const header = `<div class="tt-header"><div class="tt-header-date text-blue-spindle">${formatDate(
            dt,
          )}</div></div>`;

          const total = supplyEquilibriumMap[x];
          if (total === undefined) {
            return;
          }

          const table = `<table><tbody><tr class="tt-total-row">
              <td class="text-white">${Format.formatOneDecimal(
                total / 1e6,
              )}M <span class="text-blue-spindle">ETH</span></td>
            </tr></tbody></table>`;

          return `<div class="tt-root">${header}${table}</div>`;
        },
      },
      series: [
        {
          id: "supply-series",
          type: "spline",
          data: [
            ...supplyEquilibriumSeries,
            {
              x: _.last(supplyEquilibriumSeries)?.[0],
              y: _.last(supplyEquilibriumSeries)?.[1],
              marker: {
                symbol: `url(/dot_supply_graph.svg)`,
                enabled: true,
              },
            },
          ],
        },
      ],
    } as Highcharts.Options),
  );

  useEffect(() => {
    const nextOptions: Highcharts.Options = {
      chart: {
        width,
        height,
      },
      xAxis: {
        minPadding: 0.03,
      },
    };
    setOptions((currentOptions) => _.merge({}, currentOptions, nextOptions));
  }, [height, md, staking, supplyEquilibrium, width]);

  useEffect(() => {
    const lastPoint = _.last(supplyEquilibriumSeries);
    if (lastPoint === undefined) {
      return;
    }

    const maxX = xl2
      ? DateFns.getUnixTime(
          DateFns.addYears(DateFns.fromUnixTime(lastPoint[0]), 80),
        )
      : xl
      ? DateFns.getUnixTime(
          DateFns.addYears(DateFns.fromUnixTime(lastPoint[0]), 100),
        )
      : lg
      ? DateFns.getUnixTime(
          DateFns.addYears(DateFns.fromUnixTime(lastPoint[0]), 140),
        )
      : md
      ? DateFns.getUnixTime(
          DateFns.addYears(DateFns.fromUnixTime(lastPoint[0]), 90),
        )
      : DateFns.getUnixTime(
          DateFns.addYears(DateFns.fromUnixTime(lastPoint[0]), 50),
        );

    const nextOptions: Highcharts.Options = {
      chart: {
        events: {
          redraw: function () {
            const yAxis0 = this.yAxis[0] as Highcharts.Axis & {
              plotLinesAndBands: { svgElem: { element: SVGElement } }[];
            };

            yAxis0.plotLinesAndBands.forEach(function (lineOrBand) {
              const svg = lineOrBand.svgElem.element;
              const d = svg.getAttribute("d");
              if (d === null) {
                return;
              }
              const dArr = d.split(" ");
              const widthReductionLeft = xl ? 500 : lg ? 250 : md ? 420 : 230;
              const widthReductionRight = md ? 90 : 0;

              const newStartX = Number(dArr[1]) + widthReductionLeft;
              const newStopX = Number(dArr[4]) - widthReductionRight;
              dArr[1] = String(newStartX);
              dArr[4] = String(newStopX);

              svg.setAttribute("d", dArr.join(" "));
            });
          },
        },
      },
      series: [
        {
          id: "supply-series",
          type: "spline",
          data: [
            ...supplyEquilibriumSeries,
            {
              x: _.last(supplyEquilibriumSeries)?.[0],
              y: _.last(supplyEquilibriumSeries)?.[1],
              marker: {
                symbol: `url(/dot_supply_graph.svg)`,
                enabled: true,
              },
            },
          ],
        },
      ],
      xAxis: {
        max: maxX,
      },
      yAxis: {
        max: Math.min(Math.max(SUPPLY_MAX, supplyEquilibrium), 400e6),
        plotLines: [
          {
            id: "equilibrium",
            value: supplyEquilibrium,
            label: {
              x: 10,
              text: md ? "EQUILIBRIUM" : "",
            },
          },
          {
            id: "staking",
            value: staking,
            label: {
              x: -19,
              y: 4,
              text: md ? "STAKING" : "",
            },
          },
        ],
      },
      tooltip: {
        formatter: function () {
          const x = typeof this.x === "number" ? this.x : undefined;
          if (x === undefined) {
            return;
          }

          const total = supplyEquilibriumMap[x];
          if (total === undefined) {
            return;
          }

          const dt = DateFns.fromUnixTime(x);
          const formattedDate = DateFns.format(dt, "LLL y");

          return `
            <div class="font-roboto font-light bg-slateus-700 p-4 rounded-lg border-2 border-slateus-200">
              <div class="text-blue-spindle">
                ${formattedDate}
              </div>
              <div class="text-white">
                ${Format.formatOneDecimal(
                  total / 1e6,
                )}M <span class="text-blue-spindle">ETH</span>
              </div>
            </div>
          `;
        },
      },
    };

    if (!isRendering.current) {
      isRendering.current = true;
      setOptions((currentOptions) => _.merge({}, currentOptions, nextOptions));
    }
  }, [
    lg,
    md,
    staking,
    supplyEquilibrium,
    supplyEquilibriumMap,
    supplyEquilibriumSeries,
    xl,
    xl2,
  ]);

  return (
    <div className={`${styles.equilibriumChart}`}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};
export default EquilibriumGraph;
