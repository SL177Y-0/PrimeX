/**
 * Merkle Trade Type Definitions
 * 
 * Based on official Merkle Trade SDK and API documentation
 * All monetary values in micro units (USDC: 6 decimals, Prices: pair-specific decimals)
 * Pair IDs use underscore format (e.g., "APT_USD")
 */

export type PairId = string; // e.g., "APT_USD", "BTC_USD"
export type Address = `0x${string}`;
export type OrderSide = "LONG" | "SHORT";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "PLACED" | "FILLED" | "CANCELLED" | "EXPIRED" | "REJECTED";
export type PositionStatus = "OPEN" | "CLOSING" | "CLOSED" | "LIQUIDATED";

/**
 * Raw Position from Merkle Trade Indexer API
 * All numeric values are strings in micro units
 */
export interface RawPosition {
  positionId: string;
  address: Address;
  pairId: PairId;
  side: OrderSide;
  size: string; // micro USDC (position size in quote units)
  collateral: string; // micro USDC
  entryPrice: string; // micro price
  markPrice: string; // micro price (from backend snapshot)
  leverage?: string; // may be computed client-side
  liquidationPrice?: string; // micro price
  fundingFeeAccrued?: string; // micro USDC
  pnl?: string; // micro USDC, snapshot
  pnlPercent?: string; // percentage
  takeProfitPrice?: string; // micro price, 0 if not set
  stopLossPrice?: string; // micro price, 0 if not set
  createdAt: number; // ms epoch
  updatedAt: number; // ms epoch
  status: PositionStatus;
}

/**
 * Raw Order from Merkle Trade Indexer API
 */
export interface RawOrder {
  orderId: string;
  address: Address;
  pairId: PairId;
  side: OrderSide;
  type: OrderType;
  price?: string; // micro price for LIMIT orders
  sizeDelta: string; // micro USDC change
  collateralDelta: string; // micro USDC change
  isIncrease: boolean;
  status: OrderStatus;
  placedAt: number; // ms epoch
  filledAt?: number;
  cancelledAt?: number;
  txHash?: string;
}

/**
 * Trading History Action Types
 */
export type HistoryAction =
  | "OPEN"
  | "INCREASE"
  | "DECREASE"
  | "CLOSE"
  | "ORDER_PLACED"
  | "ORDER_FILLED"
  | "ORDER_CANCELLED"
  | "LIQUIDATED";

/**
 * Raw Trading History Entry
 */
export interface RawTradeHistory {
  id: string;
  address: Address;
  action: HistoryAction;
  pairId: PairId;
  side?: OrderSide;
  price?: string; // micro price
  size?: string; // micro USDC
  fee?: string; // micro USDC
  pnl?: string; // micro USDC (on close/decrease)
  txHash?: string;
  timestamp: number; // ms epoch
}

/**
 * Pair Information (static metadata)
 */
export interface RawPairInfo {
  pairId: PairId;
  symbol: string; // e.g., "APT/USDC"
  maxLeverage: number;
  minLeverage: number;
  minNotional: string; // micro USDC
  tickSize: string; // micro price tick
  lotSize: string; // micro USDC step
  category: "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX" | "STOCK";
  makerFee: string; // basis points
  takerFee: string; // basis points
  decimals: number; // price decimals
}

/**
 * Pair State (dynamic market data)
 */
export interface RawPairState {
  pairId: PairId;
  markPrice: string; // micro price
  indexPrice: string; // micro price
  fundingRate?: string; // per hour/day scaled number
  accFundingPerSize?: string; // accumulator for fees calculation
  longOI: string; // long open interest
  shortOI: string; // short open interest
  maxOI?: string; // maximum open interest
  updatedAt: number; // ms epoch
}

/**
 * Normalized Position for UI (converted from micro units)
 */
export interface Position {
  id: string;
  pair: PairId;
  side: "long" | "short";
  sizeUSDC: number; // size / 1e6
  collateralUSDC: number; // collateral / 1e6
  leverage: number; // sizeUSDC / collateralUSDC
  entryPrice: number; // price / 1e6
  markPrice: number; // price / 1e6
  pnlUSDC: number; // pnl / 1e6
  pnlPercent: number; // pnlUSDC / collateralUSDC * 100
  liquidationPrice?: number; // / 1e6
  fundingFeeUSDC?: number; // / 1e6
  takeProfitPrice?: number; // / 1e6, 0 means not set
  stopLossPrice?: number; // / 1e6, 0 means not set
  timestamp: number;
  status: "OPEN" | "CLOSING" | "CLOSED" | "LIQUIDATED";
}

/**
 * Normalized Order for UI
 */
export interface Order {
  id: string;
  pair: PairId;
  side: "long" | "short";
  type: "market" | "limit";
  price?: number; // converted
  sizeDeltaUSDC: number;
  collateralDeltaUSDC: number;
  isIncrease: boolean;
  status: "PLACED" | "FILLED" | "CANCELLED" | "EXPIRED" | "REJECTED";
  txHash?: string;
  placedAt: number;
  updatedAt?: number;
}

/**
 * Normalized Trading History Item for UI
 */
export interface TradeHistoryItem {
  id: string;
  action: "open" | "increase" | "decrease" | "close" | "order_placed" | "order_filled" | "order_cancelled" | "liquidated";
  pair: PairId;
  side?: "long" | "short";
  price?: number;
  sizeUSDC?: number;
  feeUSDC?: number;
  pnlUSDC?: number;
  txHash?: string;
  timestamp: number;
}

/**
 * WebSocket Price Update
 */
export interface WsPriceUpdate {
  pairId: PairId;
  markPrice: string; // micro price
  indexPrice?: string; // micro price
  ts: number; // ms epoch
}

/**
 * WebSocket Account Event Types
 */
export type WsAccountEventType = "position" | "order" | "trade" | "balance";

/**
 * WebSocket Account Event
 */
export interface WsAccountEvent {
  address: Address;
  type: WsAccountEventType;
  payload: RawPosition | RawOrder | RawTradeHistory;
  ts: number;
}

/**
 * API Response Wrappers
 */
export interface ApiResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Conversion Constants
 */
export const MICRO_USDC = 1e6;
export const MICRO_PRICE = 1e6; // Default, may vary by pair

/**
 * Conversion Utilities
 */
export const toUSDC = (microAmount?: string | number): number => {
  if (!microAmount) return 0;
  return Number(microAmount) / MICRO_USDC;
};

export const toPrice = (microPrice?: string | number): number => {
  if (!microPrice) return 0;
  return Number(microPrice) / MICRO_PRICE;
};

export const toMicroUSDC = (amount: number): bigint => {
  return BigInt(Math.floor(amount * MICRO_USDC));
};

export const toMicroPrice = (price: number): bigint => {
  return BigInt(Math.floor(price * MICRO_PRICE));
};

/**
 * Normalization Functions
 */
export function normalizePosition(raw: RawPosition): Position {
  const size = toUSDC(raw.size);
  const collateral = toUSDC(raw.collateral);
  const leverage = collateral > 0 ? size / collateral : 0;
  const pnlUSDC = toUSDC(raw.pnl ?? "0");
  const pnlPercent = collateral > 0 ? (pnlUSDC / collateral) * 100 : 0;

  return {
    id: raw.positionId,
    pair: raw.pairId,
    side: raw.side === "LONG" ? "long" : "short",
    sizeUSDC: size,
    collateralUSDC: collateral,
    leverage,
    entryPrice: toPrice(raw.entryPrice),
    markPrice: toPrice(raw.markPrice),
    pnlUSDC,
    pnlPercent,
    liquidationPrice: raw.liquidationPrice ? toPrice(raw.liquidationPrice) : undefined,
    fundingFeeUSDC: raw.fundingFeeAccrued ? toUSDC(raw.fundingFeeAccrued) : undefined,
    takeProfitPrice: raw.takeProfitPrice ? toPrice(raw.takeProfitPrice) : 0,
    stopLossPrice: raw.stopLossPrice ? toPrice(raw.stopLossPrice) : 0,
    timestamp: raw.updatedAt ?? raw.createdAt,
    status: raw.status,
  };
}

export function normalizeOrder(raw: RawOrder): Order {
  return {
    id: raw.orderId,
    pair: raw.pairId,
    side: raw.side === "LONG" ? "long" : "short",
    type: raw.type.toLowerCase() as "market" | "limit",
    price: raw.price ? toPrice(raw.price) : undefined,
    sizeDeltaUSDC: toUSDC(raw.sizeDelta),
    collateralDeltaUSDC: toUSDC(raw.collateralDelta),
    isIncrease: raw.isIncrease,
    status: raw.status,
    txHash: raw.txHash,
    placedAt: raw.placedAt,
    updatedAt: raw.filledAt ?? raw.cancelledAt ?? raw.placedAt,
  };
}

export function normalizeHistory(raw: RawTradeHistory): TradeHistoryItem {
  const actionMap: Record<HistoryAction, TradeHistoryItem["action"]> = {
    OPEN: "open",
    INCREASE: "increase",
    DECREASE: "decrease",
    CLOSE: "close",
    ORDER_PLACED: "order_placed",
    ORDER_FILLED: "order_filled",
    ORDER_CANCELLED: "order_cancelled",
    LIQUIDATED: "liquidated",
  };

  return {
    id: raw.id,
    action: actionMap[raw.action],
    pair: raw.pairId,
    side: raw.side ? (raw.side === "LONG" ? "long" : "short") : undefined,
    price: raw.price ? toPrice(raw.price) : undefined,
    sizeUSDC: raw.size ? toUSDC(raw.size) : undefined,
    feeUSDC: raw.fee ? toUSDC(raw.fee) : undefined,
    pnlUSDC: raw.pnl ? toUSDC(raw.pnl) : undefined,
    txHash: raw.txHash,
    timestamp: raw.timestamp,
  };
}
