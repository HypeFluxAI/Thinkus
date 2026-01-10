import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { Project } from '@/lib/db/models/project'
import dbConnect from '@/lib/db/connection'
import Stripe from 'stripe'

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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const projectId = session.metadata?.projectId
        if (!projectId) {
          console.error('No projectId in session metadata')
          break
        }

        // Update project status to paid
        await Project.findByIdAndUpdate(projectId, {
          status: 'paid',
          paymentId: session.payment_intent as string,
          paidAt: new Date(),
          progress: {
            phase: 'starting',
            percentage: 0,
            currentTask: '准备开始开发',
            estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        })

        console.log(`Project ${projectId} marked as paid`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', paymentIntent.id)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
