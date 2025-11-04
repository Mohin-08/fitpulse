import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import AuthWithProfile from './AuthWithProfile'
import ProfileTab from './ProfileTab'
import WorkoutsTab from './WorkoutsTab'
import NutritionTab from './NutritionTab'
import ProgressTab from './ProgressTab'
import './App.css';
import './animations.css';


function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState(null)

  const [loadingProfile, setLoadingProfile] = useState(true)

  // Function to fetch profile data (now stands alone)
  const fetchProfileData = async (user) => {
    if (!user) {
      setProfile(null);
      return;
    }
    
    setLoadingProfile(true); 
    
    try {
        let { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
        
        if (error) {
            console.error('Supabase Profile Fetch Error:', error);
            setProfile(null);
        } else if (!data) {
             setProfile(null);
        } else {
            setProfile(data);
        }
    } catch (e) {
        console.error('Critical Fetch Exception:', e);
        setProfile(null);
    } finally {
        setLoadingProfile(false);
    }
  }

  // --- PRIMARY EFFECT: Sets up listener and handles initial fetch ONCE ---
  useEffect(() => {
    let isMounted = true; 
    
    const handleAuthChange = (currentSession) => {
        if (!isMounted) return;

        setSession(currentSession);
        
        if (currentSession?.user) {
            fetchProfileData(currentSession.user);
        } else {
            setProfile(null);
            setLoadingProfile(false);
        }
    }

    // 1. Initial session check and data fetch
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
        if (isMounted) handleAuthChange(initialSession);
    });
    
    // 2. Auth state change listener (Handles real-time sign-in/sign-out)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (isMounted) handleAuthChange(newSession);
    });

    return () => {
        isMounted = false;
        listener.subscription.unsubscribe();
    };
  }, []) 

  const handleProfileSaved = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            fetchProfileData(user);
        }
    });
  }

  // --- RENDER LOGIC ---

  if (!session && !loadingProfile) {
    return (
      <div className="fitpulse-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <AuthWithProfile />
      </div>
    )
  }

  if (loadingProfile) {
    return (
      <div className="fitpulse-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: '#fff', fontSize: '1.5rem' }}>Loading profile...</div>
      </div>
    )
  }

  if (!profile && session) {
    return (
      <div className="fitpulse-container">
        <h1 className="fitpulse-title">FitPulse Dashboard</h1> 
        <div className="fitpulse-card profile-setup-card">
          <h2 className="fitpulse-title-section" style={{marginBottom: '20px'}}>Complete Your Profile Setup</h2>
          {/* CRITICAL FIX: Logout Button added to the setup screen */}
          <button className="signout-btn" onClick={() => supabase.auth.signOut()} style={{marginTop: '20px', width: '100%'}}>
              Log Out and Reset App
          </button>
          
          {/* Ensure ProfileTab receives the proper data/props */}
          <ProfileTab onProfileSaved={handleProfileSaved} profile={{}} />
        </div>
      </div>
    )
  }

  // Final Dashboard Render (Only runs if session is active and profile is loaded)
  return (
    <div className="fitpulse-container">
      <h1 className="fitpulse-title">FitPulse Dashboard</h1> 
      
      <nav className="fitpulse-nav">
        <div className="fitpulse-nav-group">
          <button className={tab==='profile'?'active':''} onClick={() => setTab('profile')}>Profile</button>
          <button className={tab==='workouts'?'active':''} onClick={() => setTab('workouts')}>Workouts</button>
          <button className={tab==='nutrition'?'active':''} onClick={() => setTab('nutrition')}>Nutrition</button>
          <button className={tab==='progress'?'active':''} onClick={() => setTab('progress')}>Progress</button>
        </div>
        <button className="signout-btn" onClick={() => supabase.auth.signOut()}>Sign Out</button>
      </nav>

      <div className="fitpulse-card">
        {/* Pass the profile object to all tabs */}
        {tab === 'profile' && <ProfileTab profile={profile || {}} onProfileSaved={handleProfileSaved} />}
        {tab === 'workouts' && <WorkoutsTab profile={profile || {}} />}
        {tab === 'nutrition' && <NutritionTab profile={profile || {}} />} 
        {tab === 'progress' && <ProgressTab profile={profile || {}} />}
      </div>
    </div>
  )
}

export default App