import { useState } from 'react';
import { LogEntry } from '@/lib/types';

export const useGameLogs = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showRobotLogs, setShowRobotLogs] = useState(false);

    const addLog = (msg: string, type: 'robot' | 'user' = 'user') => {
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            message: `[${new Date().toLocaleTimeString()}] ${msg}`,
            type
        }]);
    };

    const clearLogs = () => {
        setLogs([]);
    };

    return {
        logs,
        setLogs,
        addLog,
        clearLogs,
        showRobotLogs,
        setShowRobotLogs
    };
};
