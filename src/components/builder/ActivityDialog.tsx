import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plane, Hotel, ImagePlus, Save, Tag, ExternalLink, MessageSquare, X as XIcon, Paperclip,
} from "lucide-react";
import { BuilderActivity, BuilderDay } from "@/lib/builderTypes";
import {
  activityTypeConfig, primaryTypes, transportSubtypes, foodSubtypes, experienceSubtypes,
  HOTEL_AMENITIES, getActivityConfig, getPlaceholderImage, defaultActivityName,
} from "@/lib/builderConstants";

// ─── Activity Edit Dialog ───────────────────────────────────────────
export const ActivityDialog = ({
  open,
  onOpenChange,
  activity,
  onSave,
  isEditing = false,
  onLiveSave,
  onRevert,
  currencySymbol = "€",
  days,
  currentDayId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: BuilderActivity;
  onSave: (a: BuilderActivity, targetDayId?: string) => void;
  isEditing?: boolean;
  onLiveSave?: (a: BuilderActivity) => void;
  onRevert?: (original: BuilderActivity) => void;
  currencySymbol?: string;
  days?: BuilderDay[];
  currentDayId?: string;
}) => {
  const [form, setForm] = useState<BuilderActivity>(activity);
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(currentDayId);
  const originalRef = useRef<BuilderActivity>(activity);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    originalRef.current = activity;
    setForm(activity);
    setSelectedDayId(currentDayId);
    setTagInput("");
  }, [activity, currentDayId]);

  const updateForm = (updates: Partial<BuilderActivity>) => {
    const updated = { ...form, ...updates };
    // Hotel cost auto-calc
    if (updated.type === "accommodation") {
      if ("nights" in updates && updated.cost_per_night) {
        updated.cost = (updated.nights ?? 0) * updated.cost_per_night;
      } else if ("cost_per_night" in updates && updated.nights) {
        updated.cost = updated.nights * (updated.cost_per_night ?? 0);
      } else if ("cost" in updates && updated.nights && updated.nights > 0) {
        updated.cost_per_night = Math.round((updated.cost ?? 0) / updated.nights);
      }
      // Auto-prefix hotel names with Check-in: / Check-out:
      if ("name" in updates) {
        const prefix = updated.is_checkout ? "Check-out: " : "Check-in: ";
        const raw = (updated.name ?? "").replace(/^Check-(?:in|out):\s*/i, "");
        updated.name = raw ? `${prefix}${raw}` : "";
      }
    }
    setForm(updated);
    if (isEditing) onLiveSave?.(updated);
  };

  // When type changes: reset subtype to first option, update name to default
  const handleTypeChange = (newType: string) => {
    const subtypes: Record<string, typeof transportSubtypes> = {
      transport: transportSubtypes,
      food: foodSubtypes,
      experience: experienceSubtypes,
    };
    const firstSub = subtypes[newType]?.[0]?.value;
    const newName = defaultActivityName(newType, firstSub);
    updateForm({ type: newType, subtype: firstSub, name: form.name || newName });
  };

  const handleSubtypeChange = (newSubtype: string) => {
    const newName = defaultActivityName(form.type, newSubtype);
    updateForm({ subtype: newSubtype, name: form.name === defaultActivityName(form.type, form.subtype) ? newName : form.name });
  };

  const fetchLinkImage = async () => {
    const url = form.booking_url?.trim();
    if (!url) return;
    setIsFetchingImage(true);
    try {
      const resp = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
      const data = await resp.json();
      const imageUrl: string | undefined = data?.data?.image?.url ?? data?.data?.screenshot?.url;
      if (imageUrl) { updateForm({ image_url: imageUrl }); toast.success("Image fetched!"); }
      else toast.error("No preview image found at this URL");
    } catch { toast.error("Could not fetch image from link"); }
    finally { setIsFetchingImage(false); }
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, "");
    if (!tag) return;
    const tags = form.tags ?? [];
    if (tags.includes(tag)) { setTagInput(""); return; }
    updateForm({ tags: [...tags, tag] });
    setTagInput("");
  };

  const removeTag = (tag: string) => updateForm({ tags: (form.tags ?? []).filter(t => t !== tag) });

  const handleCommit = () => {
    const name = form.name.trim() || defaultActivityName(form.type, form.subtype);
    const targetDay = selectedDayId !== currentDayId ? selectedDayId : undefined;
    onSave({ ...form, name }, targetDay);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (isEditing) onRevert?.(originalRef.current);
    onOpenChange(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => updateForm({ image_url: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const MAX = 5 * 1024 * 1024;
    const existing = form.attachments ?? [];
    files.forEach(file => {
      if (file.size > MAX) { toast.error(`${file.name} exceeds 5 MB`); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateForm({ attachments: [...(form.attachments ?? existing), { name: file.name, url: reader.result as string, type: file.type }] });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const typeConfig = getActivityConfig(form);
  const TypeIcon = typeConfig.icon;
  const imagePreview = form.image_url || getPlaceholderImage(form);

  // Subtype options for current type
  const subtypeOptions: { value: string; icon: React.ElementType; label: string }[] =
    form.type === "transport" ? transportSubtypes :
    form.type === "food" ? foodSubtypes :
    form.type === "experience" ? experienceSubtypes : [];

  const isFlightActivity = (form.type === "transport" && form.subtype === "flight") || form.type === "flight";
  const isHotelActivity = form.type === "accommodation";
  const isTransportActivity = form.type === "transport" || form.type === "flight";
  const isNonFlightTransport = isTransportActivity && !isFlightActivity;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* ── Header: editable activity name ── */}
        <div className={cn("px-5 pt-5 pb-3 shrink-0 border-b border-border", typeConfig.bgColor)}>
          <DialogDescription className="sr-only">Edit activity details.</DialogDescription>
          <div className="flex items-center gap-2.5">
            <span className={cn("p-2 rounded-xl bg-background/60 backdrop-blur-sm", typeConfig.color)}>
              <TypeIcon className="w-4 h-4" />
            </span>
            <input
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder={defaultActivityName(form.type, form.subtype)}
              className={cn(
                "flex-1 bg-transparent border-none outline-none text-lg font-bold placeholder:text-foreground/30",
                typeConfig.color
              )}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid lg:grid-cols-[1fr_250px] divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* ── Left panel: main fields ── */}
            <div className="p-5 space-y-4 overflow-y-auto">

              {/* Type selector (primary types only) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {primaryTypes.map((key) => {
                    const cfg = activityTypeConfig[key];
                    const Icon = cfg.icon;
                    const active = form.type === key;
                    return (
                      <button key={key} type="button" onClick={() => handleTypeChange(key)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          active ? cn("border-transparent", cfg.bgColor, cfg.color)
                                 : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}>
                        <Icon className="w-3.5 h-3.5" />{cfg.label}
                      </button>
                    );
                  })}
                  {/* Accommodation is a primary type already; also show legacy types if activity uses one */}
                  {!primaryTypes.includes(form.type as typeof primaryTypes[number]) && form.type !== "accommodation" && (
                    <span className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium", typeConfig.bgColor, typeConfig.color)}>
                      <TypeIcon className="w-3.5 h-3.5" />{typeConfig.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Subtype selector */}
              {subtypeOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sub-type</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {subtypeOptions.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = form.subtype === sub.value;
                      return (
                        <button key={sub.value} type="button" onClick={() => handleSubtypeChange(sub.value)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                            active ? cn("border-transparent", typeConfig.bgColor, typeConfig.color)
                                   : "border-border bg-background text-muted-foreground hover:text-foreground"
                          )}>
                          <SubIcon className="w-3.5 h-3.5" />{sub.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Time + Duration — hidden for hotels (check-in time lives in Stay Details) */}
              {!isHotelActivity && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={form.time} onChange={(e) => updateForm({ time: e.target.value })} />
                  </div>
                  {!isFlightActivity && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Duration</Label>
                      <Input value={form.duration} onChange={(e) => updateForm({ duration: e.target.value })} placeholder="2h" />
                    </div>
                  )}
                </div>
              )}

              {/* Location — hidden for flights (departure airport is inside Flight Details) */}
              {!isFlightActivity && (
                <div className="space-y-1.5">
                  <Label>{isNonFlightTransport ? "From" : "Location"}</Label>
                  <Input value={form.location} onChange={(e) => {
                    const loc = e.target.value;
                    const updates: Partial<BuilderActivity> = { location: loc };
                    if (isHotelActivity && !form.is_checkout && (!form.name || /^Check-in:\s*/i.test(form.name))) {
                      updates.name = loc ? `Check-in: ${loc}` : "";
                    }
                    updateForm(updates);
                  }}
                    placeholder={isNonFlightTransport ? "e.g. Paris Gare du Nord" : "e.g. Champ de Mars, Paris"} />
                </div>
              )}

              {/* To — non-flight transport only */}
              {isNonFlightTransport && (
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input value={form.destination_airport || ""} onChange={(e) => updateForm({ destination_airport: e.target.value })}
                    placeholder="e.g. Brussels-Midi" />
                </div>
              )}

              {/* ── Flight-specific fields ── */}
              {isFlightActivity && (
                <div className="space-y-3 p-3 rounded-lg bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/50">
                  <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5" /> Flight Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Departure Airport</Label>
                      <Input value={form.location} onChange={(e) => {
                        const loc = e.target.value;
                        const updates: Partial<BuilderActivity> = { location: loc, origin: loc };
                        if (!form.is_arrival && (!form.name || /^Departing from /i.test(form.name))) {
                          updates.name = loc ? `Departing from ${loc}` : "";
                        }
                        updateForm(updates);
                      }} placeholder="e.g. London Heathrow (LHR)" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Arrival Airport</Label>
                      <Input value={form.destination_airport || ""} onChange={(e) => updateForm({ destination_airport: e.target.value })} placeholder="e.g. Paris CDG" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Duration</Label>
                      <Input value={form.duration} onChange={(e) => updateForm({ duration: e.target.value })} placeholder="e.g. 2h 30m" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Airline</Label>
                      <Input value={form.airline || ""} onChange={(e) => updateForm({ airline: e.target.value })} placeholder="e.g. British Airways" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Flight No.</Label>
                      <Input value={form.flight_number || ""} onChange={(e) => updateForm({ flight_number: e.target.value })} placeholder="e.g. BA123" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Class</Label>
                      <Select value={form.flight_class || "economy"} onValueChange={(v) => updateForm({ flight_class: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="premium_economy">Premium Economy</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="first">First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cabin Bags</Label>
                      <Input type="number" min={0} max={10} value={form.luggage_cabin ?? ""} onChange={(e) => updateForm({ luggage_cabin: Number(e.target.value) || 0 })} placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Check-in Bags</Label>
                      <Input type="number" min={0} max={10} value={form.luggage_checkin ?? ""} onChange={(e) => updateForm({ luggage_checkin: Number(e.target.value) || 0 })} placeholder="0" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Hotel-specific fields ── */}
              {isHotelActivity && !form.is_checkout && (
                <div className="space-y-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Hotel className="w-3.5 h-3.5" /> Stay Details
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nights</Label>
                      <Input type="number" min={1} value={form.nights ?? ""} onChange={(e) => updateForm({ nights: Number(e.target.value) || undefined })} placeholder="3" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Per Night ({currencySymbol})</Label>
                      <Input type="number" min={0} value={form.cost_per_night ?? ""} onChange={(e) => updateForm({ cost_per_night: Number(e.target.value) || undefined })} placeholder="120" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Stars</Label>
                      <Input type="number" min={1} max={5} value={form.stars ?? ""} onChange={(e) => updateForm({ stars: Number(e.target.value) || undefined })} placeholder="4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Check-in Time</Label>
                      <Input type="time" value={form.checkin_time || ""} onChange={(e) => updateForm({ checkin_time: e.target.value, time: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Check-out</Label>
                      <Input type="time" value={form.checkout_time || ""} onChange={(e) => updateForm({ checkout_time: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bed Type</Label>
                      <Input value={form.bed_types || ""} onChange={(e) => updateForm({ bed_types: e.target.value })} placeholder="King, Twin…" />
                    </div>
                  </div>
                  {/* Amenities chips */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amenities</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {HOTEL_AMENITIES.map((a) => {
                        const active = (form.amenities ?? []).includes(a.value);
                        return (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => {
                              const cur = form.amenities ?? [];
                              updateForm({ amenities: active ? cur.filter(x => x !== a.value) : [...cur, a.value] });
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                              active ? "border-transparent bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                     : "border-border bg-background text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Move to Day — editing only, multiple days available */}
              {isEditing && days && days.length > 1 && currentDayId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Move to Day</Label>
                  <Select value={selectedDayId || currentDayId} onValueChange={setSelectedDayId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day, i) => (
                        <SelectItem key={day.id} value={day.id}>
                          Day {i + 1}{day.date ? ` · ${day.date}` : ""}
                          {day.id === currentDayId ? " (current)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" /> Tags
                </Label>
                {(form.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(form.tags ?? []).map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs border border-border/50">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-foreground">
                          <XIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.replace(/[^a-z0-9\-_]/gi, ""))}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                  placeholder="must-book, optional… (Enter to add)"
                  className="h-8 text-sm"
                />
              </div>

              {/* Booking URL */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /> Booking Link
                </Label>
                <div className="flex gap-2">
                  <Input value={form.booking_url || ""} onChange={(e) => updateForm({ booking_url: e.target.value })} placeholder="https://…" className="flex-1 text-sm" />
                  {form.booking_url?.trim() && (
                    <Button type="button" variant="outline" size="sm" disabled={isFetchingImage} onClick={fetchLinkImage} title="Fetch image from link">
                      {isFetchingImage ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>
                {form.booking_url?.trim() && (
                  <a href={form.booking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline w-fit">
                    <ExternalLink className="w-3 h-3" /> Open link
                  </a>
                )}
              </div>

              {/* Attachments */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" /> Attachments
                  </Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => attachmentInputRef.current?.click()}>
                    + Add file
                  </Button>
                </div>
                <input ref={attachmentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple className="hidden" onChange={handleAttachmentUpload} />
                {(form.attachments ?? []).length > 0 && (
                  <div className="space-y-1">
                    {(form.attachments ?? []).map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-xs">
                        <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate text-foreground">{att.name}</span>
                        <button type="button" onClick={() => updateForm({ attachments: (form.attachments ?? []).filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive shrink-0">
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right panel: image + notes + sticky cost ── */}
            <div className="flex flex-col bg-muted/20">
              {/* Image */}
              <div className="p-4 space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Image</Label>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-white" />
                  </div>
                </div>
                <Input value={form.image_url?.startsWith("data:") ? "" : form.image_url} onChange={(e) => updateForm({ image_url: e.target.value })} placeholder="Paste image URL…" className="text-xs h-8" />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              {/* Notes — scrollable middle */}
              <div className="flex-1 px-4 pb-2 space-y-1.5 min-h-0">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Notes
                </Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateForm({ notes: e.target.value })}
                  placeholder="Booking tips, visa notes, opening hours, things to know…"
                  className="resize-none h-28 text-sm"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Footer: cost (always visible) + action buttons */}
        <div className="px-5 py-3 border-t border-border shrink-0 bg-background flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">Cost ({currencySymbol})</Label>
            <Input
              type="number"
              min={0}
              value={form.cost || ""}
              onChange={(e) => updateForm({ cost: Number(e.target.value) || 0 })}
              placeholder="0"
              className="text-lg font-bold h-9 w-36"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            {isEditing ? (
              <Button onClick={handleCommit}>Done</Button>
            ) : (
              <Button onClick={handleCommit}><Save className="w-4 h-4 mr-1" />Add Activity</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
