import type { MathChallenge } from '../types'

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateEasy(): MathChallenge {
  const a = randInt(10, 99)
  const b = randInt(10, 99)
  const op = Math.random() > 0.5 ? '+' : '-'
  const answer = op === '+' ? a + b : a - b
  return { question: `${a} ${op} ${b} = ?`, answer }
}

function generateMedium(): MathChallenge {
  const a = randInt(10, 50)
  const b = randInt(2, 15)
  const c = randInt(1, 20)
  const op1 = Math.random() > 0.5 ? '+' : '-'
  const op2 = Math.random() > 0.5 ? '*' : '+'
  let answer: number
  if (op2 === '*') {
    answer = op1 === '+' ? a + (b * c) : a - (b * c)
  } else {
    answer = op1 === '+' ? a + b + c : a - b + c
  }
  return { question: `${a} ${op1} ${b} ${op2} ${c} = ?`, answer }
}

function generateHard(): MathChallenge {
  const a = randInt(20, 99)
  const b = randInt(2, 20)
  const c = randInt(10, 50)
  const d = randInt(2, 10)
  const answer = a * b + c - d
  return { question: `${a} × ${b} + ${c} - ${d} = ?`, answer }
}

export function generateMathChallenge(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): MathChallenge {
  switch (difficulty) {
    case 'easy':
      return generateEasy()
    case 'medium':
      return generateMedium()
    case 'hard':
      return generateHard()
  }
}

export function checkMathAnswer(challenge: MathChallenge, userAnswer: number): boolean {
  return challenge.answer === userAnswer
}
