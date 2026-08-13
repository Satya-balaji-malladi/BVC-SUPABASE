import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Html5QrcodeScanner } from 'html5-qrcode';
import SessionService from '../../services/SessionService';
import { 
  Scan, CheckCircle2, XCircle, AlertTriangle, User, Menu,
  MapPin, Clock, Camera, Keyboard, RefreshCw, ArrowLeft, ArrowRight, Users, Calendar, Loader2, LayoutDashboard, Search, ListChecks, LogOut,
  Bell, FileText, Info, ChevronRight, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CoordinatorScanner({ isNested = false }) {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [eventId, setEventId] = useState(localStorage.getItem('selected_event_id') || ''); 
  const [eventData, setEventData] = useState(null);
  
  // App State
  const [activeModule, setActiveModule] = useState('scanner'); 
  const [attendanceFilter, setAttendanceFilter] = useState('All');
  const [currentAttendanceDate, setCurrentAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventDays, setEventDays] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Data State
  const [stats, setStats] = useState({ registered: 0, present: 0 });
  const [recentScans, setRecentScans] = useState([]);
  
  // Dropdown Data State
  const [dbDepartments, setDbDepartments] = useState([]);
  const [dbBranches, setDbBranches] = useState([]);
  const [dbSections, setDbSections] = useState([]);
  
  // Full Tables State
  const [fullParticipantsList, setFullParticipantsList] = useState([]);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [registeredSearch, setRegisteredSearch] = useState('');

  // Scanner State
  const [inputMode, setInputMode] = useState('keyboard'); 
  const [scanInput, setScanInput] = useState('');
  const [loading, setLoading] = useState(true); 
  const [processingScan, setProcessingScan] = useState(false);
  const [scanResult, setScanResult] = useState(null); 
  
  // Spot Registration State
  const [showSpotForm, setShowSpotForm] = useState(false);
  const [spotSaving, setSpotSaving] = useState(false);
  const [togglingRoll, setTogglingRoll] = useState(null);
  const [spotData, setSpotData] = useState({
    roll_number: '',
    student_name: '',
    college_type: 'BVC', // 'BVC' or 'Other'
    college_name: '',
    department: '',
    branch: '',
    section: '',
    year: ''
  });

  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleLogout = () => {
    SessionService.clearSession();
    navigate('/login');
  };

  useEffect(() => {
    const user = SessionService.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setUserRole(user.role || 'Coordinator');
    setUserName(user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username);

    if (window.innerWidth <= 768) {
      setInputMode('camera');
    }

    loadDashboardData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeModule === 'scanner' && inputMode === 'keyboard' && inputRef.current && !processingScan && !showSpotForm) {
        inputRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [inputMode, processingScan, activeModule, showSpotForm]);

  useEffect(() => {
    let scanner = null;
    if (activeModule === 'scanner' && !loading && !showSpotForm) {
      const fetchDropdownData = async () => {
        try {
          const { data: deps } = await supabase.from('departments').select('*');
          if (deps) setDbDepartments(deps);
          
          let brsData = [];
          try {
            const { data: brs } = await supabase.from('branches').select('*');
            if (brs && brs.length > 0) brsData = brs;
          } catch (e) {}

          if (brsData.length === 0 && deps && deps.length > 0) {
            brsData = deps.map(d => ({
              branch_id: d.department_id,
              branch_code: d.department_code || d.department_id,
              branch_name: d.department_name,
              department_id: d.department_id
            }));
          } else if (brsData.length === 0) {
            brsData = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML'].map(b => ({ branch_id: b, branch_code: b, branch_name: b, department_id: 'DEPT_' + b }));
          }
          setDbBranches(brsData);

          const { data: secs } = await supabase.from('sections').select('*');
          if (secs) setDbSections(secs);
        } catch (e) {
          console.warn('Failed to fetch dropdown data', e);
        }
      };
      
      fetchDropdownData();

      try {
        scanner = new Html5QrcodeScanner("qr-reader", { 
          fps: 10, 
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        }, false);
        
        scanner.render(
          (decodedText) => {
            if (!processingScan && !showSpotForm && decodedText) {
              const cleanCode = decodedText.trim().toUpperCase();
              handleScan(cleanCode); // Auto-submit immediately
            }
          },
          (error) => {}
        );
      } catch (err) {
        console.warn("Scanner init issue:", err);
      }
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
      const qrElem = document.getElementById('qr-reader');
      if (qrElem) qrElem.innerHTML = '';
    };
  }, [loading, processingScan, activeModule, showSpotForm]);

  // Auto-select branch if only one branch exists for the selected department
  useEffect(() => {
    if (showSpotForm && spotData.department) {
      const filteredBranches = dbBranches.filter(b => !spotData.department || b.department_id === spotData.department || b.department_id === `DEPT_${spotData.department}` || spotData.department === `DEPT_${b.department_id}`);
      if (filteredBranches.length === 1) {
        const singleBranch = filteredBranches[0].branch_code || filteredBranches[0].branch_name;
        if (spotData.branch !== singleBranch) {
          setSpotData(prev => ({...prev, branch: singleBranch}));
        }
      }
    }
  }, [spotData.department, dbBranches, showSpotForm]);

  // Auto-select section if no sections exist or only one section exists for the selected branch
  useEffect(() => {
    if (showSpotForm && (spotData.branch || spotData.department)) {
      const filteredSecs = dbSections.filter(s => {
        if (spotData.branch) return s.branch_code === spotData.branch;
        if (spotData.department) return s.branch_code === spotData.department.replace('DEPT_', '');
        return false;
      });
      if (filteredSecs.length === 1) {
        const singleSec = filteredSecs[0].section_code || filteredSecs[0].section_name.substring(0,5);
        if (spotData.section !== singleSec) {
          setSpotData(prev => ({...prev, section: singleSec}));
        }
      } else if (filteredSecs.length === 0) {
        if (spotData.section !== 'A') {
          setSpotData(prev => ({...prev, section: 'A'}));
        }
      }
    }
  }, [spotData.branch, spotData.department, dbSections, showSpotForm]);

  // Calculate event days when eventData changes
  useEffect(() => {
    if (eventData && eventData.start_date && eventData.end_date) {
      const start = new Date(eventData.start_date);
      const end = new Date(eventData.end_date);
      const days = [];
      let d = new Date(start);
      // Fallback limit for safety
      let safeLimit = 0;
      while (d <= end && safeLimit < 30) {
        days.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
        safeLimit++;
      }
      if (days.length === 0) days.push(new Date().toISOString().split('T')[0]);
      
      setEventDays(days);
      const today = new Date().toISOString().split('T')[0];
      if (days.includes(today)) {
        setCurrentAttendanceDate(today);
      } else {
        setCurrentAttendanceDate(days[0]);
      }
    }
  }, [eventData]);

  // Load attendance data whenever active date changes
  useEffect(() => {
    if (eventId && currentAttendanceDate) {
      loadAttendanceStats();
    }
  }, [currentAttendanceDate]);

  useEffect(() => {
    if ((activeModule === 'attendance' || activeModule === 'registered') && eventId && currentAttendanceDate) {
      loadFullParticipantsData();
    }
  }, [activeModule, currentAttendanceDate]);

  const loadDashboardData = async () => {
    if (!eventId) {
      navigate('/select-event');
      return;
    }
    setLoading(true);
    try {
      const { data: event, error: evtErr } = await supabase
        .from('events')
        .select('*')
        .eq('event_id', eventId)
        .single();
      if (evtErr) throw evtErr;
      setEventData(event);

      const { data: regData, error: regErr } = await supabase
        .from('event_participants')
        .select('roll_number')
        .eq('event_id', eventId);
        
      let uniqueCount = 0;
      if (!regErr && regData) {
        const validRolls = regData
          .map(r => (r.roll_number || '').trim().toUpperCase())
          .filter(r => r !== '');
        uniqueCount = new Set(validRolls).size;
      }

      setStats(prev => ({ ...prev, registered: uniqueCount }));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceStats = async () => {
    try {
      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('date', currentAttendanceDate)
        .eq('attendance_status', 'Present');

      setStats(prev => ({ ...prev, present: presentCount || 0 }));

      const { data: recent, error: recentErr } = await supabase
        .from('attendance')
        .select('roll_number, attendance_status, timestamp')
        .eq('event_id', eventId)
        .eq('date', currentAttendanceDate)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (!recentErr && recent) {
        const rollNumbers = recent.map(r => r.roll_number);
        if (rollNumbers.length > 0) {
          const { data: studentsData } = await supabase
            .from('students')
            .select('roll_number, student_name, department_id')
            .in('roll_number', rollNumbers);
            
          const { data: otherStudentsData } = await supabase
            .from('other_college_students')
            .select('roll_number, student_name, department')
            .in('roll_number', rollNumbers);
            
          const stuMap = new Map();
          (studentsData || []).forEach(s => stuMap.set(s.roll_number, s));
          (otherStudentsData || []).forEach(s => {
            stuMap.set(s.roll_number, {
              ...s,
              department_id: s.department
            });
          });
          
          const enriched = recent.map(r => {
            const s = stuMap.get(r.roll_number);
            return {
              ...r,
              name: s ? s.student_name : r.roll_number,
              department: s?.department_id || '--'
            };
          });
          setRecentScans(enriched);
        } else {
          setRecentScans([]);
        }
      }
    } catch (err) {
      console.error('Failed to load attendance stats:', err);
    }
  };

  const loadFullParticipantsData = async () => {
    try {
      const today = currentAttendanceDate;

      const { data: participants, error: pErr } = await supabase
        .from('event_participants')
        .select('roll_number')
        .eq('event_id', eventId);
        
      if (pErr) throw pErr;

      const { data: todaysAttendance, error: attErr } = await supabase
        .from('attendance')
        .select('roll_number, attendance_status, timestamp')
        .eq('event_id', eventId)
        .eq('date', today);

      if (participants && participants.length > 0) {
        const rollNumbers = participants.map(p => p.roll_number);
        const { data: studentsData } = await supabase
          .from('students')
          .select('roll_number, student_name, department_id, year')
          .in('roll_number', rollNumbers);

        const { data: otherStudentsData } = await supabase
          .from('other_college_students')
          .select('roll_number, student_name, department, year')
          .in('roll_number', rollNumbers);

        const stuMap = new Map();
        (studentsData || []).forEach(s => {
          if (s.roll_number) stuMap.set(s.roll_number.toUpperCase(), s);
        });
        (otherStudentsData || []).forEach(s => {
          if (s.roll_number) {
            stuMap.set(s.roll_number.toUpperCase(), {
              ...s,
              department_id: s.department
            });
          }
        });

        const attMap = new Map();
        (todaysAttendance || []).forEach(a => {
          if (a.roll_number) attMap.set(a.roll_number.toUpperCase(), a);
        });

        const mapped = participants.map(p => {
          const rollUpper = (p.roll_number || '').toUpperCase();
          const s = stuMap.get(rollUpper);
          const att = attMap.get(rollUpper);
          return {
            roll_number: p.roll_number,
            attendance_status: att ? 'Present' : 'Absent',
            attendance_timestamp: att ? att.timestamp : null,
            name: s ? s.student_name : 'Unknown',
            department: s?.department_id || '--',
            year: s?.year || '--'
          };
        });

        const uniqueMap = new Map();
        for (const p of mapped) {
           if (!uniqueMap.has(p.roll_number) || p.attendance_status === 'Present') {
              uniqueMap.set(p.roll_number, p);
           }
        }
        setFullParticipantsList(Array.from(uniqueMap.values()));
      } else {
        setFullParticipantsList([]);
      }
    } catch (err) {
      console.error("Failed to load participants:", err);
    }
  };

  const showResult = (type, message, student = null) => {
    setScanResult({ type, message, student });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setScanResult(null);
    }, 4000);
  };

  const handleScan = async (scannedValue) => {
    if (!scannedValue || !eventData) return;
    const rollNumber = scannedValue.trim().toUpperCase();
    if (!rollNumber) return;

    setProcessingScan(true);
    setScanInput('');

    try {
      const token = localStorage.getItem('custom_auth_session') || localStorage.getItem('bvc_cached_user');
      let tokenObj = null;
      try { tokenObj = JSON.parse(token); } catch(e){}
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('record_event_attendance', {
        p_event_id: eventId,
        p_roll_number: rollNumber,
        p_attendance_date: currentAttendanceDate,
        p_attendance_method: inputMode === 'camera' ? 'QR' : 'Barcode',
        p_token: tokenObj?.token || ''
      });

      let result = rpcResult || {};

      if (rpcError) {
        if (rpcError.message.includes('Could not find the function') || rpcError.code === 'PGRST202' || rpcError.message.includes('does not exist')) {
          console.warn('RPC failed or missing dependencies. Using client-side fallback for attendance...');
          // 1. Check if student exists
          const { data: stuData } = await supabase.from('students').select('*').eq('roll_number', rollNumber).single();
          
          if (!stuData) {
            result = { status: 'NOT_FOUND' };
          } else {
            // 2. Check if registered
            const { data: regData } = await supabase.from('event_participants')
              .select('*').eq('event_id', eventId).ilike('roll_number', rollNumber).single();
              
            if (!regData || !['Active', 'Registered', 'Approved'].includes(regData.registration_status)) {
               result = { status: 'NOT_REGISTERED', student: stuData };
            } else {
               // 3. Check if already marked present
               const { data: attData } = await supabase.from('attendance')
                 .select('*').eq('event_id', eventId).eq('roll_number', rollNumber)
                 .eq('date', currentAttendanceDate).single();
                 
               if (attData) {
                 result = { status: 'DUPLICATE', student: stuData };
               } else {
                 // 4. Mark present
                 const now = new Date().toISOString();
                 const attId = `ATT_${Date.now()}_${rollNumber}`;
                 const { error: insErr } = await supabase.from('attendance').insert({
                   attendance_id: attId,
                   event_id: eventId,
                   roll_number: rollNumber,
                   user_id: tokenObj?.user?.id || null,
                   attendance_status: 'Present',
                   timestamp: now,
                   date: currentAttendanceDate,
                   time: now.split('T')[1].split('.')[0],
                   attendance_method: inputMode === 'camera' ? 'QR' : 'Barcode'
                 });
                 
                 if (insErr) {
                   showResult('error', `Failed to mark attendance: ${insErr.message}`);
                   setProcessingScan(false);
                   return;
                 }
                 result = { status: 'SUCCESS', student: stuData, timestamp: now };
               }
            }
          }
        } else {
          showResult('error', `System Error: ${rpcError.message}`);
          setProcessingScan(false);
          return;
        }
      }
      const status = result.status;
      const student = result.student;

      if (status === 'ERROR') {
        showResult('error', result.message || 'Error processing scan');
        setProcessingScan(false);
        return;
      }

      if (status === 'NOT_FOUND') {
        setSpotData({
          roll_number: rollNumber,
          student_name: '',
          college_type: 'BVC',
          college_name: '',
          department: '',
          branch: '',
          section: '',
          year: '',
          is_existing_student: false,
          reason: 'NOT_IN_DATABASE'
        });
        setShowSpotForm(true);
        setProcessingScan(false);
        return;
      }

      if (status === 'NOT_REGISTERED') {
        const isSpotAllowed = eventData.allow_spot_registration === 'Yes' || eventData.allow_spot_registration === true || eventData.allow_spot_registration_form === 'Yes';
        if (!isSpotAllowed) {
          showResult('error', `Not registered for this event (${rollNumber})`, student);
          setProcessingScan(false);
          return;
        }

        // Spot registration is allowed
        setSpotData({
          roll_number: student?.roll_number || rollNumber,
          student_name: student?.student_name || '',
          college_type: 'BVC',
          college_name: '',
          department: student?.department || '',
          branch: '',
          section: '',
          year: student?.year ? String(student.year) : '',
          is_existing_student: true,
          reason: 'NOT_REGISTERED'
        });
        setShowSpotForm(true);
        setProcessingScan(false);
        return;
      }

      if (status === 'DUPLICATE') {
        showResult('warning', `Attendance has already been recorded for ${currentAttendanceDate}.`, student);
        setProcessingScan(false);
        return;
      }

      if (status === 'SUCCESS') {
        const actualRoll = student.roll_number;
        const now = result.timestamp || new Date().toISOString();
        
        // Update UI State
        setStats(prev => ({ ...prev, present: prev.present + 1 }));
        setRecentScans(prev => [
          {
            roll_number: actualRoll,
            name: student.student_name || actualRoll,
            department: student.department || '--',
            timestamp: now,
            attendance_status: 'Present'
          },
          ...prev
        ].slice(0, 5));
        
        if (fullParticipantsList.length > 0) {
          setFullParticipantsList(prev => {
            const newList = [...prev];
            const idx = newList.findIndex(p => (p.roll_number || '').toUpperCase() === actualRoll.toUpperCase());
            if (idx >= 0) {
               newList[idx] = { ...newList[idx], attendance_status: 'Present', attendance_timestamp: now };
            } else {
               newList.push({
                 roll_number: actualRoll,
                 attendance_status: 'Present',
                 attendance_timestamp: now,
                 name: student.student_name || actualRoll,
                 department: student.department || '--',
                 year: student.year || '--'
               });
            }
            return newList;
          });
        }

        showResult('success', 'Attendance Marked Successfully', student);

        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.connect(audioContext.destination);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {}
      }

    } catch (err) {
      console.error('Scan handling failed:', err);
      showResult('error', 'Network error or failed to process scan. Please try again.');
    } finally {
      setProcessingScan(false);
      if (inputMode === 'keyboard' && inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleSpotSubmit = async (e) => {
    e.preventDefault();
    if (!spotData.student_name || !spotData.department || !spotData.year) return;
    
    setSpotSaving(true);
    try {
      const studentId = `STU_${Date.now()}`;
      const fullName = spotData.student_name.trim();
      const college = spotData.college_type === 'BVC' ? 'Bonam Venkata Chalamayya Engineering College' : spotData.college_name;
      const cleanRoll = spotData.roll_number.trim().toUpperCase();

      if (spotData.college_type === 'Other' && spotData.college_name) {
        await supabase.from('other_college_students').upsert([{
          id: `EXT_${Date.now()}`,
          roll_number: cleanRoll,
          student_name: fullName,
          college_name: spotData.college_name,
          department: spotData.department,
          year: spotData.year
        }], { onConflict: 'roll_number' });
      }

      // Upsert into main students table to handle duplicates gracefully
      const { error: insertErr } = await supabase.from('students').upsert([{
        student_id: studentId,
        roll_number: cleanRoll,
        student_name: fullName,
        college: college,
        department_id: spotData.department,
        section: spotData.section,
        year: parseInt(spotData.year) || 1
      }], { onConflict: 'roll_number' });

      if (insertErr && insertErr.code !== '23505') {
        console.error("Insert error:", insertErr);
      }

      // NOW REGISTER THEM IN event_participants
      const participantId = `${eventId}_${cleanRoll}`;
      await supabase.from('event_participants').upsert({
        participant_id: participantId,
        event_id: eventId,
        roll_number: cleanRoll,
        registration_status: 'Active',
        registration_type: 'Spot Registration'
      }, { onConflict: 'participant_id' });

      setShowSpotForm(false);
      
      // Auto-scan them now that they exist in database and are registered
      await handleScan(cleanRoll);

    } catch (err) {
      console.error("Failed to register spot student:", err);
      alert("Error saving student data. Please try again.");
    } finally {
      setSpotSaving(false);
    }
  };

  const toggleAttendance = async (participant) => {
    if (togglingRoll) return;
    setTogglingRoll(participant.roll_number);

    try {
      const isCurrentlyPresent = participant.attendance_status === 'Present';
      const newStatus = isCurrentlyPresent ? 'Absent' : 'Present';
      const now = new Date().toISOString();
      // We do NOT rely on event_participants.attendance_status for daily tracking
      if (newStatus === 'Present') {
        const userSession = SessionService.getUser();
        await supabase.from('attendance').insert([{ 
          attendance_id: `ATT_${Date.now()}_${participant.roll_number}`,
          event_id: eventId, 
          roll_number: participant.roll_number,
          user_id: userSession?.id || null,
          attendance_status: 'Present',
          timestamp: now,
          date: currentAttendanceDate,
          time: now.split('T')[1].split('.')[0],
          attendance_method: 'Manual Override'
        }]);
      } else {
        // Delete the attendance log for the current active date
        await supabase.from('attendance')
          .delete()
          .eq('event_id', eventId)
          .eq('roll_number', participant.roll_number)
          .eq('date', currentAttendanceDate);
      }

      // Update local state
      setStats(prev => ({ 
        ...prev, 
        present: newStatus === 'Present' ? prev.present + 1 : Math.max(0, prev.present - 1) 
      }));

      setFullParticipantsList(prev => prev.map(p => {
        if (p.roll_number === participant.roll_number) {
          return { ...p, attendance_status: newStatus, attendance_timestamp: newStatus === 'Present' ? now : null };
        }
        return p;
      }));

    } catch (err) {
      console.error("Failed to toggle attendance:", err);
      alert("Failed to change attendance. Please try again.");
    } finally {
      setTogglingRoll(null);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!eventId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2>No Event Selected</h2>
        <button onClick={() => navigate('/select-event')} style={{ padding: '0.75rem 1.5rem', background: '#1e3a8a', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '1rem' }}>
          Go to Event Selection
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="lucide-spin" size={48} color="#1e3a8a" />
      </div>
    );
  }

  const remaining = Math.max(0, stats.registered - stats.present);
  const percentage = stats.registered > 0 ? Math.round((stats.present / stats.registered) * 100) : (stats.present > 0 ? 100 : 0);
  const isLive = eventData?.event_status === 'Active' || eventData?.status === 'Active';
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isPastDay = currentAttendanceDate < todayStr;

  const filteredAttendance = fullParticipantsList.filter(p => 
    p.attendance_status === 'Present' && 
    ((p.name || '').toLowerCase().includes(attendanceSearch.toLowerCase()) || (p.roll_number || '').toLowerCase().includes(attendanceSearch.toLowerCase()))
  );
  
  const filteredAbsent = fullParticipantsList.filter(p => 
    p.attendance_status !== 'Present' && 
    ((p.name || '').toLowerCase().includes(attendanceSearch.toLowerCase()) || (p.roll_number || '').toLowerCase().includes(attendanceSearch.toLowerCase()))
  );

  const filteredRegistered = fullParticipantsList.filter(p => 
    ((p.name || '').toLowerCase().includes(registeredSearch.toLowerCase()) || (p.roll_number || '').toLowerCase().includes(registeredSearch.toLowerCase()))
  );

  const renderScannerModule = () => (
    <>
      {/* EVENT DAY TIMELINE */}
      {eventDays.length > 0 && (
        <section style={{ marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: '600' }}>
            <Calendar size={18} color="#1e3a8a" />
            <span>Event Day Timeline</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '400', marginLeft: '0.5rem' }}>
              (Select the day you are marking attendance for)
            </span>
          </div>
          <div className="event-day-timeline" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {eventDays.map((dayDate, i) => {
              const isSelected = currentAttendanceDate === dayDate;
              return (
                <button
                  key={dayDate}
                  onClick={() => setCurrentAttendanceDate(dayDate)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : '#fff',
                    color: isSelected ? '#1e3a8a' : '#64748b',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Day {i + 1}</span>
                  <span style={{ fontSize: '0.95rem' }}>{new Date(dayDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* STATISTICS */}
      <section className="desktop-only" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Registered', value: stats.registered, icon: <Users size={20} color="#3b82f6" />, bg: '#eff6ff', onClick: () => setActiveModule('registered') },
          { label: 'Present Today', value: stats.present, icon: <CheckCircle2 size={20} color="#22c55e" />, bg: '#dcfce7', onClick: () => { setActiveModule('attendance'); setAttendanceFilter('Present'); } },
          { label: 'Remaining', value: remaining, icon: <Clock size={20} color="#f59e0b" />, bg: '#fef3c7', onClick: () => { setActiveModule('attendance'); setAttendanceFilter('Absent'); } },
          { label: 'Attendance %', value: `${percentage}%`, icon: <Scan size={20} color="#8b5cf6" />, bg: '#f3e8ff', onClick: () => setActiveModule('scanner') }
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={stat.onClick}
            style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500', marginBottom: '0.25rem' }}>{stat.label}</div>
              <div style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: '700' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="scanner-layout" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr', alignItems: 'start' }}>
      <section style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div className="desktop-only" style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Scan Student</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Scan student ID or QR code to record attendance</p>
          </div>
          
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button 
              onClick={() => setInputMode('keyboard')}
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: inputMode === 'keyboard' ? '#fff' : 'transparent', color: inputMode === 'keyboard' ? '#1e3a8a' : '#64748b', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', boxShadow: inputMode === 'keyboard' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
              <Keyboard size={16} /> Handheld
            </button>
            <button 
              onClick={() => setInputMode('camera')}
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: inputMode === 'camera' ? '#fff' : 'transparent', color: inputMode === 'camera' ? '#1e3a8a' : '#64748b', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', boxShadow: inputMode === 'camera' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
              <Camera size={16} /> Camera
            </button>
          </div>
        </div>
        
        {/* MOBILE SEGMENTED CONTROL */}
        <div className="mobile-only-flex" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', margin: '0 1.5rem 1rem 1.5rem' }}>
            <button 
              onClick={() => setInputMode('camera')}
              style={{ flex: 1, padding: '0.5rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: 'none', background: inputMode === 'camera' ? '#fff' : 'transparent', color: inputMode === 'camera' ? '#0f172a' : '#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: inputMode === 'camera' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
              <Scan size={16} /> Scan
            </button>
            <button 
              onClick={() => setInputMode('keyboard')}
              style={{ flex: 1, padding: '0.5rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: 'none', background: inputMode === 'keyboard' ? '#fff' : 'transparent', color: inputMode === 'keyboard' ? '#0f172a' : '#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: inputMode === 'keyboard' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
              <Keyboard size={16} /> Manual
            </button>
        </div>

        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', minHeight: '300px', justifyContent: 'center', position: 'relative' }}>
          
          {isPastDay ? (
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <AlertTriangle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>Completed Day</h3>
              <p style={{ marginTop: '0.5rem' }}>You cannot scan or edit attendance for past days. View only.</p>
            </div>
          ) : (
            <>
              {/* SPOT REGISTRATION OVERLAY */}
          {showSpotForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="glass-panel" style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>Spot Registration</h3>
                  <button onClick={() => setShowSpotForm(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}><XCircle size={24} /></button>
                </div>
                
                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', border: '1px solid #fecaca' }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    {spotData.reason === 'NOT_REGISTERED' ? (
                      <>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Not registered for this event ({spotData.roll_number})</div>
                        <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '2px' }}>
                          Spot Registration is enabled for this event. Enter details below to register & mark present.
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Not available in database ({spotData.roll_number})</div>
                        <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '2px' }}>
                          Student details missing from master database. Enter details below to save into database & mark present.
                        </div>
                      </>
                    )}
                  </div>
                </div>

              <form onSubmit={handleSpotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>Full Name *</label>
                    <input required type="text" value={spotData.student_name} onChange={e => setSpotData({...spotData, student_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>College *</label>
                  <select value={spotData.college_type} onChange={e => setSpotData({...spotData, college_type: e.target.value, college_name: ''})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                    <option value="BVC">BVC Engineering College</option>
                    <option value="Other">Other College</option>
                  </select>
                </div>

                {spotData.college_type === 'Other' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>External College Name *</label>
                    <input required type="text" value={spotData.college_name} onChange={e => setSpotData({...spotData, college_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>Department *</label>
                    <select required value={spotData.department} onChange={e => setSpotData({...spotData, department: e.target.value, branch: '', section: ''})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                      <option value="">Select Department</option>
                      {dbDepartments.map(d => (
                        <option key={d.department_id} value={d.department_id}>
                          {d.department_name || d.department_code || d.department_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>Branch *</label>
                    <select required value={spotData.branch} onChange={e => setSpotData({...spotData, branch: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                      <option value="">Select Branch</option>
                      {dbBranches.filter(b => !spotData.department || b.department_id === spotData.department || b.department_id === `DEPT_${spotData.department}` || spotData.department === `DEPT_${b.department_id}`).map(b => (
                        <option key={b.branch_id} value={b.branch_code || b.branch_name}>
                          {b.branch_name || b.branch_code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>Year *</label>
                    <select required value={spotData.year} onChange={e => setSpotData({...spotData, year: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>Section *</label>
                    <select required value={spotData.section} onChange={e => setSpotData({...spotData, section: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                      <option value="">Select Section</option>
                      {dbSections.filter(s => {
                        if (spotData.branch) return s.branch_code === spotData.branch;
                        if (spotData.department) return s.branch_code === spotData.department.replace('DEPT_', '');
                        return false;
                      }).map(s => (
                        <option key={s.section_id} value={s.section_code || s.section_name.substring(0,5)}>
                          {s.section_name}
                        </option>
                      ))}
                      {dbSections.filter(s => {
                        if (spotData.branch) return s.branch_code === spotData.branch;
                        if (spotData.department) return s.branch_code === spotData.department.replace('DEPT_', '');
                        return false;
                      }).length === 0 && (
                        <option value="A">Section A (Default)</option>
                      )}
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={spotSaving} style={{ width: '100%', padding: '1rem', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', marginTop: '0.5rem', cursor: spotSaving ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  {spotSaving ? <><Loader2 size={18} className="lucide-spin" /> Saving...</> : 'Save & Mark Present'}
                </button>
              </form>
            </div>
            </div>
          )}

          {scanResult && !showSpotForm && (
            <div style={{ position: 'absolute', inset: '1rem', background: '#fff', borderRadius: '12px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem', border: `2px solid ${scanResult.type === 'success' ? '#22c55e' : scanResult.type === 'warning' ? '#f59e0b' : scanResult.type === 'info' ? '#3b82f6' : '#ef4444'}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              {scanResult.type === 'success' && <CheckCircle2 size={56} color="#22c55e" style={{ marginBottom: '0.75rem' }} />}
              {scanResult.type === 'warning' && <AlertTriangle size={56} color="#f59e0b" style={{ marginBottom: '0.75rem' }} />}
              {scanResult.type === 'info' && <Scan size={56} color="#3b82f6" style={{ marginBottom: '0.75rem' }} />}
              {scanResult.type === 'error' && <XCircle size={56} color="#ef4444" style={{ marginBottom: '0.75rem' }} />}
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: '#0f172a' }}>{scanResult.message}</h3>
              {scanResult.student && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', width: '100%', maxWidth: '320px' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#0f172a' }}>{scanResult.student.student_name || scanResult.student.name || scanResult.student.roll_number}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>{scanResult.student.roll_number}</div>
                  
                  {scanResult.type === 'success' && (
                    <button 
                      onClick={() => {
                        toggleAttendance(scanResult.student);
                        setScanResult(null);
                      }}
                      style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.4rem 0.85rem', 
                        background: '#fee2e2', 
                        color: '#991b1b', 
                        border: '1px solid #fca5a5', 
                        borderRadius: '6px', 
                        fontSize: '0.8rem', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <XCircle size={14} /> Change to Absent / Undo
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {/* STACKED LAYOUT: TOP = CAMERA (conditional), BOTTOM = MANUAL ENTRY */}
          {!showSpotForm && (
            <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
              
              {/* TOP SECTION: CAMERA VIEWPORT */}
              <div style={{ 
                width: '100%', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '2px solid #cbd5e1', 
                background: '#000', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                display: inputMode === 'camera' ? 'block' : 'none'
              }}>
                <div id="qr-reader" style={{ width: '100%', borderRadius: '14px' }}></div>
              </div>

              {/* BOTTOM SECTION: MANUAL ENTRY FORM */}
              {inputMode === 'keyboard' && (
                <form onSubmit={(e) => { e.preventDefault(); handleScan(scanInput); }} style={{ width: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem', 
                    background: '#fff', 
                    border: '2px solid #3b82f6', 
                    borderRadius: '16px', 
                    padding: '1.5rem', 
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)' 
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>Enter Roll Number / ID</label>
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="e.g. 21B91A0415"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        disabled={processingScan}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          border: '2px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '1.15rem',
                          fontWeight: '600',
                          color: '#0f172a',
                          background: '#f8fafc',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={processingScan || !scanInput.trim()}
                      title="Mark Attendance"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '10px',
                        background: processingScan || !scanInput.trim() ? '#94a3b8' : '#1e3a8a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        cursor: processingScan || !scanInput.trim() ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: processingScan || !scanInput.trim() ? 'none' : '0 4px 6px -1px rgba(30, 58, 138, 0.3)'
                      }}
                    >
                      {processingScan ? <Loader2 className="lucide-spin" size={22} /> : <CheckCircle2 size={22} />}
                      {processingScan ? 'Processing...' : 'Mark Attendance'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          </>
          )}
        </div>
      </section>

      <section style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxHeight: '100%' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Recent Scans</h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Click badge to toggle status</span>
        </div>
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
          {recentScans.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No scans recorded today.</div>
          ) : (
            recentScans.map((scan, i) => (
              <div key={i} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scan.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{scan.roll_number} • {formatTime(scan.timestamp)}</div>
                </div>
                <button 
                  onClick={() => {
                    toggleAttendance({ roll_number: scan.roll_number, attendance_status: scan.attendance_status });
                    setRecentScans(prev => prev.map(s => s.roll_number === scan.roll_number ? { ...s, attendance_status: s.attendance_status === 'Present' ? 'Absent' : 'Present' } : s));
                  }}
                  disabled={togglingRoll === scan.roll_number || isPastDay}
                  title={isPastDay ? "Editing disabled for past days" : "Click to toggle status"}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: scan.attendance_status === 'Present' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: isPastDay ? 'not-allowed' : 'pointer',
                    opacity: isPastDay ? 0.6 : 1,
                    background: scan.attendance_status === 'Present' ? '#dcfce7' : '#fee2e2',
                    color: scan.attendance_status === 'Present' ? '#166534' : '#991b1b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                >
                  {scan.attendance_status === 'Present' ? (
                    <><CheckCircle2 size={13} color="#166534" /> Present</>
                  ) : (
                    <><XCircle size={13} color="#991b1b" /> Absent</>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
    </>
  );

  const renderAttendanceModule = () => (
    <section style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div className="desktop-only" style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Attendance List
            <span style={{ fontSize: '0.85rem', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '12px', color: '#475569', fontWeight: 600 }}>
              {attendanceFilter === 'Present' ? filteredAttendance.length : attendanceFilter === 'Absent' ? filteredAbsent.length : filteredAttendance.length + filteredAbsent.length} Students
            </span>
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>View present and absent students</p>
        </div>
        <div className="attendance-filters" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={attendanceFilter} 
            onChange={(e) => setAttendanceFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
          >
            <option value="All">All Status</option>
            <option value="Present">Present Today</option>
            <option value="Absent">Remaining (Absent)</option>
          </select>
          <div className="search-container" style={{ position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search roll no or name..." 
              value={attendanceSearch}
              onChange={(e) => setAttendanceSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* MOBILE FILTERS */}
      <div className="mobile-only" style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
         <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select 
              value={attendanceFilter} 
              onChange={(e) => setAttendanceFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', flex: '1', minWidth: '100px' }}
            >
              <option value="All">All Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
            <div className="search-container" style={{ position: 'relative', flex: '2' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
            <button onClick={() => setAttendanceFilter('All')} style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: 'none', background: attendanceFilter === 'All' ? '#1e3a8a' : '#f1f5f9', color: attendanceFilter === 'All' ? '#fff' : '#475569', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>All ({filteredAttendance.length + filteredAbsent.length})</button>
            <button onClick={() => setAttendanceFilter('Present')} style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: 'none', background: attendanceFilter === 'Present' ? '#166534' : '#f1f5f9', color: attendanceFilter === 'Present' ? '#fff' : '#475569', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>Present ({filteredAttendance.length})</button>
            <button onClick={() => setAttendanceFilter('Absent')} style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: 'none', background: attendanceFilter === 'Absent' ? '#991b1b' : '#f1f5f9', color: attendanceFilter === 'Absent' ? '#fff' : '#475569', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>Absent ({filteredAbsent.length})</button>
          </div>
      </div>
      <div className="responsive-table-wrapper" style={{ padding: '1rem' }}>
        <table className="desktop-only" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
              <th style={{ padding: '1rem 0.5rem' }}>Roll No</th>
              <th style={{ padding: '1rem 0.5rem' }}>Name</th>
              <th style={{ padding: '1rem 0.5rem' }}>Department</th>
              <th style={{ padding: '1rem 0.5rem' }}>Status</th>
              <th style={{ padding: '1rem 0.5rem' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {(attendanceFilter === 'All' || attendanceFilter === 'Present') && filteredAttendance.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{p.roll_number}</td>
                <td style={{ padding: '1rem 0.5rem' }}>{p.name}</td>
                <td style={{ padding: '1rem 0.5rem', color: '#64748b' }}>{p.department}</td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  <button 
                    onClick={() => toggleAttendance(p)}
                    disabled={togglingRoll === p.roll_number || isPastDay}
                    title={isPastDay ? "Editing disabled for past days" : ""}
                    style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500', border: 'none', cursor: (togglingRoll === p.roll_number || isPastDay) ? 'not-allowed' : 'pointer', opacity: (togglingRoll === p.roll_number || isPastDay) ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                    {togglingRoll === p.roll_number && <Loader2 size={12} className="lucide-spin" />}
                    Present
                  </button>
                </td>
                <td style={{ padding: '1rem 0.5rem', color: '#64748b' }}>{formatTime(p.attendance_timestamp)}</td>
              </tr>
            ))}
            {(attendanceFilter === 'All' || attendanceFilter === 'Absent') && filteredAbsent.map((p, i) => (
              <tr key={`abs_${i}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{p.roll_number}</td>
                <td style={{ padding: '1rem 0.5rem' }}>{p.name}</td>
                <td style={{ padding: '1rem 0.5rem', color: '#64748b' }}>{p.department}</td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  <button 
                    onClick={() => toggleAttendance(p)}
                    disabled={togglingRoll === p.roll_number || isPastDay}
                    title={isPastDay ? "Editing disabled for past days" : ""}
                    style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500', border: 'none', cursor: (togglingRoll === p.roll_number || isPastDay) ? 'not-allowed' : 'pointer', opacity: (togglingRoll === p.roll_number || isPastDay) ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                    {togglingRoll === p.roll_number && <Loader2 size={12} className="lucide-spin" />}
                    Absent
                  </button>
                </td>
                <td style={{ padding: '1rem 0.5rem', color: '#94a3b8' }}>--:--</td>
              </tr>
            ))}
            {((attendanceFilter === 'All' && filteredAttendance.length === 0 && filteredAbsent.length === 0) ||
              (attendanceFilter === 'Present' && filteredAttendance.length === 0) ||
              (attendanceFilter === 'Absent' && filteredAbsent.length === 0)) && (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No students found.</td></tr>
            )}
          </tbody>
        </table>

        {/* MOBILE CARDS FOR ATTENDANCE */}
        <div className="mobile-only" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
          {(attendanceFilter === 'All' || attendanceFilter === 'Present') && filteredAttendance.map((p, i) => (
            <div key={`m_${i}`} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>{p.roll_number}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500' }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{p.department} • {formatTime(p.attendance_timestamp)}</div>
              </div>
              <button 
                onClick={() => toggleAttendance(p)}
                disabled={togglingRoll === p.roll_number || isPastDay}
                style={{ background: '#dcfce7', color: '#166534', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', border: 'none', cursor: (togglingRoll === p.roll_number || isPastDay) ? 'not-allowed' : 'pointer', opacity: (togglingRoll === p.roll_number || isPastDay) ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                {togglingRoll === p.roll_number ? <Loader2 size={16} className="lucide-spin" /> : 'Present'}
              </button>
            </div>
          ))}
          {(attendanceFilter === 'All' || attendanceFilter === 'Absent') && filteredAbsent.map((p, i) => (
            <div key={`m_abs_${i}`} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>{p.roll_number}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500' }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{p.department}</div>
              </div>
              <button 
                onClick={() => toggleAttendance(p)}
                disabled={togglingRoll === p.roll_number || isPastDay}
                style={{ background: '#fee2e2', color: '#991b1b', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', border: 'none', cursor: (togglingRoll === p.roll_number || isPastDay) ? 'not-allowed' : 'pointer', opacity: (togglingRoll === p.roll_number || isPastDay) ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                {togglingRoll === p.roll_number ? <Loader2 size={16} className="lucide-spin" /> : 'Absent'}
              </button>
            </div>
          ))}
          {((attendanceFilter === 'All' && filteredAttendance.length === 0 && filteredAbsent.length === 0) ||
            (attendanceFilter === 'Present' && filteredAttendance.length === 0) ||
            (attendanceFilter === 'Absent' && filteredAbsent.length === 0)) && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '1rem', fontWeight: '500', color: '#334155' }}>No students found</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try changing the filter or search query</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const renderRegisteredModule = () => (
    <section style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div className="desktop-only" style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Registered Students</h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>All students permitted for this event</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search roll no or name..." 
            value={registeredSearch}
            onChange={(e) => setRegisteredSearch(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
          />
        </div>
      </div>

      {/* MOBILE SEARCH */}
      <div className="mobile-only" style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <div className="search-container" style={{ position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search roll no or name..." 
            value={registeredSearch}
            onChange={(e) => setRegisteredSearch(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
          />
        </div>
      </div>
      <div style={{ padding: '1rem', overflowX: 'auto' }}>
        <table className="desktop-only" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
              <th style={{ padding: '1rem 0.5rem' }}>Roll No</th>
              <th style={{ padding: '1rem 0.5rem' }}>Name</th>
              <th style={{ padding: '1rem 0.5rem' }}>Department</th>
              <th style={{ padding: '1rem 0.5rem' }}>Year</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistered.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{p.roll_number}</td>
                <td style={{ padding: '1rem 0.5rem' }}>{p.name}</td>
                <td style={{ padding: '1rem 0.5rem', color: '#64748b' }}>{p.department}</td>
                <td style={{ padding: '1rem 0.5rem', color: '#64748b' }}>{p.year}</td>
              </tr>
            ))}
            {filteredRegistered.length === 0 && (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No students found.</td></tr>
            )}
          </tbody>
        </table>

        {/* MOBILE CARDS FOR REGISTERED STUDENTS */}
        <div className="mobile-only" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredRegistered.map((p, i) => (
            <div key={`m_reg_${i}`} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '1.05rem' }}>{p.roll_number}</span>
                <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px' }}>Year {p.year}</span>
              </div>
              <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: '500' }}>{p.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Department: {p.department}</div>
            </div>
          ))}
          {filteredRegistered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '1rem', fontWeight: '500', color: '#334155' }}>No students found</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const renderMobileHomeModule = () => (
    <div className="mobile-only" style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Event Card */}
      <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ background: isLive ? '#dcfce7' : '#f1f5f9', color: isLive ? '#166534' : '#475569', padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLive ? '#22c55e' : '#94a3b8' }} />
            {isLive ? 'LIVE' : 'UPCOMING'}
          </span>
          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.5px' }}>
            {eventData?.enable_registration === 'Yes' ? 'Registered Entry' : 'Open Entry'}
          </span>
        </div>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{eventData?.event_name || 'Unknown Event'}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {eventData?.location || 'TBD'}</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {new Date(eventData?.start_date).toLocaleDateString()}</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={14} /> ID: {eventData?.event_id}</div>
        </div>
      </div>

      {/* Today's Summary */}
      <div>
        <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.75rem 0.25rem' }}>Today's Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} /></div>
             <div>
               <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Registered</div>
               <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.registered}</div>
               <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Students</div>
             </div>
          </div>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={20} /></div>
             <div>
               <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Present Today</div>
               <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.present}</div>
               <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Students</div>
             </div>
          </div>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={20} /></div>
             <div>
               <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Remaining</div>
               <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>{remaining}</div>
               <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Students</div>
             </div>
          </div>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f3e8ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Scan size={20} /></div>
             <div>
               <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Attendance %</div>
               <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>{percentage}%</div>
               <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Today</div>
             </div>
          </div>
        </div>
      </div>

      {/* Scan Attendance Large Button */}
      <button onClick={() => setActiveModule('scanner')} style={{ background: '#2446B8', color: '#fff', border: 'none', borderRadius: '16px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(36,70,184,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Scan size={28} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Scan Attendance</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Scan student ID to mark attendance</div>
          </div>
        </div>
        <ChevronRight size={20} />
      </button>

      {/* Quick Actions */}
      <div>
        <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.75rem 0.25rem' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <button onClick={() => setActiveModule('attendance')} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', minWidth: '76px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div style={{ color: '#3b82f6' }}><FileText size={22} /></div>
            <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' }}>Attendance</span>
          </button>
          <button onClick={() => setActiveModule('registered')} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', minWidth: '76px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div style={{ color: '#22c55e' }}><Users size={22} /></div>
            <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: '500' }}>Registered</span>
          </button>
          <button onClick={() => alert('Reports module under construction')} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', minWidth: '76px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div style={{ color: '#f59e0b' }}><FileText size={22} /></div>
            <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: '500' }}>Reports</span>
          </button>
          <button onClick={() => alert('Event info module under construction')} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', minWidth: '76px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div style={{ color: '#8b5cf6' }}><Info size={22} /></div>
            <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' }}>Event Info</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: isNested ? '100%' : '100vh', overflowY: isNested ? 'visible' : 'auto', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER */}
      {!isNested && (
      <header className="desktop-only" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', background: '#1e3a8a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
            BVC
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '600' }}>Coordinator Workspace</h1>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Event Operations</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'right' }}>
          <div className="hide-on-mobile">
            <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#0f172a' }}>{userName}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{userRole}</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <User size={18} />
          </div>
          <button 
            onClick={handleLogout}
            title="Logout"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      )}

      {/* MOBILE HEADER */}
      {!isNested && (
      <header className="mobile-only" style={{ background: '#2446B8', color: '#fff', padding: '1rem 1rem 3rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, zIndex: 90 }}>
        {activeModule === 'home' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => setIsDrawerOpen(true)} style={{ background: 'none', border: 'none', padding: '0.25rem', color: '#fff' }}>
                <Menu size={24} />
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Coordinator</h1>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Event Operations</div>
              </div>
            </div>
            <div style={{ position: 'relative', marginTop: '0.25rem' }}>
              <Bell size={24} color="#fff" />
              <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
            </div>
          </>
        ) : activeModule === 'scanner' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => setActiveModule('home')} style={{ background: 'none', border: 'none', padding: '0.25rem', color: '#fff' }}>
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Scan Attendance</h1>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Mark student attendance</div>
              </div>
            </div>
            <button style={{ background: 'none', border: 'none', padding: '0.25rem', color: '#fff', marginTop: '0.25rem' }}>
              <RefreshCw size={20} />
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => setActiveModule('home')} style={{ background: 'none', border: 'none', padding: '0.25rem', color: '#fff' }}>
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>{activeModule === 'attendance' ? 'Attendance List' : 'Registered Students'}</h1>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{activeModule === 'attendance' ? 'View all students' : 'Permitted students'}</div>
              </div>
            </div>
            <button style={{ background: 'none', border: 'none', padding: '0.25rem', color: '#fff', marginTop: '0.25rem' }}>
              <Search size={20} />
            </button>
          </>
        )}
      </header>
      )}

      {/* MOBILE DRAWER */}
      {isDrawerOpen && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
         <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={() => setIsDrawerOpen(false)} />
         <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '280px', maxWidth: '85vw', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', background: '#1e3a8a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '0.8rem' }}>BVC</div>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>Coordinator</span>
               </div>
               <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b' }}><XCircle size={20} /></button>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <button onClick={() => {setActiveModule('scanner'); setIsDrawerOpen(false);}} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: activeModule === 'scanner' ? '#eff6ff' : 'transparent', color: activeModule === 'scanner' ? '#1d4ed8' : '#475569', fontWeight: '600', textAlign: 'left', width: '100%' }}>
                  <Scan size={18} /> Scanner
               </button>
               <button onClick={() => {setActiveModule('attendance'); setIsDrawerOpen(false);}} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: activeModule === 'attendance' ? '#eff6ff' : 'transparent', color: activeModule === 'attendance' ? '#1d4ed8' : '#475569', fontWeight: '600', textAlign: 'left', width: '100%' }}>
                  <ListChecks size={18} /> Attendance
               </button>
               <button onClick={() => {setActiveModule('registered'); setIsDrawerOpen(false);}} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: activeModule === 'registered' ? '#eff6ff' : 'transparent', color: activeModule === 'registered' ? '#1d4ed8' : '#475569', fontWeight: '600', textAlign: 'left', width: '100%' }}>
                  <Users size={18} /> Registered Students
               </button>
            </div>
            <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid #f1f5f9' }}>
               <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff5f5', color: '#dc2626', fontWeight: '600', textAlign: 'left', width: '100%' }}>
                  <LogOut size={18} /> Logout
               </button>
            </div>
         </div>
      </div>
      )}

      <div className="layout-container" style={{ display: 'flex', maxWidth: isNested ? '100%' : '1400px', margin: '0 auto', height: isNested ? '100%' : 'calc(100vh - 73px)' }}>
        
        {/* SIDEBAR */}
        {!isNested && (
        <aside className="coordinator-sidebar" style={{ width: '250px', background: '#fff', borderRight: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
            Modules
          </div>
          <button 
            onClick={() => setActiveModule('scanner')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: activeModule === 'scanner' ? '#eff6ff' : 'transparent', color: activeModule === 'scanner' ? '#1d4ed8' : '#475569', fontWeight: activeModule === 'scanner' ? '600' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
            <Scan size={18} /> Scanner
          </button>
          <button 
            onClick={() => setActiveModule('attendance')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: activeModule === 'attendance' ? '#eff6ff' : 'transparent', color: activeModule === 'attendance' ? '#1d4ed8' : '#475569', fontWeight: activeModule === 'attendance' ? '600' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
            <ListChecks size={18} /> Attendance
          </button>
          <button 
            onClick={() => setActiveModule('registered')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: activeModule === 'registered' ? '#eff6ff' : 'transparent', color: activeModule === 'registered' ? '#1d4ed8' : '#475569', fontWeight: activeModule === 'registered' ? '600' : '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
            <Users size={18} /> Registered Students
          </button>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <button 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff5f5', color: '#dc2626', fontWeight: '600', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s' }}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        </aside>
        )}

        {/* MAIN CONTENT */}
        <main className="mobile-main-content" style={{ flex: 1, padding: isNested ? '0' : '1.5rem', overflowY: 'auto' }}>
          
          {/* EVENT CONTEXT */}
          <section className="desktop-only" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ background: isLive ? '#dcfce7' : '#f1f5f9', color: isLive ? '#166534' : '#475569', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLive ? '#22c55e' : '#94a3b8' }} />
                  {isLive ? 'LIVE' : 'UPCOMING'}
                </span>
                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                  {eventData?.enable_registration === 'Yes' ? 'Registered Entry' : 'Open Entry'}
                </span>
              </div>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', color: '#0f172a' }}>{eventData?.event_name || 'Unknown Event'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {eventData?.location || 'TBD'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {new Date(eventData?.start_date).toLocaleDateString()}</span>
                <span>ID: {eventData?.event_id}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isNested && (
                <button onClick={() => navigate('/select-event')} style={{ padding: '0.6rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                  <ArrowLeft size={16} /> Switch Event
                </button>
              )}
            </div>
          </section>


          {isNested && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#fff', padding: '0.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <button onClick={() => setActiveModule('scanner')} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: activeModule === 'scanner' ? '#eff6ff' : 'transparent', color: activeModule === 'scanner' ? '#1d4ed8' : '#475569', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Scan size={18} /> Scanner
              </button>
              <button onClick={() => setActiveModule('attendance')} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: activeModule === 'attendance' ? '#eff6ff' : 'transparent', color: activeModule === 'attendance' ? '#1d4ed8' : '#475569', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <ListChecks size={18} /> Attendance
              </button>
              <button onClick={() => setActiveModule('registered')} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: activeModule === 'registered' ? '#eff6ff' : 'transparent', color: activeModule === 'registered' ? '#1d4ed8' : '#475569', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Users size={18} /> Registered
              </button>
            </div>
          )}

          {isMobile && activeModule === 'home' && renderMobileHomeModule()}
          {activeModule === 'scanner' && renderScannerModule()}
          {activeModule === 'attendance' && renderAttendanceModule()}
          {activeModule === 'registered' && renderRegisteredModule()}

        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-only" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0', zIndex: 100, height: '70px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '100%', padding: '0 0.5rem' }}>
          <button onClick={() => setActiveModule('home')} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeModule === 'home' ? '#2446B8' : '#64748b', padding: '0.5rem' }}>
            <LayoutDashboard size={24} /> <span style={{ fontSize: '0.65rem', fontWeight: '500' }}>Home</span>
          </button>
          <button onClick={() => setActiveModule('scanner')} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeModule === 'scanner' ? '#2446B8' : '#64748b', padding: '0.5rem' }}>
            <Scan size={24} /> <span style={{ fontSize: '0.65rem', fontWeight: '500' }}>Scan</span>
          </button>
          <button onClick={() => setActiveModule('attendance')} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeModule === 'attendance' ? '#2446B8' : '#64748b', padding: '0.5rem' }}>
            <Users size={24} /> <span style={{ fontSize: '0.65rem', fontWeight: '500' }}>Students</span>
          </button>
          <button onClick={() => setIsDrawerOpen(true)} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#64748b', padding: '0.5rem' }}>
            <Menu size={24} /> <span style={{ fontSize: '0.65rem', fontWeight: '500' }}>More</span>
          </button>
        </div>
      </nav>

      <style>{`
        .hide-on-mobile { display: block; }
        .scanner-layout { grid-template-columns: 2fr 1fr; }
        .desktop-only { display: block; }
        .mobile-only { display: none !important; }
        table.desktop-only { display: table; }
        .event-day-timeline::-webkit-scrollbar { display: none; }
        .event-day-timeline { -ms-overflow-style: none; scrollbar-width: none; }
        
        @media (max-width: 1024px) {
          .scanner-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
          .mobile-only-flex { display: flex !important; }
          .hide-on-mobile { display: none; }
          .coordinator-sidebar { display: none !important; }
          .layout-container { height: auto !important; padding-bottom: 80px; }
          .mobile-bottom-nav { display: block !important; }
          .mobile-main-content {
             background: #F6F8FC !important;
             margin-top: -30px !important;
             border-top-left-radius: 24px !important;
             border-top-right-radius: 24px !important;
             position: relative !important;
             z-index: 95 !important;
             padding: 1.5rem 1rem !important;
          }
          .attendance-filters { flex-direction: column !important; width: 100%; align-items: stretch !important; }
          .attendance-filters select, .attendance-filters .search-container { width: 100% !important; }
        }
        
        #qr-reader { border: none !important; }
        #qr-reader__scan_region { background: #000; }
        #qr-reader__dashboard_section_csr button { padding: 8px 16px; background: #1e3a8a; color: white; border: none; border-radius: 6px; margin: 4px; }
      `}</style>
    </div>
  );
}
