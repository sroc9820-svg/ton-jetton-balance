import { fetchJettonBalance, formatTokenAmount, TONCENTER_TESTNET, validateInput } from './toncenter';
import './style.css';

type ViewState = 'idle' | 'loading' | 'success' | 'error';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root missing.');

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="wordmark" href="/" aria-label="Jetton Balance Viewer home">
        <span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span>jetton<span class="wordmark-muted">/view</span></span>
      </a>
      <span class="network"><span class="network-dot"></span>TON testnet</span>
    </header>

    <section class="hero" aria-labelledby="page-title">
      <div class="eyebrow"><span class="eyebrow-line"></span>Read-only chain lens</div>
      <h1 id="page-title">See what a<br /><em>jetton wallet</em> holds.</h1>
      <p class="lede">Resolve an owner's jetton wallet through TON Center. No wallet connection. No keys. Only live testnet data.</p>
    </section>

    <section class="lookup-card" aria-labelledby="lookup-title">
      <div class="card-heading">
        <div>
          <span class="section-index">01</span>
          <h2 id="lookup-title">Set your coordinates</h2>
        </div>
        <span class="method-chip">get_wallet_address <b>+</b> get_wallet_data</span>
      </div>
      <form id="lookup-form">
        <label class="field">
          <span>Owner address</span>
          <input id="owner" name="owner" autocomplete="off" spellcheck="false" placeholder="0: owner raw address" required />
          <small>Wallet or account that owns jettons</small>
        </label>
        <label class="field">
          <span>Jetton master</span>
          <input id="master" name="master" autocomplete="off" spellcheck="false" placeholder="0: jetton master raw address" required />
          <small>Token contract that defines this jetton</small>
        </label>
        <button id="lookup-button" type="submit"><span>Query balance</span><strong>↗</strong></button>
      </form>
      <p class="format-note"><span class="note-dot"></span>Raw format only&nbsp; · &nbsp;<code>0:</code> followed by 64 hexadecimal characters</p>
    </section>

    <section id="status" class="status" aria-live="polite"></section>
    <section id="result" class="result" aria-live="polite"></section>

    <footer class="footer">
      <span>Data pulled live from <a href="${TONCENTER_TESTNET}" target="_blank" rel="noreferrer">TON Center API</a></span>
      <span>Testnet only · Read-only</span>
    </footer>
  </main>
`;

const form = document.querySelector<HTMLFormElement>('#lookup-form');
const ownerInput = document.querySelector<HTMLInputElement>('#owner');
const masterInput = document.querySelector<HTMLInputElement>('#master');
const button = document.querySelector<HTMLButtonElement>('#lookup-button');
const status = document.querySelector<HTMLElement>('#status');
const result = document.querySelector<HTMLElement>('#result');

if (!form || !ownerInput || !masterInput || !button || !status || !result) throw new Error('UI element missing.');

const lookupForm = form;
const ownerField = ownerInput;
const masterField = masterInput;
const lookupButton = button;
const statusElement = status;
const resultElement = result;
let state: ViewState = 'idle';

function setState(next: ViewState, message = '') {
  state = next;
  statusElement.className = `status ${next}`;
  statusElement.innerHTML = next === 'loading'
    ? '<span class="spinner"></span><span>Reading two get methods from testnet…</span>'
    : next === 'error'
      ? `<span class="status-icon">!</span><span>${message}</span>`
      : '';
  lookupButton.disabled = next === 'loading';
}

function renderResult(data: Awaited<ReturnType<typeof fetchJettonBalance>>) {
  const amount = formatTokenAmount(data.rawBalance, data.decimals);
  resultElement.innerHTML = `
    <div class="result-top">
      <div>
        <span class="section-index">02</span>
        <h2>Balance found</h2>
      </div>
      <span class="live-badge"><span></span>LIVE</span>
    </div>
    <div class="balance-hero">
      <span class="balance-label">Available balance</span>
      <div class="balance-value"><strong>${amount}</strong><span>${data.symbol}</span></div>
      <span class="raw-value">${data.rawBalance.toString()} nano-units</span>
    </div>
    <dl class="details">
      <div><dt>Owner</dt><dd title="${data.owner}">${shortAddress(data.owner)}</dd></div>
      <div><dt>Jetton wallet</dt><dd title="${data.walletAddress ?? ''}">${shortAddress(data.walletAddress ?? 'Unavailable')}</dd></div>
      <div><dt>Jetton master</dt><dd title="${data.jettonMaster}">${shortAddress(data.jettonMaster)}</dd></div>
      <div><dt>Decimals</dt><dd>${data.decimals}</dd></div>
    </dl>
  `;
}

function shortAddress(value: string): string {
  return value.length > 25 ? `${value.slice(0, 11)}…${value.slice(-10)}` : value;
}

lookupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state === 'loading') return;
  const owner = ownerField.value.trim();
  const master = masterField.value.trim();
  const validationError = validateInput(owner, master);
  resultElement.innerHTML = '';
  if (validationError) {
    setState('error', validationError);
    return;
  }
  setState('loading');
  try {
    const data = await fetchJettonBalance(owner, master);
    renderResult(data);
    setState('success');
    resultElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    setState('error', error instanceof Error ? error.message : 'Unable to read testnet data.');
  }
});

setState('idle');
