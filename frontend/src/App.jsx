import { useState, useCallback, useEffect, useRef } from "react";
import {
  checkFreighterInstalled,
  connectFreighterWallet,
  sendPaymentWithFreighter,
  pathPaymentWithFreighter,
  changeTrustWithFreighter,
  readKitewellState,
  registerBuilderWithFreighter,
  validateSignerWeight,
  buildSetOptionsTx,
  validateMediumAgainstSigners,
  buildManageSellTx,
  buildManageBuyTx,
  validatePrice,
  listOffers,
  cancelOffer,
  buildLiquidityPoolDepositTx,
  buildLiquidityPoolWithdrawTx,
  validateLiquidityPair,
  validateMinAmount,
} from "./freighter";
import { shortenAddress } from "./addressFormat";
import {
  fundWithFriendbot,
  getAccountBalances,
  getAccountDetails,
  getTransactions,
  explorerAccountUrl,
  explorerTxUrl,
} from "./stellar";
import { validatePaymentAmount } from "./validatePaymentAmount";
import { fetchHealth, fetchNetworkInfo } from "./api";
import {
  NETWORKS,
  getActiveNetworkId,
  isFriendbotAvailable,
  setActiveNetwork,
} from "./network";
import { validateAssetCode } from "./validateAssetCode";
import "./App.css";

const TABS = ["Wallet", "Fund", "Assets", "Send", "Path", "History", "Lab"];
const PATH_MODE_FIELDS = {
  strictSend: {
    amountLabel: "Amount to send",
    boundLabel: "Minimum received",
    boundHint: "Lowest amount of the destination asset you will accept.",
  },
  strictReceive: {
    amountLabel: "Amount to receive",
    boundLabel: "Maximum to send",
    boundHint: "Most of the send asset you are willing to spend.",
  },
};
const MEMO_FIELDS = {
  text: {
    maxLength: 28,
    placeholder: "Up to 28 UTF-8 bytes",
  },
  id: {
    maxLength: 20,
    pattern: "[0-9]{1,20}",
    placeholder: "Unsigned 64-bit integer",
    inputMode: "numeric",
  },
  hash: {
    maxLength: 64,
    pattern: "[0-9a-fA-F]{64}",
    placeholder: "64 hexadecimal characters",
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Wallet");
  const [publicKey, setPublicKey] = useState(null);
  const [networkId, setNetworkId] = useState(getActiveNetworkId());
  const [freighterInstalled, setFreighterInstalled] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState("");
  const [toast, setToast] = useState(null);
  const [sendForm, setSendForm] = useState({
    destination: "",
    amount: "",
    assetKey: "native",
    memoType: "text",
    memo: "",
  });
  const [trustForm, setTrustForm] = useState({ code: "", issuer: "", limit: "1000000" });
  const [pathForm, setPathForm] = useState({
    mode: "strictSend",
    destination: "",
    amount: "",
    bound: "",
    sendAssetType: "native",
    sendCode: "",
    sendIssuer: "",
    destAssetType: "native",
    destCode: "",
    destIssuer: "",
    path: "",
  });
  const [pathResult, setPathResult] = useState(null);
  const [labInfo, setLabInfo] = useState(null);
  const [labError, setLabError] = useState(null);
  const [labState, setLabState] = useState(null);
  const [labStateError, setLabStateError] = useState(null);
  const [registerForm, setRegisterForm] = useState({ name: "" });
  const [signerForm, setSignerForm] = useState({ publicKey: "", weight: "" });
  const [signers, setSigners] = useState([]);
  const [thresholdForm, setThresholdForm] = useState({ low: "", med: "", high: "" });
  const [thresholdWarning, setThresholdWarning] = useState(null);
  const [poolForm, setPoolForm] = useState({ assetA: "", assetB: "", depositAmount: "", shareMinimum: "", withdrawShare: "", reserveAMin: "", reserveBMin: "" });
  const [pools, setPools] = useState([]);
  const [poolWarning, setPoolWarning] = useState(null);
  const [offerForm, setOfferForm] = useState({ sellingAsset: "", buyingAsset: "", price: "", amount: "" });
  const [offers, setOffers] = useState([]);
  const [cancelForm, setCancelForm] = useState({ offerId: "", price: "", amount: "" });
  const [lastRegisterTx, setLastRegisterTx] = useState(null);
  const tabRefs = useRef([]);
  const [accountDetails, setAccountDetails] = useState(null);

  const showToast = (message, type = "success", explorerUrl = null) => {
    setToast({ message, type, explorerUrl });
    setTimeout(() => setToast(null), 4200);
  };

  const xlmBalance = balances.find((b) => b.isNative)?.balance ?? null;
  const memoField = MEMO_FIELDS[sendForm.memoType];
  const activeNetwork = NETWORKS[networkId];
  const friendbotAvailable = isFriendbotAvailable();
  const pathModeField = PATH_MODE_FIELDS[pathForm.mode];
  const updatePathForm = (changes) => setPathForm((prev) => ({ ...prev, ...changes }));
  const selectedSendAsset = balances.find((b) => b.key === sendForm.assetKey);

  useEffect(() => {
    checkFreighterInstalled().then(setFreighterInstalled);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    setLoading("balance");
    try {
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      try {
        const details = await getAccountDetails(publicKey);
        setAccountDetails(details);
      } catch {
        setAccountDetails(null);
      }
    } catch {
      setBalances([]);
      showToast("Account not found on Testnet yet. Fund it with Friendbot.", "error");
    } finally {
      setLoading("");
    }
  }, [publicKey]);

  const handleConnect = async () => {
    setLoading("connect");
    try {
      const address = await connectFreighterWallet();
      setPublicKey(address);
      setBalances([]);
      setTransactions([]);
      showToast("Freighter connected.");
      try {
        const next = await getAccountBalances(address);
        setBalances(next);
      } catch {
        /* unfunded until Friendbot */
      }
    } catch (e) {
      showToast(e.message || "Failed to connect Freighter.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleDisconnect = () => {
    setPublicKey(null);
    setBalances([]);
    setTransactions([]);
    setAccountDetails(null);
    showToast("Disconnected.");
  };

  const handleNetworkChange = (id) => {
    try {
      const next = setActiveNetwork(id);
      setNetworkId(id);
      setBalances([]);
      setTransactions([]);
      setAccountDetails(null);
      showToast(`Switched to ${next.label}. Refresh to load balances.`, "info");
      if (publicKey) refreshBalances();
    } catch (e) {
      showToast(e.message || "Could not switch network.", "error");
    }
  };

  const handleFund = async () => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading("fund");
    try {
      await fundWithFriendbot(publicKey);
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      showToast("Funded with Testnet XLM via Friendbot.");
    } catch (e) {
      showToast(e.message || "Funding failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleTrust = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!trustForm.issuer) {
      return showToast("Issuer is required.", "error");
    }
    let code;
    try {
      code = validateAssetCode(trustForm.code);
    } catch (err) {
      return showToast(err.message, "error");
    }
    setLoading("trust");
    try {
      await changeTrustWithFreighter(
        publicKey,
        code,
        trustForm.issuer,
        trustForm.limit || "1000000"
      );
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      setTrustForm({ code: "", issuer: "", limit: "1000000" });
      showToast(`Trustline for ${code} submitted.`);
    } catch (err) {
      showToast(err.message || "Change trust failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleRemoveTrust = async (asset) => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (parseFloat(asset.balance) > 0) {
      return showToast(
        `${asset.code} still holds a balance. Move it to 0 before removing the trustline.`,
        "error"
      );
    }

    setLoading(`remove-${asset.key}`);
    try {
      await changeTrustWithFreighter(publicKey, asset.code, asset.issuer, "0");
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      showToast(`${asset.code} trustline removed.`);
    } catch (err) {
      showToast(err.message || `Could not remove the ${asset.code} trustline.`, "error");
    } finally {
      setLoading("");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!sendForm.destination) {
      return showToast("Destination is required.", "error");
    }
    let amount;
    try {
      amount = validatePaymentAmount(sendForm.amount);
    } catch (err) {
      return showToast(err.message, "error");
    }
    if (
      sendForm.memoType === "text" &&
      new TextEncoder().encode(sendForm.memo).length > 28
    ) {
      return showToast("Text memos must be 28 UTF-8 bytes or fewer.", "error");
    }

    const selected = balances.find((b) => b.key === sendForm.assetKey);
    if (!selected) {
      return showToast("Choose an asset you hold a trustline for.", "error");
    }
    if (parseFloat(amount) > parseFloat(selected.balance)) {
      return showToast(
        `Insufficient ${selected.code} balance. Available: ${selected.balance}.`,
        "error"
      );
    }

    const asset = selected.isNative
      ? { isNative: true }
      : { isNative: false, code: selected.code, issuer: selected.issuer };

    setLoading("send");
    try {
      const result = await sendPaymentWithFreighter(
        publicKey,
        sendForm.destination,
        amount,
        asset,
        sendForm.memoType,
        sendForm.memo
      );
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      setSendForm({
        destination: "",
        amount: "",
        assetKey: "native",
        memoType: "text",
        memo: "",
      });
      showToast(
        `Payment submitted · ${result.hash.slice(0, 12)}…`,
        "success",
        explorerTxUrl(result.hash)
      );
    } catch (err) {
      showToast(err.message || "Payment failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handlePathPayment = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!pathForm.destination || !pathForm.amount || !pathForm.bound) {
      return showToast("Destination, amount, and slippage bound are required.", "error");
    }
    if (pathForm.sendAssetType === "credit" && (!pathForm.sendCode || !pathForm.sendIssuer)) {
      return showToast("Send asset code and issuer are required.", "error");
    }
    if (pathForm.destAssetType === "credit" && (!pathForm.destCode || !pathForm.destIssuer)) {
      return showToast("Destination asset code and issuer are required.", "error");
    }

    setLoading("path");
    setPathResult(null);
    try {
      const result = await pathPaymentWithFreighter({
        publicKey,
        destination: pathForm.destination,
        mode: pathForm.mode,
        sendAsset: {
          isNative: pathForm.sendAssetType === "native",
          code: pathForm.sendCode,
          issuer: pathForm.sendIssuer,
        },
        destAsset: {
          isNative: pathForm.destAssetType === "native",
          code: pathForm.destCode,
          issuer: pathForm.destIssuer,
        },
        amount: pathForm.amount,
        destMin: pathForm.mode === "strictSend" ? pathForm.bound : undefined,
        sendMax: pathForm.mode === "strictReceive" ? pathForm.bound : undefined,
        path: pathForm.path,
      });

      setPathResult({
        hash: result.hash,
        explorerUrl: explorerTxUrl(result.hash),
      });
      try {
        const next = await getAccountBalances(publicKey);
        setBalances(next);
      } catch {
        /* balance refresh is best-effort */
      }
      showToast(`Path payment submitted · ${result.hash.slice(0, 12)}…`);
    } catch (err) {
      showToast(err.message || "Path payment failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleHistory = async () => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading("history");
    try {
      const page = await getTransactions(publicKey);
      setTransactions(page.records);
      setNextCursor(page.nextCursor);
      if (page.records.length === 0) showToast("No payments yet.", "info");
    } catch {
      showToast("Could not load payment history.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleLoadMore = async () => {
    if (!publicKey || !nextCursor) return;
    setLoading("history-more");
    try {
      // Same page size as the first page; `undefined` keeps the default limit.
      const page = await getTransactions(publicKey, undefined, nextCursor);
      setTransactions((previous) => [...previous, ...page.records]);
      setNextCursor(page.nextCursor);
    } catch {
      showToast("Could not load older payments.", "error");
    } finally {
      setLoading("");
    }
  };

  const requireWallet = !publicKey;

  const loadLabInfo = async () => {
    setLoading("lab");
    setLabError(null);
    try {
      const [health, network] = await Promise.all([fetchHealth(), fetchNetworkInfo()]);
      setLabInfo({ health, network });
    } catch (e) {
      setLabInfo(null);
      setLabError(
        e.message ||
          "Backend offline. Start it with: npm run dev:backend"
      );
    } finally {
      setLoading("");
    }
  };

  const refreshLabState = useCallback(async () => {
    const contractId = labInfo?.network?.contract?.kitewell;
    if (!contractId) {
      setLabState(null);
      setLabStateError(null);
      return;
    }
    setLoading("labstate");
    setLabStateError(null);
    try {
      const state = await readKitewellState(contractId, publicKey);
      setLabState(state);
    } catch (e) {
      setLabState(null);
      setLabStateError(
        e.message || "Could not read the kitewell contract via Soroban RPC."
      );
    } finally {
      setLoading("");
    }
  }, [labInfo, publicKey]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    const contractId = labInfo?.network?.contract?.kitewell;
    if (!contractId) {
      return showToast(
        "No contract id configured — deploy first (contracts/README.md).",
        "error"
      );
    }
    if (!registerForm.name.trim()) {
      return showToast("Enter a builder name to register.", "error");
    }
    setLoading("register");
    try {
      const result = await registerBuilderWithFreighter(
        publicKey,
        contractId,
        registerForm.name
      );
      setLastRegisterTx(result);
      setRegisterForm({ name: "" });
      showToast(
        result.confirmed
          ? `Registered on-chain · ${result.hash.slice(0, 12)}…`
          : `Submitted · ${result.hash.slice(0, 12)}…`,
        "success"
      );
      const state = await readKitewellState(contractId, publicKey);
      setLabState(state);
    } catch (err) {
      showToast(err.message || "Contract invoke failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleAddSigner = (e) => {
    e.preventDefault();
    if (!signerForm.publicKey || !signerForm.weight) {
      return showToast("Enter both public key and weight.", "error");
    }
    // Validate the weight
    const weightValidation = validateSignerWeight(Number(signerForm.weight));
    if (!weightValidation.ok) {
      return showToast(weightValidation.error, "error");
    }
    setSigners((prev) => [
      ...prev,
      { publicKey: signerForm.publicKey, weight: Number(signerForm.weight) },
    ]);
    setSignerForm({ publicKey: "", weight: "" });
  };

const handleSetOptions = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");

    setLoading("setoptions");
    setThresholdWarning(null);

    // Validate thresholds against signers
    const med = Number(thresholdForm.med);
    const validation = validateMediumAgainstSigners(med, signers);
    if (!validation.ok) {
      setThresholdWarning(validation.error);
      setLoading("");
      return showToast(validation.error, "error");
    }

    // Build the setOptions transaction
    const opts = {
      masterWeight: 0, // will be set below
      lowThreshold: Number(thresholdForm.low),
      medThreshold: med,
      highThreshold: Number(thresholdForm.high),
      signers: signers.map((s) => ({
        ed25519PublicKey: s.publicKey,
        weight: Number(s.weight),
      })),
    };

    // masterWeight should be >= each signer's weight and typically >= medThreshold
    // Set it to the sum of all signer weights or medThreshold, whichever is higher
    const totalSignerWeight = signers.reduce((sum, s) => sum + Number(s.weight), 0);
    opts.masterWeight = Math.max(totalSignerWeight, med);

    try {
      const tx = buildSetOptionsTx(opts);
      const result = await signAndSubmit(tx, publicKey);

      if (result.status === "SUCCESS") {
        showToast(
          `setOptions submitted · ${result.hash.slice(0, 12)}…`,
          "success",
          explorerTxUrl(result.hash)
        );
        // Refresh lab state
        await refreshLabState();
        await loadLabInfo();
      } else {
        showToast(
          `setOptions rejected: ${result.error?.message || "unknown error"}`,
          "error"
        );
      }
    } catch (err) {
      showToast(err.message || "setOptions failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handlePlaceOffer = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");

    // Validate price
    const priceValidation = validatePrice(Number(offerForm.price));
    if (!priceValidation.ok) {
      return showToast(priceValidation.error, "error");
    }

    // Determine if this is a sell or buy offer based on assets
    const selling = offerForm.sellingAssetType === "native" 
      ? StellarSdk.Asset.native() 
      : StellarSdk.Asset.code(offerForm.sellingAssetCode, offerForm.sellingAssetIssuer);
    const buying = offerForm.buyingAssetType === "native" 
      ? StellarSdk.Asset.native() 
      : StellarSdk.Asset.code(offerForm.buyingAssetCode, offerForm.buyingAssetIssuer);

    // Build the transaction
    let tx;
    if (offerForm.mode === "sell") {
      tx = buildManageSellTx(
        // We need a source account - load it
        null, // will be handled below
        selling,
        buying,
        priceValidation.price,
        Number(offerForm.amount)
      );
    } else {
      tx = buildManageBuyTx(
        selling,
        buying,
        priceValidation.price,
        Number(offerForm.amount)
      );
    }

    // Actually we need the source account, let me redo this
    setLoading("placeoffer");
    try {
      const sourceAccount = await getServer().loadAccount(publicKey);
      
      let operation;
      if (offerForm.mode === "sell") {
        operation = StellarSdk.Operation.manageSellOffer({
          selling: selling,
          buying: buying,
          price: priceValidation.price,
          amount: offerForm.amount,
        });
      } else {
        operation = StellarSdk.Operation.manageBuyOffer({
          selling: selling,
          buying: buying,
          price: priceValidation.price,
          amount: offerForm.amount,
        });
      }

      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: currentPassphrase(),
      });
      txBuilder.addOperation(operation);
      txBuilder.setTimeout(180);
      const tx = txBuilder.build();

      const result = await signAndSubmit(tx, publicKey);

      if (result.status === "SUCCESS") {
        showToast(
          `Offer placed · ${result.hash.slice(0, 12)}…`,
          "success",
          explorerTxUrl(result.hash)
        );
        // Refresh offers list
        await refreshOffers();
      } else {
        showToast(
          `Offer failed: ${result.error?.message || "unknown error"}`,
          "error"
        );
      }
    } catch (err) {
      showToast(err.message || "Offer placement failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const refreshOffers = async () => {
    if (!publicKey) return;
    try {
      const listedOffers = await listOffers(publicKey);
      setOffers(listedOffers);
    } catch (err) {
      showToast("Could not load offers.", "error");
    }
  };

  const handleCancelOffer = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");

    // Find the offer to cancel
    const offerToCancel = offers.find(o => o.id === cancelForm.offerId);
    if (!offerToCancel) {
      return showToast("Offer not found.", "error");
    }

    setLoading("canceloffer");
    try {
      const result = await cancelOffer(publicKey, offerToCancel);

      if (result.status === "SUCCESS") {
        showToast(
          `Offer cancelled · ${result.hash.slice(0, 12)}…`,
          "success",
          explorerTxUrl(result.hash)
        );
        // Refresh offers list
        await refreshOffers();
      } else {
        showToast(
          `Cancel failed: ${result.error?.message || "unknown error"}`,
          "error"
        );
      }
    } catch (err) {
      showToast(err.message || "Offer cancellation failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");

    // Validate pair
    const pairValidation = validateLiquidityPair(poolForm.assetA, poolForm.assetB);
    if (!pairValidation.ok) {
      return showToast(pairValidation.error, "error");
    }
    // Validate minimum
    const minValidation = validateMinAmount(Number(poolForm.shareMinimum));
    if (!minValidation.ok) {
      return showToast(minValidation.error, "error");
    }

    // Build reserves - need to get actual asset objects
    const assetA = poolForm.assetAType === "native"
      ? StellarSdk.Asset.native()
      : StellarSdk.Asset.code(poolForm.assetACode, poolForm.assetAIssuer);
    const assetB = poolForm.assetBType === "native"
      ? StellarSdk.Asset.native()
      : StellarSdk.Asset.code(poolForm.assetBCode, poolForm.assetBIssuer);

    setLoading("deposit");
    try {
      const sourceAccount = await getServer().loadAccount(publicKey);
      const tx = buildLiquidityPoolDepositTx(sourceAccount, assetA, assetB, Number(poolForm.depositAmount), Number(poolForm.shareMinimum));

      const result = await signAndSubmit(tx, publicKey);

      if (result.status === "SUCCESS") {
        showToast(
          `Liquidity deposit · ${result.hash.slice(0, 12)}…`,
          "success",
          explorerTxUrl(result.hash)
        );
        // Refresh balances
        await refreshBalances();
        await refreshPools();
      } else {
        showToast(
          `Deposit failed: ${result.error?.message || "unknown error"}`,
          "error"
        );
      }
    } catch (err) {
      showToast(err.message || "Deposit failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");

    // Validate minimum
    const minAValidation = validateMinAmount(Number(poolForm.reserveAMin));
    const minBValidation = validateMinAmount(Number(poolForm.reserveBMin));
    if (!minAValidation.ok || !minBValidation.ok) {
      return showToast(minAValidation.ok ? "" : minAValidation.error, "error");
    }

    // Build the withdraw tx
    setLoading("withdraw");
    try {
      const sourceAccount = await getServer().loadAccount(publicKey);
      const tx = buildLiquidityPoolWithdrawTx(sourceAccount, Number(poolForm.withdrawShare), Number(poolForm.reserveAMin), Number(poolForm.reserveBMin));

      const result = await signAndSubmit(tx, publicKey);

      if (result.status === "SUCCESS") {
        showToast(
          `Liquidity withdraw · ${result.hash.slice(0, 12)}…`,
          "success",
          explorerTxUrl(result.hash)
        );
        // Refresh balances
        await refreshBalances();
        await refreshPools();
      } else {
        showToast(
          `Withdraw failed: ${result.error?.message || "unknown error"}`,
          "error"
        );
      }
    } catch (err) {
      showToast(err.message || "Withdraw failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const refreshPools = async () => {
    if (!publicKey) return;
    try {
      // This is a simplified pool listing - in practice would query Horizon
      // For now, just refresh balances which includes pool shares
      await refreshBalances();
    } catch (err) {
      showToast("Could not refresh pool data.", "error");
    }
  };

  const activateTab = (tab) => {
    setActiveTab(tab);
    if (tab === "History") handleHistory();
    if (tab === "Lab") {
      loadLabInfo();
      refreshLabState();
    }
    if ((tab === "Wallet" || tab === "Assets" || tab === "Send") && publicKey) {
      refreshBalances();
    }
  };

  const handleTabKeyDown = (event, index) => {
    let nextIndex;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;
    else return;

    event.preventDefault();
    activateTab(TABS[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true" />

      {toast && (
        <div
          className={`toast toast--${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          <span>{toast.message}</span>
          {toast.explorerUrl && (
            <a
              className="toast__link"
              href={toast.explorerUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on explorer ↗
            </a>
          )}
        </div>
      )}

      <header className="header">
        <div className="header__brand">
          <KitewellMark />
          <div className="header__titles">
            <span className="header__name">Kitewell</span>
            <span className="header__tag">Stellar {activeNetwork.label} lab</span>
          </div>
        </div>
        <label className="network" htmlFor="network-select">
          <span className="eyebrow">Network</span>
          <select
            id="network-select"
            className="input input--compact"
            value={networkId}
            onChange={(e) => handleNetworkChange(e.target.value)}
            aria-label="Stellar network"
          >
            {Object.values(NETWORKS).map((network) => (
              <option key={network.id} value={network.id}>
                {network.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="main">
        <section className="hero-card">
          {publicKey ? (
            <>
              <div className="hero-card__status">
                <span className="status-dot" />
                Connected via Freighter
              </div>
              <div className="hero-card__balance">
                <span className="eyebrow">XLM balance</span>
                <span className="hero-card__amount">
                  {xlmBalance !== null
                    ? `${parseFloat(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM`
                    : "—"}
                  <button
                    className="icon-btn"
                    onClick={refreshBalances}
                    disabled={loading === "balance"}
                    title="Refresh balances"
                    aria-label="Refresh balances"
                    type="button"
                  >
                    {loading === "balance" ? <Spinner size={14} /> : "↻"}
                  </button>
                </span>
              </div>
              <div className="hero-card__key">
                <span className="eyebrow">Public key</span>
                <code>{shortenAddress(publicKey)}</code>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(publicKey);
                    showToast("Address copied.");
                  }}
                  title="Copy public key"
                  aria-label="Copy public key"
                >
                  ⎘
                </button>
                <a
                  className="text-link"
                  href={explorerAccountUrl(publicKey)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Explorer ↗
                </a>
              </div>
              {balances.filter((b) => !b.isNative).length > 0 && (
                <div className="asset-chips">
                  {balances
                    .filter((b) => !b.isNative)
                    .slice(0, 6)
                    .map((b) => (
                      <span key={b.key} className="chip">
                        {parseFloat(b.balance).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}{" "}
                        {b.code}
                      </span>
                    ))}
                </div>
              )}
            </>
          ) : (
            <div className="hero-card__empty">
              <p className="hero-card__lead">No wallet connected</p>
              <p className="muted">
                Connect Freighter to fund, trust assets, and send Testnet XLM.
              </p>
            </div>
          )}
        </section>

        <nav className="tabs" aria-label="Lab sections" role="tablist">
          {TABS.map((t, index) => {
            const isActive = activeTab === t;
            const tabId = `tab-${t.toLowerCase()}`;

            return (
              <button
                key={t}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                id={tabId}
                type="button"
                role="tab"
                className={`tab ${isActive ? "tab--active" : ""}`}
                aria-selected={isActive}
                aria-controls={`panel-${t.toLowerCase()}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => activateTab(t)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {t}
              </button>
            );
          })}
        </nav>

        <section
          className="panel"
          id={`panel-${activeTab.toLowerCase()}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab.toLowerCase()}`}
          tabIndex={0}
        >
          {activeTab === "Wallet" && (
            <div className="section">
              <h2>Connect wallet</h2>
              {freighterInstalled === false && (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">Freighter not detected</span>
                  <p className="muted">
                    Install the{" "}
                    <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                      Freighter extension
                    </a>{" "}
                    and switch it to <strong>Testnet</strong>.
                  </p>
                </div>
              )}
              {requireWallet ? (
                <>
                  <p className="muted">
                    Kitewell requests access with Freighter&apos;s{" "}
                    <code>setAllowed</code> / <code>getAddress</code> APIs. Keys never leave
                    the extension.
                  </p>
                  <button
                    className="btn btn--primary"
                    type="button"
                    onClick={handleConnect}
                    disabled={loading === "connect" || freighterInstalled === false}
                  >
                    {loading === "connect" ? (
                      <>
                        <Spinner /> Connecting…
                      </>
                    ) : (
                      "Connect Freighter"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="info-box">
                    <span className="eyebrow">Connected address</span>
                    <code>{publicKey}</code>
                  </div>
                  {accountDetails && (
                    <div className="info-box">
                      <span className="eyebrow">Account metadata</span>
                      <div className="metadata-grid">
                        <div>
                          <span className="metadata-label">Sequence</span>
                          <span className="metadata-value">{accountDetails.sequence}</span>
                        </div>
                        <div>
                          <span className="metadata-label">Subentries</span>
                          <span className="metadata-value">{accountDetails.subentryCount}</span>
                        </div>
                        <div>
                          <span className="metadata-label">Thresholds</span>
                          <span className="metadata-value">
                            {accountDetails.thresholds?.low ? accountDetails.thresholds.low : "—"},
                            {accountDetails.thresholds?.medium ? accountDetails.thresholds.medium : "—"},
                            {accountDetails.thresholds?.high ? accountDetails.thresholds.high : "—"}
                          </span>
                        </div>
                      </div>
                      <a
                        href={explorerAccountUrl(publicKey)}
                        className="text-link"
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginTop: 8, display: "inline-block" }}
                      >
                        StellarExpert ↗
                      </a>
                    </div>
                  )}
                  <button className="btn btn--secondary" type="button" onClick={handleDisconnect}>
                    Disconnect
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === "Fund" && (
            <div className="section">
              <h2>Fund with Friendbot</h2>
              <p className="muted">
                Activate the account and receive free test XLM. Only available on Testnet.
              </p>
              {!friendbotAvailable && (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">Friendbot unavailable</span>
                  <p className="muted">
                    Friendbot is disabled on {activeNetwork.label}. Switch to Testnet to fund an
                    account here, or fund it through a {activeNetwork.label} faucet.
                  </p>
                </div>
              )}
              {publicKey && (
                <div className="info-box">
                  <span className="eyebrow">Funding address</span>
                  <code>{publicKey}</code>
                </div>
              )}
              <button
                className="btn btn--primary"
                type="button"
                onClick={handleFund}
                disabled={loading === "fund" || requireWallet || !friendbotAvailable}
              >
                {loading === "fund" ? (
                  <>
                    <Spinner /> Funding…
                  </>
                ) : (
                  "Request Friendbot XLM"
                )}
              </button>
            </div>
          )}

          {activeTab === "Assets" && (
            <div className="section">
              <h2>Balances & trustlines</h2>
              <p className="muted">
                View holdings, open a trustline, or remove an empty one with Freighter{" "}
                <code>signTransaction</code>. Removing sets the limit to 0.
              </p>

              {balances.length > 0 ? (
                <ul className="balance-list">
                  {balances.map((b) => (
                    <li key={b.key} className="balance-row">
                      <div>
                        <strong>{b.code}</strong>
                        {!b.isNative && (
                          <span className="muted balance-row__issuer">
                            {shortenAddress(b.issuer)}
                          </span>
                        )}
                      </div>
                      <div className="balance-row__actions">
                        <span>
                          {parseFloat(b.balance).toLocaleString(undefined, {
                            maximumFractionDigits: 7,
                          })}
                        </span>
                        {!b.isNative && (
                          <button
                            className="btn btn--secondary btn--sm"
                            type="button"
                            onClick={() => handleRemoveTrust(b)}
                            disabled={loading === `remove-${b.key}`}
                            title={
                              parseFloat(b.balance) > 0
                                ? "Balance must be 0 before removing this trustline"
                                : `Remove the ${b.code} trustline`
                            }
                          >
                            {loading === `remove-${b.key}`
                              ? "Removing…"
                              : "Remove"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  {requireWallet
                    ? "Connect a wallet to load balances."
                    : "No balances yet — fund the account first."}
                </p>
              )}

              <form onSubmit={handleTrust} className="form">
                <h3 className="subhead">Add trustline</h3>
                <label className="label" htmlFor="trust-asset-code">
                  Asset code
                </label>
                <input
                  id="trust-asset-code"
                  className="input"
                  value={trustForm.code}
                  onChange={(e) => setTrustForm({ ...trustForm, code: e.target.value })}
                  placeholder="USDC"
                  maxLength={12}
                  required
                />
                <label className="label" htmlFor="trust-issuer">
                  Issuer
                </label>
                <input
                  id="trust-issuer"
                  className="input"
                  value={trustForm.issuer}
                  onChange={(e) => setTrustForm({ ...trustForm, issuer: e.target.value })}
                  placeholder="G…"
                  required
                />
                <label className="label" htmlFor="trust-limit">
                  Limit
                </label>
                <input
                  id="trust-limit"
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  value={trustForm.limit}
                  onChange={(e) => setTrustForm({ ...trustForm, limit: e.target.value })}
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={loading === "trust" || requireWallet}
                >
                  {loading === "trust" ? (
                    <>
                      <Spinner /> Signing…
                    </>
                  ) : (
                    "Sign changeTrust"
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === "Send" && (
            <div className="section">
              <h2>Send payment</h2>
              <p className="muted">
                Builds a payment op for XLM or a credit asset you hold, signs in Freighter, then
                submits to Horizon Testnet.
              </p>
              <form onSubmit={handleSend} className="form">
                <label className="label" htmlFor="send-destination">
                  Destination
                </label>
                <input
                  id="send-destination"
                  className="input"
                  type="text"
                  placeholder="G…"
                  value={sendForm.destination}
                  onChange={(e) => setSendForm({ ...sendForm, destination: e.target.value })}
                  required
                />
                <label className="label" htmlFor="send-asset">
                  Asset
                </label>
                <select
                  id="send-asset"
                  className="input"
                  value={sendForm.assetKey}
                  onChange={(e) => setSendForm({ ...sendForm, assetKey: e.target.value })}
                >
                  <option value="native">XLM (native)</option>
                  {balances
                    .filter((b) => !b.isNative)
                    .map((b) => (
                      <option key={b.key} value={b.key}>
                        {b.code} ·{" "}
                        {parseFloat(b.balance).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </option>
                    ))}
                </select>
                <label className="label" htmlFor="send-amount">
                  Amount ({selectedSendAsset?.code ?? "XLM"})
                </label>
                <input
                  id="send-amount"
                  className="input"
                  type="number"
                  step="0.0000001"
                  min="0.0000001"
                  placeholder="e.g. 10"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                  required
                />
                <label className="label" htmlFor="send-memo-type">
                  Memo type
                </label>
                <select
                  id="send-memo-type"
                  className="input"
                  value={sendForm.memoType}
                  onChange={(e) =>
                    setSendForm({
                      ...sendForm,
                      memoType: e.target.value,
                      memo: "",
                    })
                  }
                >
                  <option value="text">Text</option>
                  <option value="id">ID</option>
                  <option value="hash">Hash</option>
                </select>
                <label className="label" htmlFor="send-memo">
                  Memo (optional)
                </label>
                <input
                  id="send-memo"
                  className="input"
                  type="text"
                  maxLength={memoField.maxLength}
                  pattern={memoField.pattern}
                  inputMode={memoField.inputMode}
                  placeholder={memoField.placeholder}
                  value={sendForm.memo}
                  onChange={(e) => setSendForm({ ...sendForm, memo: e.target.value })}
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={loading === "send" || requireWallet}
                >
                  {loading === "send" ? (
                    <>
                      <Spinner /> Signing in Freighter…
                    </>
                  ) : (
                    "Sign & send"
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === "Path" && (
            <div className="section">
              <h2>Path payment</h2>
              <p className="muted">
                Builds a <code>pathPaymentStrictSend</code> /{" "}
                <code>pathPaymentStrictReceive</code> op, signs it in Freighter, then submits
                it to Horizon Testnet.
              </p>
              <form onSubmit={handlePathPayment} className="form">
                <label className="label" htmlFor="path-mode">
                  Mode
                </label>
                <select
                  id="path-mode"
                  className="input"
                  value={pathForm.mode}
                  onChange={(e) => updatePathForm({ mode: e.target.value })}
                >
                  <option value="strictSend">Strict send — fix the amount sent</option>
                  <option value="strictReceive">Strict receive — fix the amount received</option>
                </select>

                <label className="label" htmlFor="path-destination">
                  Destination
                </label>
                <input
                  id="path-destination"
                  className="input"
                  type="text"
                  placeholder="G…"
                  value={pathForm.destination}
                  onChange={(e) => updatePathForm({ destination: e.target.value })}
                  required
                />

                <label className="label" htmlFor="path-send-asset">
                  Send asset
                </label>
                <select
                  id="path-send-asset"
                  className="input"
                  value={pathForm.sendAssetType}
                  onChange={(e) => updatePathForm({ sendAssetType: e.target.value })}
                >
                  <option value="native">XLM (native)</option>
                  <option value="credit">Credit asset</option>
                </select>
                {pathForm.sendAssetType === "credit" && (
                  <>
                    <input
                      className="input"
                      type="text"
                      placeholder="Asset code, e.g. USDC"
                      maxLength={12}
                      value={pathForm.sendCode}
                      onChange={(e) => updatePathForm({ sendCode: e.target.value })}
                      required
                    />
                    <input
                      className="input"
                      type="text"
                      placeholder="Send asset issuer G…"
                      value={pathForm.sendIssuer}
                      onChange={(e) => updatePathForm({ sendIssuer: e.target.value })}
                      required
                    />
                  </>
                )}

                <label className="label" htmlFor="path-dest-asset">
                  Destination asset
                </label>
                <select
                  id="path-dest-asset"
                  className="input"
                  value={pathForm.destAssetType}
                  onChange={(e) => updatePathForm({ destAssetType: e.target.value })}
                >
                  <option value="native">XLM (native)</option>
                  <option value="credit">Credit asset</option>
                </select>
                {pathForm.destAssetType === "credit" && (
                  <>
                    <input
                      className="input"
                      type="text"
                      placeholder="Asset code, e.g. USDC"
                      maxLength={12}
                      value={pathForm.destCode}
                      onChange={(e) => updatePathForm({ destCode: e.target.value })}
                      required
                    />
                    <input
                      className="input"
                      type="text"
                      placeholder="Destination asset issuer G…"
                      value={pathForm.destIssuer}
                      onChange={(e) => updatePathForm({ destIssuer: e.target.value })}
                      required
                    />
                  </>
                )}

                <label className="label" htmlFor="path-amount">
                  {pathModeField.amountLabel}
                </label>
                <input
                  id="path-amount"
                  className="input"
                  type="number"
                  step="0.0000001"
                  min="0.0000001"
                  placeholder="e.g. 10"
                  value={pathForm.amount}
                  onChange={(e) => updatePathForm({ amount: e.target.value })}
                  required
                />

                <label className="label" htmlFor="path-bound">
                  {pathModeField.boundLabel}
                </label>
                <input
                  id="path-bound"
                  className="input"
                  type="number"
                  step="0.0000001"
                  min="0.0000001"
                  placeholder="e.g. 9.5"
                  value={pathForm.bound}
                  onChange={(e) => updatePathForm({ bound: e.target.value })}
                  required
                />
                <p className="muted">{pathModeField.boundHint}</p>

                <label className="label" htmlFor="path-hops">
                  Intermediate path (optional)
                </label>
                <input
                  id="path-hops"
                  className="input"
                  type="text"
                  placeholder="CODE:ISSUER, CODE:ISSUER"
                  value={pathForm.path}
                  onChange={(e) => updatePathForm({ path: e.target.value })}
                />
                <p className="muted">
                  Leave empty to route through the direct order book. Intermediate hops add a
                  fixed path to the operation.
                </p>

                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={loading === "path" || requireWallet}
                >
                  {loading === "path" ? (
                    <>
                      <Spinner /> Signing in Freighter…
                    </>
                  ) : (
                    "Sign & submit path payment"
                  )}
                </button>
              </form>

              {pathResult && (
                <div className="info-box">
                  <span className="eyebrow">Path payment submitted</span>
                  <code>{pathResult.hash}</code>
                  <a
                    className="text-link"
                    href={pathResult.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginTop: 6, display: "inline-block" }}
                  >
                    View on StellarExpert ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === "Lab" && (
            <div className="section">
              <div className="section__row">
                <h2>Lab stack</h2>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={loadLabInfo}
                  disabled={loading === "lab"}
                >
                  {loading === "lab" ? (
                    <>
                      <Spinner /> Checking…
                    </>
                  ) : (
                    "Refresh"
                  )}
                </button>
              </div>
              <p className="muted">
                Kitewell is a monorepo: <code>frontend</code> · <code>backend</code> ·{" "}
                <code>contracts</code>. This panel reads the local API and contract config.
              </p>
              {labError && (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">Backend</span>
                  <p className="muted">{labError}</p>
                </div>
              )}
              {labInfo && (
                <>
                  <div className="info-box">
                    <span className="eyebrow">Backend health</span>
                    <code>
                      {labInfo.health.service} · {labInfo.health.network} · ok=
                      {String(labInfo.health.ok)}
                    </code>
                  </div>
                  <div className="info-box">
                    <span className="eyebrow">Horizon</span>
                    <code>{labInfo.network.horizonUrl}</code>
                  </div>
                  <div className="info-box">
                    <span className="eyebrow">Soroban · kitewell</span>
                    <code>
                      {labInfo.network.contract?.kitewell ||
                        "Not deployed yet — see contracts/README.md"}
                    </code>
                    <p className="muted" style={{ marginTop: 6 }}>
                      Status: {labInfo.network.contract?.status}
                    </p>
                  </div>
                  <div className="section__row">
                    <div className="subhead">On-chain registry</div>
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={refreshLabState}
                      disabled={loading === "labstate"}
                    >
                      {loading === "labstate" ? (
                        <>
                          <Spinner /> Reading…
                        </>
                      ) : (
                        "Refresh"
                      )}
                    </button>
                  </div>
                  {labState ? (
                    <div className="info-box">
                      <span className="eyebrow">Contract state</span>
                      <div className="metadata-grid">
                        <div>
                          <span className="metadata-label">lab_name</span>
                          <span className="metadata-value">{labState.labName ?? "—"}</span>
                        </div>
                        <div>
                          <span className="metadata-label">builder_count</span>
                          <span className="metadata-value">{labState.builderCount ?? 0}</span>
                        </div>
                        <div>
                          <span className="metadata-label">get_builder (you)</span>
                          <span className="metadata-value">
                            {publicKey ? labState.builder ?? "Not registered" : "Connect to check"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="muted">
                      Reads lab_name, builder_count, and get_builder via Soroban RPC.
                    </p>
                  )}
                  {labStateError && (
                    <div className="info-box info-box--warning">
                      <span className="eyebrow">Soroban RPC</span>
                      <p className="muted">{labStateError}</p>
                    </div>
                  )}
                  <form className="form" onSubmit={handleRegister}>
                    <label className="label" htmlFor="builder-name">
                      Builder name
                    </label>
                    <input
                      id="builder-name"
                      className="input"
                      maxLength={64}
                      placeholder="e.g. stellar-alice"
                      value={registerForm.name}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, name: e.target.value })
                      }
                    />
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={loading === "register" || requireWallet}
                    >
                      {loading === "register" ? (
                        <>
                          <Spinner /> Signing in Freighter…
                        </>
                      ) : (
                        "Sign & register"
                      )}
                    </button>
                    {!publicKey && <p className="muted">Connect Freighter to sign.</p>}
                  </form>
                  {lastRegisterTx && (
                    <div className="info-box">
                      <span className="eyebrow">Register tx</span>
                      <code>{lastRegisterTx.hash}</code>
                      <a
                        href={explorerTxUrl(lastRegisterTx.hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                      >
                        Explorer ↗
                      </a>
                    </div>
                  )}
                  {/* Signer & Threshold Management */}
                  {publicKey && labState && (
                    <div className="info-box">
                      <h3 className="subhead">Signer & Threshold Management</h3>
                      {thresholdWarning && (
                        <div className="info-box info-box--warning">
                          <span className="eyebrow">Warning</span>
                          <p className="muted">{thresholdWarning}</p>
                        </div>
                      )}
                      {/* Signer form */}
                      <form className="form" onSubmit={handleAddSigner}>
                        <label className="label" htmlFor="signer-public-key">
                          Signer public key
                        </label>
                        <input
                          id="signer-public-key"
                          className="input"
                          type="text"
                          placeholder="G… (Ed25519 public key)"
                          value={signerForm.publicKey}
                          onChange={(e) =>
                            setSignerForm({ ...signerForm, publicKey: e.target.value })}
                          maxLength={56}
                          required
                        />
                        <label className="label" htmlFor="signer-weight">
                          Weight
                        </label>
                        <input
                          id="signer-weight"
                          className="input"
                          type="number"
                          min="0"
                          max="255"
                          value={signerForm.weight}
                          onChange={(e) =>
                            setSignerForm({
                              ...signerForm,
                              weight: e.target.valueAsNumber || e.target.value,
                            })}
                          required
                        />
                        <button
                          className="btn btn--primary"
                          type="submit"
                          disabled={loading === "setoptions"}
                        >
                          {loading === "setoptions"
                            ? (<>
                              <Spinner /> Adding…
                            </>)
                            : "Add signer"}
                        </button>
                      </form>

                      {/* Signers list */}
                      {signers.length > 0 && (
                        <div className="metadata-grid">
                          <div>
                            <span className="metadata-label">Signers</span>
                          </div>
                          <div>
                            {signers.map((s, i) => (
                              <div key={i} className="metadata-row">
                                <span className="metadata-value">
                                  {shortenAddress(s.publicKey)} · weight: {s.weight}
                                </span>
                                <button
                                  className="btn btn--secondary btn--sm"
                                  onClick={() =>
                                    setSigners(
                                      signers.filter((_, index) => index !== i)
                                    )
                                  }
                                  title="Remove signer"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Threshold form */}
                      <form className="form" onSubmit={handleSetOptions}>
                        <label className="label" htmlFor="threshold-low">
                          Low threshold
                        </label>
                        <input
                          id="threshold-low"
                          className="input"
                          type="number"
                          min="0"
                          max="255"
                          value={thresholdForm.low}
                          onChange={(e) =>
                            setThresholdForm({
                              ...thresholdForm,
                              low: e.target.valueAsNumber || e.target.value,
                            })}
                        />
                        <label className="label" htmlFor="threshold-med">
                          Medium threshold
                        </label>
                        <input
                          id="threshold-med"
                          className="input"
                          type="number"
                          min="0"
                          max="255"
                          value={thresholdForm.med}
                          onChange={(e) =>
                            setThresholdForm({
                              ...thresholdForm,
                              med: e.target.valueAsNumber || e.target.value,
                            })}
                        />
                        <p className="muted">
                          {signers.length > 0 &&
                          Number(thresholdForm.med) >
                            signers.reduce(
                              (sum, s) => sum + Number(s.weight),
                              0
                            )
                            ? "⚠ Medium threshold exceeds total signer weight"
                            : ""}
                        </p>
                        <label className="label" htmlFor="threshold-high">
                          High threshold
                        </label>
                        <input
                          id="threshold-high"
                          className="input"
                          type="number"
                          min="0"
                          max="255"
                          value={thresholdForm.high}
                          onChange={(e) =>
                            setThresholdForm({
                              ...thresholdForm,
                              high: e.target.valueAsNumber || e.target.value,
                            })}
                        />
                        <button
                          className="btn btn--primary"
                          type="submit"
                          disabled={loading === "setoptions"}
                        >
                          {loading === "setoptions"
                            ? (<>
                              <Spinner /> Setting…
                            </>)
                            : "Set thresholds & signers"}
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
              {/* Offer Management */}
              {publicKey && labState && (
                <div className="info-box">
                  <h3 className="subhead">Order Book Management</h3>
                  <form className="form" onSubmit={handlePlaceOffer}>
                    <label className="label" htmlFor="offer-mode">
                      Mode
                    </label>
                    <select
                      id="offer-mode"
                      className="input"
                      value={offerForm.mode}
                      onChange={(e) => setOfferForm({ ...offerForm, mode: e.target.value })}
                    >
                      <option value="sell">Sell offer — sell {offerForm.sellingAssetType === "native" ? "XLM" : offerForm.sellingAssetCode} for {offerForm.buyingAssetType === "native" ? "XLM" : offerForm.buyingAssetCode}</option>
                      <option value="buy">Buy offer — buy {offerForm.buyingAssetType === "native" ? "XLM" : offerForm.buyingAssetCode} with {offerForm.sellingAssetType === "native" ? "XLM" : offerForm.sellingAssetCode}</option>
                    </select>

                    <label className="label" htmlFor="selling-asset-type">
                      Sell asset type
                    </label>
                    <select
                      id="selling-asset-type"
                      className="input"
                      value={offerForm.sellingAssetType}
                      onChange={(e) => setOfferForm({ ...offerForm, sellingAssetType: e.target.value })}
                    >
                      <option value="native">XLM (native)</option>
                      <option value="credit">Credit asset</option>
                    </select>
                    {offerForm.sellingAssetType === "credit" && (
                      <>
                        <input
                          className="input"
                          type="text"
                          placeholder="Asset code, e.g. USDC"
                          maxLength={12}
                          value={offerForm.sellingAssetCode}
                          onChange={(e) => setOfferForm({ ...offerForm, sellingAssetCode: e.target.value })}
                          required
                        />
                        <input
                          className="input"
                          type="text"
                          placeholder="Issuer G…"
                          value={offerForm.sellingAssetIssuer}
                          onChange={(e) => setOfferForm({ ...offerForm, sellingAssetIssuer: e.target.value })}
                          required
                        />
                      </>
                    )}

                    <label className="label" htmlFor="dest-asset-type">
                      Buy asset type
                    </label>
                    <select
                      id="dest-asset-type"
                      className="input"
                      value={offerForm.buyingAssetType}
                      onChange={(e) => setOfferForm({ ...offerForm, buyingAssetType: e.target.value })}
                    >
                      <option value="native">XLM (native)</option>
                      <option value="credit">Credit asset</option>
                    </select>
                    {offerForm.buyingAssetType === "credit" && (
                      <>
                        <input
                          className="input"
                          type="text"
                          placeholder="Asset code, e.g. USDC"
                          maxLength={12}
                          value={offerForm.buyingAssetCode}
                          onChange={(e) => setOfferForm({ ...offerForm, buyingAssetCode: e.target.value })}
                          required
                        />
                        <input
                          className="input"
                          type="text"
                          placeholder="Issuer G…"
                          value={offerForm.buyingAssetIssuer}
                          onChange={(e) => setOfferForm({ ...offerForm, buyingAssetIssuer: e.target.value })}
                          required
                        />
                      </>
                    )}

                    <label className="label" htmlFor="offer-amount">
                      Amount
                    </label>
                    <input
                      id="offer-amount"
                      className="input"
                      type="number"
                      step="0.0000001"
                      min="0.0000001"
                      placeholder="e.g. 10"
                      value={offerForm.amount}
                      onChange={(e) => setOfferForm({ ...offerForm, amount: e.target.valueAsNumber || e.target.value })}
                      required
                    />

                    <label className="label" htmlFor="offer-price">
                      Price (positive number)
                    </label>
                    <input
                      id="offer-price"
                      className="input"
                      type="number"
                      step="any"
                      min="0.0000001"
                      placeholder="e.g. 1.5"
                      value={offerForm.price}
                      onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })}
                      required
                    />

                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={loading === "placeoffer"}
                    >
                      {loading === "placeoffer"
                        ? (<>
                          <Spinner /> Placing…
                        </>)
                        : "Place offer"}
                    </button>
                  </form>

                  {offers.length > 0 ? (
                    <div className="metadata-grid">
                      <div>
                        <span className="metadata-label">Your Offers</span>
                      </div>
                      <div>
                        {offers.map((offer) => (
                          <div key={offer.id} className="metadata-row">
                            <span className="metadata-value">
                              Offer ID: {offer.id}
                            </span>
                            <span className="metadata-value">
                              Selling: {offer.selling.asset_code || "XLM"} · Amount: {offer.amount}
                            </span>
                            <span className="metadata-value">
                              Buying: {offer.buying.asset_code || "XLM"} · Price: {offer.price}
                            </span>
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={() => setCancelForm({ offerId: offer.id, price: offer.price, amount: offer.amount })}
                              title="Cancel this offer"
                            >
                              Cancel
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="muted">No offers yet. Place a new offer above.</p>
                  )}

                  <form className="form" onSubmit={handleCancelOffer}>
                    <label className="label" htmlFor="cancel-offer-id">
                      Offer ID to cancel
                    </label>
                    <input
                      id="cancel-offer-id"
                      className="input"
                      type="text"
                      value={cancelForm.offerId}
                      onChange={(e) => setCancelForm({ ...cancelForm, offerId: e.target.value })}
                      required
                    />
                    <label className="label" htmlFor="cancel-price">
                      Price
                    </label>
                    <input
                      id="cancel-price"
                      className="input"
                      type="number"
                      step="any"
                      min="0.0000001"
                      value={cancelForm.price}
                      onChange={(e) => setCancelForm({ ...cancelForm, price: e.target.value })}
                      required
                    />
                    <label className="label" htmlFor="cancel-amount">
                      Amount
                    </label>
                    <input
                      id="cancel-amount"
                      className="input"
                      type="number"
                      step="0.0000001"
                      min="0.0000001"
                      value={cancelForm.amount}
                      onChange={(e) => setCancelForm({ ...cancelForm, amount: e.target.valueAsNumber || e.target.value })}
                      required
                    />
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={loading === "canceloffer"}
                    >
                      {loading === "canceloffer"
                        ? (<>
                          <Spinner /> Cancelling…
                        </>)
                        : "Cancel offer"}
                    </button>
                  </form>
                </div>
              )}
              {/* Liquidity Pool Management */}
              {publicKey && labState && (
                <div className="info-box">
                  <h3 className="subhead">Liquidity Pool Management</h3>
                  <form className="form" onSubmit={handleDeposit}>
                    <label className="label" htmlFor="pool-asset-a">
                      Reserve A asset
                    </label>
                    <select
                      id="pool-asset-a-type"
                      className="input"
                      value={poolForm.assetAType}
                      onChange={(e) => setPoolForm({ ...poolForm, assetAType: e.target.value })}
                    >
                      <option value="native">XLM (native)</option>
                      <option value="credit">Credit asset</option>
                    </select>
                    {poolForm.assetAType === "credit" && (
                      <>
                        <input
                          className="input"
                          type="text"
                          placeholder="Asset code A, e.g. USDC"
                          maxLength={12}
                          value={poolForm.assetACode}
                          onChange={(e) => setPoolForm({ ...poolForm, assetACode: e.target.value })}
                          required
                        />
                        <input
                          className="input"
                          type="text"
                          placeholder="Issuer A G…"
                          value={poolForm.assetAIssuer}
                          onChange={(e) => setPoolForm({ ...poolForm, assetAIssuer: e.target.value })}
                          required
                        />
                      </>
                    )}

                    <label className="label" htmlFor="pool-asset-b-type">
                      Reserve B asset
                    </label>
                    <select
                      id="pool-asset-b-type"
                      className="input"
                      value={poolForm.assetBType}
                      onChange={(e) => setPoolForm({ ...poolForm, assetBType: e.target.value })}
                    >
                      <option value="native">XLM (native)</option>
                      <option value="credit">Credit asset</option>
                    </select>
                    {poolForm.assetBType === "credit" && (
                      <>
                        <input
                          className="input"
                          type="text"
                          placeholder="Asset code B, e.g. USDC"
                          maxLength={12}
                          value={poolForm.assetBCode}
                          onChange={(e) => setPoolForm({ ...poolForm, assetBCode: e.target.value })}
                          required
                        />
                        <input
                          className="input"
                          type="text"
                          placeholder="Issuer B G…"
                          value={poolForm.assetBIssuer}
                          onChange={(e) => setPoolForm({ ...poolForm, assetBIssuer: e.target.value })}
                          required
                        />
                      </>
                    )}

                    <label className="label" htmlFor="pool-deposit-amount">
                      Deposit amount
                    </label>
                    <input
                      id="pool-deposit-amount"
                      className="input"
                      type="number"
                      step="0.0000001"
                      min="0.0000001"
                      placeholder="e.g. 10"
                      value={poolForm.depositAmount}
                      onChange={(e) => setPoolForm({ ...poolForm, depositAmount: e.target.valueAsNumber || e.target.value })}
                      required
                    />

                    <label className="label" htmlFor="pool-share-minimum">
                      Min pool shares
                    </label>
                    <input
                      id="pool-share-minimum"
                      className="input"
                      type="number"
                      step="0.0000001"
                      min="0.0000001"
                      placeholder="e.g. 1000"
                      value={poolForm.shareMinimum}
                      onChange={(e) => setPoolForm({ ...poolForm, shareMinimum: e.target.valueAsNumber || e.target.value })}
                      required
                    />

                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={loading === "deposit"}
                    >
                      {loading === "deposit"
                        ? (<>
                          <Spinner /> Depositing…
                        </>)
                        : "Deposit liquidity"}
                    </button>
                  </form>

                  {pools.length > 0 ? (
                    <div className="metadata-grid">
                      <div>
                        <span className="metadata-label">Your Pools</span>
                      </div>
                      <div>
                        {pools.map((pool) => (
                          <div key={pool.id} className="metadata-row">
                            <span className="metadata-value">
                              Pool: {pool.id} · Shares: {pool.shares}
                            </span>
                            <span className="metadata-value">
                              Reserve A: {pool.reserveA} · Reserve B: {pool.reserveB}
                            </span>
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={() => setPoolForm({
                                assetAType: pool.reserveAType,
                                assetBType: pool.reserveBType,
                                assetACode: pool.reserveACode,
                                assetAIssuer: pool.reserveAIssuer,
                                assetBCode: pool.reserveBCode,
                                assetBIssuer: pool.reserveBIssuer,
                                depositAmount: pool.depositAmount,
                                shareMinimum: pool.shareMinimum,
                                withdrawShare: pool.shares,
                                reserveAMin: pool.minReserveA,
                                reserveBMin: pool.minReserveB,
                              })}
                              title="Configure withdraw from this pool"
                            >
                              Withdraw
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="muted">No pools yet. Deposit liquidity above.</p>
                  )}

                  <form className="form" onSubmit={handleWithdraw}>
                    <label className="label" htmlFor="withdraw-share">
                      Share amount
                    </label>
                    <input
                      id="withdraw-share"
                      className="input"
                      type="number"
                      step="0.0000001"
                      min="0.0000001"
                      placeholder="e.g. 1000"
                      value={poolForm.withdrawShare}
                      onChange={(e) => setPoolForm({ ...poolForm, withdrawShare: e.target.valueAsNumber || e.target.value })}
                      required
                    />
                    <label className="label" htmlFor="reserve-a-min">
                      Min reserve A
                    </label>
                    <input
                      id="reserve-a-min"
                      className="input"
                      type="number"
                      step="0.0000001"
                      min="0.0000001"
                      placeholder="e.g. 5"
                      value={poolForm.reserveAMin}
                      onChange={(e) => setPoolForm({ ...poolForm, reserveAMin: e.target.valueAsNumber || e.target.value })}
                      required
                    />
                    <label className="label" htmlFor="reserve-b-min">
                      Min reserve B
                    </label>
                    <input
                      id="reserve-b-min"
                      className="input"
                      type="number"
                      step="0.0000001"
                      min="0.0000001"
                      placeholder="e.g. 5"
                      value={poolForm.reserveBMin}
                      onChange={(e) => setPoolForm({ ...poolForm, reserveBMin: e.target.valueAsNumber || e.target.value })}
                      required
                    />
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={loading === "withdraw"}
                    >
                      {loading === "withdraw"
                        ? (<>
                          <Spinner /> Withdrawing…
                        </>)
                        : "Withdraw liquidity"}
                    </button>
                  </form>
                </div>
              )}
              {!labInfo && !labError && (
                <p className="muted">Open this tab to probe the backend.</p>
              )}
            </div>
          )}

          {activeTab === "History" && (
            <div className="section">
              <div className="section__row">
                <h2>Payment history</h2>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={handleHistory}
                  disabled={loading === "history" || requireWallet}
                >
                  {loading === "history" ? (
                    <>
                      <Spinner /> Loading…
                    </>
                  ) : (
                    "Refresh"
                  )}
                </button>
              </div>
              {transactions.length > 0 ? (
                <div className="tx-list">
                  {transactions.map((tx) => {
                    const isOutgoing = tx.from === publicKey;
                    const createdAt = formatCreatedAt(tx.created_at);
                    return (
                      <div
                        key={tx.id}
                        className={`tx-item ${isOutgoing ? "tx-item--out" : "tx-item--in"}`}
                      >
                        <div className="tx-item__direction">
                          {isOutgoing ? "Sent" : "Received"}
                        </div>
                        <div className="tx-item__amount">
                          {parseFloat(tx.amount).toLocaleString()} {tx.asset_code || "XLM"}
                        </div>
                        <div className="tx-item__addr muted">
                          {isOutgoing
                            ? `To ${shortenAddress(tx.to)}`
                            : `From ${shortenAddress(tx.from)}`}
                        </div>
                        <a
                          href={explorerTxUrl(tx.transaction_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="tx-item__link"
                        >
                          Explorer ↗
                        </a>
                        {createdAt && (
                          <time
                            className="tx-item__time"
                            dateTime={tx.created_at}
                          >
                            {createdAt}
                          </time>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                !loading && <p className="muted">No payments yet.</p>
              )}
              {nextCursor && (
                <div className="section__row">
                  <button
                    className="btn btn--secondary"
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loading === "history-more"}
                  >
                    {loading === "history-more" ? (
                      <>
                        <Spinner /> Loading…
                      </>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <strong>Kitewell</strong> · Stellar {activeNetwork.label} · Freighter ·{" "}
        <a
          href="https://github.com/Kitewell-lab/Kitewell"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

function formatCreatedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function KitewellMark() {
  return (
    <svg className="mark" width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      <circle cx="18" cy="18" r="18" fill="#121826" />
      <circle cx="18" cy="18" r="7" fill="#F5C542" />
      <g stroke="#E8A317" strokeWidth="1.6" strokeLinecap="round">
        <path d="M18 3v4M18 29v4M3 18h4M29 18h4" />
        <path d="M7.8 7.8l2.8 2.8M25.4 25.4l2.8 2.8M7.8 28.2l2.8-2.8M25.4 10.6l2.8-2.8" />
      </g>
    </svg>
  );
}

function Spinner({ size = 16 }) {
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
