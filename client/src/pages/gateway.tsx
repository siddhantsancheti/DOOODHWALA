import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, CheckCircle, XCircle, RefreshCw, ShieldAlert, Smartphone } from "lucide-react";
// import { SMS } from '@awesome-cordova-plugins/sms';
import { Capacitor } from '@capacitor/core';

interface SmsMessage {
    id: number;
    phone: string;
    message: string;
    status: string;
    attempts: number;
    createdAt: string;
}

export default function Gateway() {
    const [isActive, setIsActive] = useState(false);
    const [secret, setSecret] = useState("");
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState({ sent: 0, failed: 0, pending: 0 });
    const [lastPoll, setLastPoll] = useState<Date | null>(null);
    const [pendingList, setPendingList] = useState<SmsMessage[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const isIOS = Capacitor.getPlatform() === 'ios';

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
    };

    const fetchPendingMessages = async () => {
        try {
            const res = await fetch("/api/gateway/pending", {
                headers: { 'x-gateway-secret': secret }
            });

            if (res.status === 401) {
                addLog("Unauthorized: Invalid Secret");
                setIsActive(false);
                return;
            }

            const data = await res.json();
            if (data.success && data.messages.length > 0) {
                if (isIOS) {
                    // iOS: Add to list for manual sending
                    setPendingList(prev => {
                        const newMsgs = data.messages.filter((m: SmsMessage) => !prev.find(p => p.id === m.id));
                        if (newMsgs.length > 0) addLog(`Fetched ${newMsgs.length} new messages for manual sending`);
                        return [...prev, ...newMsgs];
                    });
                } else {
                    // Android: Auto process
                    addLog(`Fetched ${data.messages.length} pending messages`);
                    processMessages(data.messages);
                }
            }
            setLastPoll(new Date());
        } catch (error) {
            addLog(`Poll Error: ${error}`);
        }
    };

    const processMessages = async (messages: SmsMessage[]) => {
        for (const msg of messages) {
            await sendSingleMessage(msg);
        }
    };

    const sendSingleMessage = async (msg: SmsMessage) => {
        try {
            addLog(`Sending to ${msg.phone}...`);

            if ((window as any).cordova) {
                const options = isIOS ? { android: { intent: '' } } : { android: { intent: '' } };

                // On iOS, this opens the composer.
                // We can't easily know if they actually clicked send in the native UI.
                const sms = (window as any).sms;
                if (sms) {
                    await new Promise((resolve, reject) => {
                        sms.send(msg.phone, msg.message, options, resolve, reject);
                    });
                } else {
                    console.error("SMS plugin not available");
                }

                if (isIOS) {
                    // For iOS, we assume success if the composer opened, or we ask user to confirm.
                    // For better UX in this "Manual Mode", we'll mark it as sent in the UI and let user confirm.
                    addLog(`ℹ️ Opened composer for ${msg.phone}`);
                } else {
                    await updateStatus(msg.id, "sent");
                    setStats(prev => ({ ...prev, sent: prev.sent + 1 }));
                    addLog(`✅ Sent to ${msg.phone}`);
                }
            } else {
                // Dev mode simulation
                console.log(`[SIMULATION] SMS to ${msg.phone}: ${msg.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await updateStatus(msg.id, "sent");
                setStats(prev => ({ ...prev, sent: prev.sent + 1 }));
                addLog(`✅ [SIM] Sent to ${msg.phone}`);
            }

        } catch (error: any) {
            addLog(`❌ Failed to ${msg.phone}: ${error}`);
            // Don't mark as failed immediately on iOS as user might have cancelled
            if (!isIOS) {
                await updateStatus(msg.id, "failed", error.message);
                setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            }
        }
    };

    const handleManualSent = async (id: number) => {
        await updateStatus(id, "sent");
        setStats(prev => ({ ...prev, sent: prev.sent + 1 }));
        setPendingList(prev => prev.filter(m => m.id !== id));
        addLog(`✅ Marked as sent (Manual)`);
    };

    const updateStatus = async (id: number, status: string, error?: string) => {
        try {
            await fetch("/api/gateway/status", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'x-gateway-secret': secret
                },
                body: JSON.stringify({ id, status, error })
            });
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const toggleGateway = () => {
        if (isActive) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsActive(false);
            addLog("Gateway Stopped");
        } else {
            if (!secret) {
                addLog("Error: Please enter Gateway Secret");
                return;
            }
            setIsActive(true);
            addLog(`Gateway Started (${isIOS ? 'iOS Manual Mode' : 'Android Auto Mode'})`);
            fetchPendingMessages(); // Immediate fetch
            intervalRef.current = setInterval(fetchPendingMessages, 5000); // Poll every 5s
        }
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="max-w-md mx-auto space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Smartphone className="h-5 w-5" />
                                {isIOS ? "iOS Gateway (Manual)" : "Android Gateway"}
                            </span>
                            <Badge variant={isActive ? "default" : "destructive"}>
                                {isActive ? "ACTIVE" : "STOPPED"}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Gateway Secret</label>
                            <Input
                                type="password"
                                value={secret}
                                onChange={e => setSecret(e.target.value)}
                                placeholder="Enter secret key"
                                disabled={isActive}
                            />
                        </div>

                        <Button
                            className="w-full"
                            variant={isActive ? "destructive" : "default"}
                            onClick={toggleGateway}
                        >
                            {isActive ? (
                                <>
                                    <XCircle className="mr-2 h-4 w-4" /> Stop Gateway
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" /> Start Gateway
                                </>
                            )}
                        </Button>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded">
                                <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                                <div className="text-xs text-muted-foreground">Sent</div>
                            </div>
                            <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded">
                                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                                <div className="text-xs text-muted-foreground">Failed</div>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded">
                                <div className="text-2xl font-bold text-blue-600">
                                    {lastPoll ? Math.floor((new Date().getTime() - lastPoll.getTime()) / 1000) : '-'}s
                                </div>
                                <div className="text-xs text-muted-foreground">Last Poll</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* iOS Manual Queue */}
                {isIOS && isActive && pendingList.length > 0 && (
                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium">Pending Messages ({pendingList.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingList.map(msg => (
                                <div key={msg.id} className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>To: {msg.phone}</span>
                                        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-sm font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                                        {msg.message}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => sendSingleMessage(msg)}
                                        >
                                            <Send className="h-3 w-3 mr-1" /> Open SMS
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                                            onClick={() => handleManualSent(msg.id)}
                                        >
                                            <CheckCircle className="h-3 w-3 mr-1" /> Mark Sent
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card className="flex-1">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center">
                            <RefreshCw className="mr-2 h-3 w-3" /> Activity Log
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[300px] p-4 pt-0">
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-xs font-mono text-muted-foreground border-b border-gray-100 dark:border-gray-800 pb-1 mb-1 last:border-0">
                                        {log}
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <div className="text-center text-muted-foreground py-8 text-xs">
                                        No activity yet. Start the gateway to begin polling.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex items-start gap-3 text-xs text-yellow-800 dark:text-yellow-200">
                    <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                    <p>
                        {isIOS
                            ? "iOS Mode: Auto-sending is restricted by Apple. You must manually tap 'Open SMS' and then send for each message."
                            : "Keep this screen open and the device active to ensure SMS delivery. The app must have SMS permissions granted."
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
