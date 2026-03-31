import { Card } from "@/components/ui/card";
import PieChart, { IPieChartData } from "@/components/ui/pie-chart";
import { getFaceRecognitionStatistics } from "@/handlers/api/analytics.handler";
import React, { useEffect, useState } from "react";

export default function FaceRecognitionChart() {
  const [chartData, setChartData] = useState<IPieChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getFaceRecognitionStatistics();
      setChartData(data);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to fetch face recognition data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card
      title="Faces per Photo"
      description="Distribution of photos by number of recognized faces"
    >
      <PieChart 
        data={chartData} 
        loading={loading} 
        errorMessage={errorMessage}
      />         
    </Card>
  );
}
