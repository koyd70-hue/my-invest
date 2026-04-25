export interface KrxDailyRow {
  BAS_DD: string;
  ISU_CD: string;
  ISU_SRT_CD: string;
  ISU_NM: string;
  TDD_CLSPRC: string;
  TDD_OPNPRC: string;
  TDD_HGPRC: string;
  TDD_LWPRC: string;
  ACC_TRDVOL: string;
  ACC_TRDAMT: string;
  [key: string]: string;
}

export interface KrxResponse<T> {
  OutBlock_1: T[];
}
