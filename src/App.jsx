import React, { useState } from 'react';

export default function App() {
  // Navigation State: 'calculator' | 'session' | 'settings' | 'recovery'
  const [currentScreen, setCurrentScreen] = useState('calculator');

  // --- SETTINGS STATES ---
  const [requiredHourly, setRequiredHourly] = useState('25.00'); 
  const [runningCostPerKm, setRunningCostPerKm] = useState('0.15'); // Wear & Tear
  const [carL100k, setCarL100k] = useState('10.0'); // Fuel consumption
  const [petrolCost, setPetrolCost] = useState('1.95'); // Global fuel price per litre

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

    const totalFuelCost = (dist / 100) * configCarL100k * gasPrice;
    const totalWearCost = dist * configRunningCost;
    const tripCarCosts = totalFuelCost + totalWearCost;
    
    const totalNetProfit = gross - tripCarCosts;
    const netProfitSplit = totalNetProfit / 2;
    
    const myTotalCut = isSplit ? (netProfitSplit + tripCarCosts + tipAmt) : (gross + tipAmt);
    const friendNetProfit = isSplit ? netProfitSplit : 0;

    const myPureProfit = isSplit ? (netProfitSplit + tipAmt) : (totalNetProfit + tipAmt);
    const hourlyRate = timeMins > 0 ? (myPureProfit / timeMins) * 60 : 0;
    const isWorthIt = hourlyRate >= (parseFloat(requiredHourly) || 0);

    setTripResult({
      gross: gross,
      tips: tipAmt,
      distance: dist,
      costs: tripCarCosts,
      totalNet: totalNetProfit + tipAmt,
      myTotalCut: myTotalCut, 
      myPureProfit: myPureProfit,
      friendNet: friendNetProfit,
      hourlyRate: hourlyRate,
      isWorthIt: isWorthIt,
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
          : (targetedTrip.isMacroBlock ? `Bulk Block Run (Gross: $${targetedTrip.gross.toFixed(2)})` : `Single Trip (Gross: $${targetedTrip.gross.toFixed(2)})`);

        const archivePayload = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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

  // FIXED: Bulletproofed Denominator calculations to protect against rendering NaN values in CSS inline widths
  const overallEarningsDenominator = (totalSessionMyPureProfit + totalSessionFriendNet + totalSessionCarCosts);
  
  const myProfitPct = overallEarningsDenominator > 0 ? Math.max(0, (totalSessionMyPureProfit / overallEarningsDenominator) * 100) : 0;
  const friendProfitPct = overallEarningsDenominator > 0 ? Math.max(0, (totalSessionFriendNet / overallEarningsDenominator) * 100) : 0;
  const carExpensesPct = overallEarningsDenominator > 0 ? Math.max(0, (totalSessionCarCosts / overallEarningsDenominator) * 100) : 0;

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
            <div className="flex flex-col gap-4 animate-fadeIn">
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
                  <span className="text-xs text-gray-500 mt-0.5 leading-relaxed">Car fund and 100% of tips remain entirely in your share</span>
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
                  <p className="text-xs text-gray-500 mb-2">(Includes ${tripResult.myPureProfit.toFixed(2)} profit + ${tripResult.costs.toFixed(2)} car fund)</p>
                  
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
            <div className="flex flex-col flex-1 animate-fadeIn">
              {sessionTrips.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 mb-4 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-600 mb-3 text-center tracking-wider uppercase">Shift Income Split Breakdown (Inc. Tips)</h3>
                  <div className="flex h-5 rounded-full overflow-hidden bg-gray-100 mb-3">
                    {myProfitPct > 0 && <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${myProfitPct}%` }} />}
                    {friendProfitPct > 0 && <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${friendProfitPct}%` }} />}
                    {carExpensesPct > 0 && <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${carExpensesPct}%` }} />}
                  </div>

                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-medium text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"/>
                      <span>Your Profit ({myProfitPct.toFixed(0)}%)</span>
                    </div>
                    {totalSessionFriendNet > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"/>
                        <span>Friend ({friendProfitPct.toFixed(0)}%)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500"/>
                      <span>Car Fund ({carExpensesPct.toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-center">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">YOUR Wallet Cash</h4>
                  <p className="text-base font-extrabold text-green-700 mt-0.5">${totalSessionMyTotalCut.toFixed(2)}</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Total Session Tips</h4>
                  <p className="text-base font-extrabold text-purple-700 mt-0.5">${totalSessionTips.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Total Car Fund</h4>
                  <p className="text-base font-extrabold text-orange-700 mt-0.5">${totalSessionCarCosts.toFixed(2)}</p>
                </div>
              </div>
              
              <p className="text-[11px] font-medium text-gray-500 text-center my-3">
                Shift Base Fares: ${totalSessionGross.toFixed(2)} | Friends Allocation: ${totalSessionFriendNet.toFixed(2)}
              </p>

              {/* STANDALONE SESSION TIP INPUT FIELD */}
              <div className="flex border border-gray-300 bg-white rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all mb-4">
                <input 
                  className="flex-1 py-2.5 px-3 text-sm bg-white focus:outline-none" 
                  type="number" 
                  step="any"
                  placeholder="Add unexpected cash / global session tip ($)" 
                  value={standaloneTipInput}
                  onChange={(e) => setStandaloneTipInput(e.target.value)}
                />
                <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 px-4 transition-colors" onClick={addStandaloneTipToSession}>
                  ⚡ Add Tip
                </button>
              </div>

              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-800">Trips Ledger</h3>
                <button className="text-red-600 hover:text-red-700 font-semibold text-xs transition-colors" onClick={resetSessionWithBackup}>Reset Session</button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[320px] pr-1 flex flex-col gap-2">
                {sessionTrips.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-8">No data logged in this shift.</p>
                ) : (
                  sessionTrips.map((item, index) => (
                    item.isStandaloneTip ? (
                      <div key={item.id} className="flex items-center bg-purple-50 border border-purple-200 p-3 rounded-lg shadow-sm">
                        <span className="text-purple-600 font-bold mr-3 text-sm">✨</span>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-purple-900">💰 Session Tip Adjustment</h4>
                          <p className="text-[10px] text-purple-600 mt-0.5">Direct Overall Session Addition</p>
                        </div>
                        <div className="text-right mr-3">
                          <span className="text-sm font-bold text-purple-900 block">+${item.tips.toFixed(2)}</span>
                        </div>
                        <button className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded py-1 px-2 transition-colors" onClick={() => deleteTrip(item.id)}>🗑️ Delete</button>
                      </div>
                    ) : (
                      <div key={item.id} className="flex items-center bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                        <span className="text-gray-400 font-bold mr-3 text-xs">#{sessionTrips.length - index}</span>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-gray-900">
                            {item.isMacroBlock ? "🚀 Bulk Run: " : "Fare: "}${item.gross.toFixed(2)}
                            {item.tips > 0 && <span className="text-purple-600 text-[11px] font-semibold"> (+${item.tips.toFixed(2)} Tip)</span>}
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">{item.distance} km • {item.wasSplit ? "👥 Shared Split" : "👤 Solo"}</p>
                        </div>
                        <div className="text-right mr-3 flex flex-col justify-center">
                          <span className="text-xs font-bold text-green-700">Your Cash: ${item.myTotalCut.toFixed(2)}</span>
                          {item.wasSplit && <span className="text-[10px] font-semibold text-blue-600 mt-0.5">Friend: ${item.friendNet.toFixed(2)}</span>}
                        </div>
                        <button className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded py-1 px-2 transition-colors" onClick={() => deleteTrip(item.id)}>🗑️ Delete</button>
                      </div>
                    )
                  ))
                )}
              </div>
            </div>
          )}

          {/* BACKUP RECOVERY SCREEN */}
          {currentScreen === 'recovery' && (
            <div className="flex flex-col flex-1 animate-fadeIn">
              <h1 className="text-base font-bold text-center text-gray-800">🛡️ Shift Recovery Vault</h1>
              <p className="text-xs text-gray-500 text-center mb-5 mt-1 leading-relaxed px-2">Accidentally deleted a session or trip line? Restore them back into your main dashboard tracking grid below.</p>
              
              <div className="flex-1 overflow-y-auto max-h-[420px] flex flex-col gap-2.5">
                {deletedSessionsArchive.length === 0 ? (
                  <div className="py-12 px-6 text-center">
                    <p className="text-xs text-gray-400 leading-relaxed">Your recovery vault is empty. Any logs cleared from your shift ledger will back up here automatically.</p>
                  </div>
                ) : (
                  deletedSessionsArchive.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white border border-gray-200 p-3.5 rounded-lg shadow-sm">
                      <div className="flex-1 pr-3">
                        <h4 className="text-xs font-bold text-gray-800 leading-tight">{item.label}</h4>
                        <p className="text-[10px] text-gray-400 mt-1">Deleted at {item.timestamp}</p>
                      </div>
                      <button className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md py-1.5 px-3 transition-colors shrink-0" onClick={() => restoreSessionFromArchive(item)}>
                        🔄 Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SETUP CONFIGURATION SCREEN */}
          {currentScreen === 'settings' && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <h1 className="text-base font-bold text-center text-gray-800">Metrics Setup</h1>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Your Minimum Target ($ / Hour Net)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" type="number" step="any" value={requiredHourly} onChange={(e) => setRequiredHourly(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Current Petrol Price (per Litre $)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" type="number" step="any" value={petrolCost} onChange={(e) => setPetrolCost(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fuel Consumption (Litres / 100 Km)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" type="number" step="any" value={carL100k} onChange={(e) => setCarL100k(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Wear & Tear Overhead (Maintenance, Tires, Oil/Km)</label>
                <input className="w-full bg-white border border-gray-300 rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:outline-none transition-all" type="number" step="any" value={runningCostPerKm} onChange={(e) => setRunningCostPerKm(e.target.value)} />
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
