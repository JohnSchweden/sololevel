import React from 'react'

export const VideosSection = ({
  videos,
  onVideoPress,
  onSeeAllPress,
  isLoading,
  error,
  testID,
}: any) =>
  React.createElement('div', { 'data-testid': testID }, [
    React.createElement('div', { key: 'content', 'data-testid': 'videos-section-content' }, [
      isLoading && React.createElement('div', { key: 'loading' }, 'Loading videos...'),
      error && React.createElement('div', { key: 'error' }, 'Error loading videos'),
      ...videos.map((video: any) =>
        React.createElement(
          'button',
          {
            key: video.id,
            'data-testid': `video-${video.id}`,
            onClick: () => onVideoPress(video.id),
          },
          video.title
        )
      ),
      React.createElement(
        'button',
        { key: 'see-all', 'data-testid': 'see-all-button', onClick: onSeeAllPress },
        'See All'
      ),
    ]),
  ])

export const CoachingSessionsSection = ({ sessions, onSessionPress, testID }: any) =>
  React.createElement(
    'div',
    { 'data-testid': testID },
    sessions.map((session: any) =>
      React.createElement(
        'button',
        {
          key: session.id,
          'data-testid': `session-${session.id}`,
          onClick: () => onSessionPress(session.id),
        },
        session.title
      )
    )
  )

export type SessionItem = {
  id: number
  date: string
  title: string
}
