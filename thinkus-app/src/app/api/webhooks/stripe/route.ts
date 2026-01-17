import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { stripe } from '@/lib/stripe/config'
import { Project, Subscription, Payment, Notification, WebhookEvent, DeliverySession } from '@/lib/db/models'
import type { SubscriptionPlan, NotificationType } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'
import Stripe from 'stripe'
import { DeliveryOrchestratorService } from '@/lib/services/delivery-orchestrator'

// 发送通知的辅助函数
async function sendNotification(params: {
  userId: mongoose.Types.ObjectId
  type: NotificationType
  title: string
  body: string
  relatedTo?: {
    type: 'subscription' | 'payment' | 'project'
    id: mongoose.Types.ObjectId
  }
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}) {
  try {
    await Notification.createNotification({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      relatedTo: params.relatedTo,
      priority: params.priority || 'normal',
      channels: ['app'],
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

// 映射 Stripe 订阅状态到本地状态
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'canceled'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'trialing':
      return 'trialing'
    case 'paused':
      return 'paused'
    default:
      return 'active'
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  await dbConnect()

  // 幂等性检查：检查事件是否已处理
  const isProcessed = await WebhookEvent.isProcessed('stripe', event.id)
  if (isProcessed) {
    console.log(`Event ${event.id} already processed, skipping`)
    return NextResponse.json({ received: true, skipped: true })
  }

  // 创建事件记录
  await WebhookEvent.createEvent({
    source: 'stripe',
    eventId: event.id,
    eventType: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
  })

  try {
    switch (event.type) {
      // ========== 一次性支付事件 ==========
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // 处理项目支付
        if (session.mode === 'payment' && session.metadata?.projectId) {
          const projectId = session.metadata.projectId
          const project = await Project.findByIdAndUpdate(
            projectId,
            {
              status: 'paid',
              paymentId: session.payment_intent as string,
              paidAt: new Date(),
              progress: {
                phase: 'starting',
                percentage: 0,
                currentTask: '准备开始开发',
                estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            },
            { new: true }
          )

          if (project) {
            // 发送支付成功通知
            await sendNotification({
              userId: project.userId,
              type: 'payment_succeeded',
              title: '支付成功',
              body: `您的项目「${project.name}」已支付成功，我们将立即开始开发！`,
              relatedTo: { type: 'project', id: project._id },
              priority: 'high',
            })

            // 自动启动交付流程
            try {
              const deliveryOrchestrator = new DeliveryOrchestratorService()

              // 创建交付会话
              const deliveryConfig = {
                projectId: project._id.toString(),
                projectName: project.name,
                userId: project.userId.toString(),
                productType: project.productType || 'web-app',
                userEmail: session.customer_email || '',
                userName: session.customer_details?.name || '用户',
                // 从项目配置中获取部署设置
                deployConfig: {
                  platform: 'vercel' as const,
                  framework: 'nextjs' as const,
                  autoSSL: true,
                },
                // 启用所有交付功能
                enableE2ETests: true,
                enableAcceptance: true,
                notifyChannels: ['email', 'in_app'] as ('email' | 'sms' | 'in_app' | 'wechat')[],
              }

              // 异步启动交付流程（不阻塞 webhook 响应）
              deliveryOrchestrator.startDelivery(deliveryConfig, (progress) => {
                console.log(`[Delivery] Project ${projectId}: ${progress.stage} - ${progress.message}`)
              }).then((result) => {
                console.log(`[Delivery] Project ${projectId} delivery completed:`, result.success ? 'SUCCESS' : 'FAILED')
              }).catch((error) => {
                console.error(`[Delivery] Project ${projectId} delivery error:`, error)
              })

              console.log(`[Delivery] Started delivery for project ${projectId}`)
            } catch (deliveryError) {
              // 交付启动失败不影响支付成功状态
              console.error(`[Delivery] Failed to start delivery for project ${projectId}:`, deliveryError)
            }
          }

          console.log(`Project ${projectId} marked as paid`)
        }

        // 处理订阅支付
        if (session.mode === 'subscription' && session.metadata?.userId) {
          const userId = new mongoose.Types.ObjectId(session.metadata.userId)
          const plan = session.metadata.plan as SubscriptionPlan
          const billingCycle = session.metadata.billingCycle as 'monthly' | 'yearly'

          // 获取订阅详情
          const stripeSubscription = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as unknown as {
            id: string
            status: string
            items: { data: Array<{ price: { id: string } }> }
            current_period_start: number
            current_period_end: number
            trial_start: number | null
            trial_end: number | null
          }

          // 更新本地订阅记录
          const subscription = await Subscription.findOneAndUpdate(
            { userId },
            {
              $set: {
                plan,
                status: stripeSubscription.status === 'trialing' ? 'trialing' : 'active',
                stripeSubscriptionId: stripeSubscription.id,
                stripePriceId: stripeSubscription.items.data[0]?.price.id,
                stripeCustomerId: session.customer as string,
                billingCycle,
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                trialStart: stripeSubscription.trial_start
                  ? new Date(stripeSubscription.trial_start * 1000)
                  : undefined,
                trialEnd: stripeSubscription.trial_end
                  ? new Date(stripeSubscription.trial_end * 1000)
                  : undefined,
                cancelAtPeriodEnd: false,
              },
            },
            { upsert: true, new: true }
          )

          // 发送订阅创建通知
          await sendNotification({
            userId,
            type: 'subscription_created',
            title: '订阅成功',
            body: `您已成功订阅 ${plan} 计划，感谢您的支持！`,
            relatedTo: subscription ? { type: 'subscription', id: subscription._id } : undefined,
            priority: 'high',
          })

          console.log(`Subscription created for user ${userId}, plan: ${plan}`)
        }
        break
      }

      // ========== 订阅事件 ==========
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as {
          id: string
          status: string
          customer: string
          current_period_start: number
          current_period_end: number
          cancel_at_period_end: boolean
          canceled_at: number | null
          trial_end: number | null
        }
        const customerId = subscription.customer

        // 通过 customerId 查找订阅
        const localSubscription = await Subscription.findOne({
          stripeCustomerId: customerId,
        })

        if (localSubscription) {
          const previousStatus = localSubscription.status

          // 更新订阅状态
          localSubscription.status = mapStripeStatus(subscription.status as Stripe.Subscription.Status)
          localSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000)
          localSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000)
          localSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end

          if (subscription.canceled_at) {
            localSubscription.canceledAt = new Date(subscription.canceled_at * 1000)
          }

          await localSubscription.save()

          // 如果状态变化，发送通知
          if (previousStatus !== localSubscription.status) {
            await sendNotification({
              userId: localSubscription.userId,
              type: 'subscription_updated',
              title: '订阅状态更新',
              body: `您的订阅状态已更新为：${localSubscription.status}`,
              relatedTo: { type: 'subscription', id: localSubscription._id },
            })
          }

          // 检查试用期即将结束
          if (subscription.trial_end) {
            const trialEndDate = new Date(subscription.trial_end * 1000)
            const daysUntilEnd = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

            if (daysUntilEnd <= 3 && daysUntilEnd > 0) {
              await sendNotification({
                userId: localSubscription.userId,
                type: 'trial_ending',
                title: '试用期即将结束',
                body: `您的试用期将在 ${daysUntilEnd} 天后结束，届时将自动开始收费。`,
                relatedTo: { type: 'subscription', id: localSubscription._id },
                priority: 'high',
              })
            }
          }

          console.log(`Subscription ${subscription.id} updated`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as unknown as { id: string; customer: string }
        const customerId = subscription.customer

        // 订阅已删除，降级到免费版
        const localSubscription = await Subscription.findOneAndUpdate(
          { stripeCustomerId: customerId },
          {
            $set: {
              plan: 'free',
              status: 'canceled',
              canceledAt: new Date(),
              stripeSubscriptionId: undefined,
              stripePriceId: undefined,
            },
          },
          { new: true }
        )

        if (localSubscription) {
          await sendNotification({
            userId: localSubscription.userId,
            type: 'subscription_canceled',
            title: '订阅已取消',
            body: '您的订阅已取消，账户已降级为免费版。如需继续使用高级功能，请重新订阅。',
            relatedTo: { type: 'subscription', id: localSubscription._id },
            priority: 'high',
          })
        }

        console.log(`Subscription ${subscription.id} deleted, downgraded to free`)
        break
      }

      // ========== 发票事件 ==========
      case 'invoice.paid': {
        const invoice = event.data.object as unknown as {
          id: string
          customer: string
          subscription: string | null
          amount_paid: number
          currency: string
          charge: string | null
          number: string | null
          hosted_invoice_url: string | null
          invoice_pdf: string | null
        }
        const customerId = invoice.customer

        // 查找用户
        const subscription = await Subscription.findOne({
          stripeCustomerId: customerId,
        })

        if (subscription && invoice.subscription) {
          // 创建支付记录
          const payment = await Payment.create({
            userId: subscription.userId,
            subscriptionId: subscription._id,
            amount: invoice.amount_paid / 100, // 转换为美元
            currency: invoice.currency,
            status: 'succeeded',
            type: 'subscription',
            stripeInvoiceId: invoice.id,
            stripeChargeId: invoice.charge || undefined,
            description: `${subscription.plan} subscription - ${subscription.billingCycle}`,
            invoiceNumber: invoice.number || undefined,
            invoiceUrl: invoice.hosted_invoice_url || undefined,
            receiptUrl: invoice.invoice_pdf || undefined,
            paidAt: new Date(),
          })

          await sendNotification({
            userId: subscription.userId,
            type: 'payment_succeeded',
            title: '付款成功',
            body: `您的订阅付款 $${invoice.amount_paid / 100} 已成功处理。`,
            relatedTo: { type: 'payment', id: payment._id },
          })

          console.log(`Invoice ${invoice.id} paid, payment recorded`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as {
          id: string
          customer: string
          amount_due: number
        }
        const customerId = invoice.customer

        // 更新订阅状态为逾期
        const subscription = await Subscription.findOneAndUpdate(
          { stripeCustomerId: customerId },
          { $set: { status: 'past_due' } },
          { new: true }
        )

        if (subscription) {
          await sendNotification({
            userId: subscription.userId,
            type: 'payment_failed',
            title: '付款失败',
            body: `您的订阅付款失败，请更新支付方式以避免服务中断。`,
            relatedTo: { type: 'subscription', id: subscription._id },
            priority: 'urgent',
          })
        }

        console.log(`Invoice ${invoice.id} payment failed`)
        break
      }

      // ========== 退款事件 ==========
      case 'charge.refunded': {
        const charge = event.data.object as unknown as {
          id: string
          amount_refunded: number
          refunded: boolean
          payment_intent: string | null
          invoice: string | null
        }
        const refundAmount = charge.amount_refunded / 100

        // 通过 payment_intent 查找支付记录
        if (charge.payment_intent) {
          const payment = await Payment.findOneAndUpdate(
            { stripePaymentIntentId: charge.payment_intent },
            {
              $set: {
                status: charge.refunded ? 'refunded' : 'succeeded',
                refundedAmount: refundAmount,
                refundedAt: new Date(),
              },
            },
            { new: true }
          )

          if (payment) {
            await sendNotification({
              userId: payment.userId,
              type: 'refund_processed',
              title: '退款已处理',
              body: `您的退款 $${refundAmount} 已成功处理，预计 5-10 个工作日到账。`,
              relatedTo: { type: 'payment', id: payment._id },
              priority: 'high',
            })
          }
        }

        // 通过 invoice 查找支付记录
        if (charge.invoice) {
          const payment = await Payment.findOneAndUpdate(
            { stripeInvoiceId: charge.invoice },
            {
              $set: {
                status: charge.refunded ? 'refunded' : 'succeeded',
                refundedAmount: refundAmount,
                refundedAt: new Date(),
              },
            },
            { new: true }
          )

          if (payment) {
            await sendNotification({
              userId: payment.userId,
              type: 'refund_processed',
              title: '退款已处理',
              body: `您的退款 $${refundAmount} 已成功处理，预计 5-10 个工作日到账。`,
              relatedTo: { type: 'payment', id: payment._id },
              priority: 'high',
            })
          }
        }

        console.log(`Charge ${charge.id} refunded: $${refundAmount}`)
        break
      }

      // ========== 支付失败事件 ==========
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // 查找相关项目
        if (paymentIntent.metadata?.projectId) {
          const project = await Project.findById(paymentIntent.metadata.projectId)
          if (project) {
            await sendNotification({
              userId: project.userId,
              type: 'payment_failed',
              title: '支付失败',
              body: `您的项目「${project.name}」支付失败，请重试或更换支付方式。`,
              relatedTo: { type: 'project', id: project._id },
              priority: 'urgent',
            })
          }
        }

        console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
        break
      }

      // ========== 客户事件 ==========
      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer

        // 同步客户信息到订阅记录
        if (customer.email) {
          await Subscription.findOneAndUpdate(
            { stripeCustomerId: customer.id },
            { $set: { updatedAt: new Date() } }
          )
        }

        console.log(`Customer ${customer.id} updated`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // 标记事件为已处理
    await WebhookEvent.markAsProcessed('stripe', event.id)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)

    // 标记事件为失败
    await WebhookEvent.markAsFailed(
      'stripe',
      event.id,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
