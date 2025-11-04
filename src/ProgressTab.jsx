import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

// We will mock the supabase client inside this file for this environment


// ------------------------------------------
// 1. CRITICAL CHARTING IMPORTS & SETUP
// ------------------------------------------
import { Line } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    Title, 
    Tooltip, 
    Legend 
} from 'chart.js';

// Register Chart.js components (REQUIRED SETUP)
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);
// ------------------------------------------

// Helper function for date formatting (YYYY-MM-DD)
const getTodayDateString = () => new Date().toISOString().substring(0, 10);

// Calorie conversion constant (7700 kcal per 1 kg)
const KCAL_PER_KG = 7700;

// Helper to calculate Projected Weight Data
const generateProjectedData = (actualWeightLogs, allWorkouts, allNutritionLogs) => {
    
    let startingWeight;
    let startDate;

    if (actualWeightLogs.length === 0 || !actualWeightLogs[0]?.weight) {
        // FALLBACK FIX: Use a dummy weight and start date if no actual logs exist
        startingWeight = 75; // Default start weight
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 3); // Start projection 3 days ago
    } else {
        // Use the latest actual recorded weight
        const latestActualLog = actualWeightLogs[0];
        startingWeight = latestActualLog.weight;
        startDate = new Date(latestActualLog.date);
    }
    
    // Sort logs by date ascending (needed for chronological projection)
    const sortedNutrition = allNutritionLogs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const sortedWorkouts = allWorkouts.filter(w => w.completed).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const calorieHistory = {};

    // 1. Map all calorie data by date with stronger null checks
    [...sortedNutrition, ...sortedWorkouts].forEach(log => {
        const date = log.date;
        // Skip logs without a valid date
        if (!date) return; 

        if (!calorieHistory[date]) {
            calorieHistory[date] = { consumed: 0, burned: 0 };
        }
        
        // Use safer parsing with fallback to 0
        const consumed = parseInt(log.calories_consumed) || 0;
        const burned = parseFloat(log.calories_burnt) || 0;

        calorieHistory[date].consumed += consumed;
        calorieHistory[date].burned += burned;
    });

    const projectedData = [];
    let currentWeight = startingWeight;
    let currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Project daily weight forward
    while (currentDate <= today) {
        const dateString = currentDate.toISOString().substring(0, 10);
        const dailyCals = calorieHistory[dateString];

        // Ensure the projection starts at the actual weight baseline date
        if (projectedData.length === 0 && currentDate.getTime() === startDate.getTime()) {
             projectedData.push({ date: dateString, weight: startingWeight });
        }
        
        if (currentDate.getTime() > startDate.getTime()) {
            
            let netChangeKg = 0;
            if (dailyCals) {
                const netBalance = dailyCals.consumed - dailyCals.burned;
                netChangeKg = netBalance / KCAL_PER_KG;
            }
            
            currentWeight += netChangeKg;
            
            // Add point for every day
            projectedData.push({ date: dateString, weight: parseFloat(currentWeight.toFixed(2)) });
        }

        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return { projectedData, latestWeight: actualWeightLogs.length > 0 ? actualWeightLogs[0].weight : startingWeight };
};


// --- 1. ProgressChart Component (Functional) ---
const ProgressChart = ({ progressLogs, projectedData, goalWeight }) => {
    // Data preparation
    const actualLogsAsc = [...progressLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Combine all unique dates for the X-axis labels
    const allDatesSet = new Set(actualLogsAsc.map(l => l.date).concat(projectedData.map(p => p.date)));
    const allDates = Array.from(allDatesSet).sort();
    
    // Create datasets for the chart
    const actualDataPoints = allDates.map(date => {
        const log = actualLogsAsc.find(l => l.date === date);
        return log ? log.weight : null; // Use null for days without actual logging
    });

    const projectedDataPoints = allDates.map(date => {
        const log = projectedData.find(l => l.date === date);
        const actualLog = actualLogsAsc.find(l => l.date === date);
        
        // If an actual measurement exists for this date, the projection stops there.
        if (actualLog) return null;
        
        if (log) return log.weight;
        
        return null;
    });
    
    // NEW: Goal Weight Data Points (A flat line across all dates)
    const goalWeightPoints = allDates.map(() => {
        const weight = parseFloat(goalWeight);
        return isNaN(weight) || weight <= 0 ? null : weight;
    });

    const chartData = {
        labels: allDates,
        datasets: [
            {
                label: 'Actual Weight',
                data: actualDataPoints,
                borderColor: '#ff6f61', // Red/Orange for Actual Tracking
                backgroundColor: '#ff6f6133',
                tension: 0.2, 
                spanGaps: true, // Connect gaps between actual logs
                pointRadius: 6,
                pointHoverRadius: 8,
            },
            {
                label: 'Projected Weight',
                data: projectedDataPoints,
                borderColor: '#1aace780', // Blue/Light for Projection
                borderDash: [5, 5], // Dotted line for projection
                backgroundColor: 'transparent',
                tension: 0.2,
                pointRadius: 3,
                pointHoverRadius: 5,
            },
            // NEW: Goal Weight Dataset
            ...(goalWeightPoints.some(p => p !== null) ? [{
                label: 'Goal Weight',
                data: goalWeightPoints,
                borderColor: '#f7e018', // Yellow/Gold for Goal
                borderDash: [10, 5], // Long dashed line for Goal
                backgroundColor: 'transparent',
                tension: 0,
                pointRadius: 0,
                pointHoverRadius: 0,
            }] : []),
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                labels: { color: '#a0b2c5' }
            },
            title: { display: false },
        },
        scales: {
            x: { title: { display: true, text: 'Date', color: '#a0b2c5' }, ticks: { color: '#a0b2c5' }, grid: { color: '#334155' } },
            y: { title: { display: true, text: 'Weight (kg)', color: '#a0b2c5' }, ticks: { color: '#a0b2c5' }, grid: { color: '#334155' } },
        },
    };
    
    // Historical change calculation remains the same
    const latestWeight = progressLogs[0]?.weight;
    const oldestWeight = progressLogs[progressLogs.length - 1]?.weight;
    const weightChange = latestWeight && oldestWeight ? latestWeight - oldestWeight : 0;


    return (
        <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(145deg, #1c2333, #161B22)', 
            borderRadius: '12px', 
            marginBottom: '30px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
        }}>
            <h3 style={{ color: '#ff6f61', marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>📊</span> Body Composition Trajectory
            </h3>
            
            <div style={{ height: '300px' }}>
                <Line data={chartData} options={options} />
            </div>
            
            {progressLogs.length > 1 && (
                <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 600, color: weightChange >= 0 ? '#ff6f61' : '#38e27d' }}>
                    Last Measured Change: {Math.abs(weightChange).toFixed(1)} kg 
                    {weightChange !== 0 ? (weightChange > 0 ? ' (Bulking Hard 💪)' : ' (Shredding Status 🔪)') : ' (Static)'}
                </p>
            )}
        </div>
    );
};


// --- 2. Main ProgressTab Component ---
export default function ProgressTab({ profile }) {
    // Data States
    const [progressLogs, setProgressLogs] = useState([]);
    const [workouts, setWorkouts] = useState([]);
    const [nutritionLogs, setNutritionLogs] = useState([]);
    const [dailyNetBalance, setDailyNetBalance] = useState(0); 
    const [projectedData, setProjectedData] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // Goal Weight State (Initialized from profile prop, if available)
    const [goalWeight, setGoalWeight] = useState(profile?.goal_weight || '');
    const [savingGoal, setSavingGoal] = useState(false);

    // --- Data Fetching and Calculation ---
    const fetchAnalyticsData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const today = getTodayDateString();

        // 1. Fetch Weight/Notes Progress (ordered by date descending for chart/latest info)
        const { data: progressData } = await supabase.from('progress').select('*').eq('user_id', user.id).order('date', { ascending: false });
        setProgressLogs(progressData || []);
        
        // 2. Fetch all Workouts (for historical metrics)
        const { data: allWorkoutData } = await supabase.from('workouts').select('*').eq('user_id', user.id);
        setWorkouts(allWorkoutData || []);

        // 3. Fetch all Nutrition Logs (for historical metrics)
        const { data: allNutritionData } = await supabase.from('nutrition_logs').select('*').eq('user_id', user.id);
        setNutritionLogs(allNutritionData || []);

        // 4. CRITICAL: Generate Projection Data
        const projectionResult = generateProjectedData(progressData || [], allWorkoutData || [], allNutritionData || []);
        setProjectedData(projectionResult.projectedData);

        // 5. CRITICAL: Calculate TODAY's Net Balance
        const todayCalsConsumed = (allNutritionData || []).filter(n => n.date === today).reduce((sum, n) => sum + (parseInt(n.calories_consumed) || 0), 0);
        const todayCalsBurned = (allWorkoutData || []).filter(w => w.date === today && w.completed).reduce((sum, w) => sum + (parseFloat(w.calories_burnt) || 0), 0);
        
        const netBalance = todayCalsConsumed - todayCalsBurned;
        setDailyNetBalance(netBalance); 
        
        setLoading(false); // Successfully finished fetching and calculating
    };

    useEffect(() => { fetchAnalyticsData() }, []);
    
    // --- NEW GOAL WEIGHT FUNCTION ---
    const handleGoalWeightChange = e => setGoalWeight(e.target.value);

    const saveGoalWeight = async () => {
        if (!goalWeight) return;

        setSavingGoal(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            setSavingGoal(false);
            return;
        }

        const payload = { 
            user_id: user.id, 
            goal_weight: parseFloat(goalWeight), 
        };

        // Simulating the upsert to the 'profiles' table (where goal weight should live)
        const { error } = await supabase.from('profiles').upsert([payload], { onConflict: ['user_id'] });

        if (error) {
            console.error('Error saving goal weight:', error);
            // Using console.error instead of alert per instructions
        } else {
            console.log("Goal weight saved successfully (MOCK)");
            // In a real app, you would update the profile state in the parent App.jsx here
        }
        setSavingGoal(false);
    };
    
    // --- Data Processing for Display Metrics ---
    
    const completedWorkouts = workouts.filter(w => w.completed);
    const totalWorkouts = completedWorkouts.length;
    const totalCalsBurned = completedWorkouts.reduce((sum, w) => sum + (parseFloat(w.calories_burnt) || 0), 0);
    const workoutCompletionRate = totalWorkouts > 0 ? ((completedWorkouts.length / totalWorkouts) * 100).toFixed(0) : 0;
    
    // Aggregate totals from all historical logs for the summary cards
    const totalCalsConsumed = nutritionLogs.reduce((sum, n) => sum + (parseInt(n.calories_consumed) || 0), 0);
    const totalProtein = nutritionLogs.reduce((sum, n) => sum + (parseInt(n.macro_protein_g) || 0), 0);
    const totalCarbs = nutritionLogs.reduce((sum, n) => sum + (parseInt(n.macro_carbs_g) || 0), 0);
    const totalFat = nutritionLogs.reduce((sum, n) => sum + (parseInt(n.macro_fat_g) || 0), 0);

    // NEW: Strength vs Cardio Balance
    const strengthWorkouts = completedWorkouts.filter(w => ['Strength', 'Compound', 'Isolation'].includes(w.type));
    const cardioWorkouts = completedWorkouts.filter(w => ['Cardio', 'Bodyweight'].includes(w.type));
    const strengthPercent = completedWorkouts.length > 0 ? ((strengthWorkouts.length / completedWorkouts.length) * 100).toFixed(0) : 0;
    const cardioPercent = completedWorkouts.length > 0 ? ((cardioWorkouts.length / completedWorkouts.length) * 100).toFixed(0) : 0;


    // --- Utility Rendering Function (for engaging workout history) ---
    const renderWorkoutLog = (workout, index) => {
        // Mock data doesn't have an ID, so use index
        const isCompleted = workout.completed;
        const bgColor = isCompleted ? '#38e27d1a' : '#ff6f611a'; // Green for Success, Red/Orange for Planned/Missed
        const borderColor = isCompleted ? '#38e27d' : '#ff6f61';
        const statusText = isCompleted ? '✅ Completed' : '🗓️ Planned';

        return (
            <li 
                key={index} 
                style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    margin: '6px 0',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.95rem',
                    color: '#c7d2e4'
                }}
            >
                <div style={{ fontWeight: 600 }}>
                    {workout.title || "Workout"} on {workout.date} 
                    <span style={{ marginLeft: '10px', color: borderColor, fontWeight: 700 }}>({statusText})</span>
                </div>
                <div style={{ color: isCompleted ? '#38e27d' : '#a0b2c5' }}>
                    {workout.duration || '--'} min | {parseFloat(workout.calories_burnt || 0).toFixed(0)} kcal
                </div>
            </li>
        );
    };
    
    // --- Net Balance Insight Logic (Updated with Gym Humor) ---
    const getNetBalanceInsight = (balance) => {
        const absBalance = Math.abs(balance);
        let color, message;

        if (balance > 500) {
            color = '#f15955';
            message = `🚨 Code Red! You’re packing on a +${absBalance.toFixed(0)} kcal surplus. We're training, not inflating! Hit the treadmill, stat! 🏃`;
        } else if (balance > 100) {
            color = '#ff6f61';
            message = `⚠️ Moderate Bulk: You’re in a +${absBalance.toFixed(0)} kcal surplus. Good fuel for muscle growth, but keep the macros clean, bro! 🍞🥩`;
        } else if (balance < -500) {
            color = '#38e27d';
            message = `🔥 SHREDDING MODE: You've crushed a -${absBalance.toFixed(0)} kcal deficit. Your abs are sending thank you notes. Keep crushing it! 💯`;
        } else if (balance < -100) {
            color = '#1aace7';
            message = `✅ Deficit King: Solid -${absBalance.toFixed(0)} kcal deficit. That’s the kind of consistency that builds legends. Keep that momentum! 🥇`;
        } else {
            color = '#c7d2e4';
            message = `⚖️ Maintenance Zone: Net balance is nearly zero (${balance.toFixed(0)} kcal). Perfect equilibrium. You're holding the exact same aesthetic. ✨`;
        }
        
        return <p style={{ color, fontWeight: 700, fontSize: '1.4rem', textAlign: 'center', marginBottom: '30px' }} dangerouslySetInnerHTML={{ __html: message.replace(/\*\*/g, '') }} />;
    };
    
    // --- Main Component Render ---
    return (
        <div className="progress-tab-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            {/* CSS for animations and interactive elements */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .fitpulse-card, .progress-chart-container {
                    animation: fadeIn 0.8s ease-out forwards;
                }

                .fitpulse-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
                    transition: all 0.3s ease-in-out;
                }

                .save-btn:hover {
                    transform: scale(1.02);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
                    transition: all 0.2s ease-in-out;
                }
                
                .fitpulse-input {
                    padding: 12px 15px;
                    border-radius: 8px;
                    border: 1px solid #334155;
                    background-color: #0D1117;
                    color: #e2e8f0;
                    font-size: 1rem;
                    transition: border-color 0.3s ease;
                }

                .fitpulse-input:focus {
                    border-color: #1aace7;
                    outline: none;
                }
            `}</style>

            <h2 className="fitpulse-title-section" style={{ marginBottom: '30px' }}>The Official GAINS Summary 👑</h2>
            
            {loading && <p style={{ textAlign: 'center', color: '#1aace7' }}>Spotting your data... almost there! 🏋️</p>}
            
            {!loading && (
                <>
                    {/* --- TODAY'S NET BALANCE INSIGHT (Motivational) --- */}
                    {getNetBalanceInsight(dailyNetBalance)}

                    {/* --- NEW SECTION: SET GOAL WEIGHT FORM --- */}
                    <div className="fitpulse-card" style={{ 
                        padding: '25px', 
                        borderRadius: '12px', 
                        marginBottom: '30px', 
                        border: '1px solid #ff6f6150',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                        maxWidth: '100%', 
                        overflow: 'hidden',
                    }}>
                        <h4 style={{ color: '#ff6f61', marginBottom: '15px' }}>🎯 Set Your Goal Weight (Target)</h4>
                        <div style={{ 
                            display: 'flex', 
                            gap: '10px', 
                            alignItems: 'center', 
                            flexWrap: 'wrap',
                            width: '100%', 
                        }}>
                            {/* Only Goal Weight Input */}
                            <input 
                                className="fitpulse-input" 
                                name="goal_weight" 
                                placeholder="Goal Weight (kg)" 
                                type="number" 
                                value={goalWeight} 
                                onChange={handleGoalWeightChange} 
                                style={{ flex: '2 1 150px', minWidth: '150px' }}
                            />
                            
                            <button 
                                className="save-btn" 
                                onClick={saveGoalWeight} 
                                disabled={savingGoal || !goalWeight || parseFloat(goalWeight) <= 0}
                                style={{ flex: '1 1 100px', background: '#ff6f61', color: '#0D1117', padding: '12px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, minWidth: '100px' }}
                            >
                                {savingGoal ? "Saving..." : "Save Goal"}
                            </button>
                        </div>
                    </div>
                    {/* --- END SET GOAL WEIGHT FORM --- */}

                    {/* --- SECTION: ANALYTICS CHART (NOW WITH PROJECTION AND GOAL) --- */}
                    <ProgressChart 
                        progressLogs={progressLogs} 
                        projectedData={projectedData} 
                        goalWeight={profile?.goal_weight} /* Pass goal weight from profile prop */
                    />
                    
                    {/* --- SECTION: SUMMARY METRICS (FIXED WIDTHS) --- */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                        gap: '20px', 
                        marginBottom: '40px' 
                    }}>
                        {/* Workout Card */}
                        <div className="fitpulse-card" style={{ 
                            background: 'linear-gradient(135deg, #1aace71a, #1aace705)', 
                            border: '1px solid #1aace7', 
                            padding: '25px', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                            transition: 'all 0.3s ease-in-out', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            minWidth: '300px',
                            overflow: 'hidden'
                        }}>
                            <h4 style={{ color: '#1aace7', marginBottom: '10px' }}>⚡ Total Workout DOMINATION</h4>
                            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#1aace7', overflowWrap: 'break-word' }}>{totalWorkouts} Sessions</p>
                            <p style={{ color: '#a0b2c5', overflowWrap: 'break-word', wordBreak: 'break-word' }}>Completion Rate: {workoutCompletionRate}% (Get that PR!) </p>
                            <p style={{ color: '#a0b2c5', overflowWrap: 'break-word', wordBreak: 'break-word' }}>Calories Burned: {totalCalsBurned.toFixed(0)} kcal</p>
                            <p style={{ color: '#a0b2c5', overflowWrap: 'break-word', wordBreak: 'break-word' }}>Focus Split: {strengthPercent}% Strength / {cardioPercent}% Cardio</p> 
                        </div>

                        {/* Nutrition Card (FINAL FIX) */}
                        <div className="fitpulse-card" style={{ 
                            background: 'linear-gradient(135deg, #38e27d1a, #38e27d05)', 
                            border: '1px solid #38e27d', 
                            padding: '25px', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                            transition: 'all 0.3s ease-in-out', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            minWidth: '300px',
                            overflow: 'hidden'
                        }}>
                            <h4 style={{ color: '#38e27d', marginBottom: '10px' }}>⛽ Total Fuel Intake (Macros)</h4>
                            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#38e27d', overflowWrap: 'break-word' }}>{totalCalsConsumed} kcal</p>
                            {/* CRITICAL: Added wordBreak: 'break-word' to prevent stretching */}
                            <p style={{ color: '#a0b2c5', overflowWrap: 'break-word', wordBreak: 'break-word' }}>Protein: {totalProtein}g (Muscle Juice 🥩)</p>
                            <p style={{ color: '#a0b2c5', overflowWrap: 'break-word', wordBreak: 'break-word' }}>Carbs: {totalCarbs}g (Energy Source 🍚)</p>
                            <p style={{ color: '#a0b2c5', overflowWrap: 'break-word', wordBreak: 'break-word' }}>Fat: {totalFat}g (Essential Fuel 🥑)</p>
                        </div>
                    </div>

                    {/* --- DIVIDED TRACK SECTIONS (Fixed Layout) --- */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                        gap: '30px' 
                    }}>
                        
                        {/* --- DIET TRACK (Latest Logs) --- */}
                        <div className="fitpulse-card" style={{ 
                            background: 'linear-gradient(145deg, #1c2333, #161B22)', 
                            border: '1px solid #334155', 
                            padding: '20px', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                            transition: 'all 0.3s ease-in-out', // Added for hover
                            display: 'flex', 
                            flexDirection: 'column', 
                            height: '100%' 
                        }}>
                            <h3 style={{ color: '#1aace7', marginBottom: '15px' }}>🍽️ Recent Fuel Logs</h3>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {nutritionLogs.slice(0, 5).map((n, index) => (
                                    <li 
                                        key={index} 
                                        style={{
                                            background: '#161B22', 
                                            border: '1px solid #334155', 
                                            padding: '10px 15px', 
                                            borderRadius: '8px', 
                                            margin: '6px 0',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            color: '#c7d2e4'
                                        }}
                                    >
                                        <div style={{ fontWeight: 600 }}>
                                            {n.meal_time} ({n.date})
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#a0b2c5' }}>
                                            {n.calories_consumed} kcal | P:{n.macro_protein_g}g
                                        </div>
                                    </li>
                                ))}
                                {nutritionLogs.length === 0 && <li style={{ color: '#94a3b8' }}>You gotta eat to get big. Log some food! 🍔</li>}
                            </ul>
                        </div>

                        {/* --- WORKOUT TRACK (Latest Logs) --- */}
                        <div className="fitpulse-card" style={{ 
                            background: 'linear-gradient(145deg, #1c2333, #161B22)', 
                            border: '1px solid #334155', 
                            padding: '20px', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                            transition: 'all 0.3s ease-in-out', // Added for hover
                            display: 'flex', 
                            flexDirection: 'column', 
                            height: '100%' 
                        }}>
                            <h3 style={{ color: '#38e27d', marginBottom: '15px' }}>💪 Recent DOMS Generators</h3>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {workouts.slice(0, 5).map(renderWorkoutLog)}
                                {workouts.length === 0 && <li style={{ color: '#94a3b8' }}>Stop skipping leg day. Log a workout! 🦵</li>}
                            </ul>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}