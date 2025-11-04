import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient" 

// --- STATIC DATA FOR SUGGESTED WORKOUTS (EXPANDED) ---
const DAILY_CARDIO_LOG = {
    title: "Daily 30-Minute Cardio Session",
    type: "Cardio",
    duration: 30,
    calories: 300,
    description: "A crucial daily session to boost metabolism and cardiovascular health. Can be walking, jogging, cycling, or rowing.",
    youtubeLink: "https://www.youtube.com/embed/P6i2y8Q8S_g" // Daily Cardio Placeholder
};

const DEFAULT_WORKOUTS = [
    { muscle: "Chest", workouts: [
        { 
            title: "Barbell Bench Press", 
            type: "Strength", 
            duration: 60, 
            calories: 400, 
            description: "A compound exercise for the chest, shoulders, and triceps. Focus on keeping a slight arch in your lower back, elbows tucked at a 45° angle, and driving up through your heels.",
            youtubeLink: "https://www.youtube.com/embed/vthMCtgVtFw"
        },
        { 
            title: "Cable Crossover", 
            type: "Isolation", 
            duration: 45, 
            calories: 250,
            description: "An isolation movement that targets the inner and lower chest. Place pulleys high, step forward, and bring your arms together in a wide arc, focusing on squeezing the chest muscles.",
            youtubeLink: "https://www.youtube.com/embed/aoP0s_MjN-g"
        },
        { 
            title: "Dumbbell Flyes (Incline)", 
            type: "Isolation", 
            duration: 30, 
            calories: 200,
            description: "Targets the upper/outer chest. Lie on an incline bench (30-45 degrees) and maintain a slight bend in your elbows throughout the movement.",
            youtubeLink: "https://www.youtube.com/embed/ajd32jD-m5U"
        }
    ] },
    { muscle: "Back", workouts: [
        { 
            title: "Barbell Deadlifts", 
            type: "Compound", 
            duration: 60, 
            calories: 500,
            description: "A full-body lift targeting the posterior chain (glutes, hamstrings, back). Keep your back flat, chest high, and the bar close to your body. Drive your hips through the bar at the top.",
            youtubeLink: "https://www.youtube.com/embed/DCEIwcA_gJo"
        },
        { 
            title: "Lat Pulldown (Wide Grip)", 
            type: "Strength", 
            duration: 40, 
            calories: 300,
            description: "A key exercise for building back width. Focus on pulling the bar down to your upper chest by driving your elbows down and back, squeezing your lats.",
            youtubeLink: "https://www.youtube.com/embed/Il23QYhVCzQ" 
        },
        { 
            title: "T-Bar Row", 
            type: "Strength", 
            duration: 45, 
            calories: 350,
            description: "Excellent for thickness in the middle back and lats. Keep your chest rested on the pad and pull with your elbows, contracting your shoulder blades.",
            youtubeLink: "https://www.youtube.com/embed/7r-A6d8J-gQ"
        }
    ] },
    { muscle: "Legs", workouts: [
        { 
            title: "Barbell Squats", 
            type: "Compound", 
            duration: 55, 
            calories: 480,
            description: "The 'king of all exercises' targeting quads, glutes, and hamstrings. Sit back as if sitting in a chair, keep your chest up, and push up through your heels. Track knees over toes.",
            youtubeLink: "https://www.youtube.com/embed/1xMaFs0L3ao"
        },
        { 
            title: "Leg Extension (Quads)", 
            type: "Isolation", 
            duration: 35, 
            calories: 220,
            description: "An isolation exercise focused on the quadriceps. Ensure your knees align with the machine's pivot point. Slowly extend the leg and squeeze the quads at the top of the movement.",
            youtubeLink: "https://www.youtube.com/embed/rT7DgCr-3pg" 
        },
        { 
            title: "Romanian Deadlifts (RDL)", 
            type: "Compound", 
            duration: 40, 
            calories: 350,
            description: "Targets the hamstrings and glutes with a focus on the stretch. Keep your knees slightly bent and push your hips backward until you feel a deep stretch.",
            youtubeLink: "https://www.youtube.com/embed/JCXUYvkb2YY"
        }
    ] },
    { muscle: "Biceps", workouts: [
        { 
            title: "Incline Dumbbell Curl", 
            type: "Isolation", 
            duration: 30, 
            calories: 180,
            description: "An effective variation that isolates the bicep long head and provides a deeper stretch. Lie on an incline bench and let your arms hang straight down, curling the weight up slowly.",
            youtubeLink: "https://www.youtube.com/embed/ql6SRu7tZcw" 
        },
        { 
            title: "Cable Rope Hammer Curl", 
            type: "Strength", 
            duration: 25, 
            calories: 160,
            description: "Targets the brachialis and brachioradialis (forearm), giving your arm thickness. Use a rope attachment and keep your thumbs up while pulling the rope towards your shoulders.",
            youtubeLink: "https://www.youtube.com/embed/vsarApmqJmo" 
        },
        { 
            title: "Preacher Curl (EZ Bar)", 
            type: "Isolation", 
            duration: 30, 
            calories: 150,
            description: "Locks the arms in position, preventing cheating and increasing isolation on the bicep. Control the eccentric (lowering) phase fully.",
            youtubeLink: "https://www.youtube.com/embed/n4Pq6Q582i0"
        }
    ] },
    { muscle: "Triceps", workouts: [
        { 
            title: "Skullcrushers (EZ Bar)", 
            type: "Isolation", 
            duration: 35, 
            calories: 200,
            description: "Targets all three heads of the triceps. Lie on a flat bench and slowly lower the bar towards your forehead, extending back up using only your triceps. Use a spotter or lighter weight.",
            youtubeLink: "https://www.youtube.com/embed/UCnIm8l8Bxc" 
        },
        { 
            title: "Cable Tricep Pushdown", 
            type: "Isolation", 
            duration: 30, 
            calories: 170,
            description: "A great finishing exercise to ensure a full tricep contraction. Keep your elbows pinned to your sides and push the bar down until your arms are fully extended.",
            youtubeLink: "https://www.youtube.com/embed/2-LAMcpzODU" 
        },
        { 
            title: "Dumbbell Overhead Extension", 
            type: "Isolation", 
            duration: 30, 
            calories: 160,
            description: "Targets the long head of the triceps. Hold one heavy dumbbell overhead with both hands and lower it behind your head, stretching the tricep fully.",
            youtubeLink: "https://www.youtube.com/embed/uG-YQh-lY1E"
        }
    ] },
    { muscle: "Abs", workouts: [
        { 
            title: "Hanging Leg Raises", 
            type: "Bodyweight", 
            duration: 20, 
            calories: 140,
            description: "Targets the lower abdominal muscles and core stability. Hang from a pull-up bar and slowly lift your legs up towards your chest, controlling the descent.",
            youtubeLink: "https://www.youtube.com/embed/rbOJSK07AGA" 
        },
        { 
            title: "Weighted Crunches", 
            type: "Isolation", 
            duration: 15, 
            calories: 110,
            description: "Targets the upper abs. Hold a plate across your chest and perform a controlled crunch, avoiding pulling on your neck. Focus on contracting the abdominal muscles.",
            youtubeLink: "https://www.youtube.com/embed/UhRf7kzLAmc" 
        },
        { 
            title: "Plank (Timed)", 
            type: "Bodyweight", 
            duration: 10, 
            calories: 80,
            description: "Excellent for full core stability. Maintain a straight line from head to heels, squeezing the glutes and abs. Focus on holding for maximum time under tension.",
            youtubeLink: "https://www.youtube.com/embed/ASdvN_X5M60"
        }
    ] },
    { muscle: "Cardio", workouts: [
        { 
            title: "HIIT Sprints", 
            type: "Cardio", 
            duration: 25, 
            calories: 350,
            description: "High-Intensity Interval Training. Alternate between 30 seconds of all-out effort (sprint) and 60 seconds of light jogging or rest. Repeat for 15-25 minutes.",
            youtubeLink: "https://www.youtube.com/embed/PMQ4WVUZvW8" 
        },
        { 
            title: "Steady State Cycling", 
            type: "Cardio", 
            duration: 45, 
            calories: 450,
            description: "Maintain a consistent, moderate effort on a stationary bike or outdoors for extended fat burning and cardiovascular endurance. Keep your heart rate stable.",
            youtubeLink: "https://www.youtube.com/embed/uMqLmIs0ax4" 
        },
        { 
            title: "Battle Ropes (HIIT)", 
            type: "Cardio", 
            duration: 20, 
            calories: 300,
            description: "A high-intensity, low-impact option that hits the upper body. Alternate between waves, slams, and spirals for 30 seconds on, 30 seconds off.",
            youtubeLink: "https://www.youtube.com/embed/i0-T5u48Y78"
        }
    ] }
];
// --- END STATIC DATA ---


export default function WorkoutsTab() {
    const [workouts, setWorkouts] = useState([]);
    const [form, setForm] = useState({ title: '', type: '', date: '', duration: '', calories_burnt: '' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); 
    // State for temporary completion status
    const [completionStatus, setCompletionStatus] = useState({});

    // State for Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWorkoutDetails, setSelectedWorkoutDetails] = useState(null);
    
    // NEW STATE: Tracks if Daily Cardio has been logged in the last 24 hours
    const [hasLoggedDailyCardio, setHasLoggedDailyCardio] = useState(false);

    const fetchWorkouts = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Fetch workouts and their current completion status
        // NOTE: The mock client returns data sorted by date descending.
        let { data } = await supabase.from('workouts').select('*').eq('user_id', user.id).order('date', { ascending: false });
        
        setWorkouts(data);
        
        // Initialize completion status based on database data
        const initialCompletion = {};
        data.forEach(w => {
            // Use w.id as the key, and w.completed (from DB) as the initial value
            initialCompletion[w.id] = w.completed || false; 
        });
        setCompletionStatus(initialCompletion);
        
        // NEW LOGIC: Check for Daily Cardio completion in the last 24 hours
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        const dailyCardioLogged = data.some(w => 
            w.title === DAILY_CARDIO_LOG.title &&
            w.completed && 
            new Date(w.created_at || w.date).getTime() > twentyFourHoursAgo
        );
        setHasLoggedDailyCardio(dailyCardioLogged);
    };

    useEffect(() => { fetchWorkouts() }, []);
    
    // Clear message after a few seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const selectDefaultWorkout = (workout) => {
        // Pre-fill the form using the suggested workout data
        setForm({
            title: workout.title,
            type: workout.type,
            date: new Date().toISOString().substring(0, 10), // Set today's date
            duration: workout.duration.toString(),
            calories_burnt: workout.calories.toString()
        });
        setMessage({ text: `Form pre-filled with ${workout.title}`, type: 'info' });
    };
    
    const showWorkoutDetails = (workout) => {
        setSelectedWorkoutDetails(workout);
        setIsModalOpen(true);
    };

    const addWorkout = async () => {
        setSaving(true);
        setMessage(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !form.title || !form.date) {
            setMessage({ text: 'Error: Title and Date are required.', type: 'error' });
            setSaving(false);
            return;
        }
        
        // CRITICAL: Insert workout with 'completed' set to FALSE by default
        const { error } = await supabase.from('workouts').insert([{ ...form, user_id: user.id, completed: false }]);
        
        if (error) {
            console.error('Supabase Insert Error:', error);
            setMessage({ text: `Error logging workout: ${error.message}`, type: 'error' });
        } else {
            // Success case
            setMessage({ text: `${form.title} added successfully!`, type: 'success' });
            setForm({ title: '', type: '', date: '', duration: '', calories_burnt: '' });
            fetchWorkouts();
        }
        setSaving(false);
    };
    
    // NEW FUNCTION: Log a special, constrained Daily Cardio session
    const logDailyCardio = async () => {
        if (hasLoggedDailyCardio) {
            setMessage({ text: 'Daily Cardio already logged within the last 24 hours!', type: 'error' });
            return;
        }
        
        setSaving(true);
        setMessage(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setMessage({ text: 'Error: Must be logged in to track cardio.', type: 'error' });
            setSaving(false);
            return;
        }
        
        const workoutToLog = {
            title: DAILY_CARDIO_LOG.title,
            type: DAILY_CARDIO_LOG.type,
            date: new Date().toISOString().substring(0, 10),
            duration: DAILY_CARDIO_LOG.duration,
            calories_burnt: DAILY_CARDIO_LOG.calories,
            user_id: user.id,
            completed: true // Log as completed immediately since it's a fixed button
        };
        
        const { error } = await supabase.from('workouts').insert([workoutToLog]);
        
        if (error) {
            console.error('Daily Cardio Log Error:', error);
            setMessage({ text: `Error logging cardio: ${error.message}`, type: 'error' });
        } else {
            setMessage({ text: 'Daily Cardio logged successfully!', type: 'success' });
            // Force set state to true to immediately disable button
            setHasLoggedDailyCardio(true);
            fetchWorkouts();
        }
        setSaving(false);
    };

    const removeWorkout = async (id) => {
        // FIX: Only allow delete if not completed (implied by request)
        const workoutToDelete = workouts.find(w => w.id === id);
        if (workoutToDelete?.completed) {
            setMessage({ text: 'Cannot delete completed workout.', type: 'error' });
            return;
        }

        const { error } = await supabase.from('workouts').delete().eq('id', id);
        if (error) {
            setMessage({ text: `Error deleting workout: ${error.message}`, type: 'error' });
        } else {
            setMessage({ text: 'Workout deleted.', type: 'info' });
            // **UPDATED**: Also remove from local completion state
            setCompletionStatus(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
            fetchWorkouts();
        }
    };

    // NEW: Function to toggle the local completion status
    const toggleCompletion = (id) => {
        setCompletionStatus(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };
    
    // **UPDATED**: Function to finalize and update all completed workouts in the DB using .update().in()
    const finalizeDailyWorkouts = async () => {
        // 1. Create an array containing only the IDs that the user has marked TRUE locally
        const completedIds = Object.keys(completionStatus)
            .filter(id => completionStatus[id] === true);
        
        if (completedIds.length === 0) {
            setMessage({ text: 'No workouts marked as complete to finalize.', type: 'info' });
            return;
        }
        
        // We cannot use window.confirm() in this environment, so we'll just log the confirmation flow.
        console.log(`Simulating confirmation: Mark ${completedIds.length} workout(s) as COMPLETED.`);
        
        setSaving(true);
        
        // 3. Use update() and in() to efficiently update multiple rows
        const { error } = await supabase
            .from('workouts')
            .update({ completed: true }) // Set the completed status to true
            .in('id', completedIds); // Target only the rows with these IDs
        
        if (error) {
            console.error('Finalize Workout Error:', error);
            setMessage({ text: `Failed to finalize workouts: ${error.message}`, type: 'error' });
        } else {
            setMessage({ text: `${completedIds.length} workouts successfully marked complete!`, type: 'success' });
            // Optional: Clean up local state before re-fetch
            setCompletionStatus(prev => {
                const newState = { ...prev };
                completedIds.forEach(id => {
                    newState[id] = true;
                });
                return newState;
            });
            fetchWorkouts(); // Re-fetch to show updated status from DB
        }
        setSaving(false);
    };

    // Filter workouts to only show those currently relevant to the user
    const filterWorkoutsForDisplay = () => {
        // Show if it is NOT completed (completed: false or null)
        return workouts.filter(w => w.completed === false || w.completed === null);
    };
    
    // Get the list of workouts to display
    const workoutsToDisplay = filterWorkoutsForDisplay();


    return (
        <div className="workouts-tab-container">
            {/* --- SECTION 1: ADD WORKOUT FORM --- */}
            <h2 className="fitpulse-title-section" style={{marginBottom: '20px'}}>Log New Session</h2>
            
            {/* User Feedback Message */}
            {message && ( 
                <div 
                    className={`message-bar ${message.type}`} 
                    style={{
                        padding: '12px 20px',
                        marginBottom: '20px',
                        borderRadius: '8px',
                        color: message.type === 'error' ? '#f15955' : (message.type === 'info' ? '#1aace7' : '#38e27d'),
                        background: message.type === 'error' ? '#f159551a' : (message.type === 'info' ? '#1aace71a' : '#38e27d1a'),
                        border: `1px solid ${message.type === 'error' ? '#f15955' : (message.type === 'info' ? '#1aace7' : '#38e27d')}`,
                        textAlign: 'center',
                        fontWeight: 500
                    }}
                >
                    {message.text}
                </div>
            )}

            {/* Grid structure for the form inputs */}
            <div className="workout-form-grid" style={{
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px', 
                maxWidth: '800px', 
                marginBottom: '30px'
            }}>
                {/* Workout Title spans two columns */}
                <input className="fitpulse-input" name="title" placeholder="Workout Title" value={form.title} onChange={handleChange} style={{gridColumn: '1 / span 4'}} />
                
                {/* Remaining inputs are placed side-by-side (2 per row on large screens) */}
                <input className="fitpulse-input" name="type" placeholder="Type (e.g. Cardio)" value={form.type} onChange={handleChange} style={{gridColumn: 'span 2'}} />
                <input className="fitpulse-input" name="date" type="date" placeholder="Date" value={form.date} onChange={handleChange} style={{gridColumn: 'span 2'}} />
                <input className="fitpulse-input" name="duration" placeholder="Duration (min)" type="number" value={form.duration} onChange={handleChange} style={{gridColumn: 'span 2'}} />
                <input className="fitpulse-input" name="calories_burnt" placeholder="Calories Burned" type="number" value={form.calories_burnt} onChange={handleChange} style={{gridColumn: 'span 2'}} />
            </div>
            
            <button className="save-btn" onClick={addWorkout} disabled={saving} style={{marginBottom: '40px'}}>
                {saving ? "Adding..." : "Add Workout"}
            </button>

            {/* --- NEW: Daily Cardio Button --- */}
            <h3 className="fitpulse-title-section" style={{ color:'#38e27d', fontSize: '1.5rem' }}>Daily Essentials</h3>
            <div style={{ width: '100%', maxWidth: '900px', marginBottom: '40px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <button
                    onClick={logDailyCardio}
                    disabled={hasLoggedDailyCardio || saving}
                    className="save-btn"
                    style={{
                        background: hasLoggedDailyCardio ? '#1a2a42' : '#38e27d',
                        color: hasLoggedDailyCardio ? '#a0b2c5' : '#0D1117',
                        border: `1px solid ${hasLoggedDailyCardio ? '#334155' : '#38e27d'}`,
                        padding: '12px 25px',
                        fontSize: '1rem',
                        cursor: hasLoggedDailyCardio ? 'default' : 'pointer'
                    }}
                >
                    {hasLoggedDailyCardio ? '✅ Daily Cardio Logged (24hr Lock)' : 'Log Daily Cardio'}
                </button>
                <button
                    onClick={() => showWorkoutDetails(DAILY_CARDIO_LOG)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#a0b2c5',
                        cursor: 'pointer',
                        fontSize: '1.1rem'
                    }}
                    title="View Daily Cardio Details"
                >
                    <i className="fas fa-info-circle"></i>
                </button>
            </div>

            {/* --- SECTION 2: SUGGESTED WORKOUTS --- */}
            <h3 className="fitpulse-title-section" style={{ color:'#38e27d', fontSize: '1.5rem' }}>Suggested Workouts</h3>
            
            <div className="default-workouts-container" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '100%',
                maxWidth: '900px',
                marginBottom: '40px'
            }}>
                {DEFAULT_WORKOUTS.map(group => (
                    <div key={group.muscle}>
                        <h4 style={{ color:'#1aace7', marginBottom: '10px', fontSize: '1.2rem' }}>{group.muscle} Focus</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {group.workouts.map(w => (
                                <div key={w.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => selectDefaultWorkout(w)}
                                        className="suggested-workout-btn"
                                        style={{
                                            background: '#1a2a42',
                                            color: '#c7d2e4',
                                            border: '1px solid #334155',
                                            padding: '10px 15px',
                                            borderRadius: '8px',
                                            transition: 'background 0.2s',
                                            cursor: 'pointer',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        {w.title}
                                    </button>
                                    
                                    {/* Info Icon Button */}
                                    <button
                                        onClick={() => showWorkoutDetails(w)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#a0b2c5',
                                            cursor: 'pointer',
                                            fontSize: '1.1rem'
                                        }}
                                        title={`View details for ${w.title}`}
                                    >
                                        <i className="fas fa-info-circle"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>


            {/* --- SECTION 3: YOUR LOGGED WORKOUTS --- */}
            <h3 className="fitpulse-title-section" style={{ color:'#c7d2e4', fontSize: '1.5rem' }}>Your Logged Sessions (Recent)</h3>
            <ul className="workout-log-list" style={{ listStyle:'none', padding:0, width: '100%', maxWidth: '900px' }}>
                {workoutsToDisplay.length === 0 && (
                    <li style={{ color:'#94a3b8', padding:'15px', textAlign: 'center' }}>No recent workouts logged or awaiting completion.</li>
                )}
                {workoutsToDisplay.map(w =>
                    <li key={w.id}
                        className="workout-log-item"
                        style={{
                            // CRITICAL: Background logic uses local state OR DB state if finalized
                            background: completionStatus[w.id] ? '#1aace71a' : '#161B22', 
                            border: completionStatus[w.id] ? '1px solid #1aace7' : '1px solid #1a2a42',
                            margin:'8px 0',
                            padding:'15px 20px',
                            borderRadius:'10px',
                            display:'flex',
                            justifyContent:'space-between',
                            alignItems:'center',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                            flexWrap: 'wrap'
                        }}
                    >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'center', fontSize: '1rem' }}>
                            
                            {/* NEW: Completion Status Checkbox/Circle */}
                            <button
                                onClick={() => toggleCompletion(w.id)}
                                // Disable button if already completed in DB (user cannot undo completion easily)
                                disabled={w.completed} 
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    // Green checkmark if completed in DB or locally checked
                                    color: completionStatus[w.id] ? '#1aace7' : '#a0b2c5',
                                    fontSize: '1.2rem',
                                    cursor: w.completed ? 'default' : 'pointer',
                                }}
                            >
                                <i className={completionStatus[w.id] ? "fas fa-check-circle" : "far fa-circle"}></i>
                            </button>
                            
                            <strong style={{ color:'#1aace7', fontWeight: 600 }}>{w.title}</strong>
                            <span style={{ color:'#a0b2c5' }}>{w.type}</span>
                            <span style={{ color:'#a0b2c5' }}>{w.date}</span>
                            <span style={{ color:'#38e27d', fontWeight: 600 }}>{w.duration} min</span>
                            <span style={{ color:'#f15955', fontWeight: 600 }}>{w.calories_burnt} kcal</span>
                        </div>
                        <button 
                            className="save-btn" 
                            style={{ background:'#f15955', padding:'8px 16px', fontSize: '0.9rem' }} 
                            onClick={()=>removeWorkout(w.id)}
                        >
                            Delete
                        </button>
                    </li>
                )}
            </ul>
            
            {/* NEW: Finalize Button */}
            <div style={{ width: '100%', maxWidth: '900px', marginTop: '30px', textAlign: 'center' }}>
                <button
                    onClick={finalizeDailyWorkouts}
                    disabled={saving}
                    className="save-btn"
                    style={{ padding: '12px 30px', fontSize: '1.1rem' }}
                >
                    {saving ? 'Finalizing...' : 'Finalize Completed Workouts'}
                </button>
            </div>
            
            {/* Detail Modal */}
            {isModalOpen && (
                <WorkoutDetailModal 
                    workout={selectedWorkoutDetails} 
                    onClose={() => setIsModalOpen(false)} 
                />
            )}
        </div>
    );
}