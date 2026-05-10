import React, { useState, useEffect, useMemo } from 'react';

const BiblePage = () => {
  const [bibleData, setBibleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedBookIdx, setSelectedBookIdx] = useState(0);
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVerseIdx, setActiveVerseIdx] = useState(null);

  useEffect(() => {
    const fetchBible = async () => {
      try {
        setLoading(true);
        const res = await fetch('/bible_bbe.json');
        if (!res.ok) throw new Error("Bible data not found.");
        const data = await res.json();
        setBibleData(data);
      } catch (err) {
        setError("Failed to load Bible: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBible();
  }, []);

  // Handle Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delay = setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const results = [];
      
      // Efficient traverse of the entire bible array
      for (let b = 0; b < bibleData.length; b++) {
        const book = bibleData[b];
        for (let c = 0; c < book.chapters.length; c++) {
          const chapter = book.chapters[c];
          for (let v = 0; v < chapter.length; v++) {
            const verseText = chapter[v];
            if (verseText.toLowerCase().includes(q)) {
              results.push({
                book: book.name,
                bookIdx: b,
                chapter: c + 1,
                chapterIdx: c,
                verse: v + 1,
                text: verseText
              });
              // Limit results to prevent UI freezing on huge matches
              if (results.length > 200) {
                setSearchResults(results);
                setIsSearching(false);
                return;
              }
            }
          }
        }
      }
      setSearchResults(results);
      setIsSearching(false);
    }, 400); // 400ms debounce
    
    return () => clearTimeout(delay);
  }, [searchQuery, bibleData]);

  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setActiveVerseIdx(null);
  };

  useEffect(() => {
    stopAudio();
  }, [selectedChapterIdx, selectedBookIdx]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const playVerseSequential = (verseArray, startIdx = 0) => {
    if (startIdx >= verseArray.length) {
      stopAudio();
      return;
    }
    if (!window.speechSynthesis) return;

    setActiveVerseIdx(startIdx);
    const utterance = new SpeechSynthesisUtterance(verseArray[startIdx]);
    
    // Gentle & Smooth Settings
    utterance.rate = 0.85; // Slower, calmer reading pace
    utterance.pitch = 0.95; // Slightly lower pitch for smoothness

    // Attempt to select a premium or more human voice
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.name.includes('Natural') && v.lang.includes('en'))
                      || voices.find(v => v.name.includes('Google UK English'))
                      || voices.find(v => v.name.includes('Google US'))
                      || voices.find(v => v.lang === 'en-GB' || v.lang === 'en-US');
    
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.onend = () => {
      setTimeout(() => {
        playVerseSequential(verseArray, startIdx + 1);
      }, 400); 
    };

    utterance.onerror = (e) => {
      console.warn('Speech error', e);
      stopAudio();
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayChapter = () => {
    if (!bibleData[selectedBookIdx]) return;
    stopAudio();
    setIsPlaying(true);
    const chap = bibleData[selectedBookIdx].chapters[selectedChapterIdx];
    playVerseSequential(chap, 0);
  };

  const handlePauseAudio = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleResumeAudio = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const handleResultClick = (res) => {
    setSelectedBookIdx(res.bookIdx);
    setSelectedChapterIdx(res.chapterIdx);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (loading) {
    return (
      <div className="bible-view loading" style={{textAlign:'center', padding: '50px'}}>
        <div className="spinner" style={{margin:'0 auto'}}></div>
        <p style={{marginTop:'20px'}}>Loading Holy Bible (BBE translation)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bible-view error" style={{color: 'var(--error-color)', padding: '50px', textAlign: 'center'}}>
        {error}
      </div>
    );
  }

  const currentBook = bibleData[selectedBookIdx];
  const currentChapter = currentBook?.chapters[selectedChapterIdx];

  return (
    <div className="bible-view" style={{maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%'}}>
      <div className="notes-header" style={{marginBottom: '20px'}}>
        <h1>The Holy Bible</h1>
      </div>

      <div className="bible-search-container" style={{marginBottom: '20px', position: 'relative'}}>
        <input 
          type="text" 
          placeholder="Search scripture..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bible-search-input"
          style={{
            width: '100%', padding: '15px', borderRadius: '8px', 
            border: '1px solid var(--border-color)', background: 'var(--input-bg)',
            color: 'var(--text-primary)', fontSize: '16px'
          }}
        />
        {isSearching && <span style={{position:'absolute', right:'15px', top:'15px'}}>🔎</span>}
        
        {searchResults.length > 0 && searchQuery.trim().length >= 3 && (
          <div className="bible-search-dropdown" style={{
            position: 'absolute', top: '100%', left: 0, right: 0, 
            background: 'var(--card-bg)', border: '1px solid var(--border-color)', 
            maxHeight: '400px', overflowY: 'auto', zIndex: 100,
            borderRadius: '8px', marginTop: '5px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            {searchResults.map((res, i) => (
              <div key={i} className="bible-search-item" onClick={() => handleResultClick(res)} style={{
                padding: '12px 15px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer'
              }}>
                <strong style={{color: 'var(--accent-color)'}}>{res.book} {res.chapter}:{res.verse}</strong>
                <p style={{margin: '5px 0 0', fontSize: '14px', lineHeight: '1.4'}}>{res.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bible-navigation" style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
        <select 
          value={selectedBookIdx} 
          onChange={(e) => {
            setSelectedBookIdx(Number(e.target.value));
            setSelectedChapterIdx(0);
          }}
          className="bible-select"
          style={{
            padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)',
            background: 'var(--input-bg)', color: 'var(--text-primary)', flex: 1
          }}
        >
          {bibleData.map((b, idx) => (
            <option key={idx} value={idx}>{b.name}</option>
          ))}
        </select>
        
        <select 
          value={selectedChapterIdx} 
          onChange={(e) => setSelectedChapterIdx(Number(e.target.value))}
          className="bible-select"
          style={{
            padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)',
            background: 'var(--input-bg)', color: 'var(--text-primary)', width: '120px'
          }}
        >
          {currentBook?.chapters.map((_, idx) => (
            <option key={idx} value={idx}>Chapter {idx + 1}</option>
          ))}
        </select>

        <div className="audio-controls" style={{display: 'flex', gap: '10px'}}>
          {!isPlaying ? (
            <button className="quiz-btn" onClick={handlePlayChapter} style={{padding: '10px 15px', background: 'var(--accent-color)'}}>▶ Listen</button>
          ) : (
            <>
              {isPaused ? (
                <button className="quiz-btn" onClick={handleResumeAudio} style={{padding: '10px 15px'}}>▶ Resume</button>
              ) : (
                <button className="quiz-btn" onClick={handlePauseAudio} style={{padding: '10px 15px', background: 'var(--border-color)', color: 'var(--text-primary)'}}>⏸ Pause</button>
              )}
              <button className="quiz-btn" onClick={stopAudio} style={{padding: '10px 15px', background: 'var(--error-color)'}}>⏹ Stop</button>
            </>
          )}
        </div>
      </div>

      <div className="bible-content" style={{
        background: 'var(--card-bg)', padding: '30px', borderRadius: '12px',
        border: '1px solid var(--border-color)', overflowY: 'auto', flex: 1,
        lineHeight: '1.8', fontSize: '18px'
      }}>
        <h2 style={{textAlign: 'center', marginBottom: '30px', color: 'var(--text-primary)'}}>
          {currentBook?.name} {selectedChapterIdx + 1}
        </h2>
        {currentChapter?.map((verse, idx) => (
          <p key={idx} style={{
            marginBottom: '15px', 
            padding: '8px 10px', 
            borderRadius: '6px',
            background: activeVerseIdx === idx ? 'var(--input-bg)' : 'transparent',
            borderLeft: activeVerseIdx === idx ? '4px solid var(--accent-color)' : '4px solid transparent',
            transition: 'all 0.3s ease'
          }}>
            <sup style={{color: 'var(--accent-color)', fontWeight: 'bold', marginRight: '8px'}}>{idx + 1}</sup>
            {verse}
          </p>
        ))}
      </div>
    </div>
  );
};

export default BiblePage;
