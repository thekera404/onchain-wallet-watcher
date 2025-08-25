"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Bell, BellOff, Settings, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface NotificationSettingsProps {
  context: any
  sdk: any // Added sdk prop for better integration
}

export function NotificationSettings({ context, sdk }: NotificationSettingsProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isAddingApp, setIsAddingApp] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if notifications are already enabled from context
    if (context?.client?.notificationDetails) {
      setNotificationsEnabled(true)
    }
  }, [context])

  const handleAddApp = async () => {
    setIsAddingApp(true)

    try {
      // Use passed SDK or import dynamically
      const farcasterSdk = sdk || (await import("@farcaster/frame-sdk")).sdk

      // Prompt user to add the mini app
      await farcasterSdk.actions.addMiniApp()

      toast({
        title: "App Added!",
        description: "You'll now receive notifications for wallet activity",
      })

      setNotificationsEnabled(true)
    } catch (error) {
      console.error("Failed to add mini app:", error)
      toast({
        title: "Failed to Add App",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsAddingApp(false)
    }
  }

  const toggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(enabled)

    toast({
      title: enabled ? "Notifications Enabled" : "Notifications Disabled",
      description: enabled ? "You'll receive alerts for wallet activity" : "Wallet activity notifications are now off",
    })
  }

  return (
    <div className="space-y-4">
      {/* User Info */}
      {context?.user && (
        <Card className="border-0 bg-card/70 backdrop-blur-sm">
          {" "}
          {/* Added glassmorphism styling */}
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {context.user.pfpUrl && (
                <img src={context.user.pfpUrl || "/placeholder.svg"} alt="Profile" className="w-12 h-12 rounded-full" />
              )}
              <div>
                <p className="font-medium text-card-foreground">{context.user.displayName || context.user.username}</p>
                <p className="text-sm text-muted-foreground">FID: {context.user.fid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* App Status */}
      <Card className="border-0 bg-card/70 backdrop-blur-sm">
        {" "}
        {/* Added glassmorphism styling */}
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            App Status
          </CardTitle>
          <CardDescription>Add this app to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-card-foreground">App Added</p>
              <p className="text-sm text-muted-foreground">Required for notifications</p>
            </div>
            <Badge variant={context?.client?.added ? "default" : "secondary"}>
              {context?.client?.added ? "Added" : "Not Added"}
            </Badge>
          </div>

          {!context?.client?.added && (
            <Button
              onClick={handleAddApp}
              disabled={isAddingApp}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {" "}
              {/* Added gradient styling */}
              {isAddingApp ? "Adding..." : "Add to Farcaster"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-0 bg-card/70 backdrop-blur-sm">
        {" "}
        {/* Added glassmorphism styling */}
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Get notified when watched wallets are active</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-card-foreground">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Mints, transfers, and swaps</p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={toggleNotifications}
              disabled={!context?.client?.added}
            />
          </div>

          {context?.client?.notificationDetails && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">Notifications Active</p>
              </div>
              <p className="text-xs text-green-700 mt-1">
                You'll receive alerts when your watched wallets are active on Base
              </p>
            </div>
          )}

          {!context?.client?.added && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <BellOff className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800">Add App First</p>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Add this app to your Farcaster client to enable notifications
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
