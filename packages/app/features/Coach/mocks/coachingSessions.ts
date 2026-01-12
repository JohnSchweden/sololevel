import type { CoachMode } from '@my/config'
import { VOICE_TEXT_CONFIG } from '@my/config'
import type { Message } from '../CoachScreen'

export interface CoachingSessionMock {
  id: number
  date: string
  title: string
  previewMessage: string
  initialMessages: Message[]
}

/**
 * Get coaching session title based on voice mode
 * Cycles through default titles if more sessions than titles
 */
function getSessionTitle(sessionIndex: number, voiceMode: CoachMode = 'roast'): string {
  const titles = VOICE_TEXT_CONFIG[voiceMode].sessions.defaultTitles
  return titles[sessionIndex % titles.length] || titles[0] || 'Coaching Session'
}

// Generate mock coaching sessions with titles based on voice mode
// Defaults to 'roast' mode for backward compatibility
export function getMockCoachingSessions(voiceMode: CoachMode = 'roast'): CoachingSessionMock[] {
  return [
    {
      id: 1,
      date: 'Today',
      title: getSessionTitle(0, voiceMode),
      previewMessage: 'Discussion about DOMS and muscle adaptation...',
      initialMessages: [
        {
          id: 'session-1-user-1',
          type: 'user',
          content:
            "I've been experiencing significant muscle soreness after my deadlift sessions. Is this normal?",
          timestamp: new Date('2024-01-15T10:30:00Z'),
        },
        {
          id: 'session-1-coach-1',
          type: 'coach',
          content:
            "DOMS. Your body's passive-aggressive way of reminding you that you exist. It's normal, especially when you deadlift like you're trying to impress someone who ghosted you. The soreness? That's your muscles adapting. Or plotting revenge. Hard to tell. Either way, let's fix your recovery so you don't need help getting off the toilet.",
          timestamp: new Date('2024-01-15T10:32:00Z'),
        },
        {
          id: 'session-1-user-2',
          type: 'user',
          content:
            'The soreness is particularly bad in my lower back and hamstrings. Should I skip my next workout?',
          timestamp: new Date('2024-01-15T10:35:00Z'),
        },
        {
          id: 'session-1-coach-2',
          type: 'coach',
          content:
            "Skip the deadlifts today. Your lower back and hamstrings wrote you a letter. It says 'STOP.' Try light mobility, walking, or swimming. If pain is 7/10+, rest. Your body isn't a rental.",
          timestamp: new Date('2024-01-15T10:37:00Z'),
        },
        {
          id: 'session-1-user-3',
          type: 'user',
          content: "What about foam rolling? I've heard mixed things about it.",
          timestamp: new Date('2024-01-15T10:40:00Z'),
        },
        {
          id: 'session-1-coach-3',
          type: 'coach',
          content:
            "Foam rolling: self-inflicted torture that works. Start light - don't go full Inquisition on sore muscles. Contrast showers (hot/cold) shock your system into compliance. Hydrate with electrolytes - you're not a cactus. Combine these. Actually recover.",
          timestamp: new Date('2024-01-15T10:42:00Z'),
        },
      ],
    },
    {
      id: 2,
      date: 'Monday, Jul 28',
      title: getSessionTitle(1, voiceMode),
      previewMessage: 'Tailored supplement plan based on training goals...',
      initialMessages: [
        {
          id: 'session-2-user-1',
          type: 'user',
          content:
            'I want to optimize my supplement stack for muscle growth and recovery. What would you recommend?',
          timestamp: new Date('2024-07-28T14:15:00Z'),
        },
        {
          id: 'session-2-coach-1',
          type: 'coach',
          content:
            "Supplements. The shiny bottles that promise everything. Based on your training (and let's be honest, how often you skip leg day), here's what actually works: protein timing (because eating real food is apparently too hard), creatine (legal gains, less sketchy than actual steroids), and omega-3s (your future self's joints will send you a thank you card). Let me build you a stack that won't require a second mortgage or turn your bathroom into a supplement graveyard.",
          timestamp: new Date('2024-07-28T14:17:00Z'),
        },
        {
          id: 'session-2-user-2',
          type: 'user',
          content: "I'm currently taking whey protein and a multivitamin. Should I add creatine?",
          timestamp: new Date('2024-07-28T14:20:00Z'),
        },
        {
          id: 'session-2-coach-2',
          type: 'coach',
          content:
            "Creatine works. It's researched. It's cheap. Start with 3-5g daily. Don't take 20g - you'll bloat and regret it. Your current stack (whey + multivitamin) is fine. You're not completely lost.",
          timestamp: new Date('2024-07-28T14:22:00Z'),
        },
        {
          id: 'session-2-user-3',
          type: 'user',
          content: 'What about pre-workout supplements? I see them everywhere.',
          timestamp: new Date('2024-07-28T14:25:00Z'),
        },
        {
          id: 'session-2-coach-3',
          type: 'coach',
          content:
            "Pre-workouts: energy drinks with a science degree. They help, but they're not magic - you still have to lift. If you try one, get caffeine (150-300mg), beta-alanine (tingles are normal), and citrulline malate (fancy name, helps pumps). But sleep, hydration, and real food matter more. Don't skip basics for shiny bottles.",
          timestamp: new Date('2024-07-28T14:27:00Z'),
        },
      ],
    },
    {
      id: 3,
      date: 'Sunday, Jul 27',
      title: getSessionTitle(2, voiceMode),
      previewMessage: 'Addressing forward head posture and rounded shoulders...',
      initialMessages: [
        {
          id: 'session-3-user-1',
          type: 'user',
          content:
            'I spend a lot of time at my desk and notice my posture is getting worse. How can I fix this?',
          timestamp: new Date('2024-07-27T16:45:00Z'),
        },
        {
          id: 'session-3-coach-1',
          type: 'coach',
          content:
            "Your back hurts because your posture is terrible. Desk work turned you into a human question mark. Chiropractors see you coming and start counting money. Let's fix this before you need a back brace and a support group. Here's a routine that actually works...",
          timestamp: new Date('2024-07-27T16:47:00Z'),
        },
        {
          id: 'session-3-user-2',
          type: 'user',
          content:
            'I have forward head posture and rounded shoulders. Which exercises should I prioritize?',
          timestamp: new Date('2024-07-27T16:50:00Z'),
        },
        {
          id: 'session-3-coach-2',
          type: 'coach',
          content:
            "Forward head posture: you look like you're reading from across the room. Fix it with chin tucks (make a double chin on purpose) and upper trap stretches. Rounded shoulders? You're permanently shrugging. Do doorway chest stretches and band pull-aparts for rhomboids. Timer every hour: 5 chin tucks, 10 band pull-aparts. Coworkers will judge. Your spine won't.",
          timestamp: new Date('2024-07-27T16:52:00Z'),
        },
        {
          id: 'session-3-user-3',
          type: 'user',
          content: 'How long will it take to see improvements?',
          timestamp: new Date('2024-07-27T16:55:00Z'),
        },
        {
          id: 'session-3-coach-3',
          type: 'coach',
          content:
            "Do these consistently (big if) and you'll see improvements in 2-4 weeks. Posture is a habit, not a one-time fix. Keep doing these or you'll revert to question mark status. Fix your workspace: monitor at eye level, feet flat, breaks every 30-45 minutes. Your future self will thank you when you're not Quasimodo.",
          timestamp: new Date('2024-07-27T16:57:00Z'),
        },
      ],
    },
    {
      id: 4,
      date: 'Saturday, Jul 26',
      title: getSessionTitle(0, voiceMode), // Cycle back to first title
      previewMessage: 'Preventing common lifting injuries through proper form...',
      initialMessages: [
        {
          id: 'session-4-user-1',
          type: 'user',
          content:
            "I'm worried about getting injured while lifting heavy. What are the best ways to prevent injuries?",
          timestamp: new Date('2024-07-26T09:20:00Z'),
        },
        {
          id: 'session-4-coach-1',
          type: 'coach',
          content:
            "Injury prevention: it's important. Unless you like explaining to people why you can't turn your head or why you walk like you're 80. The keys? Progressive overload (not 'let me deadlift 500lbs on day one'), proper warm-up (not just walking to the barbell), and listening to your body (it screams, you ignore). Let's cover the safety protocols so you don't end up in a brace.",
          timestamp: new Date('2024-07-26T09:22:00Z'),
        },
        {
          id: 'session-4-user-2',
          type: 'user',
          content:
            "I've heard mixed advice about warming up. Some say 5 minutes is enough, others say 15-20 minutes.",
          timestamp: new Date('2024-07-26T09:25:00Z'),
        },
        {
          id: 'session-4-coach-2',
          type: 'coach',
          content:
            "Warm-up duration depends on weight and whether you want to walk tomorrow. Heavy lifting? 10-15 minutes: 5 min light cardio (not sprinting), then dynamic movements mimicking your main exercises. Before squats: bodyweight squats, leg swings, hip circles. You're preparing your body for the abuse ahead.",
          timestamp: new Date('2024-07-26T09:27:00Z'),
        },
        {
          id: 'session-4-user-3',
          type: 'user',
          content: 'What about form checks? Should I record myself or get a trainer?',
          timestamp: new Date('2024-07-26T09:30:00Z'),
        },
        {
          id: 'session-4-coach-3',
          type: 'coach',
          content:
            "Recording yourself works. You'll see knee cave (knees partying without you), back rounding (scared cat mode), uneven bar path (bar doing its own thing). A trainer gives immediate feedback and saves you from yourself. Record main lifts from side and front. See a trainer every few months. Your ego takes a hit. Your spine doesn't.",
          timestamp: new Date('2024-07-26T09:32:00Z'),
        },
      ],
    },
    {
      id: 5,
      date: 'Friday, Jul 25',
      title: getSessionTitle(1, voiceMode), // Cycle to second title
      previewMessage: 'Optimizing meal timing around workouts...',
      initialMessages: [
        {
          id: 'session-5-user-1',
          type: 'user',
          content: 'When should I eat before and after my workouts for best results?',
          timestamp: new Date('2024-07-25T12:30:00Z'),
        },
        {
          id: 'session-5-coach-1',
          type: 'coach',
          content:
            "Meal timing matters. Unless you like passing out mid-squat. Carbs 1-2 hours before (energy, not just willpower). Protein + carbs within 30 minutes post-workout (muscles are screaming for food). Let's break this down so you don't eat a whole pizza at 11pm thinking it's 'recovery'.",
          timestamp: new Date('2024-07-25T12:32:00Z'),
        },
        {
          id: 'session-5-user-2',
          type: 'user',
          content: 'I work out early in the morning. Should I eat before or just have coffee?',
          timestamp: new Date('2024-07-25T12:35:00Z'),
        },
        {
          id: 'session-5-coach-2',
          type: 'coach',
          content:
            "Early morning workouts: options exist. Coffee works if you feel energized (or at least 'not dead'). Your body uses stored glycogen. Weak or dizzy? That's your body saying 'feed me, you monster.' Try a small carb snack (banana, toast) 30-60 minutes before. Listen to your body - it's vocal.",
          timestamp: new Date('2024-07-25T12:37:00Z'),
        },
        {
          id: 'session-5-user-3',
          type: 'user',
          content: 'What about the "anabolic window"? Is it really that important?',
          timestamp: new Date('2024-07-25T12:40:00Z'),
        },
        {
          id: 'session-5-coach-3',
          type: 'coach',
          content:
            "The 'anabolic window' is overhyped. Like a movie trailer that promises everything, delivers disappointment. Protein within 2-3 hours post-workout is good, but you don't need to sprint to your shake like gains are evaporating. Focus on total daily protein (0.8-1g per lb - math required) and consistent meals. The window is a garage door - open for hours, not minutes. You're not Cinderella. Gains don't disappear at midnight.",
          timestamp: new Date('2024-07-25T12:42:00Z'),
        },
      ],
    },
    {
      id: 6,
      date: 'Thursday, Jul 24',
      title: getSessionTitle(2, voiceMode), // Cycle to third title
      previewMessage: 'Advanced recovery methods for serious lifters...',
      initialMessages: [
        {
          id: 'session-6-user-1',
          type: 'user',
          content:
            "I'm training 5 days a week and feeling run down. What recovery techniques should I focus on?",
          timestamp: new Date('2024-07-24T18:00:00Z'),
        },
        {
          id: 'session-6-coach-1',
          type: 'coach',
          content:
            "Training 5 days a week? Recovery isn't optional. It's your secret weapon. Or your body gives up. Sleep quality, hydration, active recovery - these are priorities, not suggestions. Let's build a recovery protocol so you don't burn out like a candle in a hurricane. Because right now, you're the candle.",
          timestamp: new Date('2024-07-24T18:02:00Z'),
        },
        {
          id: 'session-6-user-2',
          type: 'user',
          content: "I'm getting 7-8 hours of sleep but still feel tired. What else can I do?",
          timestamp: new Date('2024-07-24T18:05:00Z'),
        },
        {
          id: 'session-6-coach-2',
          type: 'coach',
          content:
            "Sleep quality > quantity. You could sleep 12 hours on a terrible mattress and still feel like garbage. Sleep hygiene: consistent bedtime (not 'whenever'), cool room (65-68°F), no screens 1 hour before bed (put down the phone), magnesium or chamomile tea. Track sleep stages - you might get 8 hours but not enough deep sleep. Your body runs on empty without proper sleep.",
          timestamp: new Date('2024-07-24T18:07:00Z'),
        },
        {
          id: 'session-6-user-3',
          type: 'user',
          content: 'What about ice baths and saunas? Are they worth the investment?',
          timestamp: new Date('2024-07-24T18:10:00Z'),
        },
        {
          id: 'session-6-coach-3',
          type: 'coach',
          content:
            "Ice baths and saunas work if you're into self-inflicted torture. Ice baths (10-15°C, 10-15 min) reduce inflammation and make you question life. Saunas (80-90°C, 15-20 min) improve circulation and feel like a hot waiting room. But they're supplements to sleep and nutrition, not replacements. You can't sauna your way out of terrible sleep. Start with contrast showers (hot/cold) - free, effective, less sanity-questioning.",
          timestamp: new Date('2024-07-24T18:12:00Z'),
        },
      ],
    },
  ]
}

// Export default constant for backward compatibility (uses 'roast' mode)
export const MOCK_COACHING_SESSIONS: CoachingSessionMock[] = getMockCoachingSessions('roast')
