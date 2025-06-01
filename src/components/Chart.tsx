import type { Price } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";

const SVT = 25.76;

const processData = (data: Price[]) => {
  const now = new Date();

  return data.map((entry) => {
    return {
      time: new Date(entry.valid_from),
      price: entry.value_inc_vat,
      isCurrent:
        now >= new Date(entry.valid_from) && now < new Date(entry.valid_to),
      isPast: now > new Date(entry.valid_to),
    };
  });
};

export const Chart: React.FC<{ data: Price[] }> = ({ data }) => {
  const processedData = processData(data);

  return (
    <BarChart width={600} height={300} data={processedData}>
      <XAxis
        dataKey="time"
        tickFormatter={(x: Date) => {
          return x.toLocaleTimeString().slice(0, -3);
        }}
      />
      <YAxis />
      <Tooltip
        labelFormatter={(x: Date) => {
          return `${x.toLocaleTimeString()} - ${new Date(
            x.getTime() + 30 * 60 * 1000
          ).toLocaleTimeString()}`;
        }}
        formatter={(x) => `${x} p/kWh`}
      />
      <ReferenceLine y={SVT} label="SVT" strokeDasharray="3 3"></ReferenceLine>
      <Bar dataKey="price">
        {processedData.map((entry) => {
          if (entry.isCurrent) {
            return <Cell fill={"var(--color-blue-500)"}></Cell>;
          }
          const fill = entry.isPast
            ? entry.price < 0
              ? "var(--color-green-300)"
              : "grey"
            : entry.price < 0
            ? "var(--color-green-800)"
            : "black";
          return <Cell fill={fill}></Cell>;
        })}
      </Bar>
    </BarChart>
  );
};
