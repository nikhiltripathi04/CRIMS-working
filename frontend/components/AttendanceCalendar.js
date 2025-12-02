import React, { useState } from 'react';
import { IoChevronBack, IoChevronForward, IoImageOutline, IoClose } from 'react-icons/io5';

const AttendanceCalendar = ({ attendanceLogs = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDayLogs, setSelectedDayLogs] = useState(null);

    // Helper to get days in month
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Process logs into a map: "YYYY-MM-DD" -> [logs]
    const logsByDate = {};
    attendanceLogs.forEach(log => {
        const dateKey = new Date(log.timestamp).toDateString();
        if (!logsByDate[dateKey]) logsByDate[dateKey] = [];
        logsByDate[dateKey].push(log);
    });

    const handleDayClick = (day) => {
        const dateKey = new Date(year, month, day).toDateString();
        const logs = logsByDate[dateKey];
        if (logs && logs.length > 0) {
            setSelectedDayLogs({ date: dateKey, logs });
        }
    };

    const renderCalendarDays = () => {
        const days = [];
        // Empty slots for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={styles.emptyDay}></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = new Date(year, month, day).toDateString();
            const logs = logsByDate[dateKey];
            const hasLogin = logs?.some(l => l.type === 'login');
            const hasLogout = logs?.some(l => l.type === 'logout');

            let statusColor = 'transparent';
            if (hasLogin && hasLogout) statusColor = '#d4edda'; // Full day
            else if (hasLogin) statusColor = '#fff3cd'; // Partial
            else if (hasLogout) statusColor = '#f8d7da'; // Weird state

            days.push(
                <div
                    key={day}
                    style={{
                        ...styles.dayCell,
                        backgroundColor: statusColor,
                        cursor: logs ? 'pointer' : 'default',
                        fontWeight: logs ? 'bold' : 'normal'
                    }}
                    onClick={() => handleDayClick(day)}
                >
                    {day}
                    {logs && (
                        <div style={styles.dotContainer}>
                            {hasLogin && <div style={{ ...styles.dot, backgroundColor: '#28a745' }} title="In"></div>}
                            {hasLogout && <div style={{ ...styles.dot, backgroundColor: '#dc3545' }} title="Out"></div>}
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={prevMonth} style={styles.navBtn}><IoChevronBack /></button>
                <h3 style={styles.monthTitle}>{monthNames[month]} {year}</h3>
                <button onClick={nextMonth} style={styles.navBtn}><IoChevronForward /></button>
            </div>

            <div style={styles.weekDays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={styles.weekDay}>{d}</div>
                ))}
            </div>

            <div style={styles.calendarGrid}>
                {renderCalendarDays()}
            </div>

            <div style={styles.legend}>
                <div style={styles.legendItem}><div style={{ ...styles.dot, backgroundColor: '#28a745' }}></div> Check In</div>
                <div style={styles.legendItem}><div style={{ ...styles.dot, backgroundColor: '#dc3545' }}></div> Check Out</div>
            </div>

            {/* Day Details Modal */}
            {selectedDayLogs && (
                <div style={styles.modalOverlay} onClick={() => setSelectedDayLogs(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{selectedDayLogs.date}</h3>
                            <button style={styles.closeBtn} onClick={() => setSelectedDayLogs(null)}>
                                <IoClose size={24} />
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            {selectedDayLogs.logs.map((log, idx) => (
                                <div key={idx} style={styles.logItem}>
                                    <div style={styles.logHeader}>
                                        <span style={{
                                            ...styles.badge,
                                            backgroundColor: log.type === 'login' ? '#28a745' : '#dc3545'
                                        }}>
                                            {log.type === 'login' ? 'IN' : 'OUT'}
                                        </span>
                                        <span style={styles.time}>
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div style={styles.location}>
                                        📍 {log.location?.displayText || 'Unknown Location'}
                                    </div>
                                    {log.photo && (
                                        <div style={styles.photoWrapper}>
                                            <img src={log.photo} alt="Attendance" style={styles.photo} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        maxWidth: '400px',
        margin: '0 auto'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
    },
    monthTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333'
    },
    navBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '5px',
        fontSize: '18px',
        color: '#666'
    },
    weekDays: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        textAlign: 'center',
        marginBottom: '10px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#888'
    },
    weekDay: {
        padding: '5px'
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '5px'
    },
    dayCell: {
        height: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        fontSize: '14px',
        position: 'relative',
        transition: 'background 0.2s'
    },
    emptyDay: {
        height: '40px'
    },
    dotContainer: {
        display: 'flex',
        gap: '2px',
        marginTop: '2px'
    },
    dot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%'
    },
    legend: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginTop: '15px',
        fontSize: '12px',
        color: '#666'
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
    },
    // Modal Styles
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '350px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    modalHeader: {
        padding: '15px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 'bold'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '5px'
    },
    modalBody: {
        padding: '15px',
        overflowY: 'auto'
    },
    logItem: {
        marginBottom: '20px',
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '15px'
    },
    logHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    badge: {
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold'
    },
    time: {
        fontSize: '13px',
        color: '#666'
    },
    location: {
        fontSize: '12px',
        color: '#555',
        marginBottom: '8px'
    },
    photoWrapper: {
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0'
    },
    photo: {
        width: '100%',
        height: 'auto',
        display: 'block'
    }
};

export default AttendanceCalendar;
