"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { getCurrentUser, updateProfile, changePassword } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useColorIntensity } from "@/components/providers/color-intensity-provider";
import { useKanbanColumns } from "@/components/providers/kanban-columns-provider";
import {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  LayoutGridIcon,
  ListIcon,
  Columns3Icon,
  KanbanIcon,
  PaletteIcon,
  LogOutIcon,
  GripVerticalIcon,
  AlertTriangleIcon,
  TargetIcon,
  CheckCircle2Icon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

const LAYOUT_OPTIONS = [
  {
    value: "standard",
    label: "Standard",
    description: "Stat cards with separate panels for work, exams, and projects.",
    icon: LayoutGridIcon,
  },
  {
    value: "compact",
    label: "Compact",
    description: "A single chronological timeline with courses alongside.",
    icon: ListIcon,
  },
  {
    value: "board",
    label: "Board",
    description: "A column per course, each with its own upcoming work.",
    icon: Columns3Icon,
  },
  {
    value: "kanban",
    label: "Kanban",
    description: "Jira-style columns: Overdue, In Progress, Upcoming, and Done.",
    icon: KanbanIcon,
  },
];

const KANBAN_COLUMN_META = {
  overdue: { label: "Overdue", icon: AlertTriangleIcon },
  in_progress: { label: "In Progress", icon: Loader2Icon },
  upcoming: { label: "Upcoming", icon: TargetIcon },
  completed: { label: "Done", icon: CheckCircle2Icon },
};

const NAV_SECTIONS = [
  { id: "profile", label: "Public profile" },
  { id: "appearance", label: "Appearance" },
  { id: "dashboard-layout", label: "Dashboard layout" },
  { id: "kanban-columns", label: "Kanban columns" },
  { id: "security", label: "Password" },
];

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { intensity, setIntensity } = useColorIntensity();
  const { order: columnOrder, moveColumn, visibility, setColumnVisible } = useKanbanColumns();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(NAV_SECTIONS[0].id);
  const sectionRefs = useRef({});
  const [draggingColumnIndex, setDraggingColumnIndex] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [layoutSaving, setLayoutSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    setToken(storedToken);

    getCurrentUser(storedToken)
      .then((data) => {
        setUser(data);
        setDisplayName(data.display_name || "");
      })
      .catch((err) => {
        if (err.message.includes("401") || err.message.includes("403")) {
          localStorage.removeItem("access_token");
          router.push("/login");
        } else {
          setError("Failed to load account details");
        }
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    const OFFSET = 100;

    const handleScroll = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

      if (atBottom) {
        setActiveSection(NAV_SECTIONS[NAV_SECTIONS.length - 1].id);
        return;
      }

      let current = NAV_SECTIONS[0].id;

      for (const section of NAV_SECTIONS) {
        const el = sectionRefs.current[section.id];
        if (el && el.getBoundingClientRect().top <= OFFSET) {
          current = section.id;
        }
      }

      setActiveSection(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push("/");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");

    try {
      const updated = await updateProfile(token, { display_name: displayName.trim() || null });
      setUser(updated);
      setProfileMessage("Profile updated");
    } catch (err) {
      setProfileMessage(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLayoutChange = async (value) => {
    if (!token || value === user?.dashboard_layout) return;
    setLayoutSaving(true);

    try {
      const updated = await updateProfile(token, { dashboard_layout: value });
      setUser(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLayoutSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    setPasswordSaving(true);

    try {
      await changePassword(token, currentPassword, newPassword);
      setPasswordMessage("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const registerSection = (id) => (el) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6">
      <div className="mb-8 pb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="flex gap-10 max-w-5xl">
        {/* Nav */}
        <nav className="w-48 shrink-0 hidden md:block">
          <ul className="space-y-0.5 sticky top-6">
            {NAV_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                    activeSection === section.id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {section.label}
                </a>
              </li>
            ))}
            <li className="pt-2 mt-2 border-t">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <LogOutIcon className="h-3.5 w-3.5" />
                Log out
              </button>
            </li>
          </ul>
        </nav>

        {/* Sections */}
        <div className="flex-1 min-w-0 divide-y divide-border">
          {/* Profile */}
          <section id="profile" ref={registerSection("profile")} className="pb-10 scroll-mt-6">
            <h2 className="text-base font-semibold mb-1">Public profile</h2>
            <p className="text-sm text-muted-foreground mb-6">Your account identity</p>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    placeholder="How should we greet you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={100}
                  />
                </div>
                {profileMessage && (
                  <p className="text-sm text-muted-foreground">{profileMessage}</p>
                )}
                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? "Saving..." : "Update profile"}
                </Button>
              </form>
            )}
          </section>

          {/* Appearance */}
          <section id="appearance" ref={registerSection("appearance")} className="py-10 scroll-mt-6">
            <h2 className="text-base font-semibold mb-1">Appearance</h2>
            <p className="text-sm text-muted-foreground mb-6">Choose how Dueboard looks on this device</p>

            <div className="max-w-sm space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      mounted && theme === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <PaletteIcon className="h-4 w-4" />
                    Color intensity
                  </Label>
                  <span className="text-sm text-muted-foreground">{intensity}%</span>
                </div>
                <Slider
                  value={[intensity]}
                  onValueChange={([value]) => setIntensity(value)}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Controls how much course color shows up in glows, dots, and highlights across
                  courses, the dashboard, and the calendar.
                </p>
              </div>
            </div>
          </section>

          {/* Dashboard layout */}
          <section id="dashboard-layout" ref={registerSection("dashboard-layout")} className="py-10 scroll-mt-6">
            <h2 className="text-base font-semibold mb-1">Dashboard layout</h2>
            <p className="text-sm text-muted-foreground mb-6">Pick how your dashboard is arranged</p>

            {isLoading ? (
              <Skeleton className="h-24 w-full max-w-sm" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                {LAYOUT_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    disabled={layoutSaving}
                    onClick={() => handleLayoutChange(value)}
                    className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors disabled:opacity-60 ${
                      user?.dashboard_layout === value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Kanban columns */}
          <section id="kanban-columns" ref={registerSection("kanban-columns")} className="py-10 scroll-mt-6">
            <h2 className="text-base font-semibold mb-1">Kanban columns</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Drag to reorder, and choose which columns show up on the Kanban dashboard layout
            </p>

            <ul className="max-w-sm space-y-2">
              {columnOrder.map((key, index) => {
                const meta = KANBAN_COLUMN_META[key];
                const Icon = meta.icon;
                const isVisible = visibility[key] !== false;

                return (
                  <li
                    key={key}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(index));
                      setDraggingColumnIndex(index);
                    }}
                    onDragEnd={() => setDraggingColumnIndex(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
                      if (Number.isNaN(sourceIndex)) return;
                      moveColumn(sourceIndex, index);
                      setDraggingColumnIndex(null);
                    }}
                    className={`flex items-center gap-3 rounded-lg border bg-background p-3 text-sm cursor-grab active:cursor-grabbing transition-opacity ${
                      draggingColumnIndex === index ? "opacity-40" : ""
                    } ${!isVisible ? "opacity-50" : ""}`}
                  >
                    <GripVerticalIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium flex-1">{meta.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setColumnVisible(key, !isVisible)}
                    >
                      {isVisible ? (
                        <EyeIcon className="h-4 w-4" />
                      ) : (
                        <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {isVisible ? `Hide ${meta.label}` : `Show ${meta.label}`}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Security */}
          <section id="security" ref={registerSection("security")} className="pt-10 scroll-mt-6">
            <h2 className="text-base font-semibold mb-1">Change password</h2>
            <p className="text-sm text-muted-foreground mb-6">Update your account password</p>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              {passwordMessage && (
                <p className="text-sm text-muted-foreground">{passwordMessage}</p>
              )}
              <Button type="submit" disabled={passwordSaving}>
                {passwordSaving ? "Updating..." : "Update password"}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
