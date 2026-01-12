import { router } from '../trpc'
import { projectRouter } from './project'
import { userRouter } from './user'
import { executiveRouter } from './executive'
import { notificationRouter } from './notification'
import { discussionRouter } from './discussion'

export const appRouter = router({
  project: projectRouter,
  user: userRouter,
  executive: executiveRouter,
  notification: notificationRouter,
  discussion: discussionRouter,
})

export type AppRouter = typeof appRouter
