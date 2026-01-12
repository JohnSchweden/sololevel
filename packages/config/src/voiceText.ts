/**
 * Voice mode-specific UI text variants
 * Organized by category (insights, coach, feedbackPanel, processing, sessions, comments, notifications)
 *
 * Each mode (roast, zen, lovebomb) provides alternative text that matches the coaching personality.
 */
export type CoachMode = 'roast' | 'zen' | 'lovebomb'

export interface VoiceTextConfig {
  insights: {
    weeklySectionHeader: string
    focusAreasHeader: string
    achievementsHeader: string
    quickStatsHeader: string
    dailyActivityHeader: string
    progressLabels: {
      high: string
      medium: string
      low: string
    }
    progressComments: {
      excellent: string // >= 90
      good: string // >= 80
      average: string // >= 50
      poor: string // >= 25
      veryPoor: string // < 25
    }
    achievementComments: {
      streak: string
      technique: string
      record: string
    }
    dailyActivityComments: {
      none: string
      low: string
      medium: string
      high: string
    }
    sessionLabels: {
      many: string // > 10
      few: string // <= 10
    }
    improvementLabels: {
      high: string // > 20
      low: string // <= 20
    }
  }
  coach: {
    welcomeMessage: string
    defaultSessionTitle: string
    suggestions: Array<{ text: string; category: string }>
    responseTemplates: {
      deadlift: string
      squat: string
      program: string
      form: string
      bench: string
      cardio: string
      nutrition: string
      generic: string[]
    }
  }
  feedbackPanel: {
    insights: {
      overviewHeader: string
      quoteHeader: string
      focusHeader: string
      skillHeader: string
      timelineHeader: string
      highlightsHeader: string
      actionsHeader: string
      achievementsHeader: string
      reelsHeader: string
      emptyStates: {
        noInsights: { title: string; description: string }
        noAchievements: { title: string; description: string }
        noFocusAreas: { title: string; description: string }
        noSkills: { title: string; description: string }
        noTimeline: { title: string; description: string }
        noHighlights: { title: string; description: string }
        noActions: { title: string; description: string }
        noReels: { title: string; description: string }
      }
      statusLabels: {
        good: string
        improve: string
        critical: string
      }
      trendLabels: {
        up: string
        down: string
        steady: string
      }
      defaultOverview: {
        benchmarkSummary: string
        summary: string
      }
      defaultQuote: string
    }
    comments: {
      placeholder: {
        line1: string
        line2: string
        line3: string
      }
      inputHint: string
      noCommentsMessage: string
    }
  }
  processing: {
    steps: Array<{ key: string; label: string }>
    descriptions: {
      upload: string
      analyze: string
      roast: string
    }
  }
  sessions: {
    defaultTitles: string[]
  }
  notifications: {
    analysisComplete: { title: string; body: string }
    weeklyReport: { title: string; body: string }
    streakReminder: { title: string; body: string }
    demoNotifications: Array<{
      type: 'achievement' | 'progress' | 'reminder' | 'streak'
      title: string
      body: string
    }>
  }
  comments: {
    demoComments: Array<{
      authorName: string
      text: string
      timeAgo: string
    }>
  }
}

export const VOICE_TEXT_CONFIG: Record<CoachMode, VoiceTextConfig> = {
  roast: {
    insights: {
      weeklySectionHeader: "This Week (The numbers don't lie)",
      focusAreasHeader: "Focus Areas (Where you're failing)",
      achievementsHeader: 'Recent Achievements (You did something!)',
      quickStatsHeader: 'Quick Stats (The brutal truth)',
      dailyActivityHeader: 'Daily Activity (The truth hurts)',
      progressLabels: {
        high: '(Almost there!)',
        medium: '(Halfway to mediocrity)',
        low: '(Room for improvement)',
      },
      progressComments: {
        excellent: "Almost perfect! Now don't mess it up next week.",
        good: "Solid effort. Could be better, but we'll take it.",
        average: "Halfway there... which means you're also halfway behind.",
        poor: "A quarter of the way? That's... something, I guess.",
        veryPoor: 'Less than 25%? Ouch. Time to step it up.',
      },
      achievementComments: {
        streak: 'Keep it going before you break it!',
        technique: 'Finally, some improvement. About time.',
        record: 'A personal best! Now do it again.',
      },
      dailyActivityComments: {
        none: "Zero sessions? Really? That's not even trying.",
        low: 'One session per day? Consistency is key, but so is effort.',
        medium: 'Decent effort, but we both know you can do better.',
        high: "Now that's what I call commitment! Keep it up.",
      },
      sessionLabels: {
        many: 'Sessions\n(Not bad!)',
        few: 'Sessions\n(Barely trying)',
      },
      improvementLabels: {
        high: 'Improvement\n(Actually trying)',
        low: 'Improvement\n(Could be worse)',
      },
    },
    coach: {
      welcomeMessage:
        "I'm your toxic coach, and I'm here to roast you into shape. Think of me as that brutally honest friend who actually wants you to succeed. I'll call out your mistakes, make you laugh (or cry), and help you crawl. What disaster are we fixing today?",
      defaultSessionTitle: 'New Roast Session',
      suggestions: [
        { text: 'Analyze my deadlift form', category: 'Form Analysis' },
        { text: 'Create a 30-day program', category: 'Programming' },
        { text: 'Fix my squat technique', category: 'Technique' },
      ],
      responseTemplates: {
        deadlift:
          "Oh boy, your deadlift form? Let's just say I've seen better lifting technique from someone trying to move a couch up three flights of stairs. Your back is probably crying right now. Here's the brutal truth about what you're doing wrong...",
        squat:
          "Your squat technique is giving me anxiety. It's like watching a baby bird try to fly for the first time—adorable but painful. Your knees are probably having a board meeting about unionizing. Let me fix this disaster:",
        program:
          "A 30-day program? Bold move, considering you probably can't stick to a 3-day program. But I respect the ambition! Let's create something that won't make you quit by day 4. Here's what we're building:",
        form: "Alright, let's be real here. Your form is about as stable as a Jenga tower in an earthquake. But hey, at least you're trying! Here's what's actually happening...",
        bench:
          "Your bench press? More like bench mess. I've seen better pressing technique from someone trying to push a door that says 'pull'. Your shoulders are probably plotting revenge. Let's fix this:",
        cardio:
          "Cardio? You mean that thing you do for 5 minutes before giving up? I've seen better endurance from a sloth on a treadmill. But we're gonna change that. Here's how:",
        nutrition:
          "Your nutrition plan? Let me guess—it's 'eat whatever, whenever'? I've seen better meal planning from a college student living on ramen. But we're gonna fix this disaster together:",
        generic: [
          "I've seen better technique from a newborn giraffe learning to walk. But I respect the hustle. Let me show you how to not embarrass yourself:",
          "Oh honey, your body mechanics are giving me secondhand embarrassment. But we're gonna fix this mess together. Here's the brutal truth:",
          "Your dedication is admirable, but your execution? Yikes. It's like watching someone try to parallel park for the first time. Let's fix this disaster:",
          "I appreciate the enthusiasm, but your proprioception is about as accurate as a broken GPS. Here's what you're actually doing wrong:",
          "Listen, I've seen toddlers with better coordination, but at least you're not giving up. Let me roast your technique and then show you the way:",
          "Your form is so off, it's making my circuits hurt. But I'm here to help, not just judge. Here's what needs to happen:",
        ],
      },
    },
    feedbackPanel: {
      insights: {
        overviewHeader: 'How Bad Was It?',
        quoteHeader: "Coach's Honest Take",
        focusHeader: "What You're Terrible At",
        skillHeader: "Your Skill Breakdown (It's Not Pretty)",
        timelineHeader: 'How You Crashed and Burned (Timeline)',
        highlightsHeader: 'Highlights (and Lowlights)',
        actionsHeader: 'Your Intervention Plan',
        achievementsHeader: 'Achievements',
        reelsHeader: 'AI Reels (Your Greatest Hits & Misses)',
        emptyStates: {
          noInsights: {
            title: "No Insights Yet (You're Not Ready)",
            description:
              'Upload more videos so we can properly roast your performance. We need material to work with.',
          },
          noAchievements: {
            title: 'No Achievements (Shocking, I Know)',
            description:
              "You haven't earned anything yet. Keep trying, maybe one day you'll get a participation trophy.",
          },
          noFocusAreas: {
            title: 'Focus Areas Coming Soon',
            description:
              "We need more videos to identify all the ways you're failing. Don't worry, we'll find them.",
          },
          noSkills: {
            title: 'Skill Matrix Locked',
            description:
              "Record more videos so we can properly map out all your weaknesses. We're waiting.",
          },
          noTimeline: {
            title: 'Timeline Locked',
            description:
              'Add more videos so we can chart your journey from bad to... well, still bad, but documented.',
          },
          noHighlights: {
            title: 'No Highlights Yet',
            description:
              "We're still collecting your worst moments. Once we have enough cringe, we'll compile it all here.",
          },
          noActions: {
            title: 'Action Plan Locked',
            description:
              "Complete more analyses so we can create a personalized plan to fix all your problems. It's going to be a long list.",
          },
          noReels: {
            title: 'Reels Coming Soon',
            description:
              "We're still editing together your best fails and rare wins. The compilation is going to be brutal.",
          },
        },
        statusLabels: {
          good: 'Not Terrible',
          improve: 'Yikes, Fix This',
          critical: 'Absolute Disaster',
        },
        trendLabels: {
          up: 'Actually improving',
          down: 'Getting worse (oof)',
          steady: 'Stuck in mediocrity',
        },
        defaultOverview: {
          benchmarkSummary: "You're 15% clearer than the average mumbler. Congrats, I guess?",
          summary:
            "Your energy is there, but your pauses are like a broken record player. Let's fix that before your audience falls asleep.",
        },
        defaultQuote:
          "\"Look, you've got energy, I'll give you that. But your pacing? It's like watching a sloth try to deliver a TED Talk. Let's fix that disaster before your next presentation.\"",
      },
      comments: {
        placeholder: {
          line1: "Cute curiosity, but you're hunting ghosts. No friends = no comments.",
          line2:
            'Share the video first, then check History & Progress once you actually have an audience. Logic helps! ;)',
          line3: 'In Beta Version, it works without sharing.',
        },
        inputHint: 'Share your thoughts',
        noCommentsMessage: 'No comments yet. Be the first to comment!',
      },
    },
    processing: {
      steps: [
        { key: 'upload', label: 'Waking up the AI bunnies 🐰' },
        { key: 'analyze', label: 'Finding your mistakes 🔍' },
        { key: 'roast', label: 'Giving it a voice 🎤' },
      ],
      descriptions: {
        upload: 'Just uploading your crawling attempt.',
        analyze: "Don't worry, I've seen worse. Probably.",
        roast: 'Bringing your individual roast to live, so you learn for once.',
      },
    },
    sessions: {
      defaultTitles: [
        'Your Deadlift is a Question Mark',
        'Supplements: Because Real Food is Too Mainstream',
        "Why Does Your Back Hurt? (Spoiler: It's Your Posture)",
        'Form Check: The Sequel',
        'Another Day, Another Posture Disaster',
        'Deadlift Form: Still Broken',
        'What Could Go Wrong? (Everything)',
        'The Usual Suspects',
      ],
    },
    notifications: {
      analysisComplete: {
        title: 'Your Roast is Ready',
        body: 'Time to face the music. Your analysis is complete.',
      },
      weeklyReport: {
        title: "Weekly Report (The Numbers Don't Lie)",
        body: 'Check out how you did this week. Spoiler: room for improvement.',
      },
      streakReminder: {
        title: "Don't Break the Streak",
        body: "You're on a roll! Keep it going before you break it.",
      },
      demoNotifications: [
        {
          type: 'achievement',
          title: 'Level Up Unlocked!',
          body: "You've analyzed 10 videos. Your posture is still trash, but at least you're consistent.",
        },
        {
          type: 'progress',
          title: '"Some" Progress Detected',
          body: 'Your vocal variety improved 23% since last week. Only 77% more to go! Are you still reading? CONTINUE!',
        },
        {
          type: 'reminder',
          title: 'Daily Drill Reminder',
          body: 'Time to practice that hand gesture exercise. Your last video looked like you were swatting flies.',
        },
        {
          type: 'streak',
          title: '7-Day Streak!',
          body: "You've recorded every day this week. The grind doesn't stop, neither should you.",
        },
      ],
    },
    comments: {
      demoComments: [
        {
          authorName: 'Peter Parker',
          text: 'Your hand gestures are doing more work than your words. But the energy? Infectious. Keep it up.',
          timeAgo: '1d',
        },
        {
          authorName: 'Thor',
          text: '47 "ums" in 3 minutes. But when you got going? Legendary. 🔥',
          timeAgo: '2h',
        },
        {
          authorName: 'Tony Stark',
          text: 'Your pacing improved from start to finish. You found your rhythm and it shows.',
          timeAgo: '5h',
        },
        {
          authorName: 'Natasha Romanoff',
          text: 'Those pauses? Painful. But then you hit your stride and actually said something worth hearing. More of that, less of the awkward silence.',
          timeAgo: '3d',
        },
        {
          authorName: 'Steve Rogers',
          text: 'Rough start. Solid finish.',
          timeAgo: '1w',
        },
        {
          authorName: 'Bruce Banner',
          text: 'Around the 2-minute mark you finally stopped overthinking and just talked. That’s when it clicked. Why did it take you that long?',
          timeAgo: '4d',
        },
        {
          authorName: 'Wanda Maximoff',
          text: 'You stumbled, recovered, and kept going. Respect. Most people would’ve given up. You didn’t. That’s something.',
          timeAgo: '2d',
        },
      ],
    },
  },
  zen: {
    insights: {
      weeklySectionHeader: 'This Week (Your progress)',
      focusAreasHeader: 'Focus Areas (Growth opportunities)',
      achievementsHeader: 'Recent Achievements (Your journey)',
      quickStatsHeader: 'Quick Stats (Your overview)',
      dailyActivityHeader: 'Daily Activity (Your consistency)',
      progressLabels: {
        high: '(Almost there)',
        medium: '(Steady progress)',
        low: '(Room for growth)',
      },
      progressComments: {
        excellent: 'Excellent progress, keep flowing with your practice.',
        good: 'Good momentum. Continue nurturing this growth.',
        average: 'Steady progress. Each step forward matters.',
        poor: 'Building foundation. Every journey begins with awareness.',
        veryPoor: 'Starting point recognized. Growth awaits your commitment.',
      },
      achievementComments: {
        streak: 'Wonderful consistency. Keep flowing with your practice.',
        technique: 'Progress noticed. Your awareness is growing.',
        record: 'Personal milestone reached. Celebrate this moment.',
      },
      dailyActivityComments: {
        none: 'Every practice begins with a single step. Take yours today.',
        low: 'One session daily shows intention. Consistency will follow.',
        medium: 'Steady practice builds strength. Continue with patience.',
        high: 'Dedicated practice. Your commitment is clear.',
      },
      sessionLabels: {
        many: 'Sessions\n(Strong practice)',
        few: 'Sessions\n(Steady start)',
      },
      improvementLabels: {
        high: 'Improvement\n(Noticeable growth)',
        low: 'Improvement\n(Progressing steadily)',
      },
    },
    coach: {
      welcomeMessage:
        "Welcome. I'm here to guide you on your journey. Together we'll explore your movement with patience and awareness. I'll help you understand your body, offer gentle guidance, and support your growth. What would you like to explore today?",
      defaultSessionTitle: 'New Practice Session',
      suggestions: [
        { text: 'Improve my deadlift form', category: 'Form Analysis' },
        { text: 'Create a 30-day practice plan', category: 'Programming' },
        { text: 'Refine my squat technique', category: 'Technique' },
      ],
      responseTemplates: {
        deadlift:
          "Let's explore your deadlift with gentle awareness. Notice your body's alignment, your breath, and how the movement flows. Here's a mindful approach to what you're experiencing...",
        squat:
          "Observe your squat with curiosity. Notice where tension arises, where ease flows. Each repetition offers learning. Let's approach this with patience and understanding.",
        program:
          "A 30-day practice offers beautiful structure. Consistency and gradual progression create lasting change. Let's create a sustainable plan that honors your body's needs.",
        form: "Observe your movement with gentle awareness. Notice patterns without judgment. Here's a mindful perspective on what's unfolding...",
        bench:
          "Notice your bench press with presence. Observe your alignment, your breathing, your relationship with the weight. Let's refine this with care.",
        cardio:
          "Cardio practice is a meditation in motion. Notice your breath, your rhythm, your connection to movement. Let's explore this with awareness.",
        nutrition:
          "Nutrition is nourishment for body and practice. Notice what serves you, what feels balanced. Let's explore a mindful approach to fueling your body.",
        generic: [
          "Let's approach this with gentle awareness and curiosity. Here's a mindful perspective...",
          "Observe what's happening with non-judgmental presence. Together we can explore this...",
          "Every practice offers learning. Let's explore what's unfolding with patience...",
          "Notice with kindness. Your body communicates wisdom. Let's listen together...",
          'Approach this moment with curiosity. Growth happens through awareness and practice...',
          "Let's explore this together with patience and understanding. Here's a gentle approach...",
        ],
      },
    },
    feedbackPanel: {
      insights: {
        overviewHeader: 'Your Performance Review',
        quoteHeader: "Coach's Guidance",
        focusHeader: 'Areas for Growth',
        skillHeader: 'Your Skills Overview',
        timelineHeader: 'Your Progress Timeline',
        highlightsHeader: 'Highlights and Learning Moments',
        actionsHeader: 'Your Practice Plan',
        achievementsHeader: 'Achievements',
        reelsHeader: 'AI Reels (Your Journey)',
        emptyStates: {
          noInsights: {
            title: 'No Insights Yet',
            description:
              'Continue practicing and recording. With time, patterns and insights will emerge.',
          },
          noAchievements: {
            title: 'No Achievements Yet',
            description:
              'Every practice is an achievement. Keep flowing, and milestones will naturally arise.',
          },
          noFocusAreas: {
            title: 'Focus Areas Coming Soon',
            description:
              "As you continue practicing, we'll identify areas for mindful growth together.",
          },
          noSkills: {
            title: 'Skill Matrix Coming Soon',
            description:
              'Record more sessions so we can map your progress with clarity and insight.',
          },
          noTimeline: {
            title: 'Timeline Coming Soon',
            description:
              'Add more practice sessions so we can observe your journey and patterns over time.',
          },
          noHighlights: {
            title: 'No Highlights Yet',
            description:
              'Continue practicing. Your meaningful moments will be gathered here as you progress.',
          },
          noActions: {
            title: 'Practice Plan Coming Soon',
            description:
              'Complete more analyses so we can create a personalized practice plan that serves your growth.',
          },
          noReels: {
            title: 'Reels Coming Soon',
            description:
              "We're curating your practice moments. Your journey compilation is being prepared.",
          },
        },
        statusLabels: {
          good: 'Well Done',
          improve: 'Needs Attention',
          critical: 'Room to Grow',
        },
        trendLabels: {
          up: 'Improving steadily',
          down: 'Needs focus',
          steady: 'Maintaining practice',
        },
        defaultOverview: {
          benchmarkSummary: 'Your performance shows steady progress and awareness.',
          summary:
            'Your practice demonstrates intention and growth. Continue with patience and presence.',
        },
        defaultQuote:
          '"Notice your movement with gentle awareness. Each practice offers learning. Continue with patience and curiosity."',
      },
      comments: {
        placeholder: {
          line1: 'Comments will appear when you share your video.',
          line2:
            'Share your practice to receive thoughtful feedback from your community. Growth happens together.',
          line3: 'In Beta Version, it works without sharing.',
        },
        inputHint: 'Share your reflection',
        noCommentsMessage: 'No comments yet. Be the first to share your thoughts.',
      },
    },
    processing: {
      steps: [
        { key: 'upload', label: 'Preparing your analysis 🌱' },
        { key: 'analyze', label: 'Analyzing your form 🔍' },
        { key: 'roast', label: 'Creating your feedback 🎤' },
      ],
      descriptions: {
        upload: 'Uploading your practice session.',
        analyze: 'Taking time to understand your movement with care.',
        roast: 'Preparing thoughtful guidance for your practice.',
      },
    },
    sessions: {
      defaultTitles: [
        'Exploring deadlift form with mindful attention',
        'What does your body need today?',
        'A gentle inquiry into back awareness',
        'Movement and breath',
        'Cultivating presence',
        'Reflecting on supplement choices',
        'Noticing patterns',
        'How is your posture serving you?',
        'Returning to the breath',
        'Form as practice',
        'Where is your attention?',
        'Body wisdom',
        'Observing without judgment',
        'The space between movements',
        'Listening to your body',
        'Presence in motion',
        'Awareness practice',
        'What arises?',
        'Gentle observation',
        'Mindful movement',
      ],
    },
    notifications: {
      analysisComplete: {
        title: 'Your Analysis is Ready',
        body: 'Take a moment to review your insights with presence.',
      },
      weeklyReport: {
        title: 'Weekly Practice Review',
        body: 'Your weekly progress awaits. Review with gentle awareness.',
      },
      streakReminder: {
        title: 'Continue Your Practice',
        body: 'Your consistent practice is serving you well. Keep flowing.',
      },
      demoNotifications: [
        {
          type: 'achievement',
          title: 'Milestone Reached',
          body: "You've analyzed 10 videos. Your awareness is growing with each practice.",
        },
        {
          type: 'progress',
          title: 'Progress Noticed',
          body: 'Your vocal variety improved 23% since last week. Notice the subtle shifts in your practice.',
        },
        {
          type: 'reminder',
          title: 'Daily Practice Reminder',
          body: 'Time to practice that hand gesture exercise. Approach it with gentle attention.',
        },
        {
          type: 'streak',
          title: '7-Day Practice Streak',
          body: "You've recorded every day this week. Your consistent practice is serving you well.",
        },
      ],
    },
    comments: {
      demoComments: [
        {
          authorName: 'Peter Parker',
          text: 'Your hand gestures flow naturally with your words. Your presence comes through clearly.',
          timeAgo: '1d',
        },
        {
          authorName: 'Thor',
          text: 'Notice how your pacing improved throughout. Your awareness is growing.',
          timeAgo: '2h',
        },
        {
          authorName: 'Tony Stark',
          text: 'Your rhythm developed beautifully from beginning to end. Well practiced.',
          timeAgo: '5h',
        },
        {
          authorName: 'Natasha Romanoff',
          text: 'I appreciate the space you gave yourself between thoughts. That pause allowed your message to land more fully.',
          timeAgo: '3d',
        },
        {
          authorName: 'Steve Rogers',
          text: 'Subtle shifts.',
          timeAgo: '1w',
        },
        {
          authorName: 'Bruce Banner',
          text: 'When you slowed down around the 2-minute mark, something shifted. Your words carried more weight. What did you notice in that moment?',
          timeAgo: '4d',
        },
        {
          authorName: 'Wanda Maximoff',
          text: 'The way you returned to your breath when you stumbled—that’s the practice. Keep returning.',
          timeAgo: '2d',
        },
      ],
    },
  },
  lovebomb: {
    insights: {
      weeklySectionHeader: 'This Week (Amazing work!)',
      focusAreasHeader: "Focus Areas (You're crushing it!)",
      achievementsHeader: "Recent Achievements (You're incredible!)",
      quickStatsHeader: 'Quick Stats (Look at you go!)',
      dailyActivityHeader: 'Daily Activity (Your dedication!)',
      progressLabels: {
        high: "(You're amazing!)",
        medium: '(Doing so well!)',
        low: '(Getting there!)',
      },
      progressComments: {
        excellent: "You're absolutely crushing it! This is incredible progress. Keep shining!",
        good: "Look at you go! You're doing wonderfully. Your effort is paying off beautifully!",
        average:
          "You're making such lovely progress! Every step forward is something to celebrate!",
        poor: "You've started! That's the hardest part, and you did it! Keep going, you've got this!",
        veryPoor:
          "Every journey begins with a first step, and you took yours! You're amazing for trying!",
      },
      achievementComments: {
        streak: "You're absolutely incredible! Your consistency is inspiring!",
        technique: "Look at you learning and growing! You're doing so wonderfully!",
        record: 'A personal best! You should be so proud! This is amazing!',
      },
      dailyActivityComments: {
        none: "Today is a perfect day to start! You've got this, and I believe in you!",
        low: "One session a day shows such dedication! You're building beautiful consistency!",
        medium: "You're putting in such wonderful effort! Keep it up, you're doing great!",
        high: "Look at this commitment! You're absolutely incredible! This dedication is inspiring!",
      },
      sessionLabels: {
        many: "Sessions\n(You're incredible!)",
        few: 'Sessions\n(Getting started!)',
      },
      improvementLabels: {
        high: "Improvement\n(You're amazing!)",
        low: 'Improvement\n(Doing great!)',
      },
    },
    coach: {
      welcomeMessage:
        "Hello wonderful! I'm so excited to work with you! You're amazing for showing up today. I'm here to celebrate every win, support you through challenges, and cheer you on every step of the way. You're doing something beautiful for yourself, and I'm honored to be part of your journey! What wonderful thing would you like to work on today?",
      defaultSessionTitle: 'New Growth Session',
      suggestions: [
        { text: 'Perfect my amazing deadlift form', category: 'Form Analysis' },
        { text: 'Create an exciting 30-day program', category: 'Programming' },
        { text: 'Elevate my awesome squat technique', category: 'Technique' },
      ],
      responseTemplates: {
        deadlift:
          "Oh, I love that you're working on your deadlift! You're doing something amazing for your strength. Let's celebrate what you're doing well and build on those wonderful foundations. Here's how we can make it even better...",
        squat:
          "Your squat practice is so inspiring! You're showing up and putting in the effort, and that's everything! Let's build on your strengths and make this movement feel even more amazing. You've got this!",
        program:
          "A 30-day program? I love your ambition! You're showing such commitment to your growth. Let's create something exciting and sustainable that celebrates your progress every step of the way!",
        form: "You're doing such great work! Your commitment to improving your form is wonderful. Let's celebrate what you're already doing well and build from there. You've got so much potential!",
        bench:
          "Your bench press practice shows such dedication! I love seeing you work on your strength. Let's refine this with care and celebrate your progress. You're doing great!",
        cardio:
          "Cardio practice is such a gift to yourself! You're showing up, and that's beautiful. Let's make this fun and celebrate every moment of movement. You've got this!",
        nutrition:
          "Nourishing your body is such an act of self-love! I'm so proud you're thinking about this. Let's create a plan that feels good and supports your amazing journey!",
        generic: [
          "You're doing such wonderful work! Your dedication is inspiring. Let's celebrate your progress and keep building on your strengths!",
          "I'm so proud of you for showing up! Your commitment to growth is beautiful. Let's explore this together with excitement!",
          "You're absolutely incredible for trying! Every step forward is worth celebrating. Let's build on this momentum!",
          "Your willingness to learn and grow is so inspiring! You're doing great things for yourself. Let's keep this wonderful energy going!",
          "Look at you putting in the effort! That's everything! Let's celebrate what you're doing and make it even better!",
          "You're showing such beautiful dedication! I love your commitment to improvement. Let's make this journey amazing together!",
        ],
      },
    },
    feedbackPanel: {
      insights: {
        overviewHeader: 'Look What You Achieved!',
        quoteHeader: "Coach's Celebration",
        focusHeader: 'Your Improvement Journey',
        skillHeader: 'Your Amazing Skills!',
        timelineHeader: 'Your Wonderful Progress Timeline',
        highlightsHeader: 'Highlights and Wins!',
        actionsHeader: 'Your Growth Plan',
        achievementsHeader: 'Achievements',
        reelsHeader: 'AI Reels (Your Greatest Moments!)',
        emptyStates: {
          noInsights: {
            title: 'No Insights Yet',
            description:
              "Keep practicing! Your insights and achievements are on the way. You're doing great!",
          },
          noAchievements: {
            title: 'No Achievements Yet',
            description:
              "Every practice is an achievement! Keep showing up, and we'll celebrate every milestone together!",
          },
          noFocusAreas: {
            title: 'Focus Areas Coming Soon',
            description:
              "As you continue your wonderful practice, we'll identify amazing areas for growth together!",
          },
          noSkills: {
            title: 'Skill Matrix Coming Soon',
            description:
              'Record more sessions so we can celebrate all your amazing progress and skills!',
          },
          noTimeline: {
            title: 'Timeline Coming Soon',
            description:
              'Add more practice sessions so we can map out your beautiful journey and celebrate your progress!',
          },
          noHighlights: {
            title: 'No Highlights Yet',
            description:
              'Keep practicing! Your wonderful moments and wins will be gathered here as you progress!',
          },
          noActions: {
            title: 'Growth Plan Coming Soon',
            description:
              'Complete more analyses so we can create an exciting personalized plan that celebrates your amazing journey!',
          },
          noReels: {
            title: 'Reels Coming Soon',
            description:
              "We're curating your best moments! Your celebration reel is being prepared with love!",
          },
        },
        statusLabels: {
          good: 'Growing Strong',
          improve: 'Almost There',
          critical: 'On the Path',
        },
        trendLabels: {
          up: 'Improving beautifully',
          down: 'Learning moment',
          steady: 'Consistent practice',
        },
        defaultOverview: {
          benchmarkSummary: "You're showing wonderful progress and dedication!",
          summary:
            "Your practice demonstrates such beautiful effort and growth. Keep going, you're doing amazingly!",
        },
        defaultQuote:
          '"You\'re doing such wonderful work! Your dedication is inspiring, and your progress is beautiful. Keep shining!"',
      },
      comments: {
        placeholder: {
          line1: 'Your audience awaits! Share to receive wonderful encouragement.',
          line2:
            "Share your practice to receive warm, supportive feedback from your community. You're doing great!",
          line3: 'In Beta Version, it works without sharing.',
        },
        inputHint: 'Share your encouragement',
        noCommentsMessage: 'No comments yet. Be the first to spread some positivity!',
      },
    },
    processing: {
      steps: [
        { key: 'upload', label: 'Getting ready for your success! 🌟' },
        { key: 'analyze', label: 'Discovering your strengths! ✨' },
        { key: 'roast', label: 'Crafting your celebration! 🎉' },
      ],
      descriptions: {
        upload: 'Uploading your wonderful effort!',
        analyze: 'Finding all the things you did right!',
        roast: 'Preparing your personalized praise!',
      },
    },
    sessions: {
      defaultTitles: [
        'Celebrating your deadlift progress and strength!',
        'You are doing so well!',
        'Nourishing your body with love',
        'Your amazing journey',
        'Today you honored yourself',
        'Look how far you’ve come!',
        'Caring for your back',
        'Your commitment shines through',
      ],
    },
    notifications: {
      analysisComplete: {
        title: 'Your Celebration is Ready!',
        body: 'Your analysis is complete! Time to see all the amazing things you did!',
      },
      weeklyReport: {
        title: 'Weekly Celebration Report',
        body: "Check out your wonderful progress this week! You're doing great!",
      },
      streakReminder: {
        title: 'Keep the Momentum Going!',
        body: "You're on an amazing streak! Keep it up, you're incredible!",
      },
      demoNotifications: [
        {
          type: 'achievement',
          title: 'Amazing Milestone Unlocked!',
          body: "You've analyzed 10 videos! You're doing incredible work and your consistency is inspiring!",
        },
        {
          type: 'progress',
          title: 'Fantastic Progress!',
          body: "Your vocal variety improved 23% since last week! You're making such great strides! Keep it up!",
        },
        {
          type: 'reminder',
          title: 'Time for Your Daily Practice!',
          body: "Time to practice that hand gesture exercise! You're doing so well, keep shining!",
        },
        {
          type: 'streak',
          title: "7-Day Streak - You're Amazing!",
          body: "You've recorded every day this week! You're on fire! Keep up this incredible momentum!",
        },
      ],
    },
    comments: {
      demoComments: [
        {
          authorName: 'Peter Parker',
          text: 'Your hand gestures complement your words beautifully! Your energy comes through so authentically!',
          timeAgo: '1d',
        },
        {
          authorName: 'Thor',
          text: "I noticed your pacing improved so much! You're doing amazing work!",
          timeAgo: '2h',
        },
        {
          authorName: 'Tony Stark',
          text: 'Your rhythm developed beautifully from start to finish! You should be so proud!',
          timeAgo: '5h',
        },
        {
          authorName: 'Natasha Romanoff',
          text: 'I love how you took those pauses between thoughts—it gave your message so much more impact! You’re really finding your voice, and it’s incredible to watch!',
          timeAgo: '3d',
        },
        {
          authorName: 'Steve Rogers',
          text: 'You shine! ✨',
          timeAgo: '1w',
        },
        {
          authorName: 'Bruce Banner',
          text: 'When you slowed down around the 2-minute mark, I could feel the shift in your confidence! Your words carried so much power in that moment. You should be so proud of how far you’ve come!',
          timeAgo: '4d',
        },
        {
          authorName: 'Wanda Maximoff',
          text: 'The way you handled that moment when you stumbled—you just took a breath and kept going! That resilience is everything! Keep being amazing!',
          timeAgo: '2d',
        },
      ],
    },
  },
} as const
