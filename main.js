import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  FlatList,
  Switch,
  Alert
} from 'react-native';

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

  // --- NEW: STANDALONE SESSION TIP STATE ---
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
      Alert.alert("Missing Info", "Please enter numbers into base payment, distance, and duration fields.");
      return;
    }

    const totalFuelCost = (dist / 100) * parseFloat(carL100k || 0) * gasPrice;
    const totalWearCost = dist * parseFloat(runningCostPerKm || 0);
    const tripCarCosts = totalFuelCost + totalWearCost;
    
    const totalNetProfit = gross - tripCarCosts;
    const netProfitSplit = totalNetProfit / 2;
    
    const myTotalCut = isSplit ? (netProfitSplit + tripCarCosts + tipAmt) : (gross + tipAmt);
    const friendNetProfit = isSplit ? netProfitSplit : 0;

    const myPureProfit = isSplit ? (netProfitSplit + tipAmt) : (totalNetProfit + tipAmt);
    const hourlyRate = (myPureProfit / timeMins) * 60;
    const isWorthIt = hourlyRate >= parseFloat(requiredHourly || 0);

    setTripResult({
      gross: gross.toFixed(2),
      tips: tipAmt.toFixed(2),
      distance: dist,
      costs: tripCarCosts.toFixed(2),
      totalNet: (totalNetProfit + tipAmt).toFixed(2),
      myTotalCut: myTotalCut.toFixed(2), 
      myPureProfit: myPureProfit.toFixed(2),
      friendNet: friendNetProfit.toFixed(2),
      hourlyRate: hourlyRate.toFixed(2),
      isWorthIt: isWorthIt,
      time: timeMins,
      wasSplit: isSplit,
      isMacroBlock: isBigCalculator
    });
  };

  // --- NEW FUNCTION: ADDS A LUMP SUM TIP DIRECTLY TO OVERALL SESSION ---
  const addStandaloneTipToSession = () => {
    const tipAmt = parseFloat(standaloneTipInput);
    if (isNaN(tipAmt) || tipAmt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid tip amount to add to your session.");
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
      isStandaloneTip: true // Special flag for visual rendering in ledger
    };

    setSessionTrips([newTipEntry, ...sessionTrips]);
    setStandaloneTipInput('');
    Alert.alert("Tip Added!", `$${tipAmt.toFixed(2)} added directly to your session summary.`);
  };

  const logTripToSession = () => {
    if (!tripResult) return;

    const newTrip = {
      id: Date.now().toString(),
      gross: parseFloat(tripResult.gross),
      tips: parseFloat(tripResult.tips),
      myTotalCut: parseFloat(tripResult.myTotalCut), 
      myPureProfit: parseFloat(tripResult.myPureProfit),
      friendNet: parseFloat(tripResult.friendNet),
      costs: parseFloat(tripResult.costs),
      distance: tripResult.distance,
      time: tripResult.time,
      wasSplit: tripResult.wasSplit,
      isMacroBlock: tripResult.isMacroBlock,
      isStandaloneTip: false
    };

    setSessionTrips([newTrip, ...sessionTrips]);
    Alert.alert("Logged!", tripResult.isMacroBlock ? "Big shift run added to session." : "Single trip added to session.");
    
    setGrossIncome('');
    setTips('');
    setDistance('');
    setEstTime('');
    setTripResult(null);
  };

  const deleteTrip = (tripId) => {
    Alert.alert(
      "Remove Entry",
      "Are you sure you want to delete this log from your session?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
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
        }
      ]
    );
  };

  const resetSessionWithBackup = () => {
    if (sessionTrips.length === 0) return;

    Alert.alert(
      "Clear Entire Session?",
      "Your current shift records will be wiped out. You can restore this layout from the Bin tab if needed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Session",
          style: "destructive",
          onPress: () => {
            const archivePayload = {
              id: Date.now().toString(),
              timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
              label: `Full Shift Cache (${sessionTrips.length} Entries Logged)`,
              data: [...sessionTrips]
            };
            setDeletedSessionsArchive([archivePayload, ...deletedSessionsArchive]);
            setSessionTrips([]);
          }
        }
      ]
    );
  };

  const restoreSessionFromArchive = (archiveItem) => {
    setSessionTrips([...archiveItem.data, ...sessionTrips]);
    setDeletedSessionsArchive(deletedSessionsArchive.filter(item => item.id !== archiveItem.id));
    Alert.alert("Restored!", "Data merged back into active workspace.");
  };

  // Aggregate stats across the whole working session (Automatically updates when independent tips are pushed)
  const totalSessionGross = sessionTrips.reduce((sum, item) => sum + item.gross, 0);
  const totalSessionTips = sessionTrips.reduce((sum, item) => sum + (item.tips || 0), 0);
  const totalSessionMyTotalCut = sessionTrips.reduce((sum, item) => sum + item.myTotalCut, 0); 
  const totalSessionMyPureProfit = sessionTrips.reduce((sum, item) => sum + item.myPureProfit, 0);
  const totalSessionFriendNet = sessionTrips.reduce((sum, item) => sum + item.friendNet, 0);
  const totalSessionCarCosts = sessionTrips.reduce((sum, item) => sum + item.costs, 0);

  const overallEarningsDenominator = (totalSessionGross + totalSessionTips) > 0 ? (totalSessionGross + totalSessionTips) : 1;
  const myProfitPct = Math.max(0, (totalSessionMyPureProfit / overallEarningsDenominator) * 100);
  const friendProfitPct = Math.max(0, (totalSessionFriendNet / overallEarningsDenominator) * 100);
  const carExpensesPct = Math.max(0, (totalSessionCarCosts / overallEarningsDenominator) * 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* NAVIGATION TABS */}
      <View style={styles.navBar}>
        <TouchableOpacity style={[styles.navButton, currentScreen === 'calculator' && styles.activeNav]} onPress={() => setCurrentScreen('calculator')}>
          <Text style={styles.navText}>📊 Calc</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, currentScreen === 'session' && styles.activeNav]} onPress={() => setCurrentScreen('session')}>
          <Text style={styles.navText}>📋 Active ({sessionTrips.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, currentScreen === 'recovery' && styles.activeNav]} onPress={() => setCurrentScreen('recovery')}>
          <Text style={[styles.navText, deletedSessionsArchive.length > 0 && {color: '#c62828', fontWeight: '700'}]}>🛡️ Bin ({deletedSessionsArchive.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, currentScreen === 'settings' && styles.activeNav]} onPress={() => setCurrentScreen('settings')}>
          <Text style={styles.navText}>⚙️ Setup</Text>
        </TouchableOpacity>
      </View>

      {/* CALCULATOR SCREEN */}
      {currentScreen === 'calculator' && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.modeSelectorContainer}>
            <TouchableOpacity 
              style={[styles.modeTabButton, !isBigCalculator && styles.modeTabActiveLeft]}
              onPress={() => { setIsBigCalculator(false); setTripResult(null); }}
            >
              <Text style={[styles.modeTabTxt, !isBigCalculator && styles.modeTabTxtActive]}>📍 Single Trip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modeTabButton, isBigCalculator && styles.modeTabActiveRight]}
              onPress={() => { setIsBigCalculator(true); setTripResult(null); }}
            >
              <Text style={[styles.modeTabTxt, isBigCalculator && styles.modeTabTxtActive]}>🚀 Big Shift Estimator</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            {isBigCalculator ? "Macro Shift Projector" : "Dash Decision Engine"}
          </Text>

          <Text style={styles.label}>
            {isBigCalculator ? "Total Projected Base Gross Payout ($)" : "Base Fare Offer Payout ($)"}
          </Text>
          <TextInput style={styles.input} placeholder={isBigCalculator ? "e.g., 250.00" : "e.g., 24.00"} keyboardType="numeric" value={grossIncome} onChangeText={setGrossIncome} />

          <Text style={styles.label}>Collected Tips / Cash Bonuses ($)</Text>
          <TextInput style={styles.input} placeholder="e.g., 5.50 (Optional)" keyboardType="numeric" value={tips} onChangeText={setTips} />

          <Text style={styles.label}>
            {isBigCalculator ? "Total Session Distance (Total Km)" : "Total Distance (Round Trip Km)"}
          </Text>
          <TextInput style={styles.input} placeholder={isBigCalculator ? "e.g., 150.0" : "e.g., 10.0"} keyboardType="numeric" value={distance} onChangeText={setDistance} />

          <Text style={styles.label}>
            {isBigCalculator ? "Total Time on Road (Minutes)" : "Trip Duration (Minutes)"}
          </Text>
          <TextInput style={styles.input} placeholder={isBigCalculator ? "e.g., 360 (6 hours)" : "e.g., 25"} keyboardType="numeric" value={estTime} onChangeText={setEstTime} />

          <Text style={styles.fuelContextText}>
            Base fuel matrix: <Text style={{fontWeight: '700'}}>${parseFloat(petrolCost || 0).toFixed(2)}/L</Text>
          </Text>

          <View style={styles.toggleContainer}>
            <View style={{flex: 1, paddingRight: 10}}>
              <Text style={styles.toggleLabel}>👥 Split with Friend 50/50?</Text>
              <Text style={styles.toggleSubLabel}>Car fund and 100% of tips remain entirely in your share</Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: "#FF3008" }}
              thumbColor={isSplit ? "#fff" : "#f4f3f4"}
              onValueChange={(value) => setIsSplit(value)}
              value={isSplit}
            />
          </View>

          <TouchableOpacity style={styles.calcButton} onPress={calculateTrip}>
            <Text style={styles.calcButtonText}>
              {isBigCalculator ? "Project Shift Profits" : "Evaluate Trip"}
            </Text>
          </TouchableOpacity>

          {tripResult !== null && (
            <View style={[styles.resultBox, tripResult.isWorthIt ? styles.greenBox : styles.redBox]}>
              <Text style={styles.resultVerdict}>
                {tripResult.isMacroBlock 
                  ? (tripResult.isWorthIt ? "PROFITABLE SHIFT PACE" : "SUB-TARGET SHIFT PACE")
                  : (tripResult.isWorthIt ? "ACCEPT TRIP" : "DECLINE TRIP")}
              </Text>
              
              <Text style={styles.resultDetails}>Est. True Hourly Velocity: <Text style={{fontWeight: '700'}}>${tripResult.hourlyRate}/hr</Text></Text>
              <Text style={styles.resultDetails}>Car Overhead (Fuel + Wear): ${tripResult.costs}</Text>
              {parseFloat(tripResult.tips) > 0 && <Text style={styles.resultDetails}>Retained Tip Revenue: +${tripResult.tips}</Text>}
              <Text style={[styles.resultDetails, {fontWeight: '700', color: '#2e7d32'}]}>YOUR Total Take-Home Cut: ${tripResult.myTotalCut}</Text>
              <Text style={styles.resultSubDetails}>(Includes ${tripResult.myPureProfit} profit + ${tripResult.costs} car fund)</Text>
              
              {tripResult.wasSplit && (
                <Text style={[styles.resultDetails, {color: '#1565c0', fontWeight: '600', marginTop: 4}]}>Friend's Split Cut: ${tripResult.friendNet}</Text>
              )}

              <TouchableOpacity style={styles.logButton} onPress={logTripToSession}>
                <Text style={styles.logButtonText}>
                  {tripResult.isMacroBlock ? "➕ Log Bulk Block to Tracker" : "➕ Add to Session Tracker"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* SESSION TRACKER SCREEN */}
      {currentScreen === 'session' && (
        <View style={styles.sessionContainer}>
          {sessionTrips.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Shift Income Split Breakdown (Inc. Tips)</Text>
              <View style={styles.pieBarTrack}>
                {myProfitPct > 0 && <View style={[styles.pieSegment, { flex: myProfitPct, backgroundColor: '#4CAF50' }]} />}
                {friendProfitPct > 0 && <View style={[styles.pieSegment, { flex: friendProfitPct, backgroundColor: '#2196F3' }]} />}
                {carExpensesPct > 0 && <View style={[styles.pieSegment, { flex: carExpensesPct, backgroundColor: '#FF9800' }]} />}
              </View>

              <View style={styles.chartLegendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#4CAF50'}]} /><Text style={styles.legendText}>Your Total Profit ({myProfitPct.toFixed(0)}%)</Text></View>
                {totalSessionFriendNet > 0 && (
                  <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#2196F3'}]} /><Text style={styles.legendText}>Friend ({friendProfitPct.toFixed(0)}%)</Text></View>
                )}
                <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#FF9800'}]} /><Text style={styles.legendText}>Car Fund ({carExpensesPct.toFixed(0)}%)</Text></View>
              </View>
            </View>
          )}

          <View style={styles.statsDashboard}>
            <View style={styles.statCard}><Text style={styles.statLabel}>YOUR Wallet Cash</Text><Text style={[styles.statVal, {color: '#2e7d32'}]}>${totalSessionMyTotalCut.toFixed(2)}</Text></View>
            <View style={styles.statCard}><Text style={styles.statLabel}>Total Session Tips</Text><Text style={[styles.statVal, {color: '#673ab7'}]}>${totalSessionTips.toFixed(2)}</Text></View>
            <View style={styles.statCard}><Text style={styles.statLabel}>Total Car Fund</Text><Text style={[styles.statVal, {color: '#e65100'}]}>${totalSessionCarCosts.toFixed(2)}</Text></View>
          </View>
          
          <View style={styles.centerStatRow}>
            <Text style={styles.centerStatText}>Shift Base Fares: ${totalSessionGross.toFixed(2)} | Friends Allocation: ${totalSessionFriendNet.toFixed(2)}</Text>
          </View>

          {/* 📍 NEW FEATURE: STANDALONE SESSION TIP INPUT FIELD */}
          <View style={styles.standaloneTipBox}>
            <TextInput 
              style={styles.standaloneTipInput} 
              placeholder="Add unexpected cash / global session tip ($)" 
              keyboardType="numeric"
              value={standaloneTipInput}
              onChangeText={setStandaloneTipInput}
            />
            <TouchableOpacity style={styles.standaloneTipButton} onPress={addStandaloneTipToSession}>
              <Text style={styles.standaloneTipButtonText}>⚡ Add Tip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>Trips Ledger</Text>
            <TouchableOpacity onPress={resetSessionWithBackup}><Text style={styles.clearText}>Reset Session</Text></TouchableOpacity>
          </View>

          <FlatList
            data={sessionTrips}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              item.isStandaloneTip ? (
                /* Renders clean, special style if it's an standalone session tip adjustment */
                <View style={[styles.tripRow, {borderColor: '#b39ddb', backgroundColor: '#f3e5f5'}]}>
                  <Text style={[styles.tripRowIndex, {color: '#673ab7'}]}>✨</Text>
                  <View style={{flex: 1}}>
                    <Text style={[styles.tripRowTitle, {color: '#4a148c'}]}>💰 Session Tip Adjustment</Text>
                    <Text style={styles.tripRowSub}>Direct Overall Session Addition</Text>
                  </View>
                  <View style={{alignItems: 'flex-end', marginRight: 12}}>
                    <Text style={[styles.tripRowNet, {color: '#4a148c'}]}>+${item.tips.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTrip(item.id)}>
                    <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Standard dynamic trip log style */
                <View style={styles.tripRow}>
                  <Text style={styles.tripRowIndex}>#{sessionTrips.length - index}</Text>
                  <View style={{flex: 1}}>
                    <Text style={styles.tripRowTitle}>
                      {item.isMacroBlock ? "🚀 Bulk Run: " : "Fare: "}${item.gross.toFixed(2)}
                      {item.tips > 0 && <Text style={{color: '#673ab7', fontSize: 12}}> (+${item.tips.toFixed(2)} Tip)</Text>}
                    </Text>
                    <Text style={styles.tripRowSub}>{item.distance} km • {item.wasSplit ? "👥 Shared Split" : "👤 Solo"}</Text>
                  </View>
                  <View style={{alignItems: 'flex-end', marginRight: 12}}>
                    <Text style={styles.tripRowNet}>Your Cash: ${item.myTotalCut.toFixed(2)}</Text>
                    {item.wasSplit && <Text style={styles.tripRowFriendNet}>Friend: ${item.friendNet.toFixed(2)}</Text>}
                  </View>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTrip(item.id)}>
                    <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No data logged in this shift.</Text>}
          />
        </View>
      )}

      {/* BACKUP RECOVERY SCREEN */}
      {currentScreen === 'recovery' && (
        <View style={styles.sessionContainer}>
          <Text style={styles.title}>🛡️ Shift Recovery Vault</Text>
          <Text style={styles.vaultSubtext}>Accidentally deleted a session or trip line? Restore them back into your main dashboard tracking grid below.</Text>
          
          <FlatList
            data={deletedSessionsArchive}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.vaultRow}>
                <View style={{flex: 1, paddingRight: 8}}>
                  <Text style={styles.vaultLabel}>{item.label}</Text>
                  <Text style={styles.vaultTime}>Deleted at {item.timestamp}</Text>
                </View>
                <TouchableOpacity style={styles.restoreButton} onPress={() => restoreSessionFromArchive(item)}>
                  <Text style={styles.restoreButtonText}>🔄 Restore</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBinContainer}>
                <Text style={styles.emptyText}>Your recovery vault is empty. Any logs cleared from your shift ledger will back up here automatically.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* SETUP CONFIGURATION SCREEN */}
      {currentScreen === 'settings' && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Metrics Setup</Text>
          <Text style={styles.label}>Your Minimum Target ($ / Hour Net)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={requiredHourly} onChangeText={setRequiredHourly} />

          <Text style={styles.label}>Current Petrol Price (per Litre $)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={petrolCost} onChangeText={setPetrolCost} />

          <Text style={styles.label}>Fuel Consumption (Litres / 100 Km)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={carL100k} onChangeText={setCarL100k} />

          <Text style={styles.label}>Wear & Tear Overhead (Maintenance, Tires, Oil/Km)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={runningCostPerKm} onChangeText={setRunningCostPerKm} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// --- STYLING PATTERNS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  scrollContainer: { padding: 22 },
  sessionContainer: { flex: 1, padding: 20 },
  title: { fontSize: 21, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: '#111' },
  navBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  navButton: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeNav: { borderBottomWidth: 3, borderBottomColor: '#FF3008' },
  navText: { fontSize: 13, fontWeight: '600', color: '#222' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d0d0d0', padding: 12, marginBottom: 16, borderRadius: 8, fontSize: 16 },
  fuelContextText: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 16, marginTop: -4 },
  calcButton: { backgroundColor: '#FF3008', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  calcButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  
  modeSelectorContainer: { flexDirection: 'row', backgroundColor: '#eee', borderRadius: 8, padding: 4, marginBottom: 15 },
  modeTabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  modeTabActiveLeft: { backgroundColor: '#fff' },
  modeTabActiveRight: { backgroundColor: '#fff' },
  modeTabTxt: { fontSize: 13, fontWeight: '600', color: '#666' },
  modeTabTxtActive: { color: '#111', fontWeight: '700' },

  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', marginVertical: 10 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#222' },
  toggleSubLabel: { fontSize: 12, color: '#666', marginTop: 2, lineHeight: 16 },

  resultBox: { marginTop: 20, padding: 18, borderRadius: 10, borderWidth: 2, alignItems: 'center' },
  greenBox: { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
  redBox: { backgroundColor: '#ffebee', borderColor: '#c62828' },
  resultVerdict: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  resultDetails: { fontSize: 14, fontWeight: '500', marginVertical: 2, color: '#333' },
  resultSubDetails: { fontSize: 11, color: '#666', marginBottom: 4 },
  logButton: { backgroundColor: '#1976d2', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, marginTop: 12 },
  logButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  chartContainer: { backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 14 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 10, textAlign: 'center' },
  pieBarTrack: { flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: '#eee', marginBottom: 10 },
  pieSegment: { height: '100%' },
  chartLegendRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginVertical: 2 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendText: { fontSize: 11, fontWeight: '500', color: '#555' },

  statsDashboard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#555', marginBottom: 2, textAlign: 'center' },
  statVal: { fontSize: 14, fontWeight: '700' },
  centerStatRow: { marginVertical: 12, alignItems: 'center' },
  centerStatText: { fontSize: 11, color: '#666', fontWeight: '500', textAlign: 'center' },
  
  /* NEW STANDALONE COMPONENT STYLES */
  standaloneTipBox: { flexDirection: 'row', marginBottom: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 8, overflow: 'hidden', alignItems: 'center' },
  standaloneTipInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, backgroundColor: '#fff' },
  standaloneTipButton: { backgroundColor: '#673ab7', paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
  standaloneTipButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  listHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  clearText: { color: '#c62828', fontWeight: '600', fontSize: 13 },
  
  tripRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  tripRowIndex: { fontSize: 13, fontWeight: '700', color: '#888', marginRight: 10 },
  tripRowTitle: { fontSize: 14, fontWeight: '700', color: '#222' },
  tripRowSub: { fontSize: 11, color: '#666', marginTop: 1 },
  tripRowNet: { fontSize: 14, fontWeight: '700', color: '#2e7d32' },
  tripRowFriendNet: { fontSize: 12, fontWeight: '600', color: '#1565c0', marginTop: 1 },
  
  deleteButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff5f5', borderRadius: 6, borderWidth: 1, borderColor: '#ffe3e3' },
  deleteButtonText: { color: '#c62828', fontSize: 11, fontWeight: '700' },
  
  vaultSubtext: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  vaultRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  vaultLabel: { fontSize: 14, fontWeight: '700', color: '#222' },
  vaultTime: { fontSize: 11, color: '#888', marginTop: 2 },
  restoreButton: { backgroundColor: '#e3f2fd', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#bbdefb' },
  restoreButtonText: { color: '#0d47a1', fontSize: 12, fontWeight: '700' },
  emptyBinContainer: { padding: 30, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 13, paddingHorizontal: 10, lineHeight: 18 }
});
