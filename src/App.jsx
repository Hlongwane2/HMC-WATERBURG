import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        setShowSettings(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
  };

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      let msg = error.message;
      if (msg === 'Email not confirmed') msg = 'Please confirm your email address to log in.';
      if (msg === 'Invalid login credentials') msg = 'Incorrect email or password.';
      setError(msg);
      setAuthLoading(false);
    } else {
      showStatus('Welcome back!');
      setAuthLoading(false);
    }
  };
 bitumen
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setAuthLoading(false);
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        }
      }
    });

    if (signupError) {
      setError(signupError.message);
      setAuthLoading(false);
      return;
    }

    if (data.user) {
      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          { 
            id: data.user.id, 
            username: username || email.split('@')[0],
            email: email,
            status: 'Active',
            security_level: 'Medium',
            member_since: new Date().toISOString()
          }
        ]);

      if (profileError) console.error('Error creating profile:', profileError);
      
      alert('Account created! Please check your email for a confirmation link.');
      setShowSignup(false);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfileField = async (field, value) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);

    if (error) {
      showStatus('Update failed: ' + error.message);
    } else {
      fetchProfile(user.id);
      showStatus('Profile updated.');
    }
  };

  if (loading) {
    return <div className="loading-container" style={{ background: '#0a0a0c', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <div id="mainContent" className="main-content" style={{ display: 'block' }}>
        <nav className="navbar">
          <div className="navbar-branding">
            <img src="/logo.png" alt="Logo" className="nav-logo-img" />
            <h1>HMCI WATERBURG Dashboard</h1>
          </div>
          <div className="navbar-right">
            <button className="menu-btn" onClick={() => setShowSettings(!showSettings)}>☰</button>
            <button className="logout-btn" onClick={handleLogout}>Log Out</button>
          </div>
        </nav>

        {statusMsg && <div className="status-toast">{statusMsg}</div>}

        <div className="content">
          <div className="dashboard-container">
            <div className="user-header">
              <div className="user-avatar">
                <img src="/logo.png" alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              </div>
              <div className="user-greeting">
                <h2>Welcome, <span>{profile?.username || user?.email}</span></h2>
                <p>HMCI Global Network Active</p>
              </div>
            </div>

            <div className="info-cards">
              <div className="info-card">
                <h3>Account Information</h3>
                <div className="card-item">
                  <span className="label">Username:</span>
                  <span className="value">{profile?.username || 'N/A'}</span>
                </div>
                <div className="card-item">
                  <span className="label">Status:</span>
                  <span className="value status-active">{profile?.status || 'Active'}</span>
                </div>
                <div className="card-item">
                  <span className="label">Member Since:</span>
                  <span className="value">{profile?.member_since ? new Date(profile.member_since).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="info-card">
                <h3>Security & Access</h3>
                <div className="card-item">
                  <span className="label">Email:</span>
                  <span className="value">{user?.email}</span>
                </div>
                <div className="card-item">
                  <span className="label">Level:</span>
                  <span className="value security-high">{profile?.security_level || 'High'}</span>
                </div>
                <div className="card-item">
                  <span className="label">Sessions:</span>
                  <span className="value">{profile?.sessions || 1}</span>
                </div>
              </div>
            </div>

            {showSettings && (
              <div className="settings-overlay">
                <div className="settings-panel">
                  <h3>Profile Settings</h3>
                  <div className="setting-input">
                    <label>Display Name</label>
                    <input 
                      type="text" 
                      defaultValue={profile?.username} 
                      onBlur={(e) => updateProfileField('username', e.target.value)}
                    />
                  </div>
                  <div className="setting-input">
                    <label>Location</label>
                    <input 
                      type="text" 
                      defaultValue={profile?.location} 
                      onBlur={(e) => updateProfileField('location', e.target.value)}
                    />
                  </div>
                  <button className="option-btn" onClick={() => setShowSettings(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="loginDiv" className="login-container">
      <div className="login-info-section">
        <div className="login-info">
          <img src="/logo.png" alt="HMCI WATERBURG Logo" className="login-logo-img" />
          <h1>Welcome to HMCI WATERBURG</h1>
          <p>Your trusted platform for amazing experiences. Sign in to access all features and manage your account.</p>
          <ul className="info-list">
            <li>✓ Secure Supabase Auth</li>
            <li>✓ Real-time Profile Sync</li>
            <li>✓ Premium Network Access</li>
          </ul>
        </div>
      </div>
      {!showSignup ? (
        <div className="login-box">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            {error && <div className="error-alert">{error}</div>}
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" disabled={authLoading}>
              {authLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <p className="login-footer">New here? <a href="#" onClick={() => setShowSignup(true)}>Create Account</a></p>
        </div>
      ) : (
        <div className="login-box">
          <h2>New Account</h2>
          <form onSubmit={handleSignup}>
            {error && <div className="error-alert">{error}</div>}
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input type="password" placeholder="Confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <button type="submit" disabled={authLoading}>
              {authLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
          <p className="login-footer">Have an account? <a href="#" onClick={() => setShowSignup(false)}>Login</a></p>
        </div>
      )}
    </div>
  );
}
