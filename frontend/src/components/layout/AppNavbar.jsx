import {
  Avatar,
  Button,
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from "@heroui/react";
import { CalendarDays, LogOut, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { isOrganizerRole } from "../../services/authService";
import ThemeSwitcher from "../ui/ThemeSwitcher";

const BASE_LINK_CLASS =
  "rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50";

export default function AppNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const displayName = user ? `${user.first_name} ${user.last_name}`.trim() : "";
  const userLabel = displayName || user?.email || "Account";
  const canCreateEvents = isOrganizerRole(user?.role);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/events", label: "Events" },
    ...(isAuthenticated ? [{ href: "/dashboard", label: "Dashboard" }] : []),
  ];

  const isActive = useMemo(
    () => (href) => {
      if (href === "/") {
        return location.pathname === "/";
      }

      return location.pathname === href || location.pathname.startsWith(`${href}/`);
    },
    [location.pathname],
  );

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function handleLogout() {
    logout();
    closeMenu();
    navigate("/");
  }

  function navLinkClass(href) {
    return `${BASE_LINK_CLASS} ${
      isActive(href)
        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
        : "text-zinc-600 hover:bg-white/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
    }`;
  }

  return (
    <Navbar
      shouldHideOnScroll
      maxWidth="2xl"
      height="4.75rem"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="border-b border-zinc-900/8 bg-white/62 backdrop-blur-xl supports-[backdrop-filter]:bg-white/55 dark:border-white/8 dark:bg-[#09090C]/62 dark:supports-[backdrop-filter]:bg-[#09090C]/52"
    >
      <NavbarContent className="md:hidden" justify="start">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="text-zinc-700 dark:text-zinc-200"
        />
      </NavbarContent>

      <NavbarBrand className="gap-3">
        <Link
          as={RouterLink}
          to="/"
          className="flex items-center gap-3 rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sky-500/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/75 text-zinc-950 shadow-sm shadow-zinc-950/5 ring-1 ring-zinc-900/5 dark:border-white/10 dark:bg-white/10 dark:text-white dark:shadow-black/20 dark:ring-white/10">
            <CalendarDays className="h-4.5 w-4.5 text-sky-600 dark:text-sky-300" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[1rem] font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
              SmartEvent
            </span>
            <span className="hidden text-[0.68rem] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 sm:block">
              Event platform
            </span>
          </div>
        </Link>
      </NavbarBrand>

      <NavbarContent className="hidden lg:flex" justify="center">
        <div className="flex items-center gap-1 rounded-full border border-zinc-900/8 bg-white/70 p-1 dark:border-white/8 dark:bg-white/5">
          {navItems.map((item) => (
            <NavbarItem key={item.href}>
              <Link as={RouterLink} to={item.href} className={navLinkClass(item.href)}>
                {item.label}
              </Link>
            </NavbarItem>
          ))}
        </div>
      </NavbarContent>

      <NavbarContent className="gap-2 sm:gap-3" justify="end">
        <NavbarItem className="hidden sm:flex">
          <ThemeSwitcher />
        </NavbarItem>

        {!isAuthenticated ? (
          <>
            <NavbarItem className="hidden md:flex">
              <Button
                as={RouterLink}
                to="/login"
                variant="light"
                radius="full"
                className="border border-transparent bg-transparent px-4 font-medium text-zinc-700 transition-colors hover:bg-white/70 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
              >
                Login
              </Button>
            </NavbarItem>
            <NavbarItem className="hidden md:flex">
              <Button
                as={RouterLink}
                to="/register"
                radius="full"
                className="bg-zinc-950 px-4 text-white shadow-sm transition-transform hover:scale-[1.01] dark:bg-white dark:text-zinc-950"
              >
                Sign Up
              </Button>
            </NavbarItem>
          </>
        ) : (
          <>
            <NavbarItem className="hidden md:flex">
              <div className="flex items-center gap-3 rounded-full border border-zinc-900/8 bg-white/70 py-1.5 pl-1.5 pr-3 dark:border-white/8 dark:bg-white/5">
                <Avatar
                  name={user?.first_name || user?.email}
                  size="sm"
                  classNames={{
                    base: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
                  }}
                />
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-medium text-zinc-950 dark:text-white">{userLabel}</span>
                  <span className="text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    {user?.role}
                  </span>
                </div>
              </div>
            </NavbarItem>

            {canCreateEvents && (
              <NavbarItem className="hidden lg:flex">
                <Button
                  as={RouterLink}
                  to="/create-event"
                  radius="full"
                  startContent={<Plus size={15} />}
                  className="bg-zinc-950 px-4 text-white shadow-sm transition-transform hover:scale-[1.01] dark:bg-white dark:text-zinc-950"
                >
                  Create Event
                </Button>
              </NavbarItem>
            )}

            <NavbarItem className="hidden md:flex">
              <Button
                isIconOnly
                variant="light"
                radius="full"
                onPress={handleLogout}
                aria-label="Logout"
                className="text-zinc-600 hover:bg-white/70 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-red-400"
              >
                <LogOut size={18} />
              </Button>
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      <NavbarMenu className="border-t border-zinc-900/8 bg-white/80 px-4 pb-6 pt-4 backdrop-blur-2xl dark:border-white/8 dark:bg-[#09090C]/84">
        <div className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavbarMenuItem key={item.href}>
              <Link
                as={RouterLink}
                to={item.href}
                className={`flex w-full items-center rounded-2xl px-4 py-3 text-base font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "text-zinc-700 hover:bg-white/80 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
                onPress={closeMenu}
              >
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-zinc-900/8 bg-white/72 px-4 py-3 dark:border-white/8 dark:bg-white/5 sm:hidden">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-950 dark:text-white">Theme</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Light or dark mode</span>
          </div>
          <ThemeSwitcher />
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {!isAuthenticated ? (
            <>
              <Button
                as={RouterLink}
                to="/login"
                variant="bordered"
                radius="full"
                className="w-full border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onPress={closeMenu}
              >
                Login
              </Button>
              <Button
                as={RouterLink}
                to="/register"
                radius="full"
                className="w-full bg-zinc-950 font-medium text-white dark:bg-white dark:text-zinc-950"
                onPress={closeMenu}
              >
                Sign Up
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-900/8 bg-white/72 px-4 py-3 dark:border-white/8 dark:bg-white/5">
                <Avatar
                  name={user?.first_name || user?.email}
                  size="sm"
                  classNames={{
                    base: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-950 dark:text-white">{userLabel}</span>
                  <span className="text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    {user?.role}
                  </span>
                </div>
              </div>

              {canCreateEvents && (
                <Button
                  as={RouterLink}
                  to="/create-event"
                  radius="full"
                  startContent={<Plus size={15} />}
                  className="w-full bg-zinc-950 font-medium text-white dark:bg-white dark:text-zinc-950"
                  onPress={closeMenu}
                >
                  Create Event
                </Button>
              )}

              <Button
                radius="full"
                variant="bordered"
                className="w-full border-red-200 bg-red-50/90 font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                onPress={handleLogout}
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </NavbarMenu>
    </Navbar>
  );
}
