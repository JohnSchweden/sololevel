import type { Message } from '../CoachScreen'

export interface CoachingSessionMock {
  id: number
  date: string
  title: string
  previewMessage: string
  initialMessages: Message[]
}

export const MOCK_COACHING_SESSIONS: CoachingSessionMock[] = [
  {
    id: 1,
    date: 'Today',
    title: 'Muscle Soreness and Growth in Weightlifting',
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
          "Yes, delayed onset muscle soreness (DOMS) is completely normal, especially when you're progressively overloading. The soreness indicates your muscles are adapting and growing stronger. Let's discuss some recovery strategies...",
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
          "Great question! You don't need to skip entirely, but you should modify your training. Try light mobility work, walking, or swimming. If the soreness is severe (7/10 or higher), take a rest day. The key is listening to your body while maintaining movement.",
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
          "Foam rolling can help with blood flow and mobility, but don't overdo it on extremely sore muscles. Start with light pressure and gradually increase. Also consider contrast showers (hot/cold) and proper hydration with electrolytes. These strategies work best when combined!",
        timestamp: new Date('2024-01-15T10:42:00Z'),
      },
    ],
  },
  {
    id: 2,
    date: 'Monday, Jul 28',
    title: 'Personalised supplement recommendations',
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
          "Based on your training frequency and goals, I'd recommend focusing on protein timing, creatine for strength, and omega-3s for recovery. Let me create a personalized plan for you...",
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
          "Absolutely! Creatine is one of the most researched and effective supplements for strength and muscle mass. Start with 3-5g daily. It's safe, affordable, and works for most people. Your current stack is good - whey protein post-workout and a quality multivitamin are solid foundations.",
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
          "Pre-workouts can be helpful for energy and focus, but they're not essential. If you want to try one, look for caffeine (150-300mg), beta-alanine, and citrulline malate. However, good sleep, hydration, and proper nutrition are more important than any supplement. Start with the basics first!",
        timestamp: new Date('2024-07-28T14:27:00Z'),
      },
    ],
  },
  {
    id: 3,
    date: 'Sunday, Jul 27',
    title: 'Posture correction techniques',
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
          "Great question! Desk work can really impact posture. Let's start with some simple exercises to strengthen your posterior chain and stretch your chest muscles. Here's a daily routine...",
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
          'Perfect! For forward head posture, focus on chin tucks and upper trap stretches. For rounded shoulders, do doorway chest stretches and strengthen your rhomboids with band pull-aparts. Set a timer every hour to do 5 chin tucks and 10 band pull-aparts at your desk.',
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
          "With consistent daily practice, you should notice improvements in 2-4 weeks. However, remember that posture is a habit - you'll need to maintain these exercises long-term. Also consider ergonomic adjustments to your workspace: monitor at eye level, feet flat on floor, and take breaks every 30-45 minutes.",
        timestamp: new Date('2024-07-27T16:57:00Z'),
      },
    ],
  },
  {
    id: 4,
    date: 'Saturday, Jul 26',
    title: 'Injury prevention strategies',
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
          "Injury prevention is crucial for long-term progress! The key is progressive overload, proper warm-up, and listening to your body. Let's go through the essential safety protocols...",
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
          'Great question! Warm-up duration depends on your workout intensity and the weather. For heavy lifting, aim for 10-15 minutes: start with 5 minutes of light cardio, then do dynamic movements that mimic your main exercises. For example, before squats, do bodyweight squats, leg swings, and hip circles.',
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
          'Both approaches work! Recording yourself is excellent for self-analysis - you can spot issues like knee cave, back rounding, or uneven bar path. A qualified trainer can provide immediate feedback and corrections. Start with recording your main lifts from side and front angles, and consider a session with a trainer every few months for form checks.',
        timestamp: new Date('2024-07-26T09:32:00Z'),
      },
    ],
  },
  {
    id: 5,
    date: 'Friday, Jul 25',
    title: 'Nutrition timing for optimal performance',
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
          'Nutrition timing can significantly impact your performance and recovery! The general rule is carbs 1-2 hours before, and protein + carbs within 30 minutes post-workout. Let me break this down...',
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
          "For early morning workouts, you have options! If you feel energized with just coffee, that's fine - your body can use stored glycogen. But if you feel weak or dizzy, try a small carb snack like a banana or toast 30-60 minutes before. The key is listening to your body and maintaining energy throughout your workout.",
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
          'The "anabolic window" is somewhat overhyped! While eating protein within 2-3 hours post-workout is beneficial, you don\'t need to rush to eat within 30 minutes. Focus more on total daily protein intake (0.8-1g per lb bodyweight) and consistent meals. The window is more like a "garage door" - it stays open for hours, not minutes!',
        timestamp: new Date('2024-07-25T12:42:00Z'),
      },
    ],
  },
  {
    id: 6,
    date: 'Thursday, Jul 24',
    title: 'Recovery techniques for athletes',
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
          "With that training frequency, recovery becomes your secret weapon! Sleep quality, hydration, and active recovery are your priorities. Let's create a comprehensive recovery protocol...",
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
          'Sleep quality matters more than quantity! Focus on sleep hygiene: consistent bedtime, cool room (65-68°F), no screens 1 hour before bed, and consider magnesium or chamomile tea. Also, track your sleep stages - you might be getting 8 hours but not enough deep sleep. Try a sleep tracking app to see your patterns.',
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
          "Both can be beneficial! Ice baths (10-15°C for 10-15 minutes) help with inflammation and muscle soreness. Saunas (80-90°C for 15-20 minutes) improve circulation and stress adaptation. However, they're supplements to good sleep and nutrition, not replacements. Start with contrast showers (hot/cold) - they're free and effective!",
        timestamp: new Date('2024-07-24T18:12:00Z'),
      },
    ],
  },
]
