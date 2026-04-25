import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getDbInstance } from './config';
import { Holding, HoldingInput, SellInput } from '@/types';

function holdingsRef(uid: string) {
  return collection(getDbInstance(), 'users', uid, 'holdings');
}

export async function addHolding(uid: string, input: HoldingInput): Promise<string> {
  const docRef = await addDoc(holdingsRef(uid), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteHolding(uid: string, holdingId: string): Promise<void> {
  await deleteDoc(doc(getDbInstance(), 'users', uid, 'holdings', holdingId));
}

export async function sellHolding(
  uid: string,
  holding: Holding,
  sellData: SellInput
): Promise<void> {
  const { sellDate, sellPrice, sellQuantity } = sellData;
  const db = getDbInstance();

  if (sellQuantity >= holding.quantity) {
    // 전체 매도: 기존 도큐먼트에 매도 정보 추가
    await updateDoc(doc(db, 'users', uid, 'holdings', holding.id), {
      sellDate,
      sellPrice,
    });
  } else {
    // 부분 매도: 매도 수량만큼 새 도큐먼트 생성 + 원본 수량 감소
    const batch = writeBatch(db);
    const soldRef = doc(collection(db, 'users', uid, 'holdings'));
    batch.set(soldRef, {
      isuCd: holding.isuCd,
      isuSrtCd: holding.isuSrtCd,
      isuNm: holding.isuNm,
      market: holding.market,
      purchaseDate: holding.purchaseDate,
      quantity: sellQuantity,
      purchasePrice: holding.purchasePrice,
      createdAt: serverTimestamp(),
      sellDate,
      sellPrice,
    });
    batch.update(doc(db, 'users', uid, 'holdings', holding.id), {
      quantity: holding.quantity - sellQuantity,
    });
    await batch.commit();
  }
}

export function subscribeHoldings(
  uid: string,
  callback: (holdings: Holding[]) => void
): () => void {
  const q = query(holdingsRef(uid), orderBy('purchaseDate', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const holdings: Holding[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Holding, 'id'>),
    }));
    callback(holdings);
  });
}
