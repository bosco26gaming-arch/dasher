import React, { useState } from 'react';

export default function App() {
  // Navigation State: 'calculator' | 'session' | 'settings' | 'recovery'
  const [currentScreen, setCurrentScreen] = useState('calculator');

  // --- SETTINGS STATES ---
  const [requiredHourly, setRequiredHourly] = useState('25.00');
  const [runningCostPerKm, setRunningCostPerKm] = useState('0.15');
  const [carL100k, setCarL100k] = useState('10.0');
  const [petrolCost, setPetrolCost] = useState('1.95');

  // --- MODE TOGGLE: Single Trip vs Big Shift Run ---
  const [isBigCalculator, setIsBigCalculator] = useState(false);

  // --- CALCULATOR INPUT STATES ---
  const [distance, setDistance] = useState('');
  const [grossIncome, setGrossIncome] = useState('');
  const [tips, setTips] = useState('');
  const [estTime, setEstTime] = useState('');
  const [isSplit, setIsSplit] = useState(false);

  // --- STANDALONE SESSION TIP STATE ---
  const [standaloneTipInput, setStandaloneTipInput] = useState('');

  // --- CURRENT ACTIVE TRIP/SHIFT CALCULATION STATE ---
  const [tripResult, setTripResult] = useState(null);

  // --- SHIFT/SESSION HISTORY STATE ---
  const [sessionTrips, setSessionTrips] = useState([]);
  const [deletedSessionsArchive, setDeletedSessionsArchive] = useState([]);

  const calculateTrip = () => {
    const gross = parseFloat(grossIncome);
    const dist = parseFloat(distance);
    const gasPrice = parseFloat(petrolCost);
    const timeMins = parseFloat(estTime);
    const tipAmt = parseFloat(tips) || 0;

    if (isNaN(gross) || isNaN(dist) || isNaN(gasPrice) || isNaN(timeMins)) {
      alert("Missing Info: Please enter numbers into base payment, distance, and duration fields.");
      return;
    }

    const configCarL100k = parseFloat(carL100k) || 0;
    const configRunningCost = parseFloat(runningCostPerKm) || 0;

    // FIX 1: Calculate accurate overhead
    const totalFuelCost = (dist / 100) * configCarL100k * gasPrice;
    const totalWearCost = dist * configRunningCost;
    const tripCarCosts = totalFuelCost + totalWearCost;

    // Net operational pool (Base Gross minus vehicle costs)
    const totalNetProfit = gross - tripCarCosts;

    let myPureProfit = 0;
    let friendNetProfit = 0;
    // FIX 1: myCarFundShare is the portion of car costs you are responsible for
    let myCarFundShare = 0;

    if (isSplit) {
      // Split the net remaining profit down the middle
      const halfNet = totalNetProfit / 2;
      myPureProfit = halfNet + tipAmt;   // You keep your half net + all tips
      friendNetProfit = halfNet;          // Friend gets exactly half the net profit
      // In a split, you drove the car so you keep the full car fund
      myCarFundShare = tripCarCosts;
    } else {
      myPureProfit = totalNetProfit + tipAmt;
      friendNetProfit = 0;
      myCarFundShare = tripCarCosts;
    }

    // FIX 1: Your total take-home = your pure profit + your car fund share
    const myTotalCut = myPureProfit + myCarFundShare;

    const hourlyRate = timeMins > 0 ? (myPureProfit / timeMins) * 60 : 0;
    const isWorthIt = hourlyRate >= (parseFloat(requiredHourly) || 0);

    setTripResult({
      gross,
      tips: tipAmt,
      distance: dist,
      costs: tripCarCosts,
      myCarFundShare,
      totalNet: totalNetProfit + tipAmt,
      myTotalCut,
      myPureProfit,
      friendNet: friendNetProfit,
      hourlyRate,
      isWorthIt,
      time: timeMins,
      wasSplit: isSplit,
      isMacroBlock: isBigCalculator
    });
  };

  // --- ADDS A LUMP SUM TIP DIRECTLY TO OVERALL SESSION ---
  const addStandaloneTipToSession = () => {
    const tipAmt = parseFloat(standaloneTipInput);
    if (isNaN(tipAmt) || tipAmt <= 0) {
      alert("Invalid Amount: Please enter a valid tip amount to add to your session.");
      return;
    }

    const newTipEntry = {
      id: Date.now().toString(),
      gross: 0,
      tips: tipAmt,
      myTotalCut: tipAmt,
      myPureProfit: tipAmt,
      friendNet: 0,
      costs: 0,
      myCarFundShare: 0,
      distance: 0,
      time: 0,
      wasSplit: false,
      isMacroBlock: false,
      isStandaloneTip: true
    };

    setSessionTrips([newTipEntry, ...sessionTrips]);
    setStandaloneTipInput('');
  };

  const logTripToSession = () => {
    if (!tripResult) return;

    const newTrip = {
      id: Date.now().toString(),
      gross: tripResult.gross,
      tips: tripResult.tips,
      myTotalCut: tripResult.myTotalCut,
      myPureProfit: tripResult.myPureProfit,
      friendNet: tripResult.friendNet,
      costs: tripResult.costs,
      myCarFundShare: tripResult.myCarFundShare,
      distance: tripResult.distance,
      time: tripResult.time,
      wasSplit: tripResult.wasSplit,
      isMacroBlock: tripResult.isMacroBlock,
      isStandaloneTip: false
    };

    setSessionTrips([newTrip, ...sessionTrips]);

    setGrossIncome('');
    setTips('');
    setDistance('');
    setEstTime('');
    setTripResult(null);
  };

  const deleteTrip = (tripId) => {
    if (window.confirm("Remove Entry? Are you sure you want to delete this log from your session?")) {
      const targetedTrip = sessionTrips.find(t => t.id === tripId);
      if (targetedTrip) {
        const labelText = targetedTrip.isStandaloneTip
          ? `Direct Session Tip Adjust (+$${targetedTrip.tips.toFixed(2)})`
          : (targetedTrip.isMacroBlock
            ? `Bulk Block Run (Gross: $${targetedTrip.gross.toFixed(2)})`
            : `Single Trip (Gross: $${targetedTrip.gross.toFixed(2)})`);

        const archivePayload = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: labelText,
          data: [targetedTrip]
        };
        setDeletedSessionsArchive([archivePayload, ...deletedSessionsArchive]);
      }
      setSessionTrips(sessionTrips.filter(trip => trip.id !== tripId));
    }
  };

  const resetSessionWithBackup = () => {
    if (sessionTrips.length === 0) return;

    if (window.confirm("Clear Entire Session? Your current shift records will be wiped out. You can restore this layout from the Bin tab if needed.")) {
      const archivePayload = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label: `Full Shift Cache (${sessionTrips.length} Entries Logged)`,
        data: [...sessionTrips]
      };
      setDeletedSessionsArchive([archivePayload, ...deletedSessionsArchive]);
      setSessionTrips([]);
    }
  };

  const restoreSessionFromArchive = (archiveItem) => {
    setSessionTrips([...archiveItem.data, ...sessionTrips]);
    setDeletedSessionsArchive(deletedSessionsArchive.filter(item => item.id !== archiveItem.id));
  };

  // Aggregate stats across the whole working session
  const totalSessionGross = sessionTrips.reduce((sum, item) => sum + item.gross, 0);
  const totalSessionTips = sessionTrips.reduce((sum, item) => sum + (item.tips || 0), 0);
  const totalSessionMyTotalCut = sessionTrips.reduce((sum, item) => sum + item.myTotalCut, 0);
  const totalSessionMyPureProfit = sessionTrips.reduce((sum, item) => sum + item.myPureProfit, 0);
  const totalSessionFriendNet = sessionTrips.reduce((sum, item) => sum + item.friendNet, 0);
  const totalSessionCarCosts = sessionTrips.reduce((sum, item) => sum + item.costs, 0);

  // FIX 2 & 3: Use total gross + tips as denominator so percentages are accurate and sum to 100%
  const totalSessionIncome = totalSessionGross + totalSessionTips;
  const overallEarningsDenominator = totalSessionIncome > 0 ? totalSessionIncome : 1;

  const myProfitPct = Math.max(0, (totalSessionMyPureProfit / overallEarningsDenominator) * 100);
  const friendProfitPct = Math.max(0, (totalSessionFriendNet / overallEarningsDenominator) * 100);
  const carExpensesPct = Math.max(0, (totalSessionCarCosts / overallEarningsDenominator) * 100);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased selection:bg-red-500 selection:text-white">
      <main className="max-w-md mx-auto bg-white min-h-screen shadow-xl flex flex-col pb-12">

        {/* NAVIGATION BAR TABS */}
        <nav className="flex border-b border-gray-200 bg-white sticky top-0 z-50">
          <button
            className={`flex-1 py-4 text-center text-xs font-semibold border-b-2 transition-all ${currentScreen === 'calculator' ? 'border-red-500 text-red-500 font-bold' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            onClick={() => setCurrentScreen('calculator')}
          >
            📊 Calc
          </button>
          <button
            className={`flex-1 py-4 text-center text-xs font-semibold border-b-2 transition-all ${currentScreen === 'session' ? 'border-red-500 text-red-500 font-bold' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            onClick={() => setCurrentScreen('session')}
          >
            📋 Active ({sessionTrips.length})
          </button>
          <button
            className={`flex-1 py-4 text-center text-xs font-semibold border-b-2 transition-all ${currentScreen === 'recovery' ? 'border-red-500 text-red-500 font-bold' : 'border-transparent text-gray-600 hover:text-gray-900'} ${deletedSessionsArchive.length > 0 ? 'text-red-700 font-bold' : ''}`}
            onClick={() => setCurrentScreen('recovery')}
          >
            🛡️ Bin ({deletedSessionsArchive.length})
          </button>
          <button
            className={`flex-1 py-4 text-center text-xs font-semibold border-b-2 transition-all ${currentScreen === 'settings' ? 'border-red-500 text-red-500 font-bold' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            onClick={() => setCurrentScreen('settings')}
          >
            ⚙️ Setup
          </button>
        </nav>

        {/* MAIN BODY WINDOWS */}
        <section className="p-5 flex-1 flex flex-col">

          {/* CALCULATOR SCREEN */}
          {currentScreen === 'calculator' && (
            <div className="flex flex-col gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${!isBigCalculator ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  onClick={() => { setIsBigCalculator(false); setTripResult(null); }}
                >
                  📍 Single Trip
                </button>
                <button
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${isBigCalculator ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  onClick={() => { setIsBigCalculator(true); setTripResult(null); }}
                >
                  🚀 Big Shift Estimator
                </button>
              </div>

              <h1 className="text-xl font-bold text-center mt-2 text-gray-800">
                {isBigCalculator ? "Macro Shift Projector" : "Dash Decision Engine"}
              </h1>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isBigCalculator ? "Total Projected Base Gross Payout ($)" : "Base Fare Offer Payout ($)"}
                </label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" type="number" step="any" placeholder={isBigCalculator ? "e.g., 250.00" : "e.g., 24.00"} value={grossIncome} onChange={(e) => setGrossIncome(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Collected Tips / Cash Bonuses ($)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" type="number" step="any" placeholder="e.g., 5.50 (Optional)" value={tips} onChange={(e) => setTips(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isBigCalculator ? "Total Session Distance (Total Km)" : "Total Distance (Round Trip Km)"}
                </label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" type="number" step="any" placeholder={isBigCalculator ? "e.g., 150.0" : "e.g., 10.0"} value={distance} onChange={(e) => setDistance(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isBigCalculator ? "Total Time on Road (Minutes)" : "Trip Duration (Minutes)"}
                </label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" type="number" step="any" placeholder={isBigCalculator ? "e.g., 360 (6 hours)" : "e.g., 25"} value={estTime} onChange={(e) => setEstTime(e.target.value)} />
              </div>

              <p className="text-xs text-gray-500 italic -mt-1">
                Base fuel matrix: <span className="font-bold text-gray-700">${parseFloat(petrolCost || 0).toFixed(2)}/L</span>
              </p>

              <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200 mt-1 shadow-sm">
                <div className="flex flex-col pr-4">
                  <span className="text-sm font-semibold text-gray-800">👥 Split with Friend 50/50?</span>
                  <span className="text-xs text-gray-500 mt-0.5 leading-relaxed">Net profit splits equally; you retain the full car fund and all tips</span>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-red-500 cursor-pointer rounded"
                  checked={isSplit}
                  onChange={(e) => setIsSplit(e.target.checked)}
                />
              </div>

              <button className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-lg shadow transition-colors mt-2 text-base" onClick={calculateTrip}>
                {isBigCalculator ? "Project Shift Profits" : "Evaluate Trip"}
              </button>

              {tripResult !== null && (
                <div className={`mt-4 p-5 rounded-xl border-2 flex flex-col items-center text-center ${tripResult.isWorthIt ? 'bg-green-50 border-green-600' : 'bg-red-50 border-red-600'}`}>
                  <h2 className="text-lg font-extrabold mb-2 tracking-wide text-gray-900">
                    {tripResult.isMacroBlock
                      ? (tripResult.isWorthIt ? "PROFITABLE SHIFT PACE" : "SUB-TARGET SHIFT PACE")
                      : (tripResult.isWorthIt ? "ACCEPT TRIP" : "DECLINE TRIP")}
                  </h2>

                  <p className="text-sm text-gray-700 my-0.5">Est. True Hourly Velocity: <span className="font-bold text-gray-900">${tripResult.hourlyRate.toFixed(2)}/hr</span></p>
                  <p className="text-sm text-gray-700 my-0.5">Car Overhead (Fuel + Wear): ${tripResult.costs.toFixed(2)}</p>
                  {tripResult.tips > 0 && <p className="text-sm text-gray-700 my-0.5">Retained Tip Revenue: +${tripResult.tips.toFixed(2)}</p>}
                  <p className="text-base font-bold text-green-700 mt-2">YOUR Total Take-Home Cut: ${tripResult.myTotalCut.toFixed(2)}</p>
                  {/* FIX 1: Accurately reflect that myCarFundShare may equal full costs in all cases */}
                  <p className="text-xs text-gray-500 mb-2">(Includes ${tripResult.myPureProfit.toFixed(2)} profit + ${tripResult.myCarFundShare.toFixed(2)} car fund)</p>

                  {tripResult.wasSplit && (
                    <p className="text-sm text-blue-700 font-semibold mt-1">Friend's Split Cut: ${tripResult.friendNet.toFixed(2)}</p>
                  )}

                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-md mt-3 shadow transition-colors text-xs" onClick={logTripToSession}>
                    {tripResult.isMacroBlock ? "➕ Log Bulk Block to Tracker" : "➕ Add to Session Tracker"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SESSION TRACKER SCREEN */}
          {currentScreen === 'session' && (
            <div className="flex flex-col flex-1">
              {sessionTrips.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 mb-4 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-600 mb-3 text-center tracking-wider uppercase">Shift Income Split Breakdown (Inc. Tips)</h3>
                  <div className="flex h-5 rounded-full overflow-hidden bg-gray-100 mb-3">
                    {myProfitPct > 0 && <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${myProfitPct}%` }} />}
                    {friendProfitPct > 0 && <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${friendProfitPct}%` }} />}
                    {carExpensesPct > 0 && <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${carExpensesPct}%` }} />}
                  </div>

                  {/* FIX 4: Show clamped percentages with correct sum */}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-medium text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span>Your Profit ({myProfitPct.toFixed(0)}%)</span>
                    </div>
                    {totalSessionFriendNet > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span>Friend ({friendProfitPct.toFixed(0)}%)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span>Car Fund ({carExpensesPct.toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid Dashboard Totals */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Your Take-Home</p>
                  <p className="text-lg font-bold text-green-600">${totalSessionMyTotalCut.toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Pure Net Profit</p>
                  <p className="text-lg font-bold text-gray-800">${totalSessionMyPureProfit.toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Car Expenses Fund</p>
                  <p className="text-lg font-bold text-orange-600">${totalSessionCarCosts.toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Friend's Share</p>
                  <p className="text-lg font-bold text-blue-600">${totalSessionFriendNet.toFixed(2)}</p>
                </div>
              </div>

              {/* Standalone Tip Modifier Field */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4 flex gap-2 items-center">
                <input
                  type="number"
                  step="any"
                  placeholder="Lump Sum Tip/Bonus ($)"
                  className="flex-1 bg-white border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={standaloneTipInput}
                  onChange={(e) => setStandaloneTipInput(e.target.value)}
                />
                <button onClick={addStandaloneTipToSession} className="bg-gray-800 hover:bg-gray-900 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow">
                  Add Tip
                </button>
              </div>

              {/* FIX 5: Removed hardcoded max-h-[300px] to prevent clipping on longer sessions */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {sessionTrips.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8 italic">No active logs saved on this current session stack yet.</p>
                ) : (
                  sessionTrips.map((trip) => (
                    <div key={trip.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center text-xs shadow-sm">
                      <div>
                        <p className="font-bold text-gray-800">
                          {trip.isStandaloneTip ? "💰 Direct Session Tip Adjustment" : (trip.isMacroBlock ? "🚀 Bulk Shift Blocks Run" : "📍 Single Run Log")}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          {trip.isStandaloneTip
                            ? `Added: +$${trip.tips.toFixed(2)}`
                            : `Gross: $${trip.gross.toFixed(2)} | Net Cut: $${trip.myTotalCut.toFixed(2)}`}
                        </p>
                      </div>
                      <button onClick={() => deleteTrip(trip.id)} className="text-red-500 hover:text-red-700 font-bold px-2 py-1">
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {sessionTrips.length > 0 && (
                <button onClick={resetSessionWithBackup} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs py-3 rounded-lg border border-gray-300 mt-4 transition-colors">
                  Wipe & Archive Active Shift
                </button>
              )}
            </div>
          )}

          {/* RECOVERY BIN SCREEN */}
          {currentScreen === 'recovery' && (
            <div className="flex flex-col flex-1">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Archived Sessions</h2>
              <p className="text-xs text-gray-500 mb-4">Restore wiped runs or accidentally deleted items back into your main list context active state.</p>

              {/* FIX 5: Also removed hardcoded max-h here — let content grow naturally */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {deletedSessionsArchive.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-12 italic">The trash bin layer is empty.</p>
                ) : (
                  deletedSessionsArchive.map((archive) => (
                    <div key={archive.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{archive.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Deleted At: {archive.timestamp}</p>
                      </div>
                      <button onClick={() => restoreSessionFromArchive(archive)} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-3 py-1.5 rounded-md border border-red-200 transition-colors">
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SETTINGS MODULE SCREEN */}
          {currentScreen === 'settings' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Configuration Profiles</h2>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Target Expected Hourly Gross ($/hr)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" type="number" step="any" value={requiredHourly} onChange={(e) => setRequiredHourly(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">General Mechanical Depreciation Cost Per Km ($/Km)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" type="number" step="any" value={runningCostPerKm} onChange={(e) => setRunningCostPerKm(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Car Fuel Consumption Matrix (Liters / 100 Km)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" type="number" step="any" value={carL100k} onChange={(e) => setCarL100k(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fuel Pump Price Rate ($ / Liter)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" type="number" step="any" value={petrolCost} onChange={(e) => setPetrolCost(e.target.value)} />
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
