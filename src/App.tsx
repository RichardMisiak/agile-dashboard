import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { useEffect, useState } from "react";

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

export const App: React.FC = () => {
  // rubbish mechanism for periodically reloading the calculation
  const [_render, setRender] = useState(0);

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

  // find the current and next prices
  const currentPriceIndex = (getDataQuery.data?.results ?? []).findIndex(
    (x) =>
      new Date(x.valid_from) <= new Date() && new Date() <= new Date(x.valid_to)
  );
  const currentPrice = getDataQuery.data?.results[currentPriceIndex];
  const nextPrice = getDataQuery.data?.results[currentPriceIndex + 1];

  useEffect(() => {
    const calc = () => {
      // force rerender to refresh calculation (hacky)
      setRender((r) => r + 1);
      const currentPriceIndex = (getDataQuery.data?.results ?? []).findIndex(
        (x) =>
          new Date(x.valid_from) <= new Date() &&
          new Date() <= new Date(x.valid_to)
      );
      const currentPrice = getDataQuery.data?.results[currentPriceIndex];

      if (currentPrice) {
        // update the tab/document title when it changes
        const newTitle = `${(
          Math.round(currentPrice.value_inc_vat * 100) / 100
        ).toFixed(2)}p`;
        if (document.title != newTitle) {
          document.title = newTitle;
        }
      }
    };

    // perdiocially refresh
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

  return (
    <div className="flex flex-column gap-2 p-6 items-center justify-center w-full">
      <div className="flex flex-row gap-2">
        <div className="flex flex-col gap-4">
          {/* Current Price Card */}
          <Card>
            <CardHeader>
              <CardTitle className="">Current Price</CardTitle>
            </CardHeader>
            {currentPrice != null && (
              <CardContent>
                <p className="text-lg font-bold text-blue-500">
                  {(Math.round(currentPrice.value_inc_vat * 100) / 100).toFixed(
                    2
                  )}
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
                  {(Math.round(nextPrice.value_inc_vat * 100) / 100).toFixed(2)}
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

        {/* Price History List */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Price History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-scroll border rounded-md p-4">
              <ul className="space-y-2">
                {getDataQuery.data.results
                  .filter(
                    (x) =>
                      new Date(x.valid_from).getDate() == new Date().getDate()
                  )
                  .map((price, index) => (
                    <li key={index} className="border-b pb-2">
                      <span className="text-gray-600">
                        {new Date(price.valid_from).toLocaleTimeString()} -{" "}
                      </span>
                      <span className="font-semibold">
                        {price.value_inc_vat}p/kWh
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
