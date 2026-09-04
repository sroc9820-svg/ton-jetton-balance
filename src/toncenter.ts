const ENDPOINT = 'https://testnet.toncenter.com/api/v2';

export type JettonBalance = {
  rawBalance: bigint;
  decimals: number;
  symbol: string;
  owner: string;
  jettonMaster: string;
  walletAddress?: string;
};

type ToncenterResponse = {
  ok?: boolean;
  result?: {
    stack?: unknown[];
    exit_code?: number;
  };
  error?: string;
};

function addressStack(address: string): [['tvm.Slice', string]] {
  return [['tvm.Slice', address]];
}

function readNumber(stack: unknown[] | undefined, index: number): bigint {
  const entry = stack?.[index];
  if (Array.isArray(entry)) {
    const value = entry[1];
    if (typeof value === 'string' || typeof value === 'number') return BigInt(value);
  }
  if (entry && typeof entry === 'object' && 'number' in entry) {
    const value = entry.number;
    if (typeof value === 'string' || typeof value === 'number') return BigInt(value);
  }
  throw new Error('Toncenter returned unexpected get method data.');
}

function readSlice(stack: unknown[] | undefined, index: number): string {
  const entry = stack?.[index];
  if (Array.isArray(entry) && typeof entry[1] === 'string') return entry[1];
  if (entry && typeof entry === 'object' && 'slice' in entry) {
    const slice = entry.slice;
    if (typeof slice === 'string') return slice;
    if (slice && typeof slice === 'object' && 'bytes' in slice && typeof slice.bytes === 'string') return slice.bytes;
  }
  throw new Error('Toncenter returned no jetton wallet address.');
}

async function runGetMethod(address: string, method: string, stack: unknown[]): Promise<ToncenterResponse['result']> {
  const response = await fetch(`${ENDPOINT}/runGetMethod`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ address, method, stack }),
  });
  const payload = (await response.json()) as ToncenterResponse;
  if (!response.ok || !payload.ok || !payload.result) throw new Error(payload.error || `Toncenter HTTP ${response.status}`);
  if (typeof payload.result.exit_code === 'number' && payload.result.exit_code !== 0) throw new Error(`Get method ${method} exited with code ${payload.result.exit_code}.`);
  return payload.result;
}

export async function fetchJettonBalance(owner: string, master: string): Promise<JettonBalance> {
  const walletResult = await runGetMethod(master, 'get_wallet_address', addressStack(owner));
  const walletAddress = readSlice(walletResult?.stack, 0);
  const walletData = await runGetMethod(walletAddress, 'get_wallet_data', []);
  const rawBalance = readNumber(walletData?.stack, 0);
  return { rawBalance, decimals: 9, symbol: 'JETTON', owner, jettonMaster: master, walletAddress };
}

export function formatTokenAmount(value: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = value % scale;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

export function validateRawAddress(value: string): boolean {
  return /^(?:-1|0):[0-9a-fA-F]{64}$/.test(value.trim());
}

export function validateInput(owner: string, master: string): string | undefined {
  if (!owner.trim() || !master.trim()) return 'Enter owner and jetton master addresses.';
  if (!validateRawAddress(owner) || !validateRawAddress(master)) return 'Use raw TON addresses: 0:<64 hex characters>.';
  return undefined;
}

export const TONCENTER_TESTNET = ENDPOINT;

export function selfCheck(): void {
  if (formatTokenAmount(1234500000n, 9) !== '1.2345') throw new Error('Token formatting self-check failed.');
}

selfCheck();
