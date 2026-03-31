import { Card } from "@/components/ui/card";
import PieChart, { IPieChartData } from "@/components/ui/pie-chart";
import { getFaceSizesStatistics } from "@/handlers/api/analytics.handler";
import React, { useEffect, useState } from "react";

export default function FaceSizesChart() {
  const [chartData, setChartData] = useState<IPieChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getFaceSizesStatistics();
      setChartData(data);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to fetch face sizing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card
      title="Face Framing Types"
      description="Distribution of faces based on portrait vs background distance sizing"
    >
      <PieChart 
        data={chartData} 
        loading={loading} 
        errorMessage={errorMessage}
      />         
    </Card>
  );
}
