import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, adminDeviceKey } from "@/lib/queryClient";
import { Upload, Trash2, Eye, MousePointerClick } from "lucide-react";

type Ad = {
    id: number;
    title: string;
    description: string;
    imageUrl: string | null;
    ctaText: string;
    ctaUrl: string;
    advertiserName: string;
    advertiserEmail: string | null;
    position: string;
    targetAudience: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    impressions: number;
    clicks: number;
    priority: number;
};

const EMPTY = {
    title: "",
    description: "",
    imageUrl: "",
    ctaText: "Learn more",
    ctaUrl: "",
    advertiserName: "",
    advertiserEmail: "",
    position: "bottom",
    targetAudience: "all",
    startDate: "",
    endDate: "",
    priority: 1,
};

/** What an advertiser would actually be told about this campaign, right now. */
function statusOf(ad: Ad): { label: string; tone: "live" | "off" | "soon" | "done" } {
    if (!ad.isActive) return { label: "Paused", tone: "off" };
    const now = Date.now();
    if (new Date(ad.startDate).getTime() > now) return { label: "Scheduled", tone: "soon" };
    if (new Date(ad.endDate).getTime() < now) return { label: "Finished", tone: "done" };
    return { label: "Live", tone: "live" };
}

const TONE: Record<string, string> = {
    live: "bg-green-100 text-green-800 border-green-200",
    soon: "bg-blue-100 text-blue-800 border-blue-200",
    done: "bg-slate-100 text-slate-700 border-slate-200",
    off: "bg-amber-100 text-amber-900 border-amber-200",
};

const isVideo = (url: string | null) => !!url && /\.(mp4|webm|mov)(\?|$)/i.test(url);

export default function AdminAds() {
    const { toast } = useToast();
    const [ads, setAds] = useState<Ad[]>([]);
    const [form, setForm] = useState({ ...EMPTY });
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        try {
            const res = await apiRequest("/api/admin/ads", "GET");
            setAds(await res.json());
        } catch (e: any) {
            toast({ title: "Could not load ads", description: e.message, variant: "destructive" });
        }
    };

    useEffect(() => { load(); }, []);

    // Sent as multipart, so it cannot go through apiRequest — that serialises
    // JSON. The admin device header is added by hand for the same reason.
    const uploadFile = async (file: File) => {
        setUploading(true);
        try {
            const body = new FormData();
            body.append("file", file);
            const key = adminDeviceKey();
            const res = await fetch("/api/admin/ads/media", {
                method: "POST",
                credentials: "include",
                headers: key ? { "x-admin-device": key } : undefined,
                body,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Upload failed");
            setForm((f) => ({ ...f, imageUrl: data.url }));
            toast({ title: `${data.kind === "video" ? "Video" : "Image"} uploaded` });
        } catch (e: any) {
            toast({ title: "Upload failed", description: e.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const create = async () => {
        setBusy(true);
        try {
            const res = await apiRequest("/api/admin/ads", "POST", form);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Could not create the ad");
            setForm({ ...EMPTY });
            if (fileRef.current) fileRef.current.value = "";
            toast({ title: "Ad created", description: `${data.title} is now in the rotation.` });
            load();
        } catch (e: any) {
            toast({ title: "Could not create the ad", description: e.message, variant: "destructive" });
        } finally {
            setBusy(false);
        }
    };

    const toggle = async (ad: Ad) => {
        try {
            await apiRequest(`/api/admin/ads/${ad.id}`, "PATCH", { isActive: !ad.isActive });
            load();
        } catch (e: any) {
            toast({ title: "Could not update", description: e.message, variant: "destructive" });
        }
    };

    const remove = async (ad: Ad) => {
        if (!confirm(`Delete "${ad.title}" permanently? Its impression and click history goes too.`)) return;
        try {
            await apiRequest(`/api/admin/ads/${ad.id}`, "DELETE");
            toast({ title: "Ad deleted" });
            load();
        } catch (e: any) {
            toast({ title: "Could not delete", description: e.message, variant: "destructive" });
        }
    };

    const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
    const ready = form.title && form.advertiserName && form.startDate && form.endDate;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Place an ad</CardTitle>
                    <CardDescription>
                        Upload the banner or video the advertiser sent, set who sees it and for how
                        long. It appears in the app on its own once the start date arrives.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor="ad-title">Title</label>
                            <Input id="ad-title" value={form.title} onChange={(e) => set("title", e.target.value)}
                                placeholder="20% off at Sharma Kirana" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor="ad-advertiser">Advertiser</label>
                            <Input id="ad-advertiser" value={form.advertiserName} onChange={(e) => set("advertiserName", e.target.value)}
                                placeholder="Sharma Kirana Stores" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium" htmlFor="ad-desc">Description</label>
                            <Input id="ad-desc" value={form.description} onChange={(e) => set("description", e.target.value)}
                                placeholder="One line, shown under the title" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor="ad-cta">Button text</label>
                            <Input id="ad-cta" value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor="ad-ctaurl">Button link</label>
                            <Input id="ad-ctaurl" value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)}
                                placeholder="https://…" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor="ad-start">Starts</label>
                            <Input id="ad-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor="ad-end">Ends</label>
                            <Input id="ad-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor="ad-audience">Who sees it</label>
                            <select id="ad-audience" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)}>
                                <option value="all">Everyone</option>
                                <option value="customers">Customers only</option>
                                <option value="milkmen">Dairymen only</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor="ad-position">Where on the screen</label>
                            <select id="ad-position" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={form.position} onChange={(e) => set("position", e.target.value)}>
                                <option value="bottom">Bottom of the dashboard</option>
                                <option value="top">Top of the dashboard</option>
                                <option value="inline">Between the menu cards</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="ad-file">Banner or video</label>
                        <div className="flex items-center gap-3">
                            <Input id="ad-file" ref={fileRef} type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                            {uploading && <span className="text-sm text-muted-foreground">Uploading…</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            JPG, PNG, WebP, GIF or MP4/WebM/MOV. Up to 40 MB.
                        </p>
                        {form.imageUrl && (
                            <div className="rounded-md border p-2 w-fit">
                                {isVideo(form.imageUrl)
                                    ? <video src={form.imageUrl} className="h-28 rounded" muted controls />
                                    : <img src={form.imageUrl} alt="Ad preview" className="h-28 rounded" />}
                            </div>
                        )}
                    </div>

                    <Button onClick={create} disabled={!ready || busy || uploading}>
                        <Upload className="h-4 w-4 mr-2" />
                        {busy ? "Creating…" : "Create ad"}
                    </Button>
                    {!ready && (
                        <p className="text-xs text-muted-foreground">
                            Title, advertiser and both dates are required — an ad with no owner and no
                            end date is how a placeholder ends up living on a customer's screen.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Campaigns</CardTitle>
                    <CardDescription>
                        {ads.length === 0
                            ? "Nothing is running. The app shows no ad at all until one is live."
                            : `${ads.filter((a) => statusOf(a).tone === "live").length} live of ${ads.length}.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ad</TableHead>
                                    <TableHead>Advertiser</TableHead>
                                    <TableHead>Audience</TableHead>
                                    <TableHead>Runs</TableHead>
                                    <TableHead className="text-right">Seen</TableHead>
                                    <TableHead className="text-right">Tapped</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ads.map((ad) => {
                                    const s = statusOf(ad);
                                    const ctr = ad.impressions > 0
                                        ? ((ad.clicks / ad.impressions) * 100).toFixed(1) + "%"
                                        : "—";
                                    return (
                                        <TableRow key={ad.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {ad.imageUrl && !isVideo(ad.imageUrl) && (
                                                        <img src={ad.imageUrl} alt="" className="h-9 w-14 rounded object-cover" />
                                                    )}
                                                    {isVideo(ad.imageUrl) && (
                                                        <span className="h-9 w-14 rounded bg-slate-200 text-slate-700 text-[10px] grid place-items-center">
                                                            VIDEO
                                                        </span>
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{ad.title}</div>
                                                        <div className="text-xs text-muted-foreground">{ad.position}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>{ad.advertiserName}</div>
                                                {ad.advertiserEmail && (
                                                    <div className="text-xs text-muted-foreground">{ad.advertiserEmail}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="capitalize">{ad.targetAudience}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {new Date(ad.startDate).toLocaleDateString("en-IN")} →{" "}
                                                {new Date(ad.endDate).toLocaleDateString("en-IN")}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{ad.impressions ?? 0}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {ad.clicks ?? 0}
                                                <span className="text-xs text-muted-foreground ml-1">{ctr}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={TONE[s.tone]}>{s.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                <Button size="sm" variant="outline" onClick={() => toggle(ad)}>
                                                    {ad.isActive ? "Pause" : "Resume"}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => remove(ad)}
                                                    aria-label={`Delete ${ad.title}`}>
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {ads.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                            No ads yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {ads.length > 0 && (
                        <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {ads.reduce((n, a) => n + (a.impressions || 0), 0)} impressions total
                            </span>
                            <span className="flex items-center gap-1">
                                <MousePointerClick className="h-4 w-4" />
                                {ads.reduce((n, a) => n + (a.clicks || 0), 0)} taps total
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
