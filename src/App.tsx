import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { useEffect, useRef, useState } from "react";
import { Chart } from "./components/Chart";
import type { Price } from "./types";

type OctopusResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    value_ext_vat: number;
    value_inc_vat: number;
    valid_from: string;
    valid_to: string;
    payment_method: unknown;
  }[];
};

const formatPrice = (price: number) =>
  (Math.round(price * 100) / 100).toFixed(2);

export const App: React.FC = () => {
  const [currentPriceIndex, setCurrentPriceIndex] = useState(-1);
  const priceListItemRefs = useRef<Record<string, HTMLElement>>({});

  // fetch data from the octopus api
  const getDataQuery = useQuery({
    queryKey: ["data"],
    queryFn: async () => {
      const { data } = await axios.get<OctopusResponse>(
        "https://api.octopus.energy/v1/products/AGILE-24-04-03/electricity-tariffs/E-1R-AGILE-24-04-03-D/standard-unit-rates/?page_size=96"
      );
      const results = {
        ...data,
        results: data.results.sort((a, b) =>
          a.valid_to.localeCompare(b.valid_to)
        ),
      };
      return results;
    },
  });

  useEffect(() => {
    // find the current price, store the result and
    const calc = () => {
      // find the index of the price for the current time slot.
      const index = (getDataQuery.data?.results ?? []).findIndex(
        (x) =>
          new Date(x.valid_from) <= new Date() &&
          new Date() <= new Date(x.valid_to)
      );

      if (index == null) {
        return;
      }

      setCurrentPriceIndex(index);
      const currentPrice = getDataQuery.data?.results[index];

      if (currentPrice) {
        // update the tab/document title when it changes
        const newTitle = `${(
          Math.round(currentPrice.value_inc_vat * 100) / 100
        ).toFixed(2)}p (${new Date(currentPrice.valid_from)
          .toLocaleTimeString()
          .slice(0, -3)})`;
        if (document.title != newTitle) {
          document.title = newTitle;

          // also scroll to the item in the list
          if (priceListItemRefs.current) {
            priceListItemRefs.current[currentPrice.valid_from]?.scrollIntoView({
              behavior: "smooth",
            });
          }
        }
      }
    };

    // periodically refresh
    const interval = window.setInterval(() => {
      calc();
    }, 10 * 1000);

    calc();

    return () => {
      window.clearInterval(interval);
    };
  }, [getDataQuery.data]);

  if (getDataQuery.isLoading) {
    return <p className="text-center text-gray-500 p-4">Loading prices...</p>;
  }

  if (getDataQuery.error) {
    return <p className="text-red-500 text-center">Error fetching prices</p>;
  }

  if (!getDataQuery.data) {
    return <p className="text-center text-gray-500">Loading prices...</p>;
  }

  const currentPrice = getDataQuery.data.results[currentPriceIndex];
  const nextPrice = getDataQuery.data.results[currentPriceIndex + 1];

  const todayData = getDataQuery.data.results.filter(
    (x) => new Date(x.valid_from).getDate() == new Date().getDate()
  );

  const priceColor = (input: Price) => {
    if (input.valid_to === currentPrice?.valid_to) {
      return "text-blue-500";
    }
    return new Date(input.valid_to) < new Date()
      ? "text-gray-400"
      : input.value_inc_vat <= 0
      ? "text-green-600"
      : "";
  };

  return (
    <div className="flex flex-column gap-2 p-6 items-center justify-center w-full">
      <div className="flex flex-row gap-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="">Current Price</CardTitle>
            </CardHeader>
            {currentPrice != null && (
              <CardContent>
                <p className="text-lg font-bold text-blue-500">
                  {formatPrice(currentPrice.value_inc_vat)}
                  p/kWh
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(currentPrice.valid_from).toLocaleTimeString()} -{" "}
                  {new Date(currentPrice.valid_to).toLocaleTimeString()}
                </p>
              </CardContent>
            )}
            {currentPrice == null && (
              <p className="text-lg font-bold">Unknown</p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Price</CardTitle>
            </CardHeader>
            {nextPrice != null && (
              <CardContent>
                <p className="text-lg font-bold">
                  {formatPrice(nextPrice.value_inc_vat)}
                  p/kWh
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(nextPrice.valid_from).toLocaleTimeString()} -{" "}
                  {new Date(nextPrice.valid_to).toLocaleTimeString()}
                </p>
              </CardContent>
            )}
            {currentPrice == null && (
              <p className="text-lg font-bold">Unknown</p>
            )}
          </Card>
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Price History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-scroll">
              <ul className="space-y-2">
                {todayData.map((price, index) => (
                  <li
                    key={index}
                    className="border-b pb-2"
                    ref={(el) => {
                      if (el) {
                        priceListItemRefs.current[price.valid_from] = el;
                      }
                    }}
                  >
                    <span className={priceColor(price)}>
                      {new Date(price.valid_from).toLocaleTimeString()} -{" "}
                    </span>
                    <span className={`font-semibold ${priceColor(price)}`}>
                      {formatPrice(price.value_inc_vat)}
                      p/kWh
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      {getDataQuery.data && (
        <div className="h-100 w-2xl">
          <Chart key={currentPrice?.valid_to} data={todayData}></Chart>
        </div>
      )}
    </div>
  );
};
