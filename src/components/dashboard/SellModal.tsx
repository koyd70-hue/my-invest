'use client';

import { useState } from 'react';
import { Holding } from '@/types';
import { sellHolding } from '@/lib/firebase/firestore';
import { formatKRW } from '@/lib/calculations';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Props {
  uid: string;
  holding: Holding;
  currentPrice?: number | null;
  onClose: () => void;
}

function fmtDate(d: string) {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

export default function SellModal({ uid, holding, currentPrice, onClose }: Props) {
  const [sellDate, setSellDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sellPrice, setSellPrice] = useState(currentPrice ? String(currentPrice) : '');
  const [sellQuantity, setSellQuantity] = useState(String(holding.quantity));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parsedPrice = parseInt(sellPrice.replace(/,/g, ''), 10);
  const parsedQty = parseInt(sellQuantity, 10);
  const validQty = !isNaN(parsedQty) && parsedQty > 0 && parsedQty <= holding.quantity;
  const validPrice = !isNaN(parsedPrice) && parsedPrice > 0;

  const soldPurchaseAmount = validQty ? parsedQty * holding.purchasePrice : null;
  const previewProfit =
    validQty && validPrice ? parsedQty * parsedPrice - parsedQty * holding.purchasePrice : null;
  const remainingQty = validQty ? holding.quantity - parsedQty : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!sellDate) return setError('매도 일자를 입력하세요.');
    if (!validQty) return setError(`매도 수량은 1 ~ ${holding.quantity.toLocaleString()} 사이로 입력하세요.`);
    if (!validPrice) return setError('매도단가를 올바르게 입력하세요.');

    setSubmitting(true);
    try {
      await sellHolding(uid, holding, {
        sellDate: sellDate.replace(/-/g, ''),
        sellPrice: parsedPrice,
        sellQuantity: parsedQty,
      });
      onClose();
    } catch (err) {
      console.error('[SellModal] sellHolding 실패:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">매도 처리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* 매수 내역 요약 */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>종목</span>
            <span className="font-medium text-gray-800">{holding.isuNm}</span>
          </div>
          <div className="flex justify-between">
            <span>코드</span>
            <span>{holding.isuSrtCd} · {holding.market}</span>
          </div>
          <div className="flex justify-between">
            <span>매수일</span>
            <span>{fmtDate(holding.purchaseDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>보유 수량</span>
            <span>{holding.quantity.toLocaleString()}주</span>
          </div>
          <div className="flex justify-between">
            <span>매수단가</span>
            <span>{formatKRW(holding.purchasePrice)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 매도 일자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">매도 일자</label>
            <input
              type="date"
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 매도 수량 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              매도 수량 <span className="text-gray-400 font-normal">(최대 {holding.quantity.toLocaleString()}주)</span>
            </label>
            <input
              type="number"
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              min="1"
              max={holding.quantity}
              placeholder="주"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {remainingQty !== null && remainingQty > 0 && (
              <p className="text-xs text-gray-400 mt-1">매도 후 잔여: {remainingQty.toLocaleString()}주</p>
            )}
            {remainingQty === 0 && (
              <p className="text-xs text-orange-500 mt-1">전량 매도</p>
            )}
          </div>

          {/* 매도 단가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">매도 단가 (원)</label>
            <input
              type="number"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              min="1"
              placeholder="원"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 수익 미리보기 */}
          {previewProfit !== null && soldPurchaseAmount !== null && (
            <div className={`rounded-lg p-3 text-sm space-y-1 ${previewProfit >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'}`}>
              <div className="flex justify-between">
                <span>매도금액</span>
                <span className="font-medium">{formatKRW(parsedQty * parsedPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>매수금액 ({parsedQty.toLocaleString()}주)</span>
                <span>{formatKRW(soldPurchaseAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-current/20 pt-1 mt-1 font-semibold">
                <span>확정 수익</span>
                <span>
                  {(previewProfit >= 0 ? '+' : '') + formatKRW(previewProfit)}
                  {soldPurchaseAmount > 0 && (
                    <span className="ml-1.5 text-xs font-normal opacity-75">
                      ({((previewProfit / soldPurchaseAmount) * 100).toFixed(2)}%)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <><LoadingSpinner size="sm" /> 처리 중...</> : '매도 확정'}
          </button>
        </form>
      </div>
    </div>
  );
}
