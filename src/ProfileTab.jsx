import { useEffect, useState } from "react" 
import { supabase } from "./supabaseClient"

// --- Component for individual metric cards (View Mode) ---
const ProfileMetricCard = ({ label, value, unit = '', color = '#1aace7', primary = false }) => (
    <div style={{
        background: `linear-gradient(135deg, ${color}15, #161B22)`,
        border: `1px solid ${color}80`,
        borderRadius: '12px',
        padding: '15px',
        textAlign: 'center',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease',
        minWidth: '140px',
        margin: '5px 0'
    }} className="profile-metric-card">
        <div style={{
            fontSize: primary ? '1.8rem' : '1.5rem',
            fontWeight: 800,
            color: color,
            textShadow: `0 0 5px ${color}50`
        }}>
            {value} {unit}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#a0b2c5', marginTop: '5px' }}>
            {label}
        </div>
    </div>
);
// --------------------------------------------------------

// ProfileTab now accepts the 'profile' prop passed from App.jsx
function ProfileTab({ onProfileSaved, profile }) { 
    // Data is loaded by parent (App.jsx), so we remove internal fetching/loading states
    const [editing, setEditing] = useState(true) // FIX: Always start in editing mode if profile is new
    const [saving, setSaving] = useState(false)
    const [editForm, setEditForm] = useState(profile) 

    const currentProfile = profile; 

    // Sync edit form with profile prop whenever it changes (after App.jsx refreshes data)
    useEffect(() => {
        setEditForm(currentProfile);
        // If the profile object is empty (new user), we immediately set editing to true
        if (!currentProfile || !currentProfile.user_id) { // Use user_id for a robust check
            setEditing(true);
        } else {
            setEditing(false); // If profile exists, start in view mode
        }
    }, [currentProfile]);

    const handleEdit = () => {
        setEditForm({
            name: currentProfile?.name || '',
            age: currentProfile?.age || '',
            height: currentProfile?.height || '',
            weight: currentProfile?.weight || '',
            goal: currentProfile?.goal || '',
            gender: currentProfile?.gender || '' // Added gender to edit form
        })
        setEditing(true)
    }

    const handleChange = e => setEditForm({ ...editForm, [e.target.name]: e.target.value })

    const handleSave = async () => {
        setSaving(true)
        
        const { data: { user } } = await supabase.auth.getUser()
        
        // FIX: If profile.id is NOT available (new user), we MUST NOT pass 'id' to upsert.
        const profileId = currentProfile?.id;
        
        const dataToSave = { 
            ...editForm, 
            user_id: user.id, 
            // Only include 'id' if we are certain it exists (i.e., we are updating)
            ...(profileId && { id: profileId })
        };
        
        // Ensure numbers are parsed correctly if coming from text inputs
        dataToSave.age = parseInt(dataToSave.age) || null;
        dataToSave.height = parseInt(dataToSave.height) || null;
        dataToSave.weight = parseFloat(dataToSave.weight) || null;

        const { error } = await supabase.from('profiles').upsert([dataToSave], { onConflict: ['user_id'] });
        
        if (error) {
            console.error('Profile Save Error:', error);
            alert(`Error saving profile: ${error.message}`);
        }
        
        setSaving(false)
        setEditing(false)
        if (onProfileSaved) onProfileSaved() // Triggers App.jsx to re-fetch the new profile data
    }

    const handleCancel = () => setEditing(false)
    
    // --- Render Components ---
    
    const profileExists = currentProfile && currentProfile.user_id;

    return (
        <div style={{ width: '100%' }}> 
            
            {/* Header and Readout */}
            <h2 className="fitpulse-title-section" style={{ color: '#D4F4FF', marginBottom: '30px', borderBottomColor: '#1aace780' }}>
                USER PROFILE READOUT <span style={{ color: '#38e27d' }}>| {currentProfile?.name || 'GUEST'}</span>
            </h2>

            {/* If profile doesn't exist AND we are not editing, prompt the user */}
            {!profileExists && !editing && (
                <div style={{ color: '#ff6f61', textAlign: 'center', padding: '40px', border: '1px solid #ff6f6150', borderRadius: '10px' }}>
                    <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                        SYSTEM ALERT: Profile data missing. Please click "Edit Profile" to set your goals and metrics. 🚨
                    </p>
                    <button className="save-btn" onClick={handleEdit} style={{ background: '#ff6f61', marginTop: '20px' }}>
                        Set Up Profile
                    </button>
                </div>
            )}
            
            {editing ? (
                // --- EDIT MODE ---
                <div className="profile-edit-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                    width: '100%',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <input className="fitpulse-input" name="name" placeholder="Name" value={editForm?.name || ''} onChange={handleChange} autoFocus style={{ gridColumn: '1 / -1' }} />
                    
                    <input className="fitpulse-input" name="age" placeholder="Age" type="number" value={editForm?.age || ''} onChange={handleChange} />
                    <input className="fitpulse-input" name="gender" placeholder="Gender" value={editForm?.gender || ''} onChange={handleChange} />
                    <input className="fitpulse-input" name="height" placeholder="Height (cm)" type="number" value={editForm?.height || ''} onChange={handleChange} />
                    <input className="fitpulse-input" name="weight" placeholder="Weight (kg)" type="number" value={editForm?.weight || ''} onChange={handleChange} />
                    
                    {/* Goal Input/Selector */}
                    <select 
                        className="fitpulse-input" 
                        name="goal" 
                        value={editForm?.goal || ''} 
                        onChange={handleChange} 
                        style={{ gridColumn: '1 / -1', appearance: 'none', WebkitAppearance: 'none' }}
                    >
                        <option value="" disabled>Select Primary Fitness Goal</option>
                        <option value="Lean">Lean (Aggressive Cut)</option>
                        <option value="Recomposition">Recomposition (Build/Cut)</option>
                        <option value="Bulk">Bulk (Muscle Gain)</option>
                        <option value="Maintain">Maintain</option>
                        <option value="Performance">Performance/Endurance</option>
                    </select>

                    <div className="profile-btn-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '20px' }}>
                        <button className="save-btn" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                            {saving ? "SAVING DATA" : "SAVE PROFILE"}
                        </button>
                        {profileExists && <button className="cancel-btn" onClick={handleCancel} disabled={saving} style={{ flex: 1 }}>
                            CANCEL
                        </button>}
                    </div>
                </div>
            ) : (
                // --- VIEW MODE (The Super Duper Readout) ---
                <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>

                    {/* NAME and GOAL Card */}
                    <div className="fitpulse-card" style={{ 
                        marginBottom: '30px', 
                        padding: '25px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        background: 'linear-gradient(135deg, #1a2a42, #0D1117)',
                        border: '1px solid #1aace7',
                        width: '100%'
                    }}>
                        <div style={{ fontSize: '1.2rem', color: '#a0b2c5' }}>Designated User | {currentProfile?.gender?.toUpperCase() || 'N/A'}</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#D4F4FF', textShadow: '0 0 10px #1aace7' }}>
                            {currentProfile?.name || 'USER_ID'}
                        </div>
                        <div style={{ marginTop: '15px', fontSize: '1.5rem', fontWeight: 700, color: '#38e27d' }}>
                            GOAL: {currentProfile?.goal?.toUpperCase() || 'UNDEFINED'}
                        </div>
                    </div>

                    {/* METRICS GRID */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '20px',
                        marginBottom: '40px'
                    }}>
                        <ProfileMetricCard 
                            label="AGE" 
                            value={currentProfile.age || 'N/A'} 
                            color="#ff6f61" 
                        />
                        <ProfileMetricCard 
                            label="HEIGHT" 
                            value={currentProfile.height || 'N/A'} 
                            unit="cm" 
                            color="#1aace7" 
                        />
                        <ProfileMetricCard 
                            label="WEIGHT" 
                            value={currentProfile.weight || 'N/A'} 
                            unit="kg" 
                            color="#38e27d" 
                        />
                        <ProfileMetricCard 
                            label="BMI" 
                            value={ (currentProfile.weight && currentProfile.height) 
                                ? (currentProfile.weight / ((currentProfile.height / 100) ** 2)).toFixed(1) 
                                : 'N/A'} 
                            color="#f7e018"
                        />
                    </div>
                    
                    <button className="save-btn" onClick={handleEdit} style={{ 
                        width: '100%', 
                        maxWidth: '400px', 
                        margin: '0 auto',
                        display: 'block',
                        background: '#1aace7' 
                    }}>
                        <i className="fas fa-edit" style={{ marginRight: '10px' }}></i>
                        EDIT PROFILE DATA
                    </button>
                </div>
            )}
        </div>
    )
}

export default ProfileTab
