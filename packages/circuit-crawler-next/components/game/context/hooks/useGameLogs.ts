import { useState } from 'react';
import { LogEntry } from 'circuit-crawler';

export const useGameLogs = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showRobotLogs, setShowRobotLogs] = useState(false);

    const addLog = (msg: string, type: 'robot' | 'user' | 'react' | 'react_update' = 'user', payload?: any) => {
        if (type === 'react_update') {
            setLogs(prev => prev.map(log =>
                log.type === 'react' && log.payload?.id === payload?.id
                    ? { ...log, payload: { ...log.payload, props: payload.props } }
                    : log
            ));
            return;
        }

        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            message: `[${new Date().toLocaleTimeString()}] ${msg}`,
            type,
            payload
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
