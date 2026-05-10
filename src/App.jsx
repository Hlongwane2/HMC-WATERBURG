import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

import GuidelinePage from './pages/GuidelinePage';
import EndTimesPage from './pages/EndTimesPage';
import RevelationPage from './pages/RevelationPage';
import KingdomKidsPage from './pages/KingdomKidsPage';
import NewSectionPage from './pages/NewSectionPage';
import QuizPage from './pages/QuizPage';
import BiblePage from './pages/BiblePage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'settings', 'notes', 'guideline', 'endtimes', 'revelation', 'kingdomkids', 'quiz', 'bible', 'calendars'
  const [showBooksSidebar, setShowBooksSidebar] = useState(true);
  const [selectedBook, setSelectedBook] = useState('bible');
  const [showBookList, setShowBookList] = useState(true);
  const [showCalendarDetails, setShowCalendarDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [recoveryStep, setRecoveryStep] = useState('phone'); // 'phone' or 'verify'
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [branch, setBranch] = useState('');

  // Editable Profile state
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editEmail, setEditEmail] = useState('');

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
        setView('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'settings' && profile) {
      setEditUsername(profile.username || '');
      setEditPhone(profile.phone || '');
      setEditBranch(profile.location || '');
      setEditEmail(profile.email || '');
    }
  }, [view, profile]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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

    let loginEmail = email;

    if (!email.includes('@')) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', email)
        .single();

      if (profileError || !data) {
        setError('Username not found. Please check your spelling or use your email.');
        setAuthLoading(false);
        return;
      }
      loginEmail = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password,
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

  const handleSendRecoveryOTP = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone: phone,
    });

    if (error) {
      setError(error.message);
      setAuthLoading(false);
    } else {
      setRecoveryStep('verify');
      setAuthLoading(false);
      showStatus('OTP sent to your phone.');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: otpCode,
      type: 'sms',
    });

    if (error) {
      setError(error.message);
      setAuthLoading(false);
    } else {
      setShowRecovery(false);
      setAuthLoading(false);
      showStatus('Signed in via OTP. You can now change your password in settings.');
    }
  };

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
      phone,
      options: {
        data: {
          username: username,
          phone: phone,
          branch: branch
        }
      }
    });

    if (signupError) {
      let msg = signupError.message;
      if (msg.includes('Email rate limit exceeded')) {
        msg = 'Email limit reached. Please wait a few minutes or try again later.';
      }
      setError(msg);
      setAuthLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          { 
            id: data.user.id, 
            username: username || email.split('@')[0],
            email: email,
            phone: phone,
            location: branch,
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
    setView('dashboard');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setAuthLoading(true);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id,
        username: editUsername,
        phone: editPhone,
        location: editBranch,
        email: editEmail
      });

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        username: editUsername,
        phone: editPhone,
        branch: editBranch,
        display_email: editEmail
      }
    });

    if (profileError || authError) {
      showStatus('Update failed. Please try again.');
      console.error('Update Error:', profileError || authError);
    } else {
      await fetchProfile(user.id);
      showStatus('Profile updated permanently.');
    }
    setAuthLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setAuthLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      showStatus('Password change failed: ' + error.message);
    } else {
      showStatus('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    }
    setAuthLoading(false);
  };

  if (loading) {
    return <div className="loading-container" style={{ background: '#0a0a0c', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-branding">
            <img src="/logo.png" alt="Logo" className="nav-logo-img" />
            <div className="navbar-text">
              <h1>HMCI WATERBERG</h1>
              <p className="navbar-welcome">Welcome, <span>{profile?.username || user?.email}</span></p>
              <p className="navbar-motto">OCCUPY TILL I COME</p>
            </div>
          </div>
          <div className="navbar-right">
            <button className="menu-btn" onClick={() => setView(view === 'settings' ? 'dashboard' : 'settings')}>
              {view === 'settings' ? '✕' : '☰'}
            </button>
          </div>
        </nav>

        <div className="app-body">
          <aside className="sidebar">
            <div className="sidebar-header">
              <span className="sidebar-title">Menu</span>
            </div>
            <nav className="sidebar-nav">
              <div className={`sidebar-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
                <span className="sidebar-icon">🏠</span>
                <span className="sidebar-label">Dashboard</span>
              </div>
              <div className={`sidebar-item ${view === 'services' ? 'active' : ''}`} onClick={() => setView('services')}>
                <span className="sidebar-icon">⛪</span>
                <span className="sidebar-label">Services</span>
              </div>
              <div className={`sidebar-item ${view === 'events' ? 'active' : ''}`} onClick={() => setView('events')}>
                <span className="sidebar-icon">📅</span>
                <span className="sidebar-label">Events</span>
              </div>
              <div className={`sidebar-item ${view === 'pictures' ? 'active' : ''}`} onClick={() => setView('pictures')}>
                <span className="sidebar-icon">🖼️</span>
                <span className="sidebar-label">Pictures</span>
              </div>
              <div className={`sidebar-item ${view === 'highlights' ? 'active' : ''}`} onClick={() => setView('highlights')}>
                <span className="sidebar-icon">✨</span>
                <span className="sidebar-label">Highlights</span>
              </div>
              <div className={`sidebar-item ${view === 'videos' ? 'active' : ''}`} onClick={() => setView('videos')}>
                <span className="sidebar-icon">🎥</span>
                <span className="sidebar-label">Videos</span>
              </div>
              <div className={`sidebar-item ${view === 'calendars' ? 'active' : ''}`} onClick={() => setView('calendars')}>
                <span className="sidebar-icon">📆</span>
                <span className="sidebar-label">Calendars</span>
              </div>
              <div className={`sidebar-item ${view === 'quiz' ? 'active' : ''}`} onClick={() => setView('quiz')}>
                <span className="sidebar-icon">🧠</span>
                <span className="sidebar-label">Quiz</span>
              </div>
            </nav>
          </aside>
          <main className="main-content">
            <div className="content">
              {view === 'bible' ? (
                <BiblePage />
              ) : view === 'quiz' ? (
                <QuizPage />
              ) : view === 'highlights' ? (
                <div className="notes-view">
                  <div className="notes-header">
                    <h1>Highlights</h1>
                    <p>Latest updates, events, and key moments.</p>
                  </div>
                </div>
              ) : view === 'videos' ? (
                <div className="notes-view">
                  <div className="notes-header">
                    <h1>Videos</h1>
                    <p>Video content will appear here.</p>
                  </div>
                </div>
              ) : view === 'calendars' ? (
                <div className="calendar-view">
                  <div className="calendar-banner-panel">
                    <button className="calendar-year-card" onClick={() => setShowCalendarDetails(prev => !prev)}>
                      <span className="calendar-label">CALENDAR</span>
                      <h1>2026</h1>
                      <p>{showCalendarDetails ? 'Close detailed view' : 'Open the 2026 calendar'}</p>
                      <span className="calendar-toggle-icon">{showCalendarDetails ? '▲' : '▼'}</span>
                    </button>
                  </div>

                  <div className={`calendar-content ${showCalendarDetails ? 'open' : 'closed'}`}>
                    <div className="calendar-grid">
                      {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map((month) => (
                        <div key={month} className="calendar-month-card">
                          <strong>{month}</strong>
                          <div className="calendar-days-header">
                            {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((day) => (
                              <span key={day}>{day}</span>
                            ))}
                          </div>
                          <div className="calendar-days-grid">
                            {Array.from({ length: 31 }, (_, i) => (
                              <span key={i}>{String(i + 1).padStart(2, '0')}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="calendar-details">
                      <div className="calendar-detail-box">
                        <h3>Annual Meetings '26</h3>
                        <ul className="calendar-event-list">
                          <li><strong>27-28 Dec</strong> Executive strategic meeting</li>
                          <li><strong>02 Jan</strong> General meeting</li>
                          <li><strong>03 Jan</strong> Youth workshop</li>
                          <li><strong>04 Jan</strong> Media team meeting</li>
                          <li><strong>10 Jan</strong> SS 2025 review & promotions</li>
                          <li><strong>16-17 Jan</strong> Home cell leaders workshop</li>
                          <li><strong>22 Jan</strong> HMC National Christian doctrine</li>
                          <li><strong>24 Jan</strong> SS teachers workshop</li>
                          <li><strong>31 Jan</strong> Youth leadership workshop</li>
                          <li><strong>01 Feb</strong> District pastor's appreciation</li>
                          <li><strong>24-27 Mar</strong> Leadership workshop</li>
                          <li><strong>28 Mar</strong> Discipleship class</li>
                          <li><strong>29 Mar</strong> SS review</li>
                          <li><strong>03-04 Apr</strong> Camp</li>
                          <li><strong>06-10 Apr</strong> Good Friday district conference</li>
                          <li><strong>11 Apr</strong> Prayer week</li>
                          <li><strong>13-25 Apr</strong> District crusade</li>
                          <li><strong>15-26 Apr</strong> Prayer summit</li>
                          <li><strong>15-16 Jun</strong> Youth conference</li>
                          <li><strong>22-27 Jun</strong> Branch activities</li>
                          <li><strong>28 Jun - 05 Jul</strong> Transformation camp</li>
                          <li><strong>06-10 Jul</strong> Prayer week</li>
                          <li><strong>11-13 Jul</strong> National conference</li>
                          <li><strong>23-26 Jul</strong> District gathering</li>
                          <li><strong>03-07 Aug</strong> Prayer week</li>
                          <li><strong>08-10 Aug</strong> Youth gathering</li>
                          <li><strong>10-23 Aug</strong> Mothers conference</li>
                          <li><strong>19 Sep</strong> SS review</li>
                          <li><strong>24-26 Sep</strong> Heritage conference</li>
                          <li><strong>09 Oct</strong> Academic prayer</li>
                          <li><strong>30-31 Oct</strong> 24hr prayer</li>
                          <li><strong>14-15 Nov</strong> District fundraising</li>
                          <li><strong>12 Dec</strong> SS review</li>
                          <li><strong>13-20 Dec</strong> Transformation camp</li>
                          <li><strong>26 Dec</strong> Council meeting</li>
                        </ul>
                      </div>
                      <div className="calendar-detail-box">
                        <h3>School Terms '26</h3>
                        <p>Term 1: 14 Jan - 27 Mar</p>
                        <p>Term 2: 08 Apr - 26 Jun</p>
                        <p>Term 3: 21 Jul - 02 Oct</p>
                        <p>Term 4: 13 Oct - 09 Dec</p>
                      </div>
                      <div className="calendar-detail-box">
                        <h3>Public Holidays '26</h3>
                        <ul>
                          <li><strong>1 Jan</strong> New Year's Day</li>
                          <li><strong>21 Mar</strong> Human Rights Day</li>
                          <li><strong>3 Apr</strong> Good Friday</li>
                          <li><strong>6 Apr</strong> Family Day</li>
                          <li><strong>27 Apr</strong> Freedom Day</li>
                          <li><strong>1 May</strong> Workers' Day</li>
                          <li><strong>16 Jun</strong> Youth Day</li>
                          <li><strong>9 Aug</strong> Nat. Women's Day</li>
                          <li><strong>10 Aug</strong> Public holiday</li>
                          <li><strong>24 Sep</strong> Heritage Day</li>
                          <li><strong>16 Dec</strong> Day of Reconciliation</li>
                          <li><strong>25 Dec</strong> Christmas Day</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : view === 'pictures' ? (
                <div className="notes-view">
                  <div className="notes-header">
                    <h1>Pictures</h1>
                    <p>Picture gallery content will appear here.</p>
                  </div>
                </div>
              ) : view === 'events' ? (
                <div className="notes-view">
                  <div className="notes-header">
                    <h1>Events</h1>
                    <p>Upcoming events and church gatherings.</p>
                  </div>
                </div>
              ) : view === 'services' ? (
                <div className="notes-view">
                  <div className="notes-header">
                    <h1>Services</h1>
                    <p>Service schedules and church programs.</p>
                  </div>
                </div>
              ) : view === 'guideline' ? (
                <GuidelinePage />
              ) : view === 'endtimes' ? (
                <EndTimesPage />
              ) : view === 'revelation' ? (
                <RevelationPage />
              ) : view === 'notes' ? (
                <div className="notes-view">
                  <div className="notes-header">
                    <h1>HEALING MINISTRY CHURCH – WATERBERG</h1>
                    <p>JUNIOR YOUTH (2024 – 2026) | Age Group: 13 - 15</p>
                  </div>
                  
                  <div className="notes-content">
                    <section className="notes-section">
                      <div className="section-title">
                        <span className="section-num">1</span>
                        <h2>The Holy Bible</h2>
                      </div>
                      <ul>
                        <li>Written by Men, inspired by God, hence the Word of God</li>
                        <li>God breathed knowledge into their spirit (minds) and they began to write it down. Some through vision and dreams, and other part as history of events/works of God through man</li>
                        <li>It is the mind/heart of God revealed to us</li>
                        <li>No one should add or remove anything written in this Holy book. <span className="scripture">Rev 22:18-19</span></li>
                        <li>The Holy Scriptures are written so that we may believe that Jesus is the Christ. <span className="scripture">John 20:31</span></li>
                      </ul>
                      <div className="prayer-block">
                        <p><em>"And that from childhood you have known the Holy Scriptures, which are able to make you wise for salvation through faith which is in Christ Jesus. All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness, that the man of God may be complete, thoroughly equipped for every good work."</em> <span className="scripture">2Tim 3:15-17</span></p>
                        <p><em>"Even if we feel guilty, God is greater than our feelings, and he knows everything."</em> <span className="scripture">1 John 3:20</span></p>
                      </div>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <span className="section-num">2</span>
                        <h2>Be Principled</h2>
                      </div>
                      <ul>
                        <li>Don't do or say what you feel or are emotional about...feelings and emotions can lie; our culture/customs and traditions can be wrong too. <span className="scripture">Rom 1:21-32</span></li>
              ) : view === 'newsection' ? (
                <NewSectionPage />
                        <li className="sub-point">You don't go to school because you feel like it</li>
                        <li className="sub-point">You don't become a man because you feel like a man, or animal because you feel animalistic. You are a man because God created you that way, and you should be proud about it. God never created gays/lesbians. He is not the God of confusion.</li>
                        <li className="sub-point">You don't hate a person because you feel like it. (Define hatred). Love does not mean friendship. (Define love. And list benefits)</li>
                        <li className="sub-point">You don't become a traditional healer because you dreamt about bones, or had mental/health challenge you can't explain...</li>
                        <li className="sub-point">You don't do ancestral worship because you dreamed about your granny</li>
                        <li className="sub-point">You don't forgive because you feel like it. Define forgiveness, and list the benefits</li>
                        <li className="sub-point">You don't condone certain behaviours because you are emotional about them</li>
                        <li className="sub-point">You don't befriend someone because you feel sorry for him. Bad company corrupts good character</li>
                        <li className="sub-point">Sexual related activities are not for experiment/excitement. Don't ever be fooled to play with such in any way, God will not be happy with you, and there are consequences. List them!</li>
                        <li className="sub-point">You don't engage on sexual activity just because you like it or feel like doing it. List the consequences of premarital sex and related activities such as kissing. <span className="scripture">1Cor 6:9-10</span></li>
                      </ul>
                      <div className="prayer-block">
                        <p><em>"Therefore God gave them over in the sinful desires of their hearts to sexual impurity for the degrading of their bodies with one another. They exchanged the truth about God for a lie, and worshiped and served created things rather than the Creator—who is forever praised. Amen. Because of this, God gave them over to shameful lusts."</em> <span className="scripture">Rom 1:24-26</span></p>
                      </div>
                      <ul>
                        <li>Learn the right things and do them (Specify examples), even when it doesn't feel like it, or it may be too inconvenient/uncomfortable...This is the <strong>FEAR OF THE LORD</strong>. <span className="scripture">Daniel 3:18, 1Sam 15:23</span></li>
                        <li>Develop courage to say no to the wrong things...e.g. your uncle/aunt ask you to engage in sexual related activity with him/her; They want you to pray ancestors; Friends want you to drink alcohol, smoke, do sex, nudists behaviour, homosexuality, satanic practices (list them), etc. <span className="scripture">1Cor 6:9-10; Jude 1:7; Exodus 20</span></li>
                        <li>The fact that people approve it, or you don't see anything wrong with it, or it doesn't feel wrong, or many renowned people are doing it, it does not mean it is right. What God says is final!</li>
                      </ul>
                      <div className="prayer-block">
                        <p><em>"No one is to approach any close relative to have sexual relations. I am the LORD. Do not have sexual relations with a man as one does with a woman; that is detestable...Do not defile yourselves in any of these ways."</em> <span className="scripture">Leviticus 18:6, 22-24</span></p>
                      </div>
                      <ul>
                        <li>Don't feed your mind with toxic information i.e. pornographic/dirty material, horror movies, satanic movies/games, etc. Feed your mind with godly knowledge (specify). <span className="scripture">Prov 4:23; 15:14 (NLT)</span>. You become what you think about. <span className="scripture">Prov 23:7</span></li>
                      </ul>
                      <h3 className="doc-subtitle">Love your body and mind, and choose God-fearing friends:</h3>
                      <ul>
                        <li>Cleanliness is next to Godliness. Cleanliness is not expensive!</li>
                        <li>Learn to eat healthy.</li>
                        <li>Nakedness is not beauty.</li>
                        <li>Bad friends corrupt good character.</li>
                        <li>Make time to pray, read your Bible and Guidelines (Bible study)</li>
                        <li>You may ask your parent to buy you a bible as a birthday present</li>
                        <li>Talk more often to wise praying adults/friends (even about your challenges). <span className="scripture">Luk 2:41-52</span></li>
                        <li>Talk more about your God, Church, Pastors, Role Models, Future, Dreams, etc.</li>
                        <li>Don't waste your time on gossips/dirty jokes, etc...(define gossip).</li>
                        <li>Learn to help those in need of your help. Don't be selfish...</li>
                        <li>Respect all people, especially elderly ones. Don't call elderly people by names (Junior Sunday School)</li>
                      </ul>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <span className="section-num">3</span>
                        <h2>Honor your Parents/Leaders <span className="scripture">Eph 6:1-3</span></h2>
                      </div>
                      <ul>
                        <li>Learn to respect your parents always...even when they are drunk.</li>
                        <li>Learn to respect your leaders/pastors</li>
                        <li>Doing the wrong things to please your parents/leaders is not an honourable thing (List them)</li>
                        <li>Do the right things even when they are not watching/around (List them)</li>
                      </ul>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <span className="section-num">4</span>
                        <h2>The Power of Consistency</h2>
                      </div>
                      <p className="section-subtitle">Doing small things in a great way everyday...Key to success</p>
                      <ul>
                        <li>Read (bible) and pray every day (Memory verses)</li>
                        <li>Study your school books daily</li>
                        <li>Do good to others daily</li>
                        <li>Talk about your goals/future daily</li>
                      </ul>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <span className="section-num">5</span>
                        <h2>Prayer</h2>
                      </div>
                      <ul>
                        <li>It is a way to communicate with God: Ask, knock, seek... <span className="scripture">Matt 7:7-8</span></li>
                        <li>We pray to the Father (God), with the help of the Holy Spirit, In the Name of Jesus Christ.</li>
                        <li>As means to change things (i.e. atmosphere, situation, conditions, self, etc.). <span className="scripture">Acts 12:5</span></li>
                        <li>As a means to strengthen oneself. <span className="scripture">Matt 26:41, Jam 5:16</span></li>
                        <li>A means to enforce God's kingdom and will on earth. (Define Kingdom and God's will). <span className="scripture">Matt 6:10</span></li>
                        <li>Discuss worship and praise. <span className="scripture">Acts 16:25</span></li>
                        <li>9 Hebrew words defining worship e.g. Hallal, Yada, Shabach, etc.</li>
                        <li><strong>FASTING</strong> is another means to boost our prayers. <span className="scripture">Matt 17:21</span> (Story of Esther - <span className="scripture">Esther 4:15-16</span>)</li>
                      </ul>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <span className="section-num">6</span>
                        <h2>Jesus is Lord and King Now</h2>
                      </div>
                      <p className="section-subtitle">Topic: Who God is?</p>
                      <ul>
                        <li>Jesus is the only Saviour of the world.</li>
                        <li>And there is salvation in and through no one else, for there is no other name under heaven given among men by and in which we must be saved... <span className="scripture">Acts 4:12</span> (<span className="scripture">Rom 10:9-10; John 1:12</span>)</li>
                        <li>He is the King (not the president - elaborate), we are His subjects...we do what He commands, even by His Spirit in us (Holy Spirit). <span className="scripture">John 8:31-32 (Rev 3:20)</span></li>
                        <li>The devil is a defeated enemy, bound by Christ through the cross (i.e. his powers and control are limited, yet his servants are still active - <span className="scripture">Rev 20:2</span>), and the church must resist him, and he will flee <span className="scripture">Jam 4:7</span></li>
                      </ul>
                      <div className="prayer-block">
                        <p><em>"Let all the house of Israel therefore know assuredly, that God hath made him both Lord and Christ, this Jesus whom ye crucified..."</em> <span className="scripture">Acts 2:36</span></p>
                        <p><em>"Wherefore God (the Father) also hath highly exalted him, and given him a name which is above every name, that at the name of Jesus every knee should bow, of those in heaven, and of those on earth, and of those under the earth, and that every tongue should confess that Jesus Christ is Lord, to the glory of God the Father..."</em> <span className="scripture">Phil 2:9-11</span></p>
                        <p><em>"And having spoiled principalities and powers, he made a shew of them openly, triumphing over them in it."</em> <span className="scripture">Col 2:15</span></p>
                      </div>
                      <ul>
                        <li>Everything must be changed by the power of prayer (Anagkazo). <span className="scripture">Mark 11:22; Jam 5:16-17</span></li>
                      </ul>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <span className="section-num">7</span>
                        <h2>Our Identity (Who we are)</h2>
                      </div>
                      <ul>
                        <li>Our identity must be enforced by prayer</li>
                        <li>You become what your mind knows and believes...As he thinks in his heart (subconscious mind) <span className="scripture">Prov 23:7</span></li>
                        <li>Salvation (Sin nature vs God nature - what makes a pig to be a pig is the nature of the pig, not behaviour) <span className="scripture">John 3:16; Rom 3:10; 2Cor 5:17</span></li>
                        <li>You are not what your feelings or people says you are, but what God says you are</li>
                        <li>God never creates failures, weakling, homosexuals, witchcraft doctors, etc. <span className="scripture">1John 5:-5; Lev 20:13, Jud 1:7</span></li>
                        <li>You are God's workmanship (masterpiece) created for his glory/excellence. <span className="scripture">Eph 2:10</span></li>
                        <li>We must all become like Christ on earth, through transformation through prayer. <span className="scripture">Rom 8:29, 1John 4:17</span></li>
                        <li>Sin affects/robs us of our identity and destiny</li>
                        <li className="sub-point">You reap what you saw.</li>
                        <li className="sub-point">You might become a thief/murderer while you are not because of sinful thought (envy, lust, hatred, etc.) and behaviour. You might have been destined for presidential role, pastoral office, but because of sin, you might become something contrary (e.g. prisoner/inmates, rapist, witch, prostitute, etc.). <span className="scripture">Josh 1:8</span></li>
                      </ul>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <span className="section-num">8</span>
                        <h2>Dreams, Destiny and Goals</h2>
                      </div>
                      <p className="section-subtitle">Your Role Models, what you hate, what you love/desire, what excites you, etc.</p>
                      <div className="prayer-block">
                        <p><em>"Unto us a son is given, the government shall be upon His shoulder, and He shall be called Wonderful, Counsellor, Prince of Peace, Mighty God, and Everlasting Father...Of the increase of His government and peace there shall be no end, upon the throne of David, and upon his kingdom, to order it, and to establish it with judgment and with justice from henceforth even for ever. The zeal of the LORD of hosts will perform this."</em> <span className="scripture">Isa 9:6-7</span></p>
                        <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginTop: '10px' }}><em>*Kingdom is a nation having a supreme ruler (king and/or queen) while government is the body with the power to make and/or enforce laws to control a country, land area, people or organization</em></p>
                      </div>
                      <ul>
                        <li>Have a clear Goal of your life. What do you want?</li>
                        <li className="sub-point">I can do all things through Christ who strengthens me. <span className="scripture">Phil 4:13</span></li>
                        <li className="sub-point">Spend more time thinking about your dreams. <span className="scripture">Phil 4:8</span></li>
                        <li>Examples of Goals: spiritual, social, career, etc.</li>
                        <li className="sub-point">I want to be a great leader like Joseph the son of Jacob, or Daniel</li>
                        <li className="sub-point">I want to change lives by the power of God like Ev. Bonke, Apostle Paul</li>
                        <li className="sub-point">I want to preach the Gospel like Mother</li>
                        <li className="sub-point">I want to be a worshiper like King David</li>
                        <li className="sub-point">I want to be a medical Doctor like Luke in the bible</li>
                        <li className="sub-point">Want to be a Gospel movie producer</li>
                        <li>Success is a result of having goals (Focus and consistency)</li>
                        <li>Discipline as a result of having realistic Goals (The price you must pay). Nothing happens by chance. <span className="scripture">1Cor 9:24</span></li>
                        <li>Learn things that could sabotage your goals/dreams...Story of Nehemiah</li>
                        <li className="sub-point">Laziness, bad friends, TV and social media, entertainment, strange night dreams (e.g. bathing at the river, clothed in black, drinking human blood, etc.), impatience, discouragement, mockery, opposition, etc.</li>
                      </ul>
                    </section>
                  </div>
                </div>
              ) : view === 'anagkazo' ? (
                <div className="notes-view">
                  <div className="notes-header">
                    <h1>Anagkazo</h1>
                    <p>By Dag Heward-Mills</p>
                  </div>
                  
                  <div className="notes-content">
                    <section className="notes-section">
                      <div className="section-title">
                        <h2>Chapter 1: What Is Anagkazo?</h2>
                      </div>
                      <div className="prayer-block">
                        <p><em>"...Go out into the highways and hedges, and compel [anagkazo] them to come in, that my house may be filled."</em> <span className="scripture">Luke 14:23</span></p>
                      </div>
                      <p>I grew up in a Christian home and was made to attend church every Sunday. I must be honest, I found church very boring. I hated the long boring hymns and I couldn't understand the sermons. The priests looked unreal and detached from everyday life.</p>
                      <p>I remember sitting through many boring and lifeless services at church. My main pre-occupation was to predict the closure of the service. I would count the number of hymns on the board and estimate the closing time of the service.</p>
                      
                      <h3 className="doc-subtitle">They Drank $1000 Worth of Beer in One Night</h3>
                      <p>You see, the priests and the majority of the congregation were not born again. They were what you might call traditional Christians. They had inherited a family religion. One day, the unbeliever priest announced from the pulpit how much beer the whole church had drunk the night before at a party. It all came up to about $1000 worth of beer! The priest went on to say that one of the members owed him a carton of beer. Surely, many of these people were just practicing a lifeless religion. I can understand why many young people do not go to church anymore. It is just one meaningless, lifeless and boring ritual. If the pastor is not a born-again Christian, you cannot expect many members of the church to be born again.</p>
                      
                      <p>When I first attended secondary school, at the age of twelve, I was an unbeliever. That is when I first came into contact with "real" born-again Christians. They were all members of the Scripture Union (SU).</p>
                      <p>Though they seemed to be true believers, nothing about them attracted me. I remember one evening in particular, when the SU leader announced at the boarding house that there was going to be a meeting of the SU.</p>
                      <p>I thought to myself, "Who would ever attend such a boring meeting?" These Christians were not attractive. They made weak and lifeless announcements inviting us, the unsaved, to join them. As a result, it never occurred to me to join this uninteresting group.</p>
                      <p>I still cannot remember how I eventually joined the SU. I believe that the Spirit of God worked on me and drew me there without me even knowing it!</p>
                      <p>Many Christians are genuine and have a real message to impart. But for a message to have any impact, it must be compelling. It must drive the listener to change! The message of the Lord Jesus Christ must persuade the unsaved to make a decision for Christ. That is why I am writing this book on what I call "Anagkazo".</p>
                      
                      <p><strong>Anagkazo simply means "to compel". It also means to necessitate, to drive, and to constrain by all means such as force, threats, persuasion and entreaties.</strong></p>
                      
                      <p>Sometimes we need to go back to the Greek in order to understand the original meanings of some Bible words. You see, the New Testament was translated from the Greek language and the Old Testament from the Hebrew language. Anagkazo is the Greek word that is translated "to compel".</p>
                      <p>Although this is a book on anagkazo, I also want to share on another closely related Greek word, "Biazo". This is because the revelation of anagkazo is very much linked to the revelation in the word biazo.</p>
                      
                      <h3 className="doc-subtitle">What Is Biazo?</h3>
                      <p><strong>Biazo is a Greek word found in Matthew 11 that means "to use force" or "to force one's way into a thing".</strong> This is a quality I find lacking in Christian circles. We are forceful about everything else, except God's work. We are forceful about our jobs, our girlfriends, our marriages and our future. But when it comes to God's work we become like timid mice!</p>
                      
                      <p>When I observe the commercials on television, I realize that there are groups of people who are very confident about what they have to offer. They are so confident that they boldly sing catchy songs about how good their product is.</p>
                      <p>Alcohol advertisers are some of the best in the business. We all know that beer and liquor are some of the commonest killers of young people. Alcohol has broken up more homes, destroyed more marriages, caused more car accidents, started more wars and fights than anything else in the world. Yet, they forcibly advertise it.</p>
                      
                      <h3 className="doc-subtitle">Is Alcohol the Power?</h3>
                      <p>Beer is the cause of many accidents, leading to the deaths of a countless number of people. And yet there are smiling people on television, telling us that it is the "power" we need. These commercials are being forced down our throats. We are being forced to believe things that are not true. Beer is the devil in solution! Yet we are being compelled to believe otherwise. This unhealthy product is paraded as a good thing.</p>
                      <p>When I think of the forcefulness of people who want to make money at all costs, I realize that Christians have a better reason to be forceful. Why then is it that Christians behave like lame ducks, toothless dogs and helpless sparrows?</p>
                      <p>I believe that this teaching on the important subject, biazo can change that. Biazo means to force one's way into a thing. If Christianity is going to spread we are going to have to be a lot more forceful than we are.</p>
                      
                      <h3 className="doc-subtitle">Are Muslims More Forceful than Christians?</h3>
                      <p>It is amazing to see fanatic Muslims who are prepared to die for their faith. I wonder how many Christians have half the drive that Muslims seem to have. Should we be surprised if statistics indicate that Islam is spreading faster than Christianity?</p>
                      <p>Whether it is making money, spreading a false religion or selling deadly products, the whole world has become very forceful. That is why I am teaching Christians about being biblically forceful.</p>
                      <p>Another related Greek word I want us to learn about is the word "Anaideia".</p>
                      
                      <h3 className="doc-subtitle">What Is Anaideia?</h3>
                      <p><strong>Anaideia is a Greek word that is used only once in the Bible. It means "to be shameless". It also speaks of importunity.</strong> In the eleventh chapter of Luke, we learn of a man who exhibited shamelessness in his relationship with God.</p>
                      <div className="prayer-block">
                        <p><em>"I say unto you, Though he will not rise and give him, because he is his friend, yet because of his importunity [anaideia] he will rise and give him as many as he needeth."</em> <span className="scripture">Luke 11:8</span></p>
                      </div>
                      
                      <p>In 1982, I was admitted to the University of Ghana, the premier university in my country, Ghana. I cautiously entered this new environment wondering what lay ahead. One of the first things that struck me was the shamelessness of unbelievers as they went about their lives.</p>
                      
                      <h3 className="doc-subtitle">The Kissing Students</h3>
                      <p>I remember one of the first times I walked into Volta Hall, the hall of residence for the ladies in the University of Ghana. When we got to the staircase that led up to the first and second floors, there was a young man and woman engaged in a prolonged embrace and kiss. I know that in some cultures this might not look strange. However in our culture it is unusual and out of place. This couple continued in their long embrace and intimate kissing as we passed by them. They could not care less about who was watching them! They were not moved! They were shameless! Perhaps they felt they were in love.</p>
                      <p>When we got upstairs, I told my friends, "It seems people around here are not ashamed of what they're doing." Then I asked, "Why are we ashamed of what we believe in? Why are we ashamed of the gospel? Why do we go around like timid mice who don't have anything to offer?"</p>
                      <p>The Spirit of the Lord arose within me and I said, "If they are not ashamed of their immoral lives, I'm not going to be ashamed of the gospel."</p>
                      <div className="prayer-block">
                        <p><em>"For I am not ashamed of the gospel of Christ..."</em> <span className="scripture">Romans 1:16</span></p>
                      </div>
                      <p>It is amazing to see homosexuals boldly speak of their abnormal lifestyles. They come on television and speak confidently about the perversion of anal intercourse. These people forcefully demonstrate and fight for their rights. How come Christians are so quiet when it comes to speaking God's Word?</p>
                      <p>Many Christians sit in their offices and allow their unbeliever colleagues to shamelessly speak of their evil deeds. The sinners around us dominate the discussions with unwholesome words. That is why I believe many Christians need what the Bible calls "anaideia". Anaideia simply means shamelessness.</p>
                      <p>The Apostle Paul practised anaideia. Remember, it was Paul who said, "We are not ashamed of the gospel."</p>
                      <p>In the following chapters I will share with you the in-depth meanings of these three Greek words – Anagkazo, Anaideia, and Biazo. You will learn how to put these three revelations into daily use.</p>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <h2>Chapter 2: Practicing Anagkazo</h2>
                      </div>
                      <p>In the book of Luke chapter 14 we read a familiar story where Jesus told of an important person who held a party for his friends. I want you to read this whole portion of Scripture so that you will be familiar with the story.</p>
                      <div className="prayer-block">
                        <p><em>"Then said he unto him, A certain man made a great supper, and bade many: And sent his servant at supper time to say to them that were bidden, Come; for all things are now ready. And they all with one consent began to make excuse. The first said unto him, I have bought a piece of ground, and I must needs go and see it: I pray thee have me excused. And another said, I have bought five yoke of oxen, and I go to prove them: I pray thee have me excused. And another said, I have married a wife, and therefore I cannot come. So that servant came, and shewed his lord these things. Then the master of the house being angry said to his servant, Go out quickly into the streets and lanes of the city, and bring in hither the poor, and the maimed, and the halt, and the blind. And the servant said, Lord, it is done as thou hast commanded, and yet there is room. And the lord said unto the servant, Go out into the highways and hedges, and compel [anagkazo] them to come in, that my house may be filled. For I say unto you, That none of those men which were bidden shall taste of my supper."</em> <span className="scripture">Luke 14:16-24</span></p>
                      </div>
                      <p>This man had the unfortunate experience of spending a lot of money on a big party, inviting important people, only to find out that most of them were uninterested. This man was very surprised about their rejection of his invitation. He became angry as he listened to the excuses of those he had invited. In his anger, he decided to invite anybody he found out on the street. Imagine having a party with people you don't even know!</p>
                      <p>Unfortunately, at that time of the night, there were not so many people around. Even after inviting those on the street, his party was relatively unattended. He then decided to invite the sick, the blind and the handicapped. Imagine that! What an unusual selection of partygoers! His party was full of the non-entities of the community – the down-and-outs of society.</p>
                      <p>I believe this story is symbolic of the Lord Jesus sending us out to invite people to Him. It is also symbolic of pastors sending out their members to evangelize the world. I have discovered that every time I embark on evangelizing the world (inviting many people to a great supper), I encounter the same things that this man encountered. However, I believe this man was a success. In spite of everything, he had his party and his house was full of guests. It might not have turned out the way he initially wanted, but he had his party anyway.</p>
                      <p>You see, God is sending out evangelists to invite the whole world to know Christ. Unfortunately, many of those who are invited do not respond. The Jews were the first to be invited to know the Lord. But they rejected Christ in their hour of visitation. Therefore, the gospel was transmitted on to the Gentiles.</p>
                      <p>Many of the elite, who live in large urban centres, hear the gospel on television and in churches many times. However, they do not receive but rather criticize preachers. Again, the gospel is passed on to the poor and non-elite in villages. They willingly receive the Word because they have no other hope but God.</p>
                      
                      <h3 className="doc-subtitle">Is Anagkazo an Important Revelation?</h3>
                      <ul>
                        <li><strong>1. Anagkazo is important because a certain type of evangelism is not going to work in this day and age.</strong> People are not going to be convinced or compelled to know God through our little church games. Our "Mickey Mouse" church programmes and bazaars will not go very far in today's world. We must go out there and drive them to God.</li>
                        <li><strong>2. Anagkazo is important because many of the people that need the gospel are not in places where they can receive bourgeoisie invitation cards.</strong> If people are going to be touched with the gospel, a new strategy of going to the gutters, highways and the bushes must be employed. Sitting in church and inviting people has long been an unworkable strategy for evangelism.</li>
                        <li><strong>3. Dear pastor, without anagkazo, your church is going to be empty.</strong> Please remember that if this man had not employed the strategy of anagkazo he would have had an empty house. Remember this, "A pastor without anagkazo will have an empty church."</li>
                        <li><strong>4. Without anagkazo, many churches are going to die a natural death.</strong> What you must realize is that the membership of a church is very fluid. Many people come and many people leave. If you don't have more people coming in than those you are losing, your church will begin to die. If you don't want your church to close down, you must do what Jesus instructed – go out and practise anagkazo.</li>
                        <li><strong>5. Life is becoming more hectic as we approach the 21st century.</strong> Busy working people are going to have more and more excuses. The strategy of anagkazo will help you to overcome these excuses.</li>
                      </ul>
                      <p>Let me now take you through what I call the practical steps of anagkazo. These steps are derived from the story we just read in Luke 14.</p>
                      
                      <h3 className="doc-subtitle">Step #1</h3>
                      <p><strong>An anagkazo man prepares a great supper.</strong></p>
                      <p>Anyone who wants to be used by God must prepare himself for the ministry. Today, God is using me in the ministry. This has not happened without thousands of hours of preparation. I realize that the sermons I preached to ten people some years ago, are the same sermons I am preaching to thousands today. Preaching to a small group of ten people was part of God's preparation for me. So if you want God to use you mightily, you must start preparing now! Take every opportunity you have to do something useful in the church.</p>
                      
                      <h3 className="doc-subtitle">I Played the Drums</h3>
                      <p>Years ago, I remember playing the drums and the piano in my church. Though I didn't know it at the time, that was part of my preparation for ministry. Today, I know a lot about music and musical equipment. I can discuss intelligently, all details that concern music, worship and expensive equipment. My experience with the music department has been a valuable asset to me.</p>
                      
                      <h3 className="doc-subtitle">Step #2</h3>
                      <p><strong>A person who practises anagkazo does not keep to himself but influences and affects many people.</strong></p>
                      <p>You will notice that this man in Luke 14 held a great supper and invited many people. One of the primary reasons evangelism does not happen is because Christians keep to themselves. You cannot keep to yourself if you want to be an effective witness for the Lord Jesus Christ.</p>
                      <p>When you sit on a bus, you can decide to be friendly to those nearby. Begin talking to the people around you. I always try to share the gospel with people around me. I have always believed that I have some Good News about Jesus. He has saved me and set me free.</p>
                      
                      <h3 className="doc-subtitle">They Made Balloons out of Condoms</h3>
                      <p>I remember one day as I sat in the bus, I watched some senior colleagues take out condoms, blow them into balloons and fly them in the bus. As these students shouted and laughed over their lewd jokes, I realized how confident they were in what they were doing. We the Christians sat timidly in the bus, looking lame, uninteresting and boring.</p>
                      <p>As I sat there, I decided not to keep to myself. I got the attention of everyone on the bus and began to preach. Although preaching on the bus later became quite common, at that time it was unusual. Some of the students were angry and others were bored. Some looked out of the window in disapproval but I preached on! I decided not to keep to myself anymore. I decided to be like the man in Luke 14.</p>
                      
                      <h3 className="doc-subtitle">I Clapped My Hands on the London Bus</h3>
                      <p>An anagkazo person does not keep to himself or herself. I lived in London for a period in 1983. I felt stifled by the stiff atmosphere in England. I was used to preaching anywhere and everywhere. But in England I realized that one couldn't easily relate to the people around. Everyone seemed so unfriendly and uninterested in their surroundings.</p>
                      <p>One day, while sitting on the top level of a double-decker bus, the spirit of anagkazo rose up in me and I said to myself, "I cannot keep to myself any longer."</p>
                      <p>I stood to my feet and to the surprise of everyone on the bus, I began to clap my hands to get their attention. I tell you, I may have looked bold on the outside, but I was quite scared on the inside. There were all sorts of murderous looking characters in their seats. But I maintained my cool and delivered a complete full gospel sermon.</p>
                      <p>The bus was quiet for a few minutes as they listened to this young mad man preach. I took my seat after preaching and got off at the next stop. One gentleman, who got off the bus with me, said to me, "I admire your courage! But I don't think you got very far." Whether I got very far or not is not what matters. What is important is that I preached the Word. And the Word always accomplishes something when it is preached.</p>
                      <div className="prayer-block">
                        <p><em>"...my word be that goeth forth out of my mouth... it shall accomplish that which I please..."</em> <span className="scripture">Isaiah 55:11</span></p>
                      </div>
                      <p>You see, any form of soul-winning in our modern day and age, is going to have to be of the anagkazo type. Gentleness and meekness will not take you very far.</p>
                      
                      <h3 className="doc-subtitle">Step #3</h3>
                      <p><strong>Anyone practising anagkazo is not prepared to cancel his service.</strong></p>
                      <p>Every pastor, in going through the normal processes of church growth, will experience highs and lows. But a pastor with the spirit of anagkazo will never cancel his church service. He will decide to press on no matter how many people attend.</p>
                      <p>One of my pastors told me how only one person attended church on a particular Sunday. He said that he had never felt so low. However, he managed to preach to that one soul and do his best for the Lord.</p>
                      
                      <h3 className="doc-subtitle">Anagkazo from the Community</h3>
                      <p>I remember there was a time we had a very low attendance for one of our services. The Lord told me to do what this man in Luke 14 did: "Go out there and invite the community to church."</p>
                      <p>I said, "How can I do that on a Sunday?" The Lord replied, "You do it, and you will be blessed."</p>
                      <p>I continued arguing with the Lord, "What will our Sunday morning visitors think? We will drive away people from the church." However, the Lord insisted, "Go out and compel them to come in." I obeyed the Lord.</p>
                      <p>I announced to the church that we were going to stop the service, go out into the community and invite them. I said, "We are going to go out to the community to bring them in." I announced, "This is not a gentle invitation. Every single one of you must hold the hand of someone you see out there. Physically bring them into the church building."</p>
                      <p>Some were taken aback. But we did it! And we brought in hundreds of "un-churched" dwellers of the community. That day we had several people giving their lives to Christ. We did this on numerous occasions and over a period, that particular service increased in size dramatically. I was not prepared to close down my service because of a low attendance. That is what any pastor with the spirit of anagkazo is prepared to do.</p>
                      
                      <h3 className="doc-subtitle">Step #3 (continued)</h3>
                      <p><strong>An anagkazo person is not prepared to have an empty meeting.</strong></p>
                      <p>A pastor working with the spirit of anagkazo is not prepared to have any empty church service. Many years ago, as a medical student, the Lord asked me to start a church. I had no members in my church. Not even one soul to preach to! But I was not prepared to have an empty church.</p>
                      
                      <h3 className="doc-subtitle">We Woke up the Nurses</h3>
                      <p>I was still a student when the Holy Spirit directed me to the nursing students' hostel. I remember that very first day. It was around 5 a.m. and still dark. Standing outside the hostel, I clapped my hands and woke them up. They might have been surprised but that didn't bother me. I preached to them about Jesus. After I had finished I did something very bold. I said to them, "If you want to give your lives to Christ, change out of your night clothes, wear something decent and come downstairs. We want to talk to you about Christ."</p>
                      <p>That morning several young ladies gave their hearts to God. Up to this day, many of them are still members of my church.</p>
                      
                      <h3 className="doc-subtitle">I Love Dawn Broadcasts</h3>
                      <p>Preaching at dawn to people in their beds has been one of my favourite methods of implementing this principle of anagkazo. One morning, I preached at the hostel of public health nurses. A lady threw down a note saying she was a backslider and needed help. She wanted us to speak with her. That morning we ministered to her and God delivered her. She has now been a faithful member of our church for the last ten years.</p>
                      <p>Although I started out with an empty classroom, it soon became filled with nurses who had given their lives to Christ at my anagkazo dawn broadcasts. Dear reader, I want you to understand something; I did not inherit a church from anyone. I have often gone to places where I knew no one, and no one knew me. I have had to go out and win souls, driving and persuading people about the Lord, until the room was full.</p>
                      
                      <h3 className="doc-subtitle">Step #4</h3>
                      <p><strong>He is not overcome by people's excuses.</strong></p>
                      <p>Many people are full of excuses. This anagkazo man in the Bible (Luke 14) listened to three amazing excuses for not attending his party. However, he was not impressed by any of them.</p>
                      <p>The first excuse was about testing oxen in the night. Everyone knows that no one tests oxen at that time of the night. The second excuse was about somebody who had just gotten married. But we all know that a dinner would have been a nice outing for a newly wedded couple. The third excuse was about going to see some land in the night. Let me ask you a question. Would you not assess a piece of land before you buy it? How could you inspect a piece of land in the night? Would you even see it clearly? Yet somebody was using this as an excuse for not attending the party.</p>
                      <p>Any good minister, who wants to reach people, must not be overwhelmed by people's excuses. He must learn to overcome people's excuses.</p>
                      <p>Even as you minister the Word of God, people form excuses in their minds. They develop reasons why they will not obey the Word. Every good preacher must learn to preach against people's excuses and ideas. Jesus spoke directly against the people's reasoning and excuses. And they knew it!</p>
                      <div className="prayer-block">
                        <p><em>"...for they perceived that he had spoken this parable against them."</em> <span className="scripture">Luke 20:19</span></p>
                      </div>
                      
                      <h3 className="doc-subtitle">Step #5</h3>
                      <p><strong>He knows that many excuses are empty.</strong></p>
                      <p>As I said earlier, many excuses cannot be substantiated. A good minister must learn to see through the emptiness of excuses. I spoke to one friend, inviting him to church.</p>
                      
                      <h3 className="doc-subtitle">The Successful Businessman</h3>
                      <p>He in turn spoke about how the time was not convenient and how he had quite a distance to travel. I said to him, "You are a successful businessman. Everything you want to do, you do. You travel. You get up early on weekdays. You even have time to visit your girlfriend who lives a few hundred kilometres away. How come you have no time for God?"</p>
                      <p>I told him, "If you really want to do something you can do it."</p>
                      <p>Some people do not pay their tithes because they claim they have no money. Watch how much money they spend on other things. You will realize that the problem is not a lack of money, but the spirit of greed.</p>
                      
                      <h3 className="doc-subtitle">Step #6</h3>
                      <p><strong>He knows that many excuses are lies.</strong></p>
                      <p>There are many husbands who blame the inadequacies of their spiritual relationships on their wives and vice versa. I remember once, one of my pastors did fundraising in a branch church.</p>
                      
                      <h3 className="doc-subtitle">The Lying Wife</h3>
                      <p>During the fundraising, the pastor asked for those who would like to give some money for the purchase of church instruments. A husband who happened to be a foreigner was prepared to give a donation. Just as his hand was going up, his wife pulled his hand down. She thought the pastor hadn't noticed. After the service, the lady approached the pastor and said, "You know, the reason why we didn't give any money is because my foreign husband is so stingy."</p>
                      <p><strong>She Prevented Her Husband from Giving</strong> "I will see what we can do," she added. But that was an outright lie. It was actually her husband who wanted to donate something. His wife prevented him.</p>
                      
                      <h3 className="doc-subtitle">Step #7</h3>
                      <p><strong>He makes a way and does not give an excuse.</strong></p>
                      <p>Anyone operating with the spirit of anagkazo (the compelling drive) is able to achieve a lot for God.</p>
                      <p>One of the ways by which I assess leaders is to see how they handle the excuses of people. You see, I don't even have to ask young pastors what problems they have. I know the problems they must be having: the problem of some people coming this week and not coming the next week, the problem of people coming late to church and the problem of backsliding Christians! They also have the problem of new converts not remaining in church, the problem of not having enough time to pray and the problem of not being able to do outreaches.</p>
                      <p>If you are a pastor, shepherd, or cell leader you will have experienced some of these problems. But, dear friend, the Bible teaches us that there is nothing new under the sun. The problem that you have, I have. What differentiates the successful from the unsuccessful is the ability to overcome excuses. Notice that the man in Luke 14 was not moved by any of the excuses and reasons given. He made a way out of every circumstance that was produced by the unwilling guests.</p>
                      <p>I believe in one thing: if you really want to do something you make a way, if you do not want to do something you make an excuse.</p>
                      
                      <h3 className="doc-subtitle">They Came to Party</h3>
                      <p>I recall when many young people were unwilling to come to church. The young men especially, made all sorts of excuses. The spirit of anagkazo rose up in me and I said, "If they will not come to church, let us have parties for them."</p>
                      <p>We organized a party for the young people in one area of the city. We made invitation cards and distributed them to the youth in the community. They were very happy and said to themselves, "This is another opportunity to jam."</p>
                      <p>I remember that evening in particular, we played upbeat Christian music and danced with the unbelievers. One of them told me later that he wondered why they were not being served with beer. At a point in the party, we switched to slower music and we said we had an announcement to make.</p>
                      <p>By that time, many of the hardened unbelievers were sitting around. To their surprise, I got up and preached the gospel to them. They were surprised but they still gave their lives to Christ. Many were born again that night.</p>
                      <p>I have pastors in the church who were saved during some of these surprise evangelistic parties. You see, the Bible says by all means, "save some".</p>
                      <p><strong>Anagkazo means to compel and to drive people to God. An anagkazo person is not moved by unfavourable circumstances. We were not moved by the fact that these young men did not want to attend church. We made a way around that! Learn to make a way where there's no way. Find a way to overcome every excuse that people place before you.</strong></p>
                      
                      <h3 className="doc-subtitle">Step #8</h3>
                      <p><strong>He goes out of his normal circles of life.</strong></p>
                      <p>Everyone has a circle of friends. The usual thing is to stay within your circle of friends and acquaintances. However, anyone who wants to be used by God must move out of his regular group. You will notice that the anagkazo man in this story was forced to move out of his normal circle of life. This is a reality that we must face if we want to please God!</p>
                      
                      <h3 className="doc-subtitle">I Had My Circle</h3>
                      <p>When I was growing up in Accra, I had a group of friends. A sort of elitist company made up of children of foreigners and other bourgeoisie. As a child I travelled first class on intercontinental flights and interacted mainly with the so-called upper echelon of society. I stayed in international cities with my father. My hobbies were swimming and horse riding. You can imagine that in Ghana, where I come from, very few people have such pastimes.</p>
                      <p>However, there were hardly any Christians in these circles. When I got born again, I found myself moving out of this circle into a very different group. I moved out into better company, different from what I knew.</p>
                      <p>The fact is, in order to please God I could not spend a lot of time in those circles anymore. There were simply no believers in that group. If you want to please God you will have to move out of your circle and get to know other groups of people.</p>
                      <p>I know that the rich man in this story would not normally fellowship with people who live in hedges or who stand on highways. I know that the rich man in this story would not normally interact with cripples, the blind and the disabled. However, in order to achieve his goal, he had to interact with people of other social backgrounds.</p>
                      
                      <h3 className="doc-subtitle">A Nice Little Fellowship</h3>
                      <p>I remember in 1984 when I was a leader of a nice fellowship at the university. We loved each other dearly and were good company for one another (actually, I found my wife in that group). Many of the people that I knew in that little group are still my bosom friends up to this day.</p>
                      <p>However, the Spirit of God impressed upon me to move out of our little group and to go to people we didn't know. I remember, some people were not in favour of expanding our nice little clique. "If you bring in more people, we will lose something," they said. "There's something about a small fellowship. It's nice to be petite. It's a cute little family."</p>
                      <p>But I led this group into one outreach after another, driving and necessitating people to come to the Lord. I was never tired of preaching. People are not tired of sinning, why should you be tired of spreading the gospel?</p>
                      <p>During the second year of the medical school (which by the way is the most difficult year), I led this group in dawn broadcasts every Saturday morning. Everyone knew about us. They were used to our voices which rang out loud and clear every Saturday morning.</p>
                      <p>"Thank God for our nice little fellowship," I said. "But we have to go out there and win souls." We must move out of our little circle.</p>
                      
                      <h3 className="doc-subtitle">People Are No Longer Impressed</h3>
                      <p>There is a very important revelation I want you to catch – people become used to you after awhile. After awhile, unbelievers are no longer impressed with our sermons. If you do not rise up with a new approach, a new anagkazo method, your message will become blunt.</p>
                      <p>As we continued preaching at dawn, I realized that people just turned over in their beds and ignored us. I said to myself, "Our messages are no longer driving people to the Lord."</p>
                      <p>But the Spirit of the Lord gave me a bright idea.</p>
                      
                      <h3 className="doc-subtitle">Knock on Their Doors!</h3>
                      <p>Since the people were now so used to our voices, we needed to do something new. I decided to send out a group to stand outside the doors of their rooms. I told the preacher for the morning, "When you get to the altar call, we will start knocking on their doors."</p>
                      <p>I told him, "Tell the people who are listening to you they are going to hear a knock on their door. If they want to accept Christ they should open up and we will come in and lead them to the Lord."</p>
                      <p>The preacher followed my instructions. Suddenly, those who were ignoring us had to pay attention. We were knocking on their doors at 5 a.m.! Believe me, many were gloriously born again during those morning broadcasts.</p>
                      
                      <h3 className="doc-subtitle">He Would Laugh at Us</h3>
                      <p>I vividly remember one brother in particular. He would laugh at Christians as they spoke in tongues. He made fun of the gift of speaking in tongues. This is someone who would get drunk and lie by one of the many ponds that litter the beautiful campus of the University of Ghana. That morning as my friend the evangelist preached and said, "Perhaps you are hearing a knock on your door. If you want to be born again open your door and someone will come in and lead you to the Lord", I happened to knock on the door of this young man.</p>
                      <p>I was surprised when he opened the door and welcomed us in. He said, "I knew you would come here. Today is my day!" We prayed with him and he gave his heart to the Lord that very morning. To this day, this man is serving the Lord. I give glory to God for all the people that have been born again as we have forcefully moved out to speak the Word. Anagkazo works!</p>
                      
                      <h3 className="doc-subtitle">Step#9</h3>
                      <p><strong>The anagkazo man is not satisfied as long as there is still room.</strong></p>
                      <p>A song that I love goes like this,</p>
                      <div className="prayer-block">
                        <p><em>There's room at the cross for you.<br/>
                        There's room at the cross for you.<br/>
                        Though millions have come,<br/>
                        There's still room for one.<br/>
                        There's room at the cross for you.</em></p>
                      </div>
                      <p>A pastor must never be satisfied as long as there is room in the church. The man in this story sent out his servants simply because there was room.</p>
                      <div className="prayer-block">
                        <p><em>"...and yet there is room."</em> <span className="scripture">Luke 14:22</span></p>
                      </div>
                      <p>I believe that every church should arrange more chairs than people. The presence of empty pews should motivate the pastor to reach out until the house is full. The whole essence of evangelism is to have a full church.</p>
                      <div className="prayer-block">
                        <p><em>"...compel [anagkazo] them to come in, that my house may be filled."</em> <span className="scripture">Luke 14:23</span></p>
                      </div>
                      <p>Evangelism is not intended to be done in a vacuum. It should be related to church growth. All our efforts to lead people to the Lord should bear fruit. We must see our efforts filling church buildings.</p>
                      <p>Whatever the case, a minister must see that there is room at the cross for one more soul. I believe that if we have this mind, God will use us to fill the church.</p>
                      <p>I have never been satisfied with the size of my church. When we had ten people, I wanted twenty. When we had fifty, I dreamed of a hundred. When God gave me one hundred people, I thought to myself, "What would it be like if I had five hundred people?" When the church was numbered in the hundreds, I thought, "What would it be like if we had thousands?"</p>
                      <p>I think a pastor will get tired of preaching to the same few people after awhile. We must be motivated to have a fuller house. These words keep ringing in my soul, "That my house may be filled!" "That my house may be filled!" Dear Christian friend, never forget that there is still room at the cross.</p>
                    </section>

                    <section className="notes-section">
                      <div className="section-title">
                        <h2>Chapter 3: Practicing Anaideia and Biazo</h2>
                      </div>
                      
                      <h3 className="doc-subtitle">Biazo</h3>
                      <div className="prayer-block">
                        <p><em>"Verily I say unto you, Among them that are born of women there hath not risen a greater than John the Baptist: notwithstanding he that is least in the kingdom of heaven is greater than he. And from the days of John the Baptist until now the kingdom of heaven suffereth violence, and the violent [biazo] take it by force."</em> <span className="scripture">Matthew 11:11,12</span></p>
                      </div>
                      <p>Multitudes of non-Christians are hurtling down a broad street to Hell. They sing, they dance, and they wine and dine. They do not give a hoot about the gospel we preach! Many of us Christians live in our nice little world where we are oblivious to the reality of sinners going to Hell.</p>
                      <p>I once worked as a sub-intern at the mortuary of the largest hospital in Ghana. Something struck me that I want to share with you. Every few minutes a car would park outside the mortuary. In that car was the body of a man sprawled in the back seat, or even sometimes in the boot (trunk).</p>
                      <p>I would stand at the main door of the mortuary as people brought in their loved ones and relatives who had died at home or on the street. These people were so sad and shaken. You must understand that only a few hours earlier they had been talking to a living person who was now gone forever. They were bringing their loved one to a fridge.</p>
                      <p>I noticed that there did not seem to be any particular time of the day when dead people were brought to this mortuary. As I stood there, God showed me that people were dying across the city all the time. Death is not reserved for early mornings or late nights. It happens at random.</p>
                      <p>A person who has never stood at the door of a mortuary will not know how common death is. How frequently people depart for eternity! Just as the Lord spoke to his prophets when they saw certain things, the Lord spoke to me when I stood at that door. He asked, "How many of these people do you think were saved?"</p>
                      <p>"I died for them, I gave up my life for them, but are they saved?"</p>
                      <p>Listen to me Christian friend. Many of our church bazaars, weddings, fellowships and nice choirs are not enough to win the multitudes to Christ. As I said earlier, people are hurtling down the road of destruction. They do not even know that they are going to Hell.</p>
                      
                      <h3 className="doc-subtitle">They Heard the Music</h3>
                      <p>This reminds me of a war in which the prisoners were taken to large camps. They were stripped of their clothes and herded into huge gas chambers. As they filed in, their captors would play beautiful music for the prisoners. They heard the music. How soothing and refreshing it must have sounded. "Surely nothing evil is going to happen to us," they thought. Little did they know that they were about to be slaughtered by the same people who were playing the music.</p>
                      <p>This is the lot of unbelievers today. They hear the music of the devil. The melodies and lullabies of this present world charm them. Because of these things, they do not know that they are walking to their own destruction.</p>
                      <div className="prayer-block">
                        <p><em>"...as an ox goeth to the slaughter..."</em> <span className="scripture">Proverbs 7:22</span></p>
                      </div>
                      <p>In Matthew 11:12, the Bible tells us that the violent take the kingdom of God by force. What does this mean?</p>
                      <ul>
                        <li>The Twentieth Century New Testament puts it this way, <em>"...men using force have been seizing it..."</em></li>
                        <li>The William's Translation says, <em>"...men are seizing it as a precious prize..."</em></li>
                        <li>The Goodspeed translation says, <em>"...Men have been taking the kingdom of heaven by storm..."</em></li>
                        <li>The Weymouth translation says, <em>"...the kingdom of God has been enduring violent assault..."</em></li>
                      </ul>
                      <p>All these Scriptures tell us one thing. Gentle words, nice songs, lame sermons and docile choirs cannot help much in this indifferent and uninterested world. People don't want to know. They are deceived.</p>
                      
                      <h3 className="doc-subtitle">Church Games Will Not Help</h3>
                      <p>They don't care whether Jesus comes today or tomorrow. "Leave me alone," they say. "To hell with this church business of yours."</p>
                      <p>That is why we need what the Bible calls biazo. <strong>Biazo means to use force and to force one's way into a thing.</strong> Many people are blinded by the devil. We must open their eyes to the realities of Heaven and Hell.</p>
                      <div className="prayer-block">
                        <p><em>"...the god of this world hath blinded the minds of them..."</em> <span className="scripture">2 Corinthians 4:4</span></p>
                      </div>
                      <p>Apostle Paul did not only give nice sermons. He was actively involved in turning the heads and opening the eyes of unbelievers.</p>
                      <p>I always know when people are ignoring the message. But I don't want anybody to ignore this important message – I must turn their heads and open their eyes. One particular morning, my group in the university found ourselves in a hall, preaching.</p>
                      
                      <h3 className="doc-subtitle">Call out Their Room Numbers</h3>
                      <p>I realized that the young ladies (it was a ladies' hall) were just turning over in their beds, some with their boyfriends. They knew that we would end our "disturbance" after a short while. The Spirit of God gave me a quick instruction on how to use biazo on that occasion. He whispered, "Do not preach generally, but call out their room numbers and direct the preaching to individual rooms."</p>
                      <p>I obeyed.</p>
                      <p><strong>They Were Surprised</strong> I gave each of the dawn broadcasters four or five rooms to preach to. It was an amazing experience! The people were so surprised to hear their room numbers being mentioned. A voice was coming out in the darkness speaking very specifically to the occupants of particular rooms.</p>
                      <p>Everyone knew they were being addressed personally by God. Of course, some of them were very angry. And some had their boyfriends sleeping in their rooms with them. They could not help but hear a personal and direct message.</p>
                      <p>I remember that in response to this one lady ran out of her room, came downstairs, lifted up her hands and said, "I want to give my life to Christ today! I want to be born again!"</p>
                      <p>Some were outraged, but some were saved. The Bible says,</p>
                      <div className="prayer-block">
                        <p><em>"...blessed is he, whosoever shall not be offended in me."</em> <span className="scripture">Matthew 11:6</span></p>
                      </div>
                      
                      <h3 className="doc-subtitle">Don't Preach to Yourself!</h3>
                      <p>When we have city-wide crusades, I stand on the platform and command my church members to go out into the community. We don't wait for them to come to us, we go out there and bring them from their homes.</p>
                      <p>One day, we even went to a "Red Light District" and brought a group of prostitutes to the crusade. I was very happy to see these prostitutes coming to the altar to give their lives to the Lord. You see, if we hadn't forced these women out of their "work places" and to the crusade, they would never have been saved. Most prostitutes do not go to church. They would have just gone about their daily routine. We would have ended up preaching to ourselves.</p>
                      <p><strong>Christian friends, let's stop playing games. If we are going to preach the gospel, let's not preach to ourselves. Let's go out there and drive them in (anagkazo and biazo) to the Lord.</strong></p>
                      
                      <h3 className="doc-subtitle">Anaideia</h3>
                      <div className="prayer-block">
                        <p><em>"I say unto you, Though he will not rise and give him, because he is his friend, yet because of his importunity [anaideia] he will rise and give him as many as he needeth."</em> <span className="scripture">Luke 11:8</span></p>
                      </div>
                      <p>In Luke 11, Jesus told us a story of a man who needed three loaves of bread. This man buried his shame and embarrassment and went to his friend's house at a very odd hour. The master of the house was woken up.</p>
                      <p>He might have shouted, "What is happening? Are there some armed robbers here? Is there a fire? What is going on outside?" The servant of the house probably replied, "It's the neighbour. He says he wants some bread for his visitors."</p>
                      <p>Dear Christian friend, most of us would not disturb even our best friends at midnight. How much more to ask for something trivial like bread!</p>
                      <p>But Jesus' message here is very simple. If you are not ashamed to press for certain things, you will never achieve them. If you are shameless in the work of God, you will accomplish things that others will only dream about! God has shown me that people who are very concerned about their public image cannot achieve much for God.</p>
                      
                      <h3 className="doc-subtitle">Are You Ashamed to Start a Church?</h3>
                      <p>It takes anaideia, shamelessness, to start a church. When I discussed with my friend the idea of starting a church, I remember he looked at me in amazement. He said, "What if people don't come to the church? We will be so embarrassed. People in town will hear that we tried to start a church that didn't work."</p>
                      <p>By starting a church, I don't mean to break away with a large segment of someone else's ministry. I am talking about moving into a room that has two or three people and preaching to them. It takes shamelessness to tell these few people that they are now in a great church. If you are not prepared to go through the shame and ridicule of standing in an empty room and looking odd, you will never achieve great things for God.</p>
                      
                      <h3 className="doc-subtitle">Are You Ashamed?</h3>
                      <p>One pastor told me he was afraid to do an altar call (inviting people to give their life to Christ). What if no one responds? Would you not feel ashamed? People will think that you are not anointed and that your message was not powerful enough. It is this very train-of-thought that keeps people away from powerful ministry.</p>
                      <p>One of my Elders called and told me that for the first time someone in the church had responded to her altar call. You see, she had been shamelessly doing altar calls with no one responding. But with anaideia (shamelessness and persistence) she eventually had results!</p>
                      
                      <h3 className="doc-subtitle">What if No One Gets Healed?</h3>
                      <p>The shameless man, who asked for the bread, eventually accomplished his goal. I remember when I first began to pray for the sick. I was very worried about what people would think about me.</p>
                      <p>Many times whilst standing on stage, the devil would tell me, "Don't even bother to call out for testimonies; no one will be healed."</p>
                      <p>The devil told me, "Do not disgrace yourself any further. Just end the service here and send the people home."</p>
                      <p>But the Spirit of the Lord rose up within me and I said to myself, "I am not ashamed. If no one gets healed this time, I will do it again, and again, and again! One day, someone will get healed." I am glad to say that many have been healed.</p>
                      <p>After I had qualified from the medical school, I worked for one year as a medical doctor. At a point, the Lord began to speak to me about entering full-time ministry.</p>
                      
                      <h3 className="doc-subtitle">How Will I Survive?</h3>
                      <p>I argued with the Lord, "I will work and bring enough money to support the church."</p>
                      <p>I continued, "What will people think of me. To leave such a noble profession and to enter a controversial area." I told the Lord, "No one knows my church! And no one knows me!"</p>
                      <p>"Worst of all, what a shame it is for me to live off people's collection." "That's ridiculous! Why should people contribute their pennies for my upkeep? I find it degrading," I thought.</p>
                      <p>However, the Lord told me, "They that preach the gospel must live off the gospel."</p>
                      <div className="prayer-block">
                        <p><em>"Even so hath the Lord ordained that they which preach the gospel should live of the gospel."</em> <span className="scripture">1 Corinthians 9:14</span></p>
                      </div>
                      <p>I had to bury my pride as a doctor and shamelessly enter full-time ministry. Through the revelation of shamelessness (anaideia), I have gone far in ministry. I have achieved things, which no one ever thought would come out of me.</p>
                      <p><strong>Anaideia (shamelessness) is the key you need to accomplish great things for God!</strong></p>
                    </section>
                  </div>
                </div>
              ) : view === 'kingdomkids' ? (
                <KingdomKidsPage />
              ) : (
                <div className="dashboard-container">
                  <div className="dashboard-about">
                    <img src="/logo.png" alt="HMCI Waterberg Logo" className="dashboard-logo" />
                    <h1 className="dashboard-title">HMCI WATERBERG</h1>

                    <div className="about-section">
                      <h2 className="about-heading">WHO ARE WE</h2>
                      <div className="about-underline"></div>
                      <p className="about-text">WE ARE A GOD FEARING CHURCH</p>
                    </div>

                    <div className="about-section">
                      <h2 className="about-heading">OUR VISION</h2>
                      <div className="about-underline"></div>
                      <p className="about-text">A CHURCH FULL OF GOD FEARING PEOPLE</p>
                    </div>

                    <div className="about-section">
                      <h2 className="about-heading">OUR MISSION</h2>
                      <div className="about-underline"></div>
                      <p className="about-text">WE TRAIN AND EQUIP SAINTS FOR THE WORK OF THE MINISTRY (EPH 4:11-12)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
          {!showBooksSidebar && (
            <div className="sidebar-arrow" onClick={() => setShowBooksSidebar(true)} title="Open Books Sidebar">
              →
            </div>
          )}
          <aside className={`sidebar right-sidebar ${showBooksSidebar ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
              <div className="sidebar-title" onClick={() => setShowBookList(prev => !prev)} style={{ cursor: 'pointer' }}>BOOKS</div>
            </div>
            {showBookList && (
              <nav className="sidebar-nav books-nav">
                <div className={`sidebar-item ${selectedBook === 'bible' ? 'active' : ''}`} onClick={() => { setSelectedBook('bible'); setView('bible'); setShowBooksSidebar(false); }}>
                  <span className="sidebar-icon">📖</span>
                  <span className="sidebar-label">Holy Bible</span>
                </div>
                <div className={`sidebar-item ${selectedBook === 'guideline' ? 'active' : ''}`} onClick={() => { setSelectedBook('guideline'); setView('guideline'); setShowBooksSidebar(false); }}>
                  <span className="sidebar-icon">📖</span>
                  <span className="sidebar-label">The Guideline</span>
                </div>
                <div className={`sidebar-item ${selectedBook === 'endtimes' ? 'active' : ''}`} onClick={() => { setSelectedBook('endtimes'); setView('endtimes'); setShowBooksSidebar(false); }}>
                  <span className="sidebar-icon">⏳</span>
                  <span className="sidebar-label">End Times</span>
                </div>
                <div className={`sidebar-item ${selectedBook === 'revelation' ? 'active' : ''}`} onClick={() => { setSelectedBook('revelation'); setView('revelation'); setShowBooksSidebar(false); }}>
                  <span className="sidebar-icon">📜</span>
                  <span className="sidebar-label">Revelation</span>
                </div>
                <div className={`sidebar-item ${selectedBook === 'notes' ? 'active' : ''}`} onClick={() => { setSelectedBook('notes'); setView('notes'); setShowBooksSidebar(false); }}>
                  <span className="sidebar-icon">📝</span>
                  <span className="sidebar-label">Junior Youth</span>
                </div>
                <div className={`sidebar-item ${selectedBook === 'kingdomkids' ? 'active' : ''}`} onClick={() => { setSelectedBook('kingdomkids'); setView('kingdomkids'); setShowBooksSidebar(false); }}>
                  <span className="sidebar-icon">👑</span>
                  <span className="sidebar-label">Kingdom Kids</span>
                </div>
              </nav>
            )}
            <div className="books-preview">
              {selectedBook === 'bible' && (
                <>
                  <h3>Holy Bible</h3>
                  <p>Open the full Bible to read Scripture, study verses, and explore God’s Word.</p>
                </>
              )}
              {selectedBook === 'guideline' && (
                <>
                  <h3>The Guideline</h3>
                </>
              )}
              {selectedBook === 'endtimes' && (
                <>
                  <h3>End Times</h3>
                  <p>Discover teaching on the last days and understand the prophetic timeline.</p>
                </>
              )}
              {selectedBook === 'revelation' && (
                <>
                  <h3>Revelation</h3>
                  <p>Read the Revelation book and study the visions given to John.</p>
                </>
              )}
              {selectedBook === 'notes' && (
                <>
                  <h3>Junior Youth</h3>
                  <p>Access youth notes, lessons, and practical instruction for young believers.</p>
                </>
              )}
              {selectedBook === 'kingdomkids' && (
                <>
                  <h3>Kingdom Kids</h3>
                  <p>Explore Kingdom Kids teaching, activities, and study material.</p>
                </>
              )}
            </div>
          </aside>
        </div>

        {view === 'settings' && (
          <div className="settings-overlay">
            <div className="settings-modal">
              <div className="settings-header">
                <h2>Profile Settings</h2>
                <button className="close-modal-btn" onClick={() => setView('dashboard')}>✕</button>
              </div>
              
              <div className="settings-content">
                <div className="settings-section">
                  <h3>Personal Information</h3>
                  <div className="setting-input">
                    <label>Full Names</label>
                    <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Full Names" />
                  </div>
                  <div className="setting-input">
                    <label>E-mail</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="E-mail" />
                  </div>
                  <div className="setting-input">
                    <label>Phone Number</label>
                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone Number" />
                  </div>
                  <div className="setting-input">
                    <label>Branch</label>
                    <input type="text" value={editBranch} onChange={(e) => setEditBranch(e.target.value)} placeholder="Branch" />
                  </div>
                  <button className="save-btn" onClick={handleSaveProfile} disabled={authLoading} style={{ background: 'var(--accent-color)', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                    {authLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="settings-section">
                  <h3>Update Password</h3>
                  <form onSubmit={handleChangePassword}>
                    {error && <div className="error-alert" style={{ marginBottom: '15px' }}>{error}</div>}
                    <div className="setting-input">
                      <label>New Password</label>
                      <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div className="setting-input">
                      <label>Confirm Password</label>
                      <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                    <button type="submit" className="option-btn" style={{ background: 'var(--accent-color)', color: 'white', width: '100%' }}>Update Password</button>
                  </form>
                </div>

                <div className="settings-section">
                  <h3>Theme Preferences</h3>
                  <div className="theme-toggle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Dark Mode</span>
                    <label className="switch">
                      <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="logout-section">
                  <button className="logout-panel-btn" onClick={handleLogout}>Log Out</button>
                  <button className="outline-btn" style={{ marginTop: '10px', width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }} onClick={() => setView('dashboard')}>Close Settings</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="loginDiv" className="login-container">
      <div className="login-info-section">
        <div className="login-info">
          <img src="/logo.png" alt="HMCI WATERBERG Logo" className="login-logo-img" />
          <h1>Welcome to HMCI WATERBERG</h1>
          <p>Your trusted platform for amazing experiences. Sign in to access all features and manage your account.</p>
          <ul className="info-list">
            <li>✓ Secure Supabase Auth</li>
            <li>✓ Real-time Profile Sync</li>
            <li>✓ Premium Network Access</li>
          </ul>
        </div>
      </div>
      {showRecovery ? (
        <div className="login-box">
          <h2>Recover Account</h2>
          {recoveryStep === 'phone' ? (
            <form onSubmit={handleSendRecoveryOTP}>
              <p style={{ fontSize: '14px', marginBottom: '15px', color: 'var(--text-secondary)' }}>Enter your phone number to receive a secure login OTP.</p>
              {error && <div className="error-alert">{error}</div>}
              <input type="tel" placeholder="Phone Number (e.g. +27...)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <p style={{ fontSize: '14px', marginBottom: '15px', color: 'var(--text-secondary)' }}>Enter the code sent to your phone.</p>
              {error && <div className="error-alert">{error}</div>}
              <input type="text" placeholder="OTP Code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </form>
          )}
          <p className="login-footer"><a href="#" onClick={() => { setShowRecovery(false); setRecoveryStep('phone'); setError(''); }}>Back to Login</a></p>
        </div>
      ) : !showSignup ? (
        <div className="login-box">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            {error && <div className="error-alert">{error}</div>}
            <input type="text" placeholder="Email or Username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <button type="submit" disabled={authLoading}>
              {authLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <a href="#" className="forgot-password-link" onClick={() => setShowRecovery(true)}>Forgotten Password?</a>
          <p className="login-footer">New here? <a href="#" onClick={() => { setShowSignup(true); setError(''); }}>Create Account</a></p>
        </div>
      ) : (
        <div className="login-box">
          <h2>New Account</h2>
          <form onSubmit={handleSignup}>
            {error && <div className="error-alert">{error}</div>}
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <input type="text" placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} required />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="Confirm" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
            />
            <button type="submit" disabled={authLoading}>
              {authLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
          <p className="login-footer">Have an account? <a href="#" onClick={() => { setShowSignup(false); setError(''); }}>Login</a></p>
        </div>
      )}
    </div>
  );
}


