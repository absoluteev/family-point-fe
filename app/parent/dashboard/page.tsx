"use client"

import { useAuth } from "@/components/auth-provider"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Star, Trophy, Plus, Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { ParentLayout } from "@/components/parent-layout"

interface Kid {
  id: string
  display_name: string
  total_points: number
}

interface PendingActivity {
  id: string
  activity_name: string
  kid_name: string
  points: number
  submitted_at: string
}

export default function ParentDashboard() {
  const { user } = useAuth()
  const [kids, setKids] = useState<Kid[]>([])
  const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([])
  const [stats, setStats] = useState({
    totalKids: 0,
    totalActivities: 0,
    totalRewards: 0,
    pendingApprovals: 0,
  })

  useEffect(() => {
    if (user?.family_id) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user?.family_id) return

    try {
      // Fetch kids with their total points
      const { data: kidsData } = await supabase
        .from("user_profiles")
        .select(`
          id,
          display_name,
          point_entries(points)
        `)
        .eq("family_id", user.family_id)
        .eq("role", "kid")

      const kidsWithPoints =
        kidsData?.map((kid) => ({
          id: kid.id,
          display_name: kid.display_name,
          total_points: kid.point_entries?.reduce((sum: number, entry: any) => sum + entry.points, 0) || 0,
        })) || []

      setKids(kidsWithPoints)

      // Fetch pending activities
      const { data: pendingData } = await supabase
        .from("point_entries")
        .select(`
          id,
          points,
          submitted_at,
          activities(name),
          user_profiles(display_name)
        `)
        .eq("family_id", user.family_id)
        .eq("status", "pending")
        .order("submitted_at", { ascending: false })

      const pendingFormatted =
        pendingData?.map((entry) => ({
          id: entry.id,
          activity_name: entry.activities?.name || "Unknown Activity",
          kid_name: entry.user_profiles?.display_name || "Unknown Kid",
          points: entry.points,
          submitted_at: entry.submitted_at,
        })) || []

      setPendingActivities(pendingFormatted)

      // Fetch stats
      const [activitiesCount, rewardsCount] = await Promise.all([
        supabase.from("activities").select("id", { count: "exact" }).eq("family_id", user.family_id),
        supabase.from("rewards").select("id", { count: "exact" }).eq("family_id", user.family_id),
      ])

      setStats({
        totalKids: kidsWithPoints.length,
        totalActivities: activitiesCount.count || 0,
        totalRewards: rewardsCount.count || 0,
        pendingApprovals: pendingFormatted.length,
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    }
  }

  const handleApproval = async (entryId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from("point_entries")
        .update({
          status: approved ? "approved" : "rejected",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", entryId)

      if (error) throw error

      // Refresh data
      fetchDashboardData()
    } catch (error) {
      console.error("Error updating approval:", error)
    }
  }

  return (
    <ParentLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="space-x-2">
            <Link href="/parent/activities/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </Link>
            <Link href="/parent/rewards/new">
              <Button variant="outline">
                <Trophy className="h-4 w-4 mr-2" />
                Add Reward
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Kids</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalKids}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activities</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActivities}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rewards</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRewards}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leaderboard">Kids Leaderboard</TabsTrigger>
            <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Kids Leaderboard</CardTitle>
                <CardDescription>Current point standings for all kids</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kids.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No kids added yet.{" "}
                      <Link href="/parent/kids/add" className="text-blue-600 hover:underline">
                        Add your first kid
                      </Link>
                    </p>
                  ) : (
                    kids
                      .sort((a, b) => b.total_points - a.total_points)
                      .map((kid, index) => (
                        <div key={kid.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold">{kid.display_name}</h3>
                            </div>
                          </div>
                          <Badge variant={kid.total_points >= 0 ? "default" : "destructive"}>
                            {kid.total_points} points
                          </Badge>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Activities waiting for your approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingActivities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No pending approvals</p>
                  ) : (
                    pendingActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{activity.activity_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {activity.kid_name} • {new Date(activity.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={activity.points >= 0 ? "default" : "destructive"}>
                            {activity.points > 0 ? "+" : ""}
                            {activity.points} points
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => handleApproval(activity.id, true)}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleApproval(activity.id, false)}>
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ParentLayout>
  )
}
