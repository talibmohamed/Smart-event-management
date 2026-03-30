import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Button,
  Link,
} from "@heroui/react"
import { CalendarDays } from "lucide-react"
import { useMemo, useState } from "react"
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { isOrganizerRole } from "../../services/authService"
import ThemeSwitcher from "../ui/ThemeSwitcher"

export default function AppNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const activePath = location.pathname
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/events", label: "Events" },
    ...(isAuthenticated ? [{ href: "/dashboard", label: "Dashboard" }] : []),
  ]
  const canCreateEvents = isOrganizerRole(user?.role)
  const displayName = user ? `${user.first_name} ${user.last_name}` : ""
  const isActive = useMemo(
    () => (href) => (href === "/" ? activePath === "/" : activePath.startsWith(href)),
    [activePath],
  )

  function handleLogout() {
    logout()
    setIsMenuOpen(false)
    navigate("/")
  }

  return (
    <Navbar
      shouldHideOnScroll
      maxWidth="xl"
      isBordered
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="border-b border-slate-200/80 bg-white/75 transition-colors dark:border-slate-800 dark:bg-slate-950/75"
    >
      <NavbarContent className="md:hidden" justify="start">
        <NavbarMenuToggle aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"} />
      </NavbarContent>

      <NavbarBrand>
        <Link as={RouterLink} to="/" color="foreground" className="flex items-center gap-3 no-underline">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <CalendarDays size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Eventify
            </p>
            <p className="font-semibold text-inherit">Smart Event Management</p>
          </div>
        </Link>
      </NavbarBrand>

      <NavbarContent className="hidden gap-2 md:flex" justify="center">
        {navItems.map((item) => (
          <NavbarItem key={item.href} isActive={isActive(item.href)}>
            <Button
              as={RouterLink}
              to={item.href}
              radius="full"
              variant={isActive(item.href) ? "solid" : "light"}
              color={isActive(item.href) ? "primary" : "default"}
              className={isActive(item.href) ? "" : "text-slate-600 dark:text-slate-300"}
            >
              {item.label}
            </Button>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent className="gap-2" justify="end">
        <NavbarItem className="hidden sm:flex">
          <ThemeSwitcher />
        </NavbarItem>
        {isAuthenticated ? (
          <>
            <NavbarItem className="hidden lg:flex">
              <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-right dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {user?.role}
                </p>
                <p className="text-sm font-semibold">{displayName}</p>
              </div>
            </NavbarItem>
            {canCreateEvents ? (
              <NavbarItem className="hidden md:flex">
                <Button as={RouterLink} to="/create-event" color="primary" variant="flat">
                  Create Event
                </Button>
              </NavbarItem>
            ) : null}
            <NavbarItem className="hidden md:flex">
              <Button color="default" variant="light" onPress={handleLogout}>
                Logout
              </Button>
            </NavbarItem>
          </>
        ) : (
          <>
            <NavbarItem className="hidden md:flex">
              <Button as={RouterLink} to="/login" color="default" variant="light">
                Login
              </Button>
            </NavbarItem>
            <NavbarItem className="hidden md:flex">
              <Button as={RouterLink} to="/register" color="primary">
                Sign Up
              </Button>
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      <NavbarMenu className="gap-4 border-t border-slate-200/80 bg-white/95 pt-6 dark:border-slate-800 dark:bg-slate-950/95">
        {navItems.map((item) => (
          <NavbarMenuItem key={item.href}>
            <Button
              as={RouterLink}
              to={item.href}
              fullWidth
              color={isActive(item.href) ? "primary" : "default"}
              variant={isActive(item.href) ? "flat" : "light"}
              className="justify-start"
              onPress={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Button>
          </NavbarMenuItem>
        ))}

        <NavbarMenuItem className="pt-2">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Light or dark interface</p>
            </div>
            <ThemeSwitcher />
          </div>
        </NavbarMenuItem>

        <NavbarMenuItem className="grid gap-3 pt-2">
          {isAuthenticated ? (
            <>
              <div className="rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {user?.role}
                </p>
                <p className="text-sm font-semibold">{displayName}</p>
              </div>
              {canCreateEvents ? (
                <Button
                  as={RouterLink}
                  to="/create-event"
                  color="primary"
                  variant="flat"
                  className="justify-start"
                  onPress={() => setIsMenuOpen(false)}
                >
                  Create Event
                </Button>
              ) : null}
              <Button color="default" variant="light" className="justify-start" onPress={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button as={RouterLink} to="/login" variant="light" className="justify-start" onPress={() => setIsMenuOpen(false)}>
                Login
              </Button>
              <Button as={RouterLink} to="/register" color="primary" className="justify-start" onPress={() => setIsMenuOpen(false)}>
                Sign Up
              </Button>
            </>
          )}
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  )
}
