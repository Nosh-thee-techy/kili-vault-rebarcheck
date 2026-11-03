/**
 * Web chat fallback for RebarCheck — same flow as the WhatsApp bot:
 * photo (+ EXIF GPS or device location) → case + spec → overlay and result.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCasesQuery } from "@/hooks/useCaseQueries";
import { submitRebarCheck } from "@/lib/api";

const DISCLAIMER =
  "Visual spacing check from a photo. Not an engineer's sign-off. Pending human verification.";

function chip(result: string | undefined) {
  if (result === "within_tolerance") return { label: "Within tolerance", variant: "forest" as const };
  if (result === "outside_tolerance") return { label: "Outside tolerance", variant: "clay" as const };
  return { label: "Inconclusive", variant: "muted" as const };
}

/**
 * Read GPS from JPEG EXIF if present. WhatsApp strips this; the browser file
 * picker often does not. Returns null when the file has no GPS IFD.
 */
async function readExifGps(file: File): Promise<{ lat: number; lon: number } | null> {
  if (!file.type.includes("jpeg") && !file.name.toLowerCase().endsWith(".jpg")) {
    return null;
  }
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1) {
      return parseExifGps(view, offset + 4);
    }
    offset += 2 + size;
  }
  return null;
}

function parseExifGps(view: DataView, start: number): { lat: number; lon: number } | null {
  try {
    const header = String.fromCharCode(
      view.getUint8(start),
      view.getUint8(start + 1),
      view.getUint8(start + 2),
      view.getUint8(start + 3),
    );
    if (header !== "Exif") return null;
    const tiff = start + 6;
    const little = view.getUint16(tiff) === 0x4949;
    const u16 = (o: number) => (little ? view.getUint16(o, true) : view.getUint16(o, false));
    const u32 = (o: number) => (little ? view.getUint32(o, true) : view.getUint32(o, false));
    const ifd0 = tiff + u32(tiff + 4);
    const gpsOffset = findTagOffset(view, ifd0, 0x8825, tiff, little, u16, u32);
    if (gpsOffset == null) return null;
    const gpsIfd = tiff + gpsOffset;
    const latRef = findAscii(view, gpsIfd, 0x0001, tiff, little, u16, u32);
    const lonRef = findAscii(view, gpsIfd, 0x0003, tiff, little, u16, u32);
    const lat = readRationalCoord(view, gpsIfd, 0x0002, tiff, little, u16, u32);
    const lon = readRationalCoord(view, gpsIfd, 0x0004, tiff, little, u16, u32);
    if (lat == null || lon == null) return null;
    return {
      lat: latRef === "S" ? -lat : lat,
      lon: lonRef === "W" ? -lon : lon,
    };
  } catch {
    return null;
  }
}

function findTagOffset(
  _view: DataView,
  ifd: number,
  tag: number,
  _tiff: number,
  _little: boolean,
  u16: (o: number) => number,
  u32: (o: number) => number,
): number | null {
  const count = u16(ifd);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (u16(entry) === tag) return u32(entry + 8);
  }
  return null;
}

function findAscii(
  _view: DataView,
  ifd: number,
  tag: number,
  _tiff: number,
  _little: boolean,
  u16: (o: number) => number,
  u32: (o: number) => number,
): string | null {
  const count = u16(ifd);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (u16(entry) === tag) {
      const value = u32(entry + 8);
      return String.fromCharCode(value & 0xff);
    }
  }
  return null;
}

function readRationalCoord(
  view: DataView,
  ifd: number,
  tag: number,
  tiff: number,
  little: boolean,
  u16: (o: number) => number,
  u32: (o: number) => number,
): number | null {
  const count = u16(ifd);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (u16(entry) !== tag) continue;
    const offset = tiff + u32(entry + 8);
    const readRat = (o: number) => {
      const num = little ? view.getUint32(o, true) : view.getUint32(o, false);
      const den = little ? view.getUint32(o + 4, true) : view.getUint32(o + 4, false);
      return den ? num / den : 0;
    };
    const deg = readRat(offset);
    const min = readRat(offset + 8);
    const sec = readRat(offset + 16);
    return deg + min / 60 + sec / 3600;
  }
  return null;
}

export function RebarCheckPage() {
  const { user } = useAuth();
  const { data } = useCasesQuery({ limit: 50 });
  const cases = data?.data ?? [];
  const [caseId, setCaseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const [spacing, setSpacing] = useState("150");
  const [tolerance, setTolerance] = useState("15");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitRebarCheck>>["data"] | null>(null);

  useEffect(() => {
    if (!caseId && cases[0]) setCaseId(cases[0].id);
  }, [cases, caseId]);

  const onFile = async (next: File | null) => {
    setFile(next);
    setResult(null);
    if (!next) return;
    const gps = await readExifGps(next);
    if (gps) {
      setLat(String(gps.lat));
      setLon(String(gps.lon));
    }
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLon(String(pos.coords.longitude));
        setAccuracy(String(Math.round(pos.coords.accuracy)));
      },
      () => setError("Could not read the device location. Enter coordinates or allow location access."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async () => {
    if (!file || !caseId) {
      setError("Choose a case and a JPEG or PNG photo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await submitRebarCheck(caseId, file, {
        latitude: lat || null,
        longitude: lon || null,
        accuracy: accuracy || null,
        specSpacingMm: spacing,
        toleranceMm: tolerance,
        referenceType: "a4",
        referenceLengthMm: 297,
        channel: "web",
        submitter: user?.name,
      });
      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "RebarCheck failed");
    } finally {
      setBusy(false);
    }
  };

  const rc = result?.rebarCheck;
  const resultChip = chip(rc?.result);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

  return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="text-sm text-charcoal-muted">
          Take a top-down photo of the cage with an A4 sheet laid flat, then pin your location.
          Same flow as the WhatsApp bot.
        </p>
        <label className="mt-4 block text-sm font-medium text-charcoal">Case</label>
        <select
          className="mt-1 h-11 w-full rounded-xl border border-sand bg-off-white px-3 text-sm"
          value={caseId}
          onChange={(event) => setCaseId(event.target.value)}
        >
          {cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.caseNumber} · {item.title.slice(0, 48)}
            </option>
          ))}
        </select>
        <label className="mt-4 block text-sm font-medium text-charcoal">Photo (JPEG or PNG)</label>
        <input
          type="file"
          accept="image/jpeg,image/png"
          className="mt-1 block w-full text-sm"
          onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Input label="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <Input label="Longitude" value={lon} onChange={(e) => setLon(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={useDeviceLocation}>
            Use my current location
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Input label="Spec spacing (mm)" value={spacing} onChange={(e) => setSpacing(e.target.value)} />
          <Input label="Tolerance (mm)" value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
        </div>
        <Button className="mt-5 w-full" isLoading={busy} onClick={() => void submit()}>
          Run visual spacing check
        </Button>
        {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}

        {rc && (
          <div className="mt-6 rounded-2xl border border-sand bg-off-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={resultChip.variant}>{resultChip.label}</Badge>
              <span className="text-xs text-charcoal-muted">
                Confidence {Math.round((rc.confidence ?? 0) * 100)}%
              </span>
            </div>
            {rc.overlayUrl && (
              <img
                src={`${apiBase}${rc.overlayUrl}`}
                alt="Spacing overlay"
                className="mt-3 w-full rounded-lg border border-sand"
              />
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-charcoal-muted">Mean horizontal</dt>
                <dd className="font-semibold">{rc.summary?.horizontal?.meanMm ?? "—"} mm</dd>
              </div>
              <div>
                <dt className="text-charcoal-muted">Mean vertical</dt>
                <dd className="font-semibold">{rc.summary?.vertical?.meanMm ?? "—"} mm</dd>
              </div>
            </dl>
            {rc.explanation && (
              <p className="mt-3 text-sm leading-relaxed text-charcoal">{rc.explanation}</p>
            )}
            <p className="mt-2 text-[11px] text-charcoal-muted">{rc.disclaimer || DISCLAIMER}</p>
            <Link to={`/planner/cases/${caseId}`} className="mt-3 inline-block text-sm font-semibold text-forest">
              Open case evidence
            </Link>
          </div>
        )}
      </div>
  );
}
