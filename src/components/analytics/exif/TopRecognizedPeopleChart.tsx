import { Card } from "@/components/ui/card";
import PieChart, { IPieChartData } from "@/components/ui/pie-chart";
import { getTopRecognizedPeopleStatistics } from "@/handlers/api/analytics.handler";
import React, { useEffect, useState } from "react";

export default function TopRecognizedPeopleChart() {
  const [chartData, setChartData] = useState<IPieChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getTopRecognizedPeopleStatistics();
      setChartData(data);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to fetch top recognized people data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card
      title="Top Pictured People"
      description="Most frequently recognized known people"
    >
      <PieChart 
        data={chartData} 
        loading={loading} 
        errorMessage={errorMessage}
      />         
    </Card>
  );
}
