import { useState } from 'react'
import { Button } from './ui/Button'
import { inputClassName } from './ui/styles'
import {
  grantLeaderboardAccess,
  LEADERBOARD_QUIZ,
  LEADERBOARD_QUIZ_LENGTH,
  verifyLeaderboardAnswer,
} from '../lib/leaderboardAccess'

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8 text-primary-600" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

interface LeaderboardUnlockGateProps {
  onUnlock: () => void
}

export function LeaderboardUnlockGate({ onUnlock }: LeaderboardUnlockGateProps) {
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)

  const current = LEADERBOARD_QUIZ[step]!

  const handleSubmit = () => {
    if (!answer.trim()) {
      setError('Vui lòng nhập câu trả lời.')
      return
    }

    if (!verifyLeaderboardAnswer(step, answer)) {
      setError('Câu trả lời chưa đúng. Thử lại nhé!')
      return
    }

    if (step + 1 >= LEADERBOARD_QUIZ_LENGTH) {
      grantLeaderboardAccess()
      onUnlock()
      return
    }

    setStep((prev) => prev + 1)
    setAnswer('')
    setError(null)
  }

  return (
    <div className="flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
              <LockIcon />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-text-primary">Bảng xếp hạng</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Trả lời {LEADERBOARD_QUIZ_LENGTH} câu hỏi theo thứ tự để xem BXH.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            {LEADERBOARD_QUIZ.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index < step
                    ? 'w-6 bg-primary-600'
                    : index === step
                      ? 'w-8 bg-primary-400'
                      : 'w-4 bg-neutral-200'
                }`}
                aria-hidden
              />
            ))}
          </div>
          <p className="mt-2 text-center text-xs font-medium text-text-secondary">
            Câu {step + 1}/{LEADERBOARD_QUIZ_LENGTH}
          </p>

          <div className="mt-6 rounded-xl border border-primary-100 bg-primary-50/40 px-4 py-4">
            <p className="text-sm font-semibold text-text-primary">{current.question}</p>
          </div>

          <input
            type="text"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Nhập câu trả lời"
            className={`mt-4 ${inputClassName}`}
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <Button className="mt-6 w-full" onClick={handleSubmit}>
            {step + 1 >= LEADERBOARD_QUIZ_LENGTH ? 'Xem BXH' : 'Câu tiếp theo'}
          </Button>
        </div>
      </section>
    </div>
  )
}
