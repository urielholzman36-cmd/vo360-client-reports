import { HistoryTable } from "@/components/history-table";

export default function HistoryPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Report History</h1>
      <HistoryTable />
    </div>
  );
}
