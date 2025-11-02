import type { Challenge } from "@/types"

interface DailyActivityProps {
  challenge: Challenge | null
}

export default function DailyActivity({ challenge }: DailyActivityProps) {
  const maxDay = challenge?.max_day || 21
  const currentDay = challenge?.current_day || 0

  const days = Array.from({ length: maxDay }, (_, i) => i + 1)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.map((day) => {
          let bgColor = "bg-[#1a1f3a]"
          let textColor = "text-gray-500"

          if (day === currentDay) {
            bgColor = "bg-yellow-500/80"
            textColor = "text-white"
          } else if (day < currentDay) {
            bgColor = "bg-[#00ff88]"
            textColor = "text-[#0a0e27]"
          }

          return (
            <div
              key={day}
              className={`${bgColor} ${textColor} rounded p-1 text-center font-bold text-xs aspect-square flex items-center justify-center transition-all hover:scale-105`}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#00ff88]" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#1a1f3a]" />
          <span>Pending</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#1a1f3a]">
        <p className="text-xs text-gray-400">
          <span className="font-semibold">1 NIGHT</span> = <span className="font-semibold">1,000,000 STAR</span>
        </p>
      </div>
    </div>
  )
}
