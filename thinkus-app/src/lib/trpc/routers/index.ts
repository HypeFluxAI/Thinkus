import { router } from '../trpc'
import { projectRouter } from './project'
import { userRouter } from './user'
import { executiveRouter } from './executive'
import { notificationRouter } from './notification'
import { discussionRouter } from './discussion'
import { deliveryRouter } from './delivery'

export const appRouter = router({
  project: projectRouter,
  user: userRouter,
  executive: executiveRouter,
  notification: notificationRouter,
  discussion: discussionRouter,
  delivery: deliveryRouter,
})

export type AppRouter = typeof appRouter
