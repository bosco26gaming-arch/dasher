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

              <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-gray-20
