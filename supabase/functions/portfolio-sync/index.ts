// Supabase Edge Function for Portfolio Synchronization
// Handles real-time position updates and PnL calculations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PositionUpdate {
  user_address: string;
  asset_symbol: string;
  coin_type: string;
  position_type: 'supply' | 'borrow';
  amount: string;
  amount_usd: string;
  current_price: string;
  current_apr: string;
}

interface PnLCalculation {
  position_id: string;
  entry_price: string;
  current_price: string;
  amount: string;
  pnl: string;
  pnl_percent: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()

    switch (action) {
      case 'sync_position':
        return await syncPosition(supabaseClient, data)
      case 'calculate_pnl':
        return await calculatePnL(supabaseClient, data)
      case 'update_portfolio_snapshot':
        return await updatePortfolioSnapshot(supabaseClient, data)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function syncPosition(supabaseClient: any, positionData: PositionUpdate) {
  // Check if position exists
  const { data: existingPosition } = await supabaseClient
    .from('positions')
    .select('*')
    .eq('user_address', positionData.user_address)
    .eq('asset_symbol', positionData.asset_symbol)
    .eq('position_type', positionData.position_type)
    .single()

  if (existingPosition) {
    // Update existing position
    const { data, error } = await supabaseClient
      .from('positions')
      .update({
        amount: positionData.amount,
        amount_usd: positionData.amount_usd,
        current_price: positionData.current_price,
        current_apr: positionData.current_apr,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPosition.id)
      .select()

    if (error) throw error

    // Calculate and update PnL
    await calculatePositionPnL(supabaseClient, existingPosition.id)

    return new Response(
      JSON.stringify({ success: true, position: data[0] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } else {
    // Create new position
    const { data, error } = await supabaseClient
      .from('positions')
      .insert({
        user_address: positionData.user_address,
        asset_symbol: positionData.asset_symbol,
        coin_type: positionData.coin_type,
        position_type: positionData.position_type,
        amount: positionData.amount,
        amount_usd: positionData.amount_usd,
        entry_price: positionData.current_price,
        current_price: positionData.current_price,
        current_apr: positionData.current_apr,
        pnl: '0',
        pnl_percent: '0'
      })
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, position: data[0] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function calculatePositionPnL(supabaseClient: any, positionId: string) {
  const { data: position } = await supabaseClient
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single()

  if (!position) return

  const entryPrice = parseFloat(position.entry_price)
  const currentPrice = parseFloat(position.current_price)
  const amount = parseFloat(position.amount_usd)

  let pnl = 0
  let pnlPercent = 0

  if (position.position_type === 'supply') {
    // For supply positions, PnL is based on interest earned
    // This is a simplified calculation - in reality, you'd track accrued interest
    const timeHeld = (new Date().getTime() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24) // days
    const apr = parseFloat(position.current_apr) / 100
    pnl = amount * apr * (timeHeld / 365)
    pnlPercent = (pnl / amount) * 100
  } else {
    // For borrow positions, PnL is negative interest paid
    const timeHeld = (new Date().getTime() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24) // days
    const apr = parseFloat(position.current_apr) / 100
    pnl = -(amount * apr * (timeHeld / 365))
    pnlPercent = (pnl / amount) * 100
  }

  // Update position with calculated PnL
  await supabaseClient
    .from('positions')
    .update({
      pnl: pnl.toString(),
      pnl_percent: pnlPercent.toString()
    })
    .eq('id', positionId)
}

async function calculatePnL(supabaseClient: any, data: PnLCalculation) {
  const entryPrice = parseFloat(data.entry_price)
  const currentPrice = parseFloat(data.current_price)
  const amount = parseFloat(data.amount)

  const priceDiff = currentPrice - entryPrice
  const pnl = (priceDiff / entryPrice) * amount
  const pnlPercent = (priceDiff / entryPrice) * 100

  const { error } = await supabaseClient
    .from('positions')
    .update({
      pnl: pnl.toString(),
      pnl_percent: pnlPercent.toString(),
      current_price: data.current_price
    })
    .eq('id', data.position_id)

  if (error) throw error

  return new Response(
    JSON.stringify({ 
      success: true, 
      pnl: pnl.toString(), 
      pnl_percent: pnlPercent.toString() 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updatePortfolioSnapshot(supabaseClient: any, data: { user_address: string }) {
  // Get all user positions
  const { data: positions } = await supabaseClient
    .from('positions')
    .select('*')
    .eq('user_address', data.user_address)

  if (!positions || positions.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: 'No positions found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Calculate portfolio totals
  let totalSuppliedUsd = 0
  let totalBorrowedUsd = 0
  let totalPnlUsd = 0

  for (const position of positions) {
    const amountUsd = parseFloat(position.amount_usd)
    const pnl = parseFloat(position.pnl || '0')

    if (position.position_type === 'supply') {
      totalSuppliedUsd += amountUsd
    } else {
      totalBorrowedUsd += amountUsd
    }

    totalPnlUsd += pnl
  }

  const netWorthUsd = totalSuppliedUsd - totalBorrowedUsd
  const healthFactor = totalBorrowedUsd > 0 ? totalSuppliedUsd / totalBorrowedUsd : null

  // Get previous snapshot for daily PnL calculation
  const { data: previousSnapshot } = await supabaseClient
    .from('portfolio_snapshots')
    .select('*')
    .eq('user_address', data.user_address)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single()

  const dailyPnlUsd = previousSnapshot 
    ? totalPnlUsd - parseFloat(previousSnapshot.total_pnl_usd || '0')
    : 0

  // Insert new snapshot
  const { error } = await supabaseClient
    .from('portfolio_snapshots')
    .insert({
      user_address: data.user_address,
      total_supplied_usd: totalSuppliedUsd.toString(),
      total_borrowed_usd: totalBorrowedUsd.toString(),
      net_worth_usd: netWorthUsd.toString(),
      health_factor: healthFactor?.toString(),
      total_pnl_usd: totalPnlUsd.toString(),
      daily_pnl_usd: dailyPnlUsd.toString()
    })

  if (error) throw error

  return new Response(
    JSON.stringify({ 
      success: true, 
      snapshot: {
        total_supplied_usd: totalSuppliedUsd.toString(),
        total_borrowed_usd: totalBorrowedUsd.toString(),
        net_worth_usd: netWorthUsd.toString(),
        health_factor: healthFactor?.toString(),
        total_pnl_usd: totalPnlUsd.toString(),
        daily_pnl_usd: dailyPnlUsd.toString()
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
