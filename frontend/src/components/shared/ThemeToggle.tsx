import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const handleToggle = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    const nextIsDark = nextTheme === 'dark'

    setIsDark(nextIsDark)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.classList.toggle('dark', nextIsDark)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleToggle}
      className="rounded-full p-2"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
