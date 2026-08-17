"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function RefreshDashboard() { const router = useRouter(); const [loading, setLoading] = useState(false); return <button onClick={() => { setLoading(true); router.refresh(); setTimeout(() => setLoading(false), 700); }} className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-sm hover:border-primary"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/>Refresh data</button>; }
