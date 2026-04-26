'use client';

import { useState, useEffect, useRef } from 'react';
import { searchKisStocks, getKisPriceHistory } from '@/lib/kis/client';
import { addHolding } from '@/lib/firebase/firestore';
import { StockSearchResult } from '@/types';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Props {
  uid: string;
  onClose: () => void;
}

export default function AddHoldingModal({ uid, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<StockSearchResult | null>(null);

  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchKisStocks(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, selected]);

  // KIS 가격 자동입력: 선택한 종목 + 매수일 기준 월말 가격 참고
  useEffect(() => {
    if (!selected || !purchaseDate) return;
    const month = purchaseDate.replace(/-/g, '').slice(0, 6);
    getKisPriceHistory(selected.isuSrtCd, selected.market, [month])
      .then((results) => {
        const r = results[0];
        if (r?.price !== null && r?.price !== undefined) {
          setPurchasePrice(String(r.price));
        }
      })
      .catch(() => {});
  }, [selected, purchaseDate]);

  function handleSelect(stock: StockSearchResult) {
    setSelected(stock);
    setQuery(stock.isuNm);
    setResults([]);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    setPurchasePrice('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const qty = parseInt(quantity, 10);
    const price = parseInt(purchasePrice.replace(/,/g, ''), 10);

    if (!selected) return setError('종목을 선택하세요.');
    if (!selected.isuSrtCd) return setError('종목 코드를 확인할 수 없습니다. 다시 검색해주세요.');
    if (!qty || qty <= 0) return setError('수량을 올바르게 입력하세요.');
    if (!price || price <= 0) return setError('매수단가를 올바르게 입력하세요.');

    setSubmitting(true);
    try {
      await addHolding(uid, {
        isuCd: selected.isuCd,
        isuSrtCd: selected.isuSrtCd,
        isuNm: selected.isuNm,
        market: selected.market,
        purchaseDate: purchaseDate.replace(/-/g, ''),
        quantity: qty,
        purchasePrice: price,
      });
      onClose();
    } catch (err) {
      console.error('[AddHoldingModal] addHolding 실패:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`저장에 실패했습니다: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">종목 추가 (매수)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 종목 검색 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">종목 검색</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                placeholder="종목명 또는 코드 입력"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!selected}
              />
              {selected && (
                <button type="button" onClick={handleClear} className="text-sm px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                  변경
                </button>
              )}
            </div>

            {searching && (
              <div className="absolute right-3 top-9">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {results.length > 0 && !selected && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {results.map((r) => (
                  <li
                    key={`${r.market}:${r.isuCd}`}
                    onClick={() => handleSelect(r)}
                    className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm flex justify-between"
                  >
                    <span className="font-medium text-gray-800">{r.isuNm}</span>
                    <span className="text-gray-400 text-xs">
                      {r.isuSrtCd} · {r.market}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {selected && (
              <p className="mt-1.5 text-xs text-blue-600">
                {selected.isuSrtCd} ({selected.isuCd}) · {selected.market}
              </p>
            )}
          </div>

          {/* 매수 일자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">매수 일자</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 매수 수량 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">매수 수량</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              placeholder="주"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 매수 단가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              매수 단가 (원)
              <span className="text-xs text-gray-400 ml-1.5 font-normal">해당 월 KIS 종가 자동입력</span>
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              min="1"
              placeholder="원"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <><LoadingSpinner size="sm" /> 저장 중...</> : '추가하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
