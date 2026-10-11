/**
 * Commission and fee rates, set from the dashboard.
 *
 * Two levels. The platform defaults apply to everyone; a dairyman with his own
 * rate departs from them. Both are shown together because a rate means nothing
 * without the default it departs from — "2%" is only legible next to "standard
 * is 0.5%".
 *
 * Clearing a dairyman's rate is deliberately a separate action from setting it
 * to zero. Zero means he pays nothing; cleared means he pays whatever everyone
 * else pays, and follows the default when it moves.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Percent, RotateCcw, Save, AlertTriangle } from "lucide-react";

type MilkmanRate = {
    id: number;
    businessName: string | null;
    verified: boolean | null;
    commissionPercentage: string | null;
    hasOwnRate: boolean;
    effectiveRate: number;
};

type RatesResponse = {
    customerFeePercent: number;
    vendorCommissionPercent: number;
    milkmen: MilkmanRate[];
};

/** Mirrors the server's parseRate, so the field rejects before the round trip. */
function validRate(s: string): boolean {
    return /^\d{1,3}(\.\d{1,2})?$/.test(s.trim()) && Number(s) >= 0 && Number(s) <= 100;
}

export default function AdminRates() {
    const { toast } = useToast();
    const [data, setData] = useState<RatesResponse | null>(null);
    const [fee, setFee] = useState("");
    const [commission, setCommission] = useState("");
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState<string | null>(null);

    const load = async () => {
        try {
            const res = await apiRequest("/api/admin/rates", "GET");
            const d: RatesResponse = await res.json();
            setData(d);
            setFee(String(d.customerFeePercent));
            setCommission(String(d.vendorCommissionPercent));
            setDrafts({});
        } catch (e: any) {
            toast({ title: "Could not load rates", description: e.message, variant: "destructive" });
        }
    };

    useEffect(() => { load(); }, []);

    const saveDefaults = async () => {
        if (!validRate(fee) || !validRate(commission)) {
            toast({
                title: "Check the numbers",
                description: "Each rate must be between 0 and 100, to at most two decimals.",
                variant: "destructive",
            });
            return;
        }
        setBusy("defaults");
        try {
            const res = await apiRequest("/api/admin/rates", "PUT", {
                customerFeePercent: fee,
                vendorCommissionPercent: commission,
            });
            const d = await res.json();
            toast({
                title: "Rates updated",
                description: d.notice || "New bills will use these rates. Bills already raised keep the rate they were issued under.",
            });
            await load();
        } catch (e: any) {
            toast({ title: "Could not save", description: e.message, variant: "destructive" });
        } finally {
            setBusy(null);
        }
    };

    const saveMilkman = async (m: MilkmanRate, value: string | null) => {
        if (value !== null && !validRate(value)) {
            toast({
                title: "Check the number",
                description: "A rate must be between 0 and 100, to at most two decimals.",
                variant: "destructive",
            });
            return;
        }
        setBusy(`m${m.id}`);
        try {
            await apiRequest(`/api/admin/milkmen/${m.id}/commission`, "PATCH", { percentage: value });
            toast({
                title: value === null ? "Back to the standard rate" : "Rate set",
                description: value === null
                    ? `${m.businessName || "Dairyman"} now follows the platform default.`
                    : `${m.businessName || "Dairyman"} is now on ${value}%.`,
            });
            await load();
        } catch (e: any) {
            toast({ title: "Could not save", description: e.message, variant: "destructive" });
        } finally {
            setBusy(null);
        }
    };

    if (!data) return <p className="text-sm text-muted-foreground">Loading rates…</p>;

    const feeChanged = String(data.customerFeePercent) !== fee.trim();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Percent className="h-5 w-5" /> Platform defaults
                    </CardTitle>
                    <CardDescription>
                        What everyone pays unless a dairyman has his own rate. Changing these
                        affects bills raised from now on — bills already issued keep the rate
                        they were raised under.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Customer fee %</label>
                            <Input
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                                inputMode="decimal"
                                placeholder="1"
                                className={validRate(fee) ? "" : "border-destructive"}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Added on top of the customer's subtotal.
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Dairyman commission %</label>
                            <Input
                                value={commission}
                                onChange={(e) => setCommission(e.target.value)}
                                inputMode="decimal"
                                placeholder="0.5"
                                className={validRate(commission) ? "" : "border-destructive"}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Taken from his revenue, calculated on the subtotal.
                            </p>
                        </div>
                    </div>

                    {feeChanged && (
                        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                                Clause 8.7 of the customer terms promises <strong>seven days' notice</strong>{" "}
                                before a customer fee change takes effect. Saving here does not send it.
                            </span>
                        </div>
                    )}

                    <Button onClick={saveDefaults} disabled={busy === "defaults"}>
                        <Save className="mr-2 h-4 w-4" />
                        {busy === "defaults" ? "Saving…" : "Save defaults"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Per-dairyman commission</CardTitle>
                    <CardDescription>
                        Set an individual rate to honour a negotiated deal. Clear it to put him
                        back on the default ({data.vendorCommissionPercent}%), where he follows it
                        if it later moves. Zero is not the same as cleared: zero means he pays nothing.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Dairyman</TableHead>
                                <TableHead>Current</TableHead>
                                <TableHead className="w-[150px]">Set rate %</TableHead>
                                <TableHead className="w-[180px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.milkmen.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-muted-foreground">
                                        No dairymen registered yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.milkmen.map((m) => {
                                const draft = drafts[m.id] ?? "";
                                const saving = busy === `m${m.id}`;
                                return (
                                    <TableRow key={m.id}>
                                        <TableCell>
                                            <div className="font-medium">{m.businessName || `Dairyman #${m.id}`}</div>
                                            {!m.verified && (
                                                <Badge variant="outline" className="mt-1 text-xs">Unverified</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold">{m.effectiveRate}%</span>{" "}
                                            <Badge variant={m.hasOwnRate ? "default" : "secondary"} className="ml-1 text-xs">
                                                {m.hasOwnRate ? "own rate" : "default"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={draft}
                                                onChange={(e) => setDrafts({ ...drafts, [m.id]: e.target.value })}
                                                inputMode="decimal"
                                                placeholder={String(m.effectiveRate)}
                                                className={draft === "" || validRate(draft) ? "" : "border-destructive"}
                                            />
                                        </TableCell>
                                        <TableCell className="space-x-2 whitespace-nowrap">
                                            <Button
                                                size="sm"
                                                disabled={saving || draft === "" || !validRate(draft)}
                                                onClick={() => saveMilkman(m, draft)}
                                            >
                                                {saving ? "…" : "Set"}
                                            </Button>
                                            {m.hasOwnRate && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={saving}
                                                    onClick={() => saveMilkman(m, null)}
                                                    title="Put this dairyman back on the platform default"
                                                >
                                                    <RotateCcw className="mr-1 h-3 w-3" /> Clear
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
