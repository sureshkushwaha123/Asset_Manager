import { api } from "@shared/routes";
import { fetchWithAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

export function useDownloadMonthlyReport() {
  const { toast } = useToast();

  const downloadReport = useCallback(async () => {
    try {
      const res = await fetchWithAuth(api.reports.monthlyReport.path);
      if (!res.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Financial_Report_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "Report downloaded successfully" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to download report",
        variant: "destructive"
      });
    }
  }, [toast]);

  return downloadReport;
}
