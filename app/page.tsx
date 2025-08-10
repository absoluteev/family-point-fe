"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Users, Trophy, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on role
      if (user.role === "parent") {
        router.push("/parent/dashboard")
      } else if (user.role === "kid") {
        router.push("/kid/dashboard")
      } else if (user.role === "admin") {
        router.push("/admin/dashboard")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect based on role
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Star className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">FamilyPoints</span>
          </div>
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Smart Parenting Point Tracker</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Build strong character in your children using a behavior-based reward and punishment system. Track progress
            in real-time with gamified rewards and structured activity management.
          </p>
          <div className="space-x-4">
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 py-3">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="px-8 py-3 bg-transparent">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Family Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure, private environment for each family with role-based access for parents and kids.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Real-time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor daily and weekly progress with comprehensive dashboards and activity logs.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Trophy className="h-12 w-12 text-yellow-600 mb-4" />
              <CardTitle>Gamified Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Kids can apply for tasks and redeem rewards through an engaging, game-like interface.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Custom Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Configure custom behavior rules with obligations, nice-to-haves, and forbidden activities.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How FamilyPoints Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold">Set Up Activities</h3>
              <p className="text-gray-600">
                Parents create custom activities with point values and approval requirements.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold">Kids Participate</h3>
              <p className="text-gray-600">Children apply for activities and track their progress in real-time.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold">Earn Rewards</h3>
              <p className="text-gray-600">Accumulated points can be redeemed for custom family rewards.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Star className="h-6 w-6" />
            <span className="text-xl font-bold">FamilyPoints</span>
          </div>
          <p className="text-gray-400">Building stronger families through positive behavior tracking.</p>
        </div>
      </footer>
    </div>
  )
}
