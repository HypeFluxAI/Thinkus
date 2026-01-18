import { router } from '../trpc'
import { projectRouter } from './project'
import { userRouter } from './user'
import { executiveRouter } from './executive'
import { notificationRouter } from './notification'
import { discussionRouter } from './discussion'
import { deliveryRouter } from './delivery'
import { aiEmployeeRouter } from './ai-employee'
import { memoryRouter } from './memory'

export const appRouter = router({
  project: projectRouter,
  user: userRouter,
  executive: executiveRouter,
  notification: notificationRouter,
  discussion: discussionRouter,
  delivery: deliveryRouter,
  aiEmployee: aiEmployeeRouter,
  memory: memoryRouter,
})

export type AppRouter = typeof appRouter
