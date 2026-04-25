'use client';

import { useEffect, useState } from 'react';
import { subscribeHoldings } from '@/lib/firebase/firestore';
import { Holding } from '@/types';

export function useHoldings(uid: string | null) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setHoldings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeHoldings(uid, (data) => {
      setHoldings(data);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { holdings, loading };
}
