import { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useDataActs } from "../hooks/useDataAct";
import type { EChartsOption } from "echarts";

export default function CountriesBarRaceChart() {
  const { dataActs, loading } = useDataActs();
  const [option, setOption] = useState<EChartsOption>({});
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    // Exit early if data is still loading or not available
    if (loading || !dataActs || dataActs.length === 0) return;

    // Build a map of countries to their related initiatives
    const countryMap: Record<string, typeof dataActs> = {};

    dataActs.forEach((item) => {
      const countries = item.countries
        ?.split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0) ?? [];

      countries.forEach((country) => {
        if (!countryMap[country]) countryMap[country] = [];
        countryMap[country].push(item);
      });
    });

    // Sort countries by number of initiatives
    const sorted = Object.entries(countryMap)
      .map(([name, items]) => ({ name, value: items.length, items }))
      .sort((a, b) => a.value - b.value);

    const names = sorted.map((item) => item.name);
    const values = sorted.map((item) => item.value);

    // Chart configuration
    const barOption: EChartsOption = {
      title: {
        text: "Ranking of countries by initiatives",
        left: "center",
        textStyle: { fontSize: 18, fontWeight: "bold" }
      },
      grid: { left: 140, right: 60, top: 100, bottom: 60 },
      tooltip: {
        show: window.innerWidth >= 768, // Hide tooltip on mobile
        trigger: "item",
        backgroundColor: "#fff",
        borderColor: "#ccc",
        borderWidth: 1,
        padding: 10,
        textStyle: {
          color: "#333",
          fontFamily: "Inter, sans-serif",
          fontSize: 13
        },
        formatter: (params: any) => {
          const country = params.name;
          const initiatives = countryMap[country] ?? [];

          const lines = initiatives.map(i => `
            <div style="margin-bottom:6px;">
              <div style="font-weight:600; font-size:14px; color:#1f2937;">${i.title}</div>
              <div style="font-size:12px; color:#6b7280;">${i.type_offre} – ${i.statuts}</div>
            </div>
          `);

          return `
            <div style="max-width:90vw; word-break:break-word;">
              <div style="font-size:13px; font-weight:600; margin-bottom:8px; color:#111827;">
                ${country} : ${initiatives.length} initiative(s)
              </div>
              ${lines.join("")}
            </div>`;
        }
      },
      xAxis: {
        type: "value",
        name: "Initiatives",
        axisLine: { lineStyle: { color: "#888" } },
        splitLine: { lineStyle: { color: "#eee" } }
      },
      yAxis: {
        type: "category",
        data: names,
        axisLabel: { fontWeight: 600 },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          type: "bar",
          data: values,
          itemStyle: {
            color: "#4c78a8",
            borderRadius: [0, 6, 6, 0]
          },
          label: {
            show: true,
            position: "right",
            color: "#333",
            fontWeight: 500
          }
        }
      ]
    };

    setOption(barOption);

    //  On mobile, handle bar clicks to show a custom info box
    if (chartRef.current) {
      const chartInstance = chartRef.current.getEchartsInstance();
      chartInstance.off("click");

      chartInstance.on("click", (params: any) => {
        if (window.innerWidth < 768) {
          setSelectedCountry(params.name);
        }
      });
    }
  }, [dataActs, loading]);

  // Get selected country initiatives for the infobox
  const initiatives = selectedCountry
    ? dataActs.filter((i) => i.countries?.includes(selectedCountry))
    : [];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-white rounded-lg shadow relative">
      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          <ReactECharts
            option={option}
            ref={chartRef}
            style={{ height: "500px", width: "100%" }}
          />

          {/* 📱 Responsive infobox (mobile only) */}
          {selectedCountry && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 md:hidden">
              <div className="bg-white rounded-lg shadow-lg w-[90vw] max-h-[80vh] overflow-y-auto p-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold">{selectedCountry} : {initiatives.length} initiative(s)</h2>
                  <button
                    className="text-gray-600 hover:text-black"
                    onClick={() => setSelectedCountry(null)}
                  >
                    ✕
                  </button>
                </div>
                <ul className="space-y-3">
                  {initiatives.map((item, i) => (
                    <li key={i} className="border-b pb-2">
                      <div className="font-semibold text-gray-800">{item.title}</div>
                      <div className="text-sm text-gray-500">
                        {item.type_offre} – {item.statuts}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
