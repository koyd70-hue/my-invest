import { PortfolioSummary } from '@/types';
import { formatKRW, formatRate } from '@/lib/calculations';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Props {
  summary: PortfolioSummary | null;
  loading: boolean;
}

export default function SummaryHeader({ summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="flex justify-center py-6">
        <LoadingSpinner />
      </div>
    );
  }

  const rateColor =
    summary.totalReturnRate === null
      ? 'text-gray-500'
      : summary.totalReturnRate >= 0
      ? 'text-blue-600'
      : 'text-red-500';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500 mb-1">총 매수금액</p>
        <p className="text-xl font-bold text-gray-800">
          {formatKRW(summary.totalPurchaseAmount)}
        </p>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500 mb-1">총 평가금액</p>
        <p className="text-xl font-bold text-gray-800">
          {summary.totalEvalAmount !== null ? formatKRW(summary.totalEvalAmount) : '-'}
        </p>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500 mb-1">총 수익률 (보유)</p>
        <p className={`text-xl font-bold ${rateColor}`}>
          {formatRate(summary.totalReturnRate)}
        </p>
        <p className={`text-sm mt-0.5 ${rateColor}`}>
          {summary.totalProfitAmount !== null
            ? (summary.totalProfitAmount >= 0 ? '+' : '') + formatKRW(summary.totalProfitAmount)
            : '-'}
        </p>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500 mb-1">매도 확정 수익</p>
        <p className={`text-xl font-bold ${summary.totalConfirmedProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
          {(summary.totalConfirmedProfit >= 0 ? '+' : '') + formatKRW(summary.totalConfirmedProfit)}
        </p>
      </div>
    </div>
  );
}
