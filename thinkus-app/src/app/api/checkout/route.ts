import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { stripe, getPriceForComplexity } from '@/lib/stripe/config'
import Project from '@/lib/db/models/project'
import dbConnect from '@/lib/db/connection'

interface CheckoutRequest {
  projectId?: string
  proposal: {
    projectName: string
    positioning: string
    features: Array<{
      id: string
      name: string
      description: string
      priority: 'P0' | 'P1' | 'P2'
    }>
    techStack: {
      frontend: string[]
      backend: string[]
      database: string[]
    }
    risks: string[]
    recommendations: string[]
    estimatedComplexity: string
    estimatedPrice: number
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CheckoutRequest = await req.json()
    const { proposal, projectId } = body

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal is required' }, { status: 400 })
    }

    await dbConnect()

    // Create or update project with proposal
    let project
    if (projectId) {
      project = await Project.findByIdAndUpdate(
        projectId,
        {
          name: proposal.projectName,
          proposal: {
            positioning: proposal.positioning,
            features: proposal.features,
            techStack: proposal.techStack,
            risks: proposal.risks,
            recommendations: proposal.recommendations,
            pricing: {
              base: proposal.estimatedPrice,
              addons: [],
              total: proposal.estimatedPrice,
            },
          },
          complexity: proposal.estimatedComplexity as 'L1' | 'L2' | 'L3' | 'L4' | 'L5',
          status: 'pending_payment',
        },
        { new: true }
      )
    } else {
      project = await Project.create({
        userId: session.user.id,
        name: proposal.projectName,
        proposal: {
          positioning: proposal.positioning,
          features: proposal.features,
          techStack: proposal.techStack,
          risks: proposal.risks,
          recommendations: proposal.recommendations,
          pricing: {
            base: proposal.estimatedPrice,
            addons: [],
            total: proposal.estimatedPrice,
          },
        },
        complexity: proposal.estimatedComplexity as 'L1' | 'L2' | 'L3' | 'L4' | 'L5',
        status: 'pending_payment',
      })
    }

    if (!project) {
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    const price = getPriceForComplexity(proposal.estimatedComplexity)

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: proposal.projectName,
              description: `${proposal.positioning} - ${proposal.estimatedComplexity} 级别应用`,
            },
            unit_amount: price * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/create/success?session_id={CHECKOUT_SESSION_ID}&project_id=${project._id}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/create/confirm?proposal=${encodeURIComponent(JSON.stringify(proposal))}`,
      metadata: {
        projectId: project._id.toString(),
        userId: session.user.id as string,
        complexity: proposal.estimatedComplexity,
      },
      customer_email: session.user.email,
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
