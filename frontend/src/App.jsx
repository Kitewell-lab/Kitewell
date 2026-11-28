import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  checkFreighterInstalled,
  connectFreighterWallet,
  buildPaymentEnvelope,
  submitEnvelopeWithFreighter,
  sendPaymentWithFreighter,
  pathPaymentWithFreighter,
  changeOfferPriceWithFreighter,
  changeTrustWithFreighter,
  revokeTrustlineSponsorshipWithFreighter,
  clawbackClaimableBalanceWithFreighter,
  readKitewellState,
  registerBuilderWithFreighter,
  simulateRegisterBuilder,
  setAccountOptionsWithFreighter,
  allowTrustWithFreighter,
  readContractInstanceTtl,
  extendContractTtlWithFreighter,
  readContractTTL,
  extendCodeTTL,
  readKitewellEvents,
  submitFailureResult,
  signChallengeWithFreighter,
} from "./freighter";
import {
  createFailedSubmitLog,
  downloadFailedSubmitLog,
} from "./failedSubmitLog";
import {
  shortenAddress,
  buildMuxedAddress,
  splitMuxedAddress,
} from "./addressFormat";
import {
  fundWithFriendbot,
  buildAsset,
  getAccountBalances,
  getAccountDetails,
  getOpenOffers,
  getPendingTransactions,
  getClaimableBalances,
  getSponsoredTrustlines,
  getLiquidityPool,
  getOrderBook,
  getTransactions,
  explorerAccountUrl,
  explorerTxUrl,
  isHorizonSlowdownError,
  HORIZON_SLOWDOWN_MESSAGE,
  statusWatchHref,
  getAccountAuthConfig,
  getIssuedAssetTrustlines,
  IMMUTABLE_CONFIRMATION,

  getTransactionMemos,
  buildPaymentsCsv,
  PAYMENTS_CSV_FILENAME,
  getAccountMergeBlockers,
} from "./stellar";
import {
  clearStoredOrderBookPair,
  parseOrderBookPair,
  readStoredOrderBookPair,
  saveOrderBookPair,
} from "./orderBookPair";
import { poolShareRows } from "./poolShare";
import { validatePaymentAmount } from "./validatePaymentAmount";
import { fetchHealth, fetchNetworkInfo } from "./api";
import { decodeEnvelope, formatArgumentValue } from "./envelopeDecoder";
import { formatSimulationFee } from "./simulationFees";
import {
  NETWORKS,
  getActiveNetworkId,
  isFriendbotAvailable,
  setActiveNetwork,
} from "./network";
import { validateAssetCode } from "./validateAssetCode";
import { checkThresholds } from "./thresholdCheck";
import { decodeTransactionEnvelope } from "./txInspector";
import TransactionHashLookup from "./TransactionHashLookup";
import { completeWebAuthChallenge } from "./sep10WebAuth";
import { loadIssuerCurrencyList } from "./issuerToml";
import { createPaymentStreamController } from "./paymentStream";
import {
  normaliseTxHash,
  txStatusPresentation,
  watchTransactionStatus,
} from "./txStatusWatch";
import { buildTransactionExplorerUrl } from "./explorerLink";
import "./App.css";

const TABS = [
  "Wallet",
  "Fund",
  "Assets",
  "Offers",
  "Issuer",
  "Send",
  "Path",
  "Offer",
  "Book",
  "History",
  "Pending",
  "Inspect",
  "Decode",
  "Issuer",
  "Web auth",
  "Muxed",
  "Lab",
  "Issue",
];
const PENDING_REFRESH_MS = 8000;
const EVENT_POLL_MS = 6000;
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
  const [sponsoredTrustlines, setSponsoredTrustlines] = useState([]);
  const [sponsoredTrustlinesLoading, setSponsoredTrustlinesLoading] = useState(false);
  const [sponsoredTrustlinesError, setSponsoredTrustlinesError] = useState(null);
  const [sponsoredTrustlineRefresh, setSponsoredTrustlineRefresh] = useState(0);
  const [claimableBalances, setClaimableBalances] = useState([]);
  const [liquidityPools, setLiquidityPools] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pendingError, setPendingError] = useState(null);
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
  const [createAccountForm, setCreateAccountForm] = useState({
    destination: "",
    startingBalance: "",
  });
  const [mergeForm, setMergeForm] = useState({ destination: "", retypeDestination: "" });
  const [mergeBlockers, setMergeBlockers] = useState([]);

  useEffect(() => {
    if (!publicKey) {
      setMergeBlockers([]);
      return;
    }
    let cancelled = false;
    getAccountMergeBlockers(publicKey)
      .then((blockers) => {
        if (!cancelled) setMergeBlockers(blockers);
      })
      .catch(() => {
        if (!cancelled) setMergeBlockers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);
  const [baseReserveInStroops, setBaseReserveInStroops] = useState(null);
  const [reserveError, setReserveError] = useState(null);
  const [reserveSubentryCount, setReserveSubentryCount] = useState("0");
  const [limitChangeForm, setLimitChangeForm] = useState({});
  const [openOffers, setOpenOffers] = useState([]);
  const [offerPrices, setOfferPrices] = useState({});
  const [offerError, setOfferError] = useState(null);
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerRefresh, setOfferRefresh] = useState(0);
  const [offerResult, setOfferResult] = useState(null);
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
  const [issueForm, setIssueForm] = useState({
    code: "",
    destination: "",
    amount: "",
  });
  const [pathResult, setPathResult] = useState(null);
  const [offerForm, setOfferForm] = useState({
    sellingType: "native",
    sellingCode: "",
    sellingIssuer: "",
    buyingType: "credit",
    buyingCode: "",
    buyingIssuer: "",
    price: "",
  });
  const [orderBook, setOrderBook] = useState(null);
  const [orderBookError, setOrderBookError] = useState(null);
  const [bookPair, setBookPair] = useState(readStoredOrderBookPair);
  const [bookResult, setBookResult] = useState(null);
  const bookClearGenerationRef = useRef(0);
  const [unsignedEnvelope, setUnsignedEnvelope] = useState(null);
  const [labInfo, setLabInfo] = useState(null);
  const [labError, setLabError] = useState(null);
  const [simulationFees, setSimulationFees] = useState(null);
  const [labState, setLabState] = useState(null);
  const [labStateError, setLabStateError] = useState(null);
  const [registerForm, setRegisterForm] = useState({ name: "" });
  const [lastRegisterTx, setLastRegisterTx] = useState(null);
  const [muxedBuildForm, setMuxedBuildForm] = useState({ gAddress: "", id: "" });
  const [muxedBuildResult, setMuxedBuildResult] = useState(null);
  const [muxedSplitForm, setMuxedSplitForm] = useState({ mAddress: "" });
  const [muxedSplitResult, setMuxedSplitResult] = useState(null);
  const [muxedError, setMuxedError] = useState(null);
  const [inspectForm, setInspectForm] = useState({ xdr: "" });
  const [inspectResult, setInspectResult] = useState(null);
  const [inspectError, setInspectError] = useState(null);
  const [envelopeXdr, setEnvelopeXdr] = useState("");
  const [decodedEnvelope, setDecodedEnvelope] = useState(null);
  const [decodeError, setDecodeError] = useState(null);
  const tabRefs = useRef([]);
  const horizonAbortRef = useRef(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [selectedSigners, setSelectedSigners] = useState([]);
  const [horizonNotice, setHorizonNotice] = useState(null);
  const [failedSubmits, setFailedSubmits] = useState([]);
  const failedSubmitLogRef = useRef(createFailedSubmitLog());
  const [webAuthForm, setWebAuthForm] = useState({ endpoint: "", serverAccount: "" });
  const [webAuthResult, setWebAuthResult] = useState(null);
  const [webAuthError, setWebAuthError] = useState(null);
  const [issuerInput, setIssuerInput] = useState("");
  const [issuerResult, setIssuerResult] = useState(null);
  const [issuerError, setIssuerError] = useState(null);
  const [streamedPayments, setStreamedPayments] = useState([]);
  const [streamState, setStreamState] = useState(null);
  const [txWatch, setTxWatch] = useState(null);
  const [txWatchError, setTxWatchError] = useState(null);
  const [hashForm, setHashForm] = useState("");
  const [hashError, setHashError] = useState(null);
  const streamSessionRef = useRef(null);
  const watchTokenRef = useRef(0);

  // Issue #512: the controller owns the streamed payments and their paging
  // tokens, so a duplicate event can never reach the list twice; this only
  // mirrors its state into React.
  const paymentStream = useMemo(
    () =>
      createPaymentStreamController({
        onChange: (records, state) => {
          setStreamedPayments(records);
          setStreamState(state);
        },
      }),
    []
  );

  // Issuer auth flags + trustlines the connected account issued.
  const [issuerConfig, setIssuerConfig] = useState(null);
  const [issuerConfigError, setIssuerConfigError] = useState(null);
  const [issuerForm, setIssuerForm] = useState({
    homeDomain: "",
    authRequired: false,
    authRevocable: false,
    authImmutable: false,
    confirmation: "",
  });
  const [issuedTrustlines, setIssuedTrustlines] = useState([]);
  const [issuedTrustlinesError, setIssuedTrustlinesError] = useState(null);

  // Contract instance TTL + event tail in the Lab tab.
  const [ttlInfo, setTtlInfo] = useState(null);
  const [ttlError, setTtlError] = useState(null);
  const [ttlForm, setTtlForm] = useState({ extendTo: "" });
  const [ttlResult, setTtlResult] = useState(null);
  const [codeTtl, setCodeTtl] = useState(null);
  const [codeTtlError, setCodeTtlError] = useState(null);
  const [labEvents, setLabEvents] = useState([]);
  const [labEventsError, setLabEventsError] = useState(null);
  const eventCursorRef = useRef(null);
  const eventStartLedgerRef = useRef(null);

  const showToast = (message, type = "success", explorerUrl = null) => {
    setToast({ message, type, explorerUrl });
    setTimeout(() => setToast(null), 4200);
  };

  const beginHorizonRead = () => {
    horizonAbortRef.current?.abort();
    const controller = new AbortController();
    horizonAbortRef.current = controller;
    return controller.signal;
  };

  const cancelHorizonReads = () => {
    horizonAbortRef.current?.abort();
    horizonAbortRef.current = null;
  };

  /** Append a failed submit to the in-memory session list (not localStorage). */
  const trackFailedSubmit = (operationType, error) => {
    failedSubmitLogRef.current.record({
      operationType,
      network: getActiveNetworkId(),
      result: submitFailureResult(error),
    });
    setFailedSubmits(failedSubmitLogRef.current.list());
  };

  const handleDownloadFailedSubmits = () => {
    if (failedSubmits.length === 0) return;
    downloadFailedSubmitLog(failedSubmitLogRef.current);
  };

  const xlmBalance = balances.find((b) => b.isNative)?.balance ?? null;
  const assetBalances = balances.filter((b) => !b.isPoolShare);
  const poolShares = poolShareRows(balances, liquidityPools);
  const memoField = MEMO_FIELDS[sendForm.memoType];
  const activeNetwork = NETWORKS[networkId];
  const friendbotAvailable = isFriendbotAvailable();
  const pathModeField = PATH_MODE_FIELDS[pathForm.mode];
  const updatePathForm = (changes) => setPathForm((prev) => ({ ...prev, ...changes }));
  const updateOfferForm = (changes) => setOfferForm((prev) => ({ ...prev, ...changes }));
  // Any edit changes the operation list, so the previewed envelope is stale.
  const updateSendForm = (changes) => {
    setSendForm((prev) => ({ ...prev, ...changes }));
    setUnsignedEnvelope(null);
  };
  const selectedSendAsset = balances.find((b) => b.key === sendForm.assetKey);
  const muxedSendBase = (() => {
    const value = sendForm.destination.trim();
    if (!value) return null;
    try {
      return splitMuxedAddress(value).gAddress;
    } catch {
      return null;
    }
  })();
  const configuredContractId = labInfo?.network?.contract?.kitewell;
  const parsedBookPair = parseOrderBookPair(bookPair);
  const bookKey = JSON.stringify([networkId, bookPair.selling, bookPair.buying]);
  const currentBookResult = bookResult?.key === bookKey ? bookResult : null;

  useEffect(() => {
    if (activeTab !== "Book") return;
    const pair = parseOrderBookPair(bookPair);
    if (!pair) return;

    let cancelled = false;
    const clearGeneration = bookClearGenerationRef.current;
    getOrderBook(pair.selling, pair.buying)
      .then((result) => {
        if (cancelled || clearGeneration !== bookClearGenerationRef.current) return;
        setBookResult({ key: bookKey, data: result });
        saveOrderBookPair(bookPair);
      })
      .catch((error) => {
        if (cancelled || clearGeneration !== bookClearGenerationRef.current) return;
        setBookResult({ key: bookKey, error: error.message || "Could not load the order book." });
      });
    return () => { cancelled = true; };
  }, [activeTab, bookPair, bookKey]);

  const getOfferAsset = (side) => {
    const type = offerForm[`${side}Type`];
    return buildAsset({
      isNative: type === "native",
      code: offerForm[`${side}Code`],
      issuer: offerForm[`${side}Issuer`],
    });
  };

  useEffect(() => {
    checkFreighterInstalled().then(setFreighterInstalled);
  }, []);

  useEffect(() => {
    if (!publicKey) return;

    let cancelled = false;
    const controller = new AbortController();

    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setSponsoredTrustlines([]);
        setSponsoredTrustlinesError(null);
        setSponsoredTrustlinesLoading(true);
        return getSponsoredTrustlines(publicKey, { signal: controller.signal });
      })
      .then((trustlines) => {
        if (!cancelled && trustlines) setSponsoredTrustlines(trustlines);
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setSponsoredTrustlines([]);
        setSponsoredTrustlinesError(
          error.message || "Could not load sponsored trustlines."
        );
      })
      .finally(() => {
        if (!cancelled) setSponsoredTrustlinesLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [publicKey, networkId, sponsoredTrustlineRefresh]);

  useEffect(() => () => cancelHorizonReads(), []);

  useEffect(() => {
    if (activeTab !== "Offers" || !publicKey) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setOfferLoading(true);
        setOfferError(null);
        return getOpenOffers(publicKey);
      })
      .then((offers) => {
        if (!cancelled && offers) setOpenOffers(offers);
      })
      .catch((error) => {
        if (!cancelled) {
          setOpenOffers([]);
          setOfferError(error.message || "Could not load open offers.");
        }
      })
      .finally(() => {
        if (!cancelled) setOfferLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, publicKey, networkId, offerRefresh]);

  // A pool-share balance only says how many shares the account holds. Load
  // each pool so the panel can also show both reserves and the total shares.
  useEffect(() => {
    const poolIds = [
      ...new Set(
        balances.filter((b) => b.isPoolShare && b.poolId).map((b) => b.poolId)
      ),
    ];

    if (poolIds.length === 0) return;

    let cancelled = false;
    for (const poolId of poolIds) {
      getLiquidityPool(poolId)
        .then((pool) => {
          if (!cancelled) {
            setLiquidityPools((previous) => ({ ...previous, [poolId]: pool }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLiquidityPools((previous) => ({ ...previous, [poolId]: null }));
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [balances]);

  // Issue #512: payments stream only while the history tab is open on a
  // connected account. Every way the issue closes the stream names itself here,
  // and a network switch is handled by `start`, which closes the old stream
  // before opening the new one.
  useEffect(() => {
    const previous = streamSessionRef.current;

    if (activeTab !== "History" || !publicKey) {
      if (paymentStream.isOpen()) {
        paymentStream.stop(
          !publicKey
            ? "disconnect"
            : previous?.networkId !== networkId
              ? "network-change"
              : "tab-hidden"
        );
      }
      streamSessionRef.current = null;
      return;
    }

    if (
      paymentStream.isOpen() &&
      previous &&
      previous.publicKey === publicKey &&
      previous.networkId === networkId
    ) {
      return;
    }

    streamSessionRef.current = { publicKey, networkId };
    try {
      paymentStream.start({ publicKey, networkId });
    } catch (err) {
      paymentStream.fail(err);
    }
  }, [activeTab, publicKey, networkId, paymentStream]);

  useEffect(
    () => () => {
      if (paymentStream.isOpen()) paymentStream.stop("tab-hidden");
      streamSessionRef.current = null;
    },
    [paymentStream]
  );

  // Issue #513: one watch runs at a time, so a token makes an older watch's
  // remaining polls invisible instead of letting two hashes fight over the box.
  const startTxWatch = useCallback(
    (hash) => {
      const token = watchTokenRef.current + 1;
      watchTokenRef.current = token;
      setTxWatchError(null);
      setTxWatch({
        hash,
        attempts: 0,
        ...txStatusPresentation({
          status: "pending",
          explorerUrl: buildTransactionExplorerUrl(networkId, hash),
        }),
      });

      watchTransactionStatus({
        hash,
        networkId,
        onUpdate: (snapshot) => {
          if (watchTokenRef.current !== token) return;
          setTxWatch({ ...snapshot, ...txStatusPresentation(snapshot) });
        },
      }).catch((err) => {
        if (watchTokenRef.current !== token) return;
        setTxWatch(null);
        setTxWatchError(err.message || "The transaction watch could not read this hash.");
      });
    },
    [networkId]
  );

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    setLoading("balance");
    const signal = beginHorizonRead();
    try {
      const next = await getAccountBalances(publicKey, { signal });
      setBalances(next);
      setHorizonNotice(null);
      const claimables = await getClaimableBalances(publicKey).catch(() => []);
      setClaimableBalances(claimables);
      try {
        const details = await getAccountDetails(publicKey, { signal });
        setAccountDetails(details);
      } catch (detailsError) {
        if (detailsError?.name === "AbortError") return;
        if (isHorizonSlowdownError(detailsError)) {
          setHorizonNotice(HORIZON_SLOWDOWN_MESSAGE);
          showToast(HORIZON_SLOWDOWN_MESSAGE, "info");
        }
        setAccountDetails(null);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      setBalances([]);
      setClaimableBalances([]);
      if (isHorizonSlowdownError(error)) {
        setHorizonNotice(HORIZON_SLOWDOWN_MESSAGE);
        showToast(HORIZON_SLOWDOWN_MESSAGE, "info");
      } else {
        setHorizonNotice(null);
        showToast("Account not found on Testnet yet. Fund it with Friendbot.", "error");
      }
    } finally {
      setLoading("");
    }
  }, [publicKey]);

  const handleClawback = async (balance) => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading(`clawback-${balance.id}`);
    try {
      await clawbackClaimableBalanceWithFreighter(publicKey, balance.id);
      const next = await getClaimableBalances(publicKey).catch(() => []);
      setClaimableBalances(next);
      showToast(`${balance.code} claimable balance clawed back.`);
    } catch (err) {
      trackFailedSubmit("clawbackClaimableBalance", err);
      showToast(err.message || "Clawback failed.", "error");
    } finally {
      setLoading("");
    }
  };
  const refreshAccountDetails = async () => {
    if (!publicKey) return;
    try {
      setAccountDetails(await getAccountDetails(publicKey));
    } catch {
      setAccountDetails(null);
    }
  };

  const handleSetData = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!dataForm.name) return showToast("Data name is required.", "error");

    setLoading("data-set");
    try {
      await manageDataWithFreighter(publicKey, dataForm.name, dataForm.value);
      setDataForm({ name: "", value: "" });
      await refreshAccountDetails();
      showToast("Account data submitted.");
    } catch (err) {
      showToast(err.message || "Could not set account data.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleClearData = async (name) => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading(`data-clear-${name}`);
    try {
      await manageDataWithFreighter(publicKey, name, null);
      await refreshAccountDetails();
      showToast(`Cleared account data "${name}".`);
    } catch (err) {
      showToast(err.message || `Could not clear "${name}".`, "error");
    } finally {
      setLoading("");
    }
  };

  const handleMergeAccount = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading("merge");
    try {
      const blockers = await getAccountMergeBlockers(publicKey);
      setMergeBlockers(blockers);
      if (blockers.length > 0) {
        showToast(`Cannot merge account: ${blockers.join("; ")}`, "error");
        setLoading("");
        return;
      }
      const result = await mergeAccountWithFreighter(
        publicKey,
        mergeForm.destination,
        mergeForm.retypeDestination
      );
      showToast(
        `Account merge submitted · ${result.hash.slice(0, 12)}…`,
        "success",
        explorerTxUrl(result.hash)
      );
      setPublicKey(null);
      setBalances([]);
      setTransactions([]);
      setAccountDetails(null);
      setMergeForm({ destination: "", retypeDestination: "" });
      setMergeBlockers([]);
    } catch (err) {
      showToast(err.message || "Account merge failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleClaimableRefresh = useCallback(async () => {
    if (!publicKey) return;
    setLoading("claimable-list");
    try {
      setClaimableBalances(await getSponsoredClaimableBalances(publicKey));
    } catch (err) {
      setClaimableBalances([]);
      showToast(err.message || "Could not load claimable balances.", "error");
    } finally {
      setLoading("");
    }
  }, [publicKey]);

  const handleCreateClaimable = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!claimableForm.claimant) {
      return showToast("Claimant is required.", "error");
    }
    const selected = balances.find((b) => b.key === claimableForm.assetKey);
    if (!selected) return showToast("Choose an asset you hold.", "error");
    if (parseFloat(claimableForm.amount) > parseFloat(selected.balance)) {
      return showToast(
        `Insufficient ${selected.code} balance. Available: ${selected.balance}.`,
        "error"
      );
    }
    setLoading("claimable-create");
    setClaimableResult(null);
    try {
      const asset = selected.isNative
        ? { isNative: true }
        : { isNative: false, code: selected.code, issuer: selected.issuer };
      const result = await createClaimableBalanceWithFreighter({
        publicKey,
        claimant: claimableForm.claimant,
        amount: claimableForm.amount,
        asset,
        predicateMode: claimableForm.predicateMode,
        ledgerTime: claimableForm.ledgerTime,
      });
      setClaimableResult({ type: "created", hash: result.hash });
      setClaimableForm({
        claimant: "",
        amount: "",
        assetKey: "native",
        predicateMode: "unconditional",
        ledgerTime: "",
      });
      try {
        setBalances(await getAccountBalances(publicKey));
      } catch {
        /* balances refresh separately */
      }
      showToast(
        `Claimable balance created · ${result.hash.slice(0, 12)}…`,
        "success",
        explorerTxUrl(result.hash)
      );
    } catch (err) {
      showToast(err.message || "Could not create claimable balance.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleClaimClaimable = async (balance) => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading(`claimable-${balance.id}`);
    try {
      const result = await claimClaimableBalanceWithFreighter(publicKey, balance.id);
      setClaimableResult({
        type: "claimed",
        hash: result.hash,
        balanceId: balance.id,
      });
      await handleClaimableRefresh();
      try {
        setBalances(await getAccountBalances(publicKey));
      } catch {
        /* balances refresh separately */
      }
      showToast(
        `Claimable balance claimed · ${result.hash.slice(0, 12)}…`,
        "success",
        explorerTxUrl(result.hash)
      );
    } catch (err) {
      showToast(err.message || "Could not claim balance.", "error");
    } finally {
      setLoading("");
    }
  };
  const handleConnect = async () => {
    setLoading("connect");
    try {
      const address = await connectFreighterWallet();
      setPublicKey(address);
      setBalances([]);
      setSponsoredTrustlines([]);
      setSponsoredTrustlinesError(null);
      setSponsoredTrustlinesLoading(false);
      setOpenOffers([]);
      setOfferPrices({});
      setOfferResult(null);
      setClaimableBalances([]);
      setTransactions([]);
      setPendingTransactions([]);
      setPendingError(null);
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
    failedSubmitLogRef.current.clear();
    setFailedSubmits([]);
    setPublicKey(null);
    setBalances([]);
    setSponsoredTrustlines([]);
    setSponsoredTrustlinesError(null);
    setSponsoredTrustlinesLoading(false);
    setOpenOffers([]);
    setOfferPrices({});
    setOfferResult(null);
    setTransactions([]);
    setPendingTransactions([]);
    setPendingError(null);
    setAccountDetails(null);
    setSelectedSigners([]);
    setIssuerConfig(null);
    setIssuedTrustlines([]);
    showToast("Disconnected.");
  };

  const handleNetworkChange = (id) => {
    try {
      cancelHorizonReads();
      setHorizonNotice(null);
      const next = setActiveNetwork(id);
      setNetworkId(id);
      setBalances([]);
      setSponsoredTrustlines([]);
      setSponsoredTrustlinesError(null);
      setSponsoredTrustlinesLoading(false);
      setOpenOffers([]);
      setOfferPrices({});
      setOfferResult(null);
      setTransactions([]);
      setPendingTransactions([]);
      setPendingError(null);
      setAccountDetails(null);
      setInspectResult(null);
      setInspectError(null);
      showToast(`Switched to ${next.label}. Refresh to load balances.`, "info");
      if (publicKey) refreshBalances();
    } catch (e) {
      showToast(e.message || "Could not switch network.", "error");
    }
  };

  const refreshPending = useCallback(async () => {
    if (!publicKey) {
      setPendingTransactions([]);
      setPendingError(null);
      return;
    }
    try {
      const rows = await getPendingTransactions(publicKey);
      setPendingTransactions(rows);
      setPendingError(null);
      setHorizonNotice(null);
    } catch (e) {
      if (isHorizonSlowdownError(e)) {
        setHorizonNotice(HORIZON_SLOWDOWN_MESSAGE);
        setPendingError(null);
        return;
      }
      setPendingError(e.message || "Could not load pending transactions.");
    }
  }, [publicKey]);

  useEffect(() => {
    if (activeTab !== "Pending" || !publicKey) {
      return undefined;
    }

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshPending();
    };

    tick();
    const timer = setInterval(tick, PENDING_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, publicKey, networkId, refreshPending]);

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
      const result = await changeTrustWithFreighter(
        publicKey,
        code,
        trustForm.issuer,
        trustForm.limit || "1000000"
      );
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      setTrustForm({ code: "", issuer: "", limit: "1000000" });
      showToast(`Trustline for ${code} submitted.`);
      startTxWatch(result.hash);
    } catch (err) {
      trackFailedSubmit("changeTrust", err);
      showToast(err.message || "Change trust failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");

    let code;
    let amount;
    try {
      code = validateAssetCode(issueForm.code);
      amount = validatePaymentAmount(issueForm.amount, "Issuance amount");
    } catch (err) {
      return showToast(err.message, "error");
    }

    if (!issueForm.destination.trim()) {
      return showToast("Holder account is required.", "error");
    }

    setLoading("issue");
    try {
      const result = await sendPaymentWithFreighter(
        publicKey,
        issueForm.destination.trim(),
        amount,
        { isNative: false, code, issuer: publicKey }
      );
      setIssueForm({ code: "", destination: "", amount: "" });
      showToast(
        `Issued ${amount} ${code} · ${result.hash.slice(0, 12)}…`,
        "success",
        explorerTxUrl(result.hash)
      );
      startTxWatch(result.hash);
    } catch (err) {
      trackFailedSubmit("issue", err);
      showToast(err.message || "Issue failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleChangeLimit = async (asset) => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");

    const newLimit = limitChangeForm[asset.key];
    if (!newLimit || newLimit.trim() === "") {
      return showToast("Enter a new limit.", "error");
    }

    const limitNum = parseFloat(newLimit);
    if (Number.isNaN(limitNum) || limitNum < 0) {
      return showToast("Limit must be a non-negative number.", "error");
    }

    const balance = parseFloat(asset.balance);
    if (limitNum < balance) {
      return showToast(
        `Limit (${newLimit}) cannot be below current balance (${asset.balance}).`,
        "error"
      );
    }

    setLoading(`limit-${asset.key}`);
    try {
      const result = await changeTrustWithFreighter(
        publicKey,
        asset.code,
        asset.issuer,
        newLimit
      );
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      setLimitChangeForm({ ...limitChangeForm, [asset.key]: "" });
      showToast(`${asset.code} trustline limit updated to ${newLimit}.`);
      startTxWatch(result.hash);
    } catch (err) {
      trackFailedSubmit("changeTrust", err);
      showToast(err.message || `Could not change ${asset.code} trustline limit.`, "error");
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
      const result = await changeTrustWithFreighter(publicKey, asset.code, asset.issuer, "0");
      const next = await getAccountBalances(publicKey);
      setBalances(next);
      showToast(`${asset.code} trustline removed.`);
      startTxWatch(result.hash);
    } catch (err) {
      trackFailedSubmit("changeTrust", err);
      showToast(err.message || `Could not remove the ${asset.code} trustline.`, "error");
    } finally {
      setLoading("");
    }
  };

  const handleRevokeSponsorship = async (asset) => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading(`revoke-${asset.key}`);
    try {
      await revokeTrustlineSponsorshipWithFreighter(
        publicKey,
        asset.code,
        asset.issuer,
        asset.holder
      );
      setSponsoredTrustlineRefresh((refresh) => refresh + 1);
      showToast(`${asset.code} sponsorship revoked.`);
      try {
        const next = await getAccountBalances(publicKey);
        setBalances(next);
      } catch (refreshError) {
        showToast(
          `Sponsorship was revoked, but balances could not be refreshed: ${
            refreshError.message || "unknown error"
          }`,
          "error"
        );
      }
    } catch (err) {
      trackFailedSubmit("revokeSponsorship", err);
      showToast(err.message || `Could not revoke the ${asset.code} sponsorship.`, "error");
    } finally {
      setLoading("");
    }
  };

  /** Validate the send form and return the args shared by preview and send. */
  const sendFormArgs = () => {
    if (!publicKey) {
      showToast("Connect Freighter first.", "error");
      return null;
    }
    if (!sendForm.destination) {
      showToast("Destination is required.", "error");
      return null;
    }
    let amount;
    try {
      amount = validatePaymentAmount(sendForm.amount);
    } catch (err) {
      showToast(err.message, "error");
      return null;
    }
    if (
      sendForm.memoType === "text" &&
      new TextEncoder().encode(sendForm.memo).length > 28
    ) {
      showToast("Text memos must be 28 UTF-8 bytes or fewer.", "error");
      return null;
    }

    const selected = balances.find((b) => b.key === sendForm.assetKey);
    if (!selected) {
      showToast("Choose an asset you hold a trustline for.", "error");
      return null;
    }
    if (!selected.isNative && selected.isAuthorized === false) {
      showToast(
        `${selected.code} is unauthorized by its issuer and cannot be sent.`,
        "error"
      );
      return null;
    }
    const available = parseFloat(selected.available || selected.balance);
    if (parseFloat(amount) > available) {
      showToast(
        `Insufficient ${selected.code} balance. Available: ${available.toFixed(7)} (after reserves and liabilities).`,
        "error"
      );
      return null;
    }

    return {
      destination: sendForm.destination,
      amount,
      asset: selected.isNative
        ? { isNative: true }
        : { isNative: false, code: selected.code, issuer: selected.issuer },
      memoType: sendForm.memoType,
      memo: sendForm.memo,
    };
  };

  const buildSendEnvelope = async () => {
    const args = sendFormArgs();
    if (!args) return null;

    return buildPaymentEnvelope(
      publicKey,
      args.destination,
      args.amount,
      args.asset,
      args.memoType,
      args.memo
    );
  };

  /** Build the unsigned envelope only: never signs and never submits. */
  const handlePreviewEnvelope = async () => {
    setLoading("preview");
    try {
      const xdr = await buildSendEnvelope();
      if (!xdr) return;
      setUnsignedEnvelope(xdr);
      showToast(
        "Unsigned envelope ready. Nothing was signed or submitted.",
        "info"
      );
    } catch (err) {
      showToast(err.message || "Could not build the unsigned envelope.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const args = sendFormArgs();
    if (!args) return;

    // Show the envelope before Freighter opens so it can be copied or handed
    // to another signer. The same XDR is signed on the next click.
    if (!unsignedEnvelope) {
      try {
        const xdr = await buildSendEnvelope();
        if (!xdr) return;
        setUnsignedEnvelope(xdr);
        showToast(
          "Review the unsigned envelope, then click Sign & send to sign this exact XDR.",
          "info"
        );
      } catch (err) {
        showToast(err.message || "Could not build the unsigned envelope.", "error");
      }
      return;
    }

    setLoading("send");
    try {
      const result = await submitEnvelopeWithFreighter(
        unsignedEnvelope,
        publicKey
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
      setUnsignedEnvelope(null);
      showToast(
        `Payment submitted · ${result.hash.slice(0, 12)}…`,
        "success",
        explorerTxUrl(result.hash)
      );
      startTxWatch(result.hash);
    } catch (err) {
      trackFailedSubmit("payment", err);
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
      startTxWatch(result.hash);
    } catch (err) {
      trackFailedSubmit("pathPayment", err);
      showToast(err.message || "Path payment failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleOrderBook = async (e) => {
    e.preventDefault();
    setLoading("order-book");
    setOrderBookError(null);
    setOrderBook(null);
    try {
      const book = await getOrderBook(getOfferAsset("selling"), getOfferAsset("buying"));
      setOrderBook(book);
    } catch (error) {
      setOrderBookError(
        error.message === "Selling and buying assets must be different."
          ? error.message
          : "The order book could not be read. Try again in a moment."
      );
    } finally {
      setLoading("");
    }
  };

  const handleOfferPriceChange = async (event, offer) => {
    event.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    const newPrice = offerPrices[offer.id]?.trim();
    setLoading("offer");
    setOfferResult(null);
    try {
      const result = await changeOfferPriceWithFreighter(publicKey, offer, newPrice);
      setOfferResult({
        id: offer.id,
        oldPrice: result.oldPrice,
        newPrice,
        hash: result.hash,
      });
      setOfferPrices((previous) => ({ ...previous, [offer.id]: "" }));
      setOfferRefresh((count) => count + 1);
      showToast(`Offer ${offer.id} price change submitted.`);
      startTxWatch(result.hash);
    } catch (error) {
      trackFailedSubmit("manageSellOffer", error);
      showToast(error.message || "Could not change offer price.", "error");
    } finally {
      setLoading("");
    }
  };

  const selectBookPrice = (row) => {
    const price = row.price ?? (Number(row.priceR?.n) / Number(row.priceR?.d)).toString();
    updateOfferForm({ price });
  };

  const handleHistory = async () => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading("history");
    const signal = beginHorizonRead();
    try {
      const page = await getTransactions(publicKey, 15, undefined, { signal });
      setTransactions(page.records);
      setNextCursor(page.nextCursor);
      setHorizonNotice(null);
      if (page.records.length === 0) showToast("No payments yet.", "info");
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (isHorizonSlowdownError(error)) {
        setHorizonNotice(HORIZON_SLOWDOWN_MESSAGE);
        showToast(HORIZON_SLOWDOWN_MESSAGE, "info");
      } else {
        showToast("Could not load payment history.", "error");
      }
    } finally {
      setLoading("");
    }
  };

  const handleLoadMore = async () => {
    if (!publicKey || !nextCursor) return;
    setLoading("history-more");
    const signal = beginHorizonRead();
    try {
      // Same page size as the first page; `undefined` keeps the default limit.
      const page = await getTransactions(publicKey, undefined, nextCursor, {
        signal,
      });
      setTransactions((previous) => [...previous, ...page.records]);
      setNextCursor(page.nextCursor);
      setHorizonNotice(null);
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (isHorizonSlowdownError(error)) {
        setHorizonNotice(HORIZON_SLOWDOWN_MESSAGE);
        showToast(HORIZON_SLOWDOWN_MESSAGE, "info");
      } else {
        showToast("Could not load older payments.", "error");
      }
    } finally {
      setLoading("");
    }
  };

  // Issue #513: the same watch that follows a submit also serves a pasted hash,
  // so the hash is validated before it reaches Horizon.
  const handleWatchHash = (e) => {
    e.preventDefault();
    setHashError(null);
    let hash;
    try {
      hash = normaliseTxHash(hashForm);
    } catch (err) {
      return setHashError(err.message || "Enter the 64-character transaction hash.");
    }
    setHashForm("");
    startTxWatch(hash);
  };

  // Issue #510: the panel sends the challenge to Freighter to sign and holds
  // the returned JWT only as long as this render needs it.
  const handleWebAuth = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");

    setLoading("webauth");
    setWebAuthError(null);
    setWebAuthResult(null);
    try {
      const result = await completeWebAuthChallenge({
        endpoint: webAuthForm.endpoint,
        account: publicKey,
        serverAccount: webAuthForm.serverAccount,
        sign: (unsignedXdr) => signChallengeWithFreighter(unsignedXdr, publicKey),
      });
      setWebAuthResult({ requestUrl: result.requestUrl, ...result.challenge, session: result.session });
      showToast("Web authentication complete.");
    } catch (err) {
      setWebAuthError(err.message || "Web authentication failed.");
    } finally {
      setLoading("");
    }
  };

  // Issue #511: an issuer account resolves to its home domain first, so the
  // same form accepts either an account or a domain.
  const handleIssuerLookup = async (e) => {
    e.preventDefault();
    setLoading("issuer");
    setIssuerError(null);
    setIssuerResult(null);
    try {
      setIssuerResult(await loadIssuerCurrencyList({ accountOrDomain: issuerInput }));
    } catch (err) {
      setIssuerError(err.message || "Could not read the issuer's stellar.toml.");
    } finally {
      setLoading("");
    }
  };

  const requireWallet = !publicKey;
  const visibleTransactions = mergeStreamedPayments(streamedPayments, transactions);

  const loadLabInfo = async () => {
    setLoading("lab");
    setLabError(null);
    try {
      const [health, network] = await Promise.all([fetchHealth(), fetchNetworkInfo()]);
      const info = { health, network };
      setLabInfo(info);
      return info;
    } catch (e) {
      setLabInfo(null);
      setLabError(
        e.message ||
          "Backend offline. Start it with: npm run dev:backend"
      );
      return null;
    } finally {
      setLoading("");
    }
  };

  const refreshLabState = useCallback(async (explicitContractId) => {
    const contractId = explicitContractId ?? labInfo?.network?.contract?.kitewell;
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
      startTxWatch(result.hash);
      const state = await readKitewellState(contractId, publicKey);
      setLabState(state);
    } catch (err) {
      trackFailedSubmit("register", err);
      showToast(err.message || "Contract invoke failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const refreshIssuerPanel = async () => {
    if (!publicKey) return;
    setLoading("issuer");
    try {
      const config = await getAccountAuthConfig(publicKey);
      setIssuerConfig(config);
      setIssuerConfigError(null);
      setIssuerForm({
        homeDomain: config.homeDomain || "",
        authRequired: config.authRequired,
        authRevocable: config.authRevocable,
        authImmutable: config.authImmutable,
        confirmation: "",
      });
    } catch (err) {
      setIssuerConfig(null);
      setIssuerConfigError(err.message || "Could not read account flags.");
    }

    try {
      setIssuedTrustlines(await getIssuedAssetTrustlines(publicKey));
      setIssuedTrustlinesError(null);
    } catch (err) {
      setIssuedTrustlines([]);
      setIssuedTrustlinesError(err.message || "Could not read issued trustlines.");
    }
    setLoading("");
  };

  const handleSetIssuerOptions = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading("issuer-update");
    try {
      await setAccountOptionsWithFreighter(publicKey, {
        current: issuerConfig || {},
        homeDomain: issuerForm.homeDomain,
        authRequired: issuerForm.authRequired,
        authRevocable: issuerForm.authRevocable,
        authImmutable: issuerForm.authImmutable,
        immutableConfirmation: issuerForm.confirmation,
      });
      showToast("Account flags updated.");
      // A successful update refreshes both the flags and the account balances.
      await refreshIssuerPanel();
      await refreshBalances();
    } catch (err) {
      showToast(err.message || "Could not update account flags.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleAllowTrust = async (entry, authorize) => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    setLoading(`allow-${entry.key}`);
    try {
      await allowTrustWithFreighter(publicKey, {
        holder: entry.holder,
        assetCode: entry.assetCode,
        assetIssuer: entry.assetIssuer,
        authorize,
      });
      showToast(
        `${authorize ? "Authorized" : "Revoked"} ${shortenAddress(entry.holder)} for ${entry.assetCode}.`
      );
      await refreshIssuerPanel();
    } catch (err) {
      showToast(err.message || "Could not update the trustline.", "error");
    } finally {
      setLoading("");
    }
  };

  const refreshTtlInfo = async (explicitContractId) => {
    const contractId = explicitContractId ?? configuredContractId;
    if (!contractId) {
      setTtlInfo(null);
      setTtlError(null);
      return;
    }
    setLoading("ttl");
    setTtlError(null);
    try {
      const info = await readContractInstanceTtl(contractId);
      setTtlInfo(info);
      setTtlForm({
        extendTo: String((info.liveUntilLedgerSeq || info.latestLedger || 0) + 5000),
      });
    } catch (err) {
      setTtlInfo(null);
      setTtlError(err.message || "Could not read the instance TTL.");
    } finally {
      setLoading("");
    }
  };

  const refreshCodeTtl = useCallback(async () => {
    if (!configuredContractId) {
      setCodeTtl(null);
      setCodeTtlError(null);
      return;
    }
    setLoading("code-ttl");
    setCodeTtlError(null);
    try {
      const ttlData = await readContractTTL(configuredContractId);
      setCodeTtl(ttlData);
    } catch (err) {
      setCodeTtl(null);
      setCodeTtlError(err.message || "Could not read the contract code TTL.");
    } finally {
      setLoading("");
    }
  }, [configuredContractId]);

  const handleExtendCodeTtl = async () => {
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!configuredContractId) {
      return showToast("No contract id configured.", "error");
    }
    if (!codeTtl?.wasmHash || !codeTtl?.currentLedger) {
      return showToast("Refresh the code TTL first.", "error");
    }

    const extendTo = codeTtl.currentLedger + 100000;
    setLoading("extend-code");
    try {
      const result = await extendCodeTTL(
        publicKey,
        codeTtl.wasmHash,
        extendTo,
        codeTtl.currentLedger
      );
      showToast(`Code TTL extended to ledger ${result.deadline}.`, "success");
      await refreshCodeTtl();
    } catch (err) {
      showToast(err.message || "Failed to extend code TTL.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleExtendTtl = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect Freighter first.", "error");
    if (!configuredContractId) {
      return showToast("No contract id configured — deploy first.", "error");
    }
    setLoading("ttl-extend");
    try {
      const result = await extendContractTtlWithFreighter(
        publicKey,
        configuredContractId,
        ttlForm.extendTo,
        {
          currentDeadline: ttlInfo?.liveUntilLedgerSeq ?? undefined,
          latestLedger: ttlInfo?.latestLedger ?? undefined,
        }
      );
      setTtlResult({
        hash: result.hash,
        liveUntilLedgerSeq: result.liveUntilLedgerSeq,
      });
      showToast(
        result.confirmed
          ? `TTL extended to ledger ${result.liveUntilLedgerSeq}.`
          : `TTL extension submitted · ${result.hash.slice(0, 12)}…`
      );
      await refreshTtlInfo(configuredContractId);
    } catch (err) {
      showToast(err.message || "Could not extend the instance TTL.", "error");
    } finally {
      setLoading("");
    }
  };

  const pollLabEvents = useCallback(async (contractId) => {
    if (!contractId) return;
    try {
      const result = await readKitewellEvents(contractId, {
        cursor: eventCursorRef.current || undefined,
        startLedger: eventStartLedgerRef.current || undefined,
      });
      if (eventStartLedgerRef.current === null && result.latestLedger) {
        eventStartLedgerRef.current = result.latestLedger;
      }
      if (result.cursor) eventCursorRef.current = result.cursor;
      setLabEvents((previous) => {
        const byId = new Map(previous.map((event) => [event.id, event]));
        result.events.forEach((event) => byId.set(event.id, event));
        return [...byId.values()];
      });
      setLabEventsError(null);
    } catch (err) {
      setLabEventsError(err.message || "Could not read contract events.");
    }
  }, []);

  // Start the tail at the ledger open when the Lab tab is first shown, and
  // poll for new register / pause events while it stays open.
  useEffect(() => {
    if (activeTab !== "Lab" || !configuredContractId) {
      if (activeTab !== "Lab") {
        eventCursorRef.current = null;
        eventStartLedgerRef.current = null;
      }
      return undefined;
    }
    eventCursorRef.current = null;
    eventStartLedgerRef.current = null;
    pollLabEvents(configuredContractId);
    const timer = setInterval(
      () => pollLabEvents(configuredContractId),
      EVENT_POLL_MS
    );
    return () => clearInterval(timer);
  }, [activeTab, configuredContractId, pollLabEvents]);

  const handleInspect = (event) => {
    event.preventDefault();
    setInspectError(null);
    setInspectResult(null);
    try {
      setInspectResult(
        decodeTransactionEnvelope(inspectForm.xdr, activeNetwork.passphrase)
      );
    } catch (e) {
      setInspectError(e.message || "XDR could not be read.");
    }
  };

  const handleDecodeEnvelope = (event) => {
    event.preventDefault();
    setDecodeError(null);
    setDecodedEnvelope(null);
    try {
      setDecodedEnvelope(decodeEnvelope(envelopeXdr, activeNetwork.passphrase));
    } catch (error) {
      setDecodedEnvelope(null);
      setDecodeError(error.message || "Could not decode the envelope.");
    }
  };

  const handleBuildMuxed = (event) => {
    event.preventDefault();
    setMuxedError(null);
    setMuxedBuildResult(null);
    try {
      setMuxedBuildResult(
        buildMuxedAddress(
          muxedBuildForm.gAddress.trim(),
          muxedBuildForm.id.trim()
        )
      );
    } catch (err) {
      setMuxedError(err.message || "Could not build the muxed address.");
    }
  };

  const handleSplitMuxed = (event) => {
    event.preventDefault();
    setMuxedError(null);
    setMuxedSplitResult(null);
    try {
      const { gAddress, id } = splitMuxedAddress(
        muxedSplitForm.mAddress.trim()
      );
      setMuxedSplitResult({ gAddress, id: id.toString() });
    } catch (err) {
      setMuxedError(err.message || "Could not split the muxed address.");
    }
  };

  const activateTab = (tab) => {
    setActiveTab(tab);
    if (tab === "History") handleHistory();
    if (tab === "Lab") {
      loadLabInfo().then((info) => {
        const contractId = info?.network?.contract?.kitewell;
        refreshLabState(contractId);
        refreshTtlInfo(contractId);
      });
    }
    if (tab === "Issuer") refreshIssuerPanel();
    if ((tab === "Wallet" || tab === "Assets" || tab === "Send") && publicKey) {
      refreshBalances();
    }
  };

  const handleSimulateRegister = async () => {
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

    setLoading("simulate");
    setSimulationFees(null);
    try {
      const fees = await simulateRegisterBuilder(
        publicKey,
        contractId,
        registerForm.name
      );
      setSimulationFees(fees);
      if (fees.error) {
        showToast(`Simulation failed: ${fees.error}`, "error");
      }
    } catch (err) {
      showToast(err.message || "Simulation failed.", "error");
    } finally {
      setLoading("");
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

  // Issue #513: one element reused by every tab that submits, because only one
  // watch runs at a time and it must be visible right where the hash appeared.
  const txWatchPanel = (
    <div className="section">
      <h2>Transaction status</h2>
      <p className="muted">
        A transaction submitted here is followed until it reaches the ledger, fails, or passes
        its max time.
      </p>

      {txWatch && (
        <div
          className={
            txWatch.status === "failed" || txWatch.status === "expired"
              ? "info-box info-box--warning"
              : "info-box"
          }
          role="status"
          aria-live="polite"
        >
          <span className="eyebrow">
            <code>{txWatch.hash}</code> · {txWatch.status}
          </span>
          <p className="muted">{txWatch.text}</p>
          <a
            className="text-link"
            href={txWatch.explorerUrl}
            target="_blank"
            rel="noreferrer"
            style={{ marginTop: 6, display: "inline-block" }}
          >
            Explorer ↗
          </a>
        </div>
      )}
      {txWatchError && (
        <div className="info-box info-box--warning">
          <span className="eyebrow">Transaction watch</span>
          <p className="muted">{txWatchError}</p>
        </div>
      )}

      <form className="form" onSubmit={handleWatchHash}>
        <label className="label" htmlFor="watch-tx-hash">
          Watch a transaction hash
        </label>
        <input
          id="watch-tx-hash"
          className="input"
          type="text"
          placeholder="64 hexadecimal characters"
          maxLength={64}
          value={hashForm}
          onChange={(e) => setHashForm(e.target.value)}
          aria-describedby="watch-tx-hash-help"
          required
        />
        <p className="muted" id="watch-tx-hash-help" role={hashError ? "alert" : undefined}>
          {hashError || "Paste any transaction hash from this network to follow it."}
        </p>
        <button
          className="btn btn--primary"
          type="submit"
          disabled={loading === "issue"}
        >
          Watch status
        </button>
      </form>
    </div>
  );

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
              {horizonNotice && (
                <p className="muted" role="status">
                  {horizonNotice}
                </p>
              )}
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
                    .filter((b) => !b.isNative && !b.isPoolShare)
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
            const tabId = `tab-${tabSlug(t)}`;

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
          id={`panel-${tabSlug(activeTab)}`}
          role="tabpanel"
          aria-labelledby={`tab-${tabSlug(activeTab)}`}
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
                            {accountDetails.thresholds?.low_threshold ?? "—"},{" "}
                            {accountDetails.thresholds?.med_threshold ?? "—"},{" "}
                            {accountDetails.thresholds?.high_threshold ?? "—"}
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
                  <div className="section__row">
                    <button className="btn btn--secondary" type="button" onClick={handleDisconnect}>
                      Disconnect
                    </button>
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={handleDownloadAccountSnapshot}
                      disabled={loading === "snapshot"}
                      title="Download a JSON snapshot of this account"
                    >
                      {loading === "snapshot" ? (
                        <>
                          <Spinner /> Exporting…
                        </>
                      ) : (
                        "Download account JSON"
                      )}
                    </button>
                  </div>
                  <form className="form" onSubmit={handleMergeAccount} style={{ marginTop: 16 }}>
                    <h3 className="subhead">Merge account</h3>
                    <p className="muted">
                      Send all XLM to another account and close this one. The account can only be
                      merged once it has no trustlines, offers, data entries, or created claimable
                      balances.
                    </p>
                    {mergeBlockers.length > 0 && (
                      <div className="info-box info-box--warning" role="alert">
                        <span className="eyebrow">Merge blocked</span>
                        <ul>
                          {mergeBlockers.map((blocker) => (
                            <li key={blocker}>{blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <label className="label" htmlFor="merge-destination">
                      Destination public key
                    </label>
                    <input
                      id="merge-destination"
                      className="input"
                      value={mergeForm.destination}
                      onChange={(e) =>
                        setMergeForm((prev) => ({
                          ...prev,
                          destination: e.target.value,
                        }))
                      }
                      placeholder="G..."
                      required
                    />
                    <label className="label" htmlFor="merge-retype">
                      Retype destination public key
                    </label>
                    <input
                      id="merge-retype"
                      className="input"
                      value={mergeForm.retypeDestination}
                      onChange={(e) =>
                        setMergeForm((prev) => ({
                          ...prev,
                          retypeDestination: e.target.value,
                        }))
                      }
                      placeholder="G..."
                      required
                    />
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={loading === "merge" || mergeBlockers.length > 0}
                    >
                      {loading === "merge" ? (
                        <>
                          <Spinner /> Merging…
                        </>
                      ) : (
                        "Merge account"
                      )}
                    </button>
                  </form>

                  {accountDetails?.signers && accountDetails.signers.length > 0 && (
                    <div className="info-box">
                      <span className="eyebrow">Signers & thresholds</span>
                      <p className="muted" style={{ marginBottom: 12 }}>
                        Tick signers to check if they meet the low, medium, and high thresholds.
                      </p>
                      <div style={{ marginBottom: 12 }}>
                        {accountDetails.signers
                          .filter((s) => s.weight > 0)
                          .map((signer) => (
                            <label
                              key={signer.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 8,
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedSigners.includes(signer.key)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSigners([...selectedSigners, signer.key]);
                                  } else {
                                    setSelectedSigners(
                                      selectedSigners.filter((k) => k !== signer.key)
                                    );
                                  }
                                }}
                                style={{ cursor: "pointer" }}
                              />
                              <code style={{ flex: 1 }}>{shortenAddress(signer.key)}</code>
                              <span className="muted">
                                weight: {signer.weight}
                                {signer.key === publicKey && " (master)"}
                              </span>
                            </label>
                          ))}
                      </div>
                      {(() => {
                        const thresholds = {
                          low: accountDetails.thresholds?.low_threshold || 0,
                          medium: accountDetails.thresholds?.med_threshold || 0,
                          high: accountDetails.thresholds?.high_threshold || 0,
                        };
                        const result = checkThresholds(
                          accountDetails.signers,
                          selectedSigners,
                          thresholds
                        );
                        return (
                          <>
                            <div style={{ marginBottom: 12 }}>
                              <div className="metadata-grid">
                                <div>
                                  <span className="metadata-label">
                                    Low ({thresholds.low})
                                  </span>
                                  <span
                                    className="metadata-value"
                                    style={{ color: result.low ? "#4ade80" : "#f87171" }}
                                  >
                                    {result.low ? "✓ Pass" : "✗ Fail"}
                                  </span>
                                </div>
                                <div>
                                  <span className="metadata-label">
                                    Medium ({thresholds.medium})
                                  </span>
                                  <span
                                    className="metadata-value"
                                    style={{ color: result.medium ? "#4ade80" : "#f87171" }}
                                  >
                                    {result.medium ? "✓ Pass" : "✗ Fail"}
                                  </span>
                                </div>
                                <div>
                                  <span className="metadata-label">
                                    High ({thresholds.high})
                                  </span>
                                  <span
                                    className="metadata-value"
                                    style={{ color: result.high ? "#4ade80" : "#f87171" }}
                                  >
                                    {result.high ? "✓ Pass" : "✗ Fail"}
                                  </span>
                                </div>
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <span className="metadata-label">Selected weight total</span>
                                <span className="metadata-value"> {result.totalWeight}</span>
                              </div>
                            </div>
                            {!result.canMeetHigh && (
                              <div className="info-box info-box--warning" style={{ marginTop: 0 }}>
                                <span className="eyebrow">⚠ Account locked out</span>
                                <p className="muted">
                                  No combination of existing signers can meet the high threshold.
                                  The account cannot perform high-threshold operations.
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
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

          {activeTab === "Offers" && (
            <div className="section">
              <div className="section__row">
                <h2>Open offers</h2>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => setOfferRefresh((count) => count + 1)}
                  disabled={offerLoading || loading === "offer" || requireWallet}
                >
                  Refresh
                </button>
              </div>
              <p className="muted">
                Change the price of one offer. Its remaining amount and offer ID stay the same.
              </p>
              {requireWallet ? (
                <p className="muted">Connect Freighter to view your offers.</p>
              ) : offerLoading ? (
                <p className="muted" role="status">Loading open offers…</p>
              ) : offerError ? (
                <p className="muted" role="alert">{offerError}</p>
              ) : openOffers.length === 0 ? (
                <p className="muted">No open offers on this network.</p>
              ) : (
                <ul className="balance-list">
                  {openOffers.map((offer) => (
                    <li key={offer.id} className="balance-row offer-row">
                      <strong>
                        {offer.selling.asset_code || "XLM"} → {offer.buying.asset_code || "XLM"}
                      </strong>
                      <span className="muted">Offer #{offer.id} · Remaining {offer.amount} {offer.selling.asset_code || "XLM"}</span>
                      <form className="form" onSubmit={(event) => handleOfferPriceChange(event, offer)}>
                        <label className="label" htmlFor={`offer-price-${offer.id}`}>
                          New price ({offer.buying.asset_code || "XLM"} per {offer.selling.asset_code || "XLM"})
                        </label>
                        <input
                          id={`offer-price-${offer.id}`}
                          className="input"
                          type="text"
                          inputMode="decimal"
                          required
                          value={offerPrices[offer.id] || ""}
                          onChange={(event) => setOfferPrices((previous) => ({ ...previous, [offer.id]: event.target.value }))}
                        />
                        <span className="muted">Current price: {offer.price} → New price: {offerPrices[offer.id] || "—"}</span>
                        <button className="btn btn--primary" type="submit" disabled={loading === "offer" || offerLoading}>
                          {loading === "offer" ? "Signing…" : "Sign price change"}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              {offerResult && (
                <div className="info-box" role="status">
                  <span className="eyebrow">Offer #{offerResult.id} price change submitted</span>
                  <p>Old price: {offerResult.oldPrice} → New price: {offerResult.newPrice}</p>
                  <a className="text-link" href={explorerTxUrl(offerResult.hash)} target="_blank" rel="noreferrer">
                    View transaction ↗
                  </a>
                </div>
              )}
              {txWatchPanel}
            </div>
          )}

          {activeTab === "Assets" && (
            <div className="section">
              <h2>Balances & trustlines</h2>
              <p className="muted">
                View holdings, open a trustline, remove an empty one, or revoke a sponsored
                trustline with Freighter <code>signTransaction</code>.
              </p>

              {assetBalances.length > 0 ? (
                <ul className="balance-list">
                  {assetBalances.map((b) => (
                    <li key={b.key} className="balance-row">
                      <div>
                        <strong>{b.code}</strong>
                        {!b.isNative && (
                          <span className="muted balance-row__issuer">
                            {shortenAddress(b.issuer)}
                          </span>
                        )}
                        {!b.isNative && (
                          <div className="muted balance-row__flags">
                            Authorization: {b.isAuthorized === true ? "Authorized" : b.isAuthorized === false ? "Unauthorized" : "Unknown"}
                            {" · "}Liabilities: {b.isAuthorizedToMaintainLiabilities === true ? "Authorized" : b.isAuthorizedToMaintainLiabilities === false ? "Unauthorized" : "Unknown"}
                            {" · "}Clawback: {b.clawbackEnabled === true ? "Enabled" : b.clawbackEnabled === false ? "Disabled" : "Unknown"}
                          </div>
                        )}
                      </div>
                      <div className="balance-row__actions">
                        <span>
                          Available{" "}
                          {parseFloat(b.available || b.balance).toLocaleString(undefined, {
                            maximumFractionDigits: 7,
                          })}
                        </span>
                        {!b.isNative && (
                          <>
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
                              {loading === `remove-${b.key}` ? "Removing…" : "Remove"}
                            </button>
                          </>
                        )}
                      </div>
                      {!b.isNative && (
                        <div className="balance-row__actions">
                          <span className="muted">
                            Limit:{" "}
                            {b.limit
                              ? parseFloat(b.limit).toLocaleString(undefined, {
                                  maximumFractionDigits: 7,
                                })
                              : "—"}
                          </span>
                          <input
                            className="input"
                            type="number"
                            placeholder="New limit"
                            value={limitChangeForm[b.key] || ""}
                            onChange={(e) =>
                              setLimitChangeForm({
                                ...limitChangeForm,
                                [b.key]: e.target.value,
                              })
                            }
                            disabled={loading === `limit-${b.key}`}
                          />
                          <button
                            className="btn btn--secondary btn--sm"
                            type="button"
                            onClick={() => handleChangeLimit(b)}
                            disabled={
                              loading === `limit-${b.key}` || !limitChangeForm[b.key]
                            }
                          >
                            {loading === `limit-${b.key}` ? "Changing…" : "Change limit"}
                          </button>
                        </div>
                      )}
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

              <div className="section">
                <h3 className="subhead">Trustlines you sponsor</h3>
                {sponsoredTrustlinesLoading ? (
                  <p className="muted">Loading sponsored trustlines…</p>
                ) : sponsoredTrustlinesError ? (
                  <p className="muted">{sponsoredTrustlinesError}</p>
                ) : sponsoredTrustlines.length === 0 ? (
                  <p className="muted">You are not sponsoring any trustlines.</p>
                ) : (
                  <ul className="balance-list">
                    {sponsoredTrustlines.map((asset) => (
                      <li key={asset.key} className="balance-row">
                        <div>
                          <strong>{asset.code}</strong>
                          <span className="muted balance-row__issuer">
                            {shortenAddress(asset.issuer)}
                          </span>
                          <span className="muted balance-row__issuer">
                            {asset.holder === publicKey
                              ? "Held by connected account"
                              : `Held by ${shortenAddress(asset.holder)}`}
                          </span>
                        </div>
                        <button
                          className="btn btn--secondary btn--sm"
                          type="button"
                          onClick={() => handleRevokeSponsorship(asset)}
                          disabled={loading === `revoke-${asset.key}`}
                        >
                          {loading === `revoke-${asset.key}`
                            ? "Revoking…"
                            : "Revoke sponsorship"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {poolShares.length > 0 && (
                <div className="section">
                  <h3 className="subhead">Liquidity pool shares</h3>
                  {poolShares.map((row) => (
                    <div key={row.poolId} className="info-box">
                      <span className="eyebrow">Pool {shortenAddress(row.poolId)}</span>
                      <div className="metadata-grid">
                        <div>
                          <span className="metadata-label">Your shares</span>
                          <span className="metadata-value">{row.shares}</span>
                        </div>
                        <div>
                          <span className="metadata-label">Total shares</span>
                          <span className="metadata-value">
                            {row.totalShares ?? "—"}
                          </span>
                        </div>
                        <div>
                          <span className="metadata-label">Your share</span>
                          <span className="metadata-value">
                            {row.percentage !== null ? `${row.percentage}%` : "—"}
                          </span>
                        </div>
                      </div>
                      {row.loading ? (
                        <p className="muted">Loading pool reserves…</p>
                      ) : row.reservesUnavailable ? (
                        <p className="muted">
                          Reserves unavailable — Horizon could not load this pool.
                        </p>
                      ) : (
                        <div className="metadata-grid">
                          {row.reserves.map((reserve) => (
                            <div key={reserve.label}>
                              <span className="metadata-label">{reserve.label}</span>
                              <span className="metadata-value">{reserve.balance}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="section">
                <h3 className="subhead">Claimable balances you created</h3>
                {claimableBalances.length > 0 ? (
                  <ul className="balance-list">
                    {claimableBalances.map((balance) => (
                      <li key={balance.id} className="balance-row">
                        <div>
                          <strong>{balance.amount} {balance.code}</strong>
                          <span className="muted balance-row__issuer">
                            {balance.issuer ? shortenAddress(balance.issuer) : "Native asset"}
                          </span>
                        </div>
                        {balance.clawbackEnabled && balance.issuer === publicKey && (
                          <button
                            className="btn btn--secondary btn--sm"
                            type="button"
                            onClick={() => handleClawback(balance)}
                            disabled={loading === `clawback-${balance.id}`}
                          >
                            {loading === `clawback-${balance.id}` ? "Clawing back…" : "Claw back"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No claimable balances created by this account.</p>
                )}
              </div>

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

              {txWatchPanel}
            </div>
          )}

          {activeTab === "Issuer" && (
            <div className="section">
              <div className="section__row">
                <h2>Issuer controls</h2>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={refreshIssuerPanel}
                  disabled={loading === "issuer" || requireWallet}
                >
                  {loading === "issuer" ? (
                    <>
                      <Spinner /> Loading…
                    </>
                  ) : (
                    "Refresh"
                  )}
                </button>
              </div>
              <p className="muted">
                Reads auth flags from Horizon and signs <code>setOptions</code> /{" "}
                <code>allowTrust</code> with Freighter.
              </p>

              {requireWallet ? (
                <p className="muted">Connect Freighter to manage an issuer.</p>
              ) : (
                <>
                  {issuerConfigError && (
                    <div className="info-box info-box--warning">
                      <span className="eyebrow">Account flags</span>
                      <p className="muted">{issuerConfigError}</p>
                    </div>
                  )}

                  {issuerConfig && (
                    <form className="form" onSubmit={handleSetIssuerOptions}>
                      <div className="info-box">
                        <span className="eyebrow">Current account flags</span>
                        <div className="metadata-grid">
                          <div>
                            <span className="metadata-label">Home domain</span>
                            <span className="metadata-value">
                              {issuerConfig.homeDomain || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Auth required</span>
                            <span className="metadata-value">
                              {String(issuerConfig.authRequired)}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Auth revocable</span>
                            <span className="metadata-value">
                              {String(issuerConfig.authRevocable)}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Auth immutable</span>
                            <span className="metadata-value">
                              {String(issuerConfig.authImmutable)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <label className="label" htmlFor="issuer-home-domain">
                        Home domain (32 bytes max)
                      </label>
                      <input
                        id="issuer-home-domain"
                        className="input"
                        type="text"
                        value={issuerForm.homeDomain}
                        onChange={(e) =>
                          setIssuerForm({
                            ...issuerForm,
                            homeDomain: e.target.value,
                          })
                        }
                        disabled={issuerConfig.authImmutable}
                      />

                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={issuerForm.authRequired}
                          onChange={(e) =>
                            setIssuerForm({
                              ...issuerForm,
                              authRequired: e.target.checked,
                            })
                          }
                          disabled={issuerConfig.authImmutable}
                        />
                        Auth required — holders need approval
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={issuerForm.authRevocable}
                          onChange={(e) =>
                            setIssuerForm({
                              ...issuerForm,
                              authRevocable: e.target.checked,
                            })
                          }
                          disabled={issuerConfig.authImmutable}
                        />
                        Auth revocable — the issuer can revoke holders
                      </label>

                      {!issuerConfig.authImmutable && (
                        <div className="info-box info-box--warning">
                          <span className="eyebrow">Irreversible</span>
                          <p className="muted">
                            Auth immutable can never be turned off. It is a
                            separate control from the two flags above.
                          </p>
                        </div>
                      )}
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={issuerConfig.authImmutable || issuerForm.authImmutable}
                          onChange={(e) =>
                            setIssuerForm({
                              ...issuerForm,
                              authImmutable: e.target.checked,
                              confirmation: "",
                            })
                          }
                          disabled={issuerConfig.authImmutable}
                        />
                        Auth immutable (one-way)
                      </label>

                      {issuerForm.authImmutable && !issuerConfig.authImmutable && (
                        <>
                          <label
                            className="label"
                            htmlFor="immutable-confirmation"
                          >
                            Type {IMMUTABLE_CONFIRMATION} to confirm
                          </label>
                          <input
                            id="immutable-confirmation"
                            className="input"
                            type="text"
                            value={issuerForm.confirmation}
                            onChange={(e) =>
                              setIssuerForm({
                                ...issuerForm,
                                confirmation: e.target.value,
                              })
                            }
                            placeholder={IMMUTABLE_CONFIRMATION}
                          />
                        </>
                      )}

                      <button
                        className="btn btn--primary"
                        type="submit"
                        disabled={
                          loading === "issuer-update" ||
                          issuerConfig.authImmutable ||
                          (issuerForm.authImmutable &&
                            issuerForm.confirmation !== IMMUTABLE_CONFIRMATION)
                        }
                      >
                        {loading === "issuer-update" ? (
                          <>
                            <Spinner /> Signing…
                          </>
                        ) : (
                          "Sign setOptions"
                        )}
                      </button>
                      {issuerConfig.authImmutable && (
                        <p className="muted">
                          Flags are locked on-chain — auth immutable is already
                          set.
                        </p>
                      )}
                    </form>
                  )}

                  <h3 className="subhead">Trustlines you issued</h3>
                  {issuedTrustlinesError && (
                    <div className="info-box info-box--warning">
                      <p className="muted">{issuedTrustlinesError}</p>
                    </div>
                  )}
                  {issuedTrustlines.length > 0 ? (
                    <ul className="balance-list">
                      {issuedTrustlines.map((entry) => (
                        <li key={entry.key} className="balance-row">
                          <div>
                            <strong>{entry.assetCode}</strong>
                            <span className="muted balance-row__issuer">
                              {shortenAddress(entry.holder)} · {entry.balance}
                            </span>
                          </div>
                          <div className="balance-row__actions">
                            <span className="muted">
                              {entry.isAuthorized === null
                                ? "status unknown"
                                : entry.isAuthorized
                                  ? "authorized"
                                  : "not authorized"}
                            </span>
                            <button
                              className="btn btn--secondary btn--sm"
                              type="button"
                              onClick={() => handleAllowTrust(entry, true)}
                              disabled={loading === `allow-${entry.key}`}
                            >
                              Authorize
                            </button>
                            <button
                              className="btn btn--secondary btn--sm"
                              type="button"
                              onClick={() => handleAllowTrust(entry, false)}
                              disabled={loading === `allow-${entry.key}`}
                            >
                              Revoke
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !issuedTrustlinesError && (
                      <p className="muted">
                        No accounts hold an asset issued by this address.
                      </p>
                    )
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "Send" && (
            <div className="section">
              <h2>Send payment</h2>
              <p className="muted">
                Builds a payment op for XLM or a credit asset you hold. Review the unsigned
                envelope XDR, then sign in Freighter to submit it to Horizon Testnet.
              </p>
              <form onSubmit={handleSend} className="form">
                <label className="label" htmlFor="send-destination">
                  Destination (G… or M…)
                </label>
                <input
                  id="send-destination"
                  className="input"
                  type="text"
                  placeholder="G… or M…"
                  value={sendForm.destination}
                  onChange={(e) => updateSendForm({ destination: e.target.value })}
                  required
                />
                {muxedSendBase && (
                  <p className="muted">
                    Muxed payment arrives at {shortenAddress(muxedSendBase)} (the
                    base account).
                  </p>
                )}
                <label className="label" htmlFor="send-asset">
                  Asset
                </label>
                <select
                  id="send-asset"
                  className="input"
                  value={sendForm.assetKey}
                  onChange={(e) => updateSendForm({ assetKey: e.target.value })}
                >
                  <option value="native">XLM (native)</option>
                  {balances
                    .filter((b) => !b.isNative && !b.isPoolShare)
                    .map((b) => (
                      <option key={b.key} value={b.key} disabled={b.isAuthorized === false}>
                        {b.code} ·{" "}
                        {parseFloat(b.balance).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                        {b.isAuthorized === false ? " · unauthorized (cannot send)" : ""}
                      </option>
                    ))}
                </select>
                {selectedSendAsset?.isAuthorized === false && (
                  <p className="muted" role="alert">
                    {selectedSendAsset.code} is unauthorized by its issuer, so it cannot be selected as a send asset.
                  </p>
                )}
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
                  onChange={(e) => updateSendForm({ amount: e.target.value })}
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
                    updateSendForm({ memoType: e.target.value, memo: "" })
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
                  onChange={(e) => updateSendForm({ memo: e.target.value })}
                />
                {unsignedEnvelope && (
                  <div className="info-box">
                    <span className="eyebrow">Unsigned envelope XDR</span>
                    <code style={{ wordBreak: "break-all" }}>
                      {unsignedEnvelope}
                    </code>
                    <p className="muted">
                      Copy this envelope to hand it to another signer or the decoder.
                      Copying does not sign or submit it.
                    </p>
                    <button
                      className="btn btn--secondary btn--sm"
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(unsignedEnvelope);
                        showToast(
                          "Unsigned envelope copied. Nothing was signed or submitted.",
                          "info"
                        );
                      }}
                    >
                      Copy XDR
                    </button>
                  </div>
                )}
                <div className="section__row">
                  <button
                    className="btn btn--secondary"
                    type="button"
                    onClick={handlePreviewEnvelope}
                    disabled={loading === "preview" || requireWallet}
                  >
                    {loading === "preview" ? (
                      <>
                        <Spinner /> Building…
                      </>
                    ) : (
                      "Build unsigned envelope"
                    )}
                  </button>
                  <button
                    className="btn btn--primary"
                    type="submit"
                    disabled={loading === "send" || loading === "preview" || requireWallet}
                  >
                    {loading === "send" ? (
                      <>
                        <Spinner /> Signing in Freighter…
                      </>
                    ) : (
                      "Sign & send"
                    )}
                  </button>
                </div>
              </form>

              {txWatchPanel}
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

              {txWatchPanel}
            </div>
          )}

          {activeTab === "Offer" && (
            <div className="section">
              <h2>Price an offer</h2>
              <p className="muted">
                Read the live order book before pricing an offer. Selecting a row only fills the
                price; nothing is signed or submitted.
              </p>
              <form onSubmit={handleOrderBook} className="form">
                <label className="label" htmlFor="offer-selling-type">Selling asset</label>
                <select id="offer-selling-type" className="input" value={offerForm.sellingType}
                  onChange={(e) => updateOfferForm({ sellingType: e.target.value })}>
                  <option value="native">XLM (native)</option>
                  <option value="credit">Credit asset</option>
                </select>
                {offerForm.sellingType === "credit" && <>
                  <input className="input" placeholder="Selling asset code, e.g. USDC" maxLength={12}
                    value={offerForm.sellingCode} onChange={(e) => updateOfferForm({ sellingCode: e.target.value })} required />
                  <input className="input" placeholder="Selling asset issuer G…"
                    value={offerForm.sellingIssuer} onChange={(e) => updateOfferForm({ sellingIssuer: e.target.value })} required />
                </>}
                <label className="label" htmlFor="offer-buying-type">Buying asset</label>
                <select id="offer-buying-type" className="input" value={offerForm.buyingType}
                  onChange={(e) => updateOfferForm({ buyingType: e.target.value })}>
                  <option value="native">XLM (native)</option>
                  <option value="credit">Credit asset</option>
                </select>
                {offerForm.buyingType === "credit" && <>
                  <input className="input" placeholder="Buying asset code, e.g. USDC" maxLength={12}
                    value={offerForm.buyingCode} onChange={(e) => updateOfferForm({ buyingCode: e.target.value })} required />
                  <input className="input" placeholder="Buying asset issuer G…"
                    value={offerForm.buyingIssuer} onChange={(e) => updateOfferForm({ buyingIssuer: e.target.value })} required />
                </>}
                <label className="label" htmlFor="offer-price">Offer price (buying per selling)</label>
                <input id="offer-price" className="input" type="number" min="0" step="any"
                  value={offerForm.price} onChange={(e) => updateOfferForm({ price: e.target.value })}
                  placeholder="Choose a bid or ask below" />
                <button className="btn btn--primary" type="submit" disabled={loading === "order-book"}>
                  {loading === "order-book" ? <><Spinner /> Loading book…</> : "Load order book"}
                </button>
              </form>
              {orderBookError && <div className="info-box info-box--warning" role="alert">
                <span className="eyebrow">Order book</span><p className="muted">{orderBookError}</p>
              </div>}
              {orderBook && <div className="order-book" aria-label="Order book">
                {[['Bids', orderBook.bids], ['Asks', orderBook.asks]].map(([label, rows]) => (
                  <div key={label} className="order-book__side">
                    <h3 className="subhead">{label}</h3>
                    {rows.length === 0 ? <p className="muted">No {label.toLowerCase()} available.</p> : (
                      <div className="order-book__rows">
                        {rows.map((row, index) => <button key={`${label}-${index}`} type="button"
                          className="order-book__row" onClick={() => selectBookPrice(row)}>
                          <span>{row.price}</span><span>{row.amount}</span>
                        </button>)}
                      </div>
                    )}
                  </div>
                ))}
                <div className="order-book__header"><span>Price</span><span>Amount</span></div>
              </div>}
            </div>
          )}
          {activeTab === "Book" && (
            <div className="section">
              <div className="section__row">
                <h2>Order book</h2>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => {
                    bookClearGenerationRef.current += 1;
                    clearStoredOrderBookPair();
                    setBookPair({ selling: "", buying: "" });
                  }}
                >
                  Clear pair
                </button>
              </div>
              <p className="muted">Enter XLM or CODE:ISSUER for each asset.</p>
              <div className="form">
                <label className="label" htmlFor="book-selling">Selling asset</label>
                <input
                  id="book-selling"
                  className="input"
                  type="text"
                  placeholder="XLM"
                  value={bookPair.selling}
                  onChange={(event) => setBookPair((pair) => ({ ...pair, selling: event.target.value }))}
                />
                <label className="label" htmlFor="book-buying">Buying asset</label>
                <input
                  id="book-buying"
                  className="input"
                  type="text"
                  placeholder="USDC:G…"
                  value={bookPair.buying}
                  onChange={(event) => setBookPair((pair) => ({ ...pair, buying: event.target.value }))}
                />
              </div>
              {!parsedBookPair && (
                <p className="muted">Choose two different valid assets to load the book.</p>
              )}
              {parsedBookPair && !currentBookResult && (
                <p className="muted" role="status">Loading order book…</p>
              )}
              {currentBookResult?.error && (
                <p className="muted" role="alert">{currentBookResult.error}</p>
              )}
              {currentBookResult?.data && (
                <div className="info-box">
                  <strong>Asks</strong>
                  {currentBookResult.data.asks?.length ? currentBookResult.data.asks.slice(0, 10).map((offer, index) => (
                    <span key={index}>Price {offer.price} · Amount {offer.amount}</span>
                  )) : <span className="muted">No asks</span>}
                  <strong>Bids</strong>
                  {currentBookResult.data.bids?.length ? currentBookResult.data.bids.slice(0, 10).map((offer, index) => (
                    <span key={index}>Price {offer.price} · Amount {offer.amount}</span>
                  )) : <span className="muted">No bids</span>}
                </div>
              )}
            </div>
          )}

          {activeTab === "Inspect" && (
            <div className="section">
              <div className="section__row">
                <h2>Inspect transaction</h2>
              </div>
              <p className="muted">
                Paste a base64 transaction envelope to read it before signing. It is
                decoded locally on {activeNetwork.label}; nothing is submitted.
              </p>
              <form className="form" onSubmit={handleInspect}>
                <label className="label" htmlFor="inspect-xdr">
                  Transaction envelope (base64 XDR)
                </label>
                <textarea
                  id="inspect-xdr"
                  className="input"
                  rows={5}
                  spellCheck={false}
                  placeholder="AAAAAgAAAAA..."
                  value={inspectForm.xdr}
                  onChange={(e) =>
                    setInspectForm({ ...inspectForm, xdr: e.target.value })
                  }
                />
                <button className="btn btn--primary" type="submit">
                  Decode
                </button>
              </form>
              {inspectError && (
                <div className="info-box info-box--warning" role="alert">
                  <span className="eyebrow">Could not decode</span>
                  <p className="muted">{inspectError}</p>
                </div>
              )}
              {inspectResult && <DecodedEnvelope decoded={inspectResult} />}
              {!inspectResult && !inspectError && (
                <p className="muted">
                  The source, fee, sequence, memo, time bounds, and one block per
                  operation will appear here.
                </p>
              )}
              <TransactionHashLookup key={networkId} />
            </div>
          )}

          {activeTab === "Muxed" && (
            <div className="section">
              <h2>Muxed accounts</h2>
              <p className="muted">
                An M… address combines a G… base account with an unsigned 64-bit
                id. A payment to the M… address still credits the base account.
              </p>

              {muxedError && (
                <div className="info-box info-box--warning" role="alert">
                  <span className="eyebrow">Muxed address</span>
                  <p className="muted">{muxedError}</p>
                </div>
              )}

              <form className="form" onSubmit={handleBuildMuxed}>
                <div className="subhead">Build an M address</div>
                <label className="label" htmlFor="muxed-base-address">
                  Base account (G…)
                </label>
                <input
                  id="muxed-base-address"
                  className="input"
                  type="text"
                  placeholder="G…"
                  value={muxedBuildForm.gAddress}
                  onChange={(e) =>
                    setMuxedBuildForm({
                      ...muxedBuildForm,
                      gAddress: e.target.value,
                    })
                  }
                />
                <label className="label" htmlFor="muxed-id">
                  Id (unsigned 64-bit)
                </label>
                <input
                  id="muxed-id"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={muxedBuildForm.id}
                  onChange={(e) =>
                    setMuxedBuildForm({
                      ...muxedBuildForm,
                      id: e.target.value,
                    })
                  }
                />
                <button className="btn btn--secondary" type="submit">
                  Build M address
                </button>
              </form>

              {muxedBuildResult && (
                <div className="info-box">
                  <span className="eyebrow">Muxed address</span>
                  <code>{muxedBuildResult}</code>
                </div>
              )}

              <form className="form" onSubmit={handleSplitMuxed}>
                <div className="subhead">Split an M address</div>
                <label className="label" htmlFor="muxed-address">
                  Muxed address (M…)
                </label>
                <input
                  id="muxed-address"
                  className="input"
                  type="text"
                  placeholder="M…"
                  value={muxedSplitForm.mAddress}
                  onChange={(e) =>
                    setMuxedSplitForm({ mAddress: e.target.value })
                  }
                />
                <button className="btn btn--secondary" type="submit">
                  Split M address
                </button>
              </form>

              {muxedSplitResult && (
                <div className="info-box">
                  <span className="eyebrow">Base account and id</span>
                  <div className="metadata-grid">
                    <div>
                      <span className="metadata-label">Base account</span>
                      <span className="metadata-value">
                        {muxedSplitResult.gAddress}
                      </span>
                    </div>
                    <div>
                      <span className="metadata-label">Id</span>
                      <span className="metadata-value">
                        {muxedSplitResult.id}
                      </span>
                    </div>
                  </div>
                  <p className="muted" style={{ marginTop: 6 }}>
                    Payments to this M address arrive at the base account above.
                  </p>
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
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={handleSimulateRegister}
                      disabled={loading === "simulate" || requireWallet}
                    >
                      {loading === "simulate" ? (
                        <>
                          <Spinner /> Simulating…
                        </>
                      ) : (
                        "Simulate fees"
                      )}
                    </button>
                    {!publicKey && <p className="muted">Connect Freighter to sign.</p>}
                  </form>
                  {simulationFees && (
                    <div className="info-box">
                      <span className="eyebrow">Simulated fees (stroops)</span>
                      {simulationFees.error ? (
                        <p className="muted">
                          Simulation failed: fees are unavailable.
                        </p>
                      ) : (
                        <div className="metadata-grid">
                          <div>
                            <span className="metadata-label">Inclusion fee</span>
                            <span className="metadata-value">
                              {formatSimulationFee(simulationFees.inclusionFee)}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Resource fee</span>
                            <span className="metadata-value">
                              {formatSimulationFee(simulationFees.resourceFee)}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Total fee</span>
                            <span className="metadata-value">
                              {formatSimulationFee(simulationFees.totalFee)}
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="muted">
                        Simulation does not submit. Press Sign &amp; register to sign
                        with these fees.
                      </p>
                    </div>
                  )}
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

                  <div className="section__row">
                    <div className="subhead">Contract instance TTL</div>
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={() => refreshTtlInfo()}
                      disabled={loading === "ttl" || !configuredContractId}
                    >
                      {loading === "ttl" ? (
                        <>
                          <Spinner /> Reading…
                        </>
                      ) : (
                        "Refresh"
                      )}
                    </button>
                  </div>
                  {!configuredContractId && (
                    <p className="muted">
                      No contract id configured — set one in the backend to read
                      or extend its TTL.
                    </p>
                  )}
                  {ttlError && (
                    <div className="info-box info-box--warning">
                      <span className="eyebrow">Soroban RPC</span>
                      <p className="muted">{ttlError}</p>
                    </div>
                  )}
                  {ttlInfo && (
                    <div className="info-box">
                      <span className="eyebrow">Instance lifetime</span>
                      <div className="metadata-grid">
                        <div>
                          <span className="metadata-label">Latest ledger</span>
                          <span className="metadata-value">
                            {ttlInfo.latestLedger}
                          </span>
                        </div>
                        <div>
                          <span className="metadata-label">Expires at ledger</span>
                          <span className="metadata-value">
                            {ttlInfo.liveUntilLedgerSeq ?? "—"}
                          </span>
                        </div>
                        <div>
                          <span className="metadata-label">
                            Ledgers remaining
                          </span>
                          <span className="metadata-value">
                            {ttlInfo.ledgersRemaining}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <form className="form" onSubmit={handleExtendTtl}>
                    <label className="label" htmlFor="ttl-deadline">
                      Extend to ledger
                    </label>
                    <input
                      id="ttl-deadline"
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={ttlForm.extendTo}
                      onChange={(e) =>
                        setTtlForm({ extendTo: e.target.value })
                      }
                      disabled={!ttlInfo}
                    />
                    <p className="muted">
                      Must be later than the current deadline. This sends only
                      an <code>extendFootprintTtl</code> op — never register,
                      pause, or unregister.
                    </p>
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={
                        loading === "ttl-extend" ||
                        requireWallet ||
                        !configuredContractId ||
                        !ttlInfo ||
                        !ttlForm.extendTo
                      }
                    >
                      {loading === "ttl-extend" ? (
                        <>
                          <Spinner /> Signing in Freighter…
                        </>
                      ) : (
                        "Extend TTL"
                      )}
                    </button>
                  </form>
                  {ttlResult && (
                    <div className="info-box">
                      <span className="eyebrow">New deadline</span>
                      <code>
                        Ledger {ttlResult.liveUntilLedgerSeq} ·{" "}
                        {ttlResult.hash}
                      </code>
                    </div>
                  )}

                  <div className="section__row">
                    <div className="subhead">Contract code TTL</div>
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={refreshCodeTtl}
                      disabled={loading === "code-ttl" || !configuredContractId}
                    >
                      {loading === "code-ttl" ? "Reading…" : "Refresh code TTL"}
                    </button>
                  </div>
                  <p className="muted">
                    Extends the Wasm code entry on its own. The instance TTL above is left unchanged.
                  </p>
                  {codeTtlError && (
                    <div className="info-box info-box--warning">
                      <p className="muted">{codeTtlError}</p>
                    </div>
                  )}
                  {codeTtl && (
                    <div className="info-box">
                      <span className="eyebrow">Code lifetime</span>
                      <div className="metadata-grid">
                        <div>
                          <span className="metadata-label">Current ledger</span>
                          <span className="metadata-value">{codeTtl.currentLedger}</span>
                        </div>
                        <div>
                          <span className="metadata-label">Code TTL</span>
                          <span className="metadata-value">
                            {codeTtl.codeTTL ? `Ledger ${codeTtl.codeTTL}` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="metadata-label">Wasm hash</span>
                          <span className="metadata-value">
                            {codeTtl.wasmHash ? `${codeTtl.wasmHash.slice(0, 16)}…` : "—"}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn btn--secondary btn--sm"
                        type="button"
                        onClick={handleExtendCodeTtl}
                        disabled={
                          loading === "extend-code" ||
                          !publicKey ||
                          !codeTtl.wasmHash
                        }
                      >
                        {loading === "extend-code" ? "Extending…" : "Extend code TTL"}
                      </button>
                    </div>
                  )}

                  <div className="section__row">
                    <div className="subhead">Contract event tail</div>
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={() => pollLabEvents(configuredContractId)}
                      disabled={!configuredContractId}
                    >
                      Refresh
                    </button>
                  </div>
                  {!configuredContractId && (
                    <p className="muted">
                      No contract id configured — no events to show.
                    </p>
                  )}
                  {labEventsError && (
                    <div className="info-box info-box--warning">
                      <p className="muted">{labEventsError}</p>
                    </div>
                  )}
                  {labEvents.length > 0 ? (
                    <ul className="balance-list">
                      {labEvents.map((event) => (
                        <li key={event.id} className="balance-row">
                          <div>
                            <strong>{event.functionName ?? "unknown"}</strong>
                            <span className="muted balance-row__issuer">
                              ledger {event.ledger}
                            </span>
                          </div>
                          <div className="muted contract-event-detail">
                            {event.type === "register"
                              ? `${event.name ?? "—"} · ${event.caller} · ${
                                  event.isNew ? "new builder" : "existing"
                                }`
                              : event.type === "paused"
                                ? `paused = ${String(event.paused)}`
                                : `topics: ${event.topics.join(" · ")}`}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !labEventsError && (
                      <p className="muted">
                        No contract events since this tab opened.
                      </p>
                    )
                  )}
                </>
              )}
              {!labInfo && !labError && (
                <p className="muted">Open this tab to probe the backend.</p>
              )}
              <div className="info-box">
                <span className="eyebrow">Failed submits</span>
                <p className="muted">
                  {failedSubmits.length === 0
                    ? "No failed submits this session yet."
                    : `${failedSubmits.length} failed submission${
                        failedSubmits.length === 1 ? "" : "s"
                      } this session. Cleared on disconnect or reload — not stored in localStorage.`}
                </p>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={handleDownloadFailedSubmits}
                  disabled={failedSubmits.length === 0}
                >
                  Download failed JSON
                </button>
              </div>

              {txWatchPanel}
            </div>
          )}

          {activeTab === "Issue" && (
            <div className="section">
              <div className="section__row">
                <h2>Issue Credit Asset</h2>
                <p className="muted">
                  Send a new credit asset from your issuer account to a holder.
                </p>
              </div>
              {publicKey ? (
                <form className="form" onSubmit={handleIssue}>
                  <label className="label" htmlFor="issue-asset-code">
                    Asset code
                  </label>
                  <input
                    id="issue-asset-code"
                    className="input"
                    value={issueForm.code}
                    onChange={(e) =>
                      setIssueForm({ ...issueForm, code: e.target.value })
                    }
                    placeholder="e.g. MYASSET"
                    maxLength={12}
                    required
                  />
                  <label className="label" htmlFor="issue-destination">
                    Holder account
                  </label>
                  <input
                    id="issue-destination"
                    className="input"
                    type="text"
                    placeholder="G…"
                    value={issueForm.destination}
                    onChange={(e) =>
                      setIssueForm({ ...issueForm, destination: e.target.value })
                    }
                    required
                  />
                  <label className="label" htmlFor="issue-amount">
                    Amount to issue
                  </label>
                  <input
                    id="issue-amount"
                    className="input"
                    type="number"
                    min="0.0000001"
                    step="0.0000001"
                    placeholder="e.g. 1000000"
                    value={issueForm.amount}
                    onChange={(e) =>
                      setIssueForm({ ...issueForm, amount: e.target.value })
                    }
                    required
                  />
                  <p className="muted">
                    The holder must already have a trustline for this asset.
                    Connected issuer: <code>{publicKey}</code>
                  </p>
                  <button className="btn btn--primary" type="submit">
                    {loading === "issue" ? "Issuing…" : "Issue to holder"}
                  </button>
                </form>
              ) : (
                <p className="muted">Connect Freighter to issue an asset.</p>
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
              <p className="muted" aria-live="polite">
                {streamStatusLabel(streamState)}
              </p>
              {visibleTransactions.length > 0 ? (
                <div className="tx-list">
                  {visibleTransactions.map((tx) => {
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

              {txWatchPanel}
            </div>
          )}

          {activeTab === "Issuer" && (
            <div className="section">
              <h2>Issuer stellar.toml</h2>
              <p className="muted">
                An issuer account is looked up for the home domain it publishes, then that
                domain&apos;s stellar.toml is read over HTTPS only. A file that does not parse
                shows the failure and no rows.
              </p>

              <form className="form" onSubmit={handleIssuerLookup}>
                <label className="label" htmlFor="issuer-account-or-domain">
                  Issuer account or home domain
                </label>
                <input
                  id="issuer-account-or-domain"
                  className="input"
                  type="text"
                  placeholder="G… or example.org"
                  value={issuerInput}
                  onChange={(e) => setIssuerInput(e.target.value)}
                  required
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={loading === "issuer"}
                >
                  {loading === "issuer" ? (
                    <>
                      <Spinner /> Reading…
                    </>
                  ) : (
                    "Read stellar.toml"
                  )}
                </button>
              </form>

              {issuerError && (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">stellar.toml</span>
                  <p className="muted">{issuerError}</p>
                </div>
              )}

              {issuerResult && (
                <>
                  <div className="info-box">
                    <span className="eyebrow">
                      Published by {issuerResult.homeDomain}
                    </span>
                    <p className="muted">
                      Organisation: {issuerResult.orgName ?? "not published"}
                    </p>
                    {issuerResult.account && (
                      <a
                        className="text-link"
                        href={explorerAccountUrl(issuerResult.account)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Issuer account on explorer ↗
                      </a>
                    )}
                  </div>

                  <div className="subhead">DOCUMENTATION</div>
                  {Object.keys(issuerResult.documentation ?? {}).length > 0 ? (
                    <div className="metadata-grid">
                      {Object.entries(issuerResult.documentation).map(([key, value]) => (
                        <div key={key}>
                          <span className="metadata-label">{key}</span>
                          <span className="metadata-value">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No DOCUMENTATION table is published.</p>
                  )}

                  <div className="subhead">Currencies</div>
                  {issuerResult.rows.length > 0 ? (
                    <ul className="balance-list">
                      {issuerResult.rows.map((row, index) => (
                        <li
                          key={`${row.code ?? "unspecified"}-${index}`}
                          className="balance-row"
                        >
                          <div>
                            <strong>{row.code ?? "code not published"}</strong>
                            {row.issuer && (
                              <span className="muted balance-row__issuer">
                                {shortenAddress(row.issuer)}
                              </span>
                            )}
                          </div>
                          <div className="balance-row__actions">
                            <span>
                              display decimals {row.displayDecimals ?? "not published"}
                            </span>
                            {row.issuer && (
                              <a
                                className="text-link"
                                href={explorerAccountUrl(row.issuer)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Explorer ↗
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No CURRENCIES rows are published.</p>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "Web auth" && (
            <div className="section">
              <h2>Web authentication</h2>
              <p className="muted">
                Ask an anchor for a sign-in challenge, check it, sign it in Freighter, and show
                what the returned session says. The session lives in this panel only — it is
                never stored.
              </p>

              <form className="form" onSubmit={handleWebAuth}>
                <label className="label" htmlFor="webauth-endpoint">
                  Web-auth endpoint
                </label>
                <input
                  id="webauth-endpoint"
                  className="input"
                  type="text"
                  placeholder="https://auth.example.org/auth"
                  value={webAuthForm.endpoint}
                  onChange={(e) =>
                    setWebAuthForm({ ...webAuthForm, endpoint: e.target.value })
                  }
                  required
                />
                <label className="label" htmlFor="webauth-server-account">
                  Endpoint&apos;s server account
                </label>
                <input
                  id="webauth-server-account"
                  className="input"
                  type="text"
                  placeholder="G…"
                  value={webAuthForm.serverAccount}
                  onChange={(e) =>
                    setWebAuthForm({ ...webAuthForm, serverAccount: e.target.value })
                  }
                  required
                />
                <p className="muted">
                  A challenge whose source account is not this one is refused before anything is
                  signed, and so is one that has already expired.
                </p>
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={loading === "webauth" || requireWallet}
                >
                  {loading === "webauth" ? (
                    <>
                      <Spinner /> Signing in Freighter…
                    </>
                  ) : (
                    "Request & sign challenge"
                  )}
                </button>
                {requireWallet && <p className="muted">Connect Freighter to sign.</p>}
              </form>

              {webAuthError && (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">Web authentication</span>
                  <p className="muted">{webAuthError}</p>
                </div>
              )}

              {webAuthResult && (
                <div className="info-box" role="status" aria-live="polite">
                  <span className="eyebrow">Signed challenge</span>
                  <div className="metadata-grid">
                    <div>
                      <span className="metadata-label">Server</span>
                      <span className="metadata-value">
                        {shortenAddress(webAuthResult.serverAccount)}
                      </span>
                    </div>
                    <div>
                      <span className="metadata-label">Operation</span>
                      <span className="metadata-value">
                        {webAuthResult.operationName} · {webAuthResult.operationCount}
                      </span>
                    </div>
                    <div>
                      <span className="metadata-label">Valid until</span>
                      <span className="metadata-value">
                        {formatCreatedAt(webAuthResult.expiresAtMs) ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="metadata-label">Session subject</span>
                      <span className="metadata-value">
                        {shortenAddress(webAuthResult.session.subject)}
                      </span>
                    </div>
                    <div>
                      <span className="metadata-label">Session expires</span>
                      <span className="metadata-value">
                        {formatCreatedAt(webAuthResult.session.expiresAtMs) ?? "—"}
                      </span>
                    </div>
                  </div>
                  <p className="muted">
                    {webAuthResult.session.expired
                      ? "The session token has already expired."
                      : "The session token is current."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Decode" && (
            <div className="section">
              <h2>Decode envelope</h2>
              <p className="muted">
                Paste a signed or unsigned transaction envelope XDR. A Soroban invoke
                names its contract, function, and arguments; classic envelopes keep the
                fee, sequence, and signatures only.
              </p>
              <form onSubmit={handleDecodeEnvelope} className="form">
                <label className="label" htmlFor="envelope-xdr">
                  Envelope XDR
                </label>
                <textarea
                  id="envelope-xdr"
                  className="input"
                  rows={5}
                  placeholder="AAAAAgAAAA..."
                  value={envelopeXdr}
                  onChange={(e) => setEnvelopeXdr(e.target.value)}
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={!envelopeXdr.trim()}
                >
                  Decode
                </button>
              </form>

              {decodeError && (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">Decode failed</span>
                  <p className="muted">{decodeError}</p>
                </div>
              )}

              {decodedEnvelope && (
                <div className="section">
                  <div className="info-box">
                    <span className="eyebrow">Envelope</span>
                    <div className="metadata-grid">
                      <div>
                        <span className="metadata-label">Kind</span>
                        <span className="metadata-value">
                          {decodedEnvelope.kind === "feeBump" ? "Fee bump" : "Transaction"}
                        </span>
                      </div>
                      <div>
                        <span className="metadata-label">Fee</span>
                        <span className="metadata-value">
                          {decodedEnvelope.fee} stroops
                        </span>
                      </div>
                      {decodedEnvelope.innerFee !== null && (
                        <div>
                          <span className="metadata-label">Inner fee</span>
                          <span className="metadata-value">
                            {decodedEnvelope.innerFee} stroops
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="metadata-label">Sequence</span>
                        <span className="metadata-value">{decodedEnvelope.sequence}</span>
                      </div>
                      <div>
                        <span className="metadata-label">Source</span>
                        <span className="metadata-value">
                          {shortenAddress(decodedEnvelope.source)}
                        </span>
                      </div>
                      <div>
                        <span className="metadata-label">Signatures</span>
                        <span className="metadata-value">
                          {decodedEnvelope.signatures.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {decodedEnvelope.operations.map((operation, index) => (
                    <div key={`${operation.type}-${index}`} className="info-box">
                      <span className="eyebrow">
                        Operation {index + 1} · {operation.type}
                      </span>
                      {operation.contract && (
                        <div className="metadata-grid">
                          <div>
                            <span className="metadata-label">Contract</span>
                            <span className="metadata-value">
                              {operation.contract.address ?? "No contract address"}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Function</span>
                            <span className="metadata-value">
                              {operation.contract.function ?? "—"}
                            </span>
                          </div>
                          {operation.contract.args.length > 0 && (
                            <div>
                              <span className="metadata-label">Arguments</span>
                              <ul className="balance-list">
                                {operation.contract.args.map((argument, argIndex) => (
                                  <li
                                    key={`${argument.type}-${argIndex}`}
                                    className="metadata-value"
                                  >
                                    <code>{argument.type}</code>{" · "}
                                    {formatArgumentValue(argument)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {operation.type === "payment" && (
                        <div className="metadata-grid">
                          <div>
                            <span className="metadata-label">Destination</span>
                            <span className="metadata-value">
                              {shortenAddress(operation.destination)}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Asset</span>
                            <span className="metadata-value">
                              {operation.asset ?? "—"}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Amount</span>
                            <span className="metadata-value">{operation.amount}</span>
                          </div>
                        </div>
                      )}
                      {operation.type === "changeTrust" && (
                        <div className="metadata-grid">
                          <div>
                            <span className="metadata-label">Asset</span>
                            <span className="metadata-value">
                              {operation.asset ?? "—"}
                            </span>
                          </div>
                          <div>
                            <span className="metadata-label">Limit</span>
                            <span className="metadata-value">{operation.limit}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "Pending" && (
            <div className="section">
              <div className="section__row">
                <h2>Pending transactions</h2>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={refreshPending}
                  disabled={requireWallet}
                >
                  Refresh
                </button>
              </div>
              <p className="muted">
                Transactions Horizon has accepted but not applied yet for this
                account. The list refreshes while this panel is open.
              </p>
              {requireWallet ? (
                <p className="muted">Connect a wallet to load the pending queue.</p>
              ) : pendingError ? (
                <div className="info-box info-box--warning">
                  <span className="eyebrow">Pending queue</span>
                  <p className="muted">{pendingError}</p>
                </div>
              ) : pendingTransactions.length > 0 ? (
                <div className="tx-list">
                  {pendingTransactions.map((tx) => (
                    <div key={tx.hash} className="tx-item tx-item--out">
                      <div className="tx-item__direction">Pending</div>
                      <div className="tx-item__amount">
                        <code>{tx.hash}</code>
                      </div>
                      <div className="tx-item__addr muted">
                        Fee {tx.fee || "—"} · Seq {tx.sequence || "—"}
                      </div>
                      <a
                        href={statusWatchHref(tx.hash)}
                        className="tx-item__link"
                      >
                        Watch status ↗
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No pending transactions.</p>
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

function DecodedEnvelope({ decoded }) {
  const networkLabel = decoded.network?.label || decoded.network?.passphrase;
  const transaction = decoded.isFeeBump ? decoded.inner : decoded;

  return (
    <div className="inspect-result">
      <div className="info-box">
        <span className="eyebrow">Decoded on</span>
        <code>{networkLabel || "Selected network"}</code>
      </div>
      {decoded.isFeeBump && (
        <div className="info-box">
          <span className="eyebrow">Fee-bump · fee source</span>
          <code>{decoded.feeSource}</code>
          <p className="muted" style={{ marginTop: 6 }}>
            Outer fee: {decoded.fee} stroops
          </p>
        </div>
      )}
      <div className="subhead">
        {decoded.isFeeBump ? "Inner transaction" : "Transaction"}
      </div>
      <TransactionDetails transaction={transaction} />
    </div>
  );
}

function TransactionDetails({ transaction }) {
  const memo = transaction.memo
    ? `${transaction.memo.type}: ${transaction.memo.value}`
    : "None";
  const timeBounds = transaction.timeBounds
    ? `${transaction.timeBounds.minTime} – ${transaction.timeBounds.maxTime}`
    : "None";

  return (
    <>
      <div className="info-box">
        <div className="metadata-grid">
          <div>
            <span className="metadata-label">Source</span>
            <span className="metadata-value">{transaction.source}</span>
          </div>
          <div>
            <span className="metadata-label">Fee</span>
            <span className="metadata-value">{transaction.fee} stroops</span>
          </div>
          <div>
            <span className="metadata-label">Sequence</span>
            <span className="metadata-value">{transaction.sequence}</span>
          </div>
          <div>
            <span className="metadata-label">Memo</span>
            <span className="metadata-value">{memo}</span>
          </div>
          <div>
            <span className="metadata-label">Time bounds</span>
            <span className="metadata-value">{timeBounds}</span>
          </div>
        </div>
      </div>
      {transaction.operations.map((operation) => (
        <div className="info-box" key={operation.index}>
          <span className="eyebrow">
            Operation {operation.index + 1} · {operation.type}
          </span>
          <div className="metadata-grid">
            {operation.fields.map((field) => (
              <div key={field.key}>
                <span className="metadata-label">{field.label}</span>
                <span className="metadata-value">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function tabSlug(tab) {
  return tab.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Issue #512: a payment the stream already prepended stays at the top when a
 * manual refresh re-reads it, so the paged rows drop any id the stream showed.
 */
function mergeStreamedPayments(streamed, paged) {
  const streamedIds = new Set(streamed.map((tx) => tx.id));
  return [...streamed, ...paged.filter((tx) => !streamedIds.has(tx.id))];
}

const STREAM_CLOSED_LINES = {
  disconnect: "Payments stream closed: the wallet was disconnected.",
  "network-change": "Payments stream closed: the network changed.",
  "tab-hidden": "Payments stream closed: this tab was left.",
};

/** Issue #512: what the history tab says about its own stream. */
function streamStatusLabel(state) {
  if (!state) return "New payments appear at the top of this list as they arrive.";
  if (state.failure) return state.failure;
  if (state.status === "open") return "Streaming new payments into the top of the list.";
  if (state.status === "closed") {
    return STREAM_CLOSED_LINES[state.reason] ?? "Payments stream closed.";
  }
  return "Payments stream not running.";
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
