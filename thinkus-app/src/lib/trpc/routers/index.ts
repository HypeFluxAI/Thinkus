import { router } from '../trpc'
import { projectRouter } from './project'
import { userRouter } from './user'

export const appRouter = router({
  project: projectRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter
