"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

// Define interfaces for type safety
interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

interface ShowPasswords {
  current: boolean
  new: boolean
  confirm: boolean
}

interface PasswordAlert {
  type: string
  message: string
}

export default function SettingsPage() {
  // Change Password States
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState<ShowPasswords>({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false)
  const [passwordAlert, setPasswordAlert] = useState<PasswordAlert>({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Check if token exists on component mount
  useEffect(() => {
    // Just check if token exists, don't verify it
    const token = getToken()
    console.log('Token found:', token ? 'Yes' : 'No')
    
    if (!token) {
      console.log('No token found')
      setPasswordAlert({ 
        type: 'error', 
        message: 'You need to be logged in to access settings.' 
      })
    }
    
    setIsLoading(false)
  }, [])

  // Get token from localStorage or sessionStorage
  const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      return token
    }
    return null
  }

  // Handle password form changes
  const handlePasswordChange = (field: keyof PasswordForm, value: string): void => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear alerts when user starts typing
    if (passwordAlert.message) {
      setPasswordAlert({ type: '', message: '' })
    }
  }

  // Toggle password visibility
  const togglePasswordVisibility = (field: keyof ShowPasswords): void => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  // Validate password form
  const validatePasswordForm = (): boolean => {
    const { currentPassword, newPassword, confirmNewPassword } = passwordForm
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordAlert({ type: 'error', message: 'All fields are required' })
      return false
    }
    
    if (newPassword.length < 6) {
      setPasswordAlert({ type: 'error', message: 'New password must be at least 6 characters long' })
      return false
    }
    
    if (newPassword !== confirmNewPassword) {
      setPasswordAlert({ type: 'error', message: 'New passwords do not match' })
      return false
    }
    
    if (currentPassword === newPassword) {
      setPasswordAlert({ type: 'error', message: 'New password must be different from current password' })
      return false
    }
    
    return true
  }

  // Handle password change submission
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    
    if (!validatePasswordForm()) {
      return
    }

    const token = getToken()
    if (!token) {
      setPasswordAlert({ type: 'error', message: 'You need to be logged in to change password. Please log in again.' })
      return
    }

    setPasswordLoading(true)
    setPasswordAlert({ type: '', message: '' })

    try {
      console.log('Attempting to change password...')
      const response = await fetch('https://qtech-backend.vercel.app/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmNewPassword: passwordForm.confirmNewPassword
        })
      })

      console.log('Password change response status:', response.status)
      const data = await response.json()
      console.log('Password change response data:', data)

      if (response.ok && data.success) {
        setPasswordAlert({ type: 'success', message: data.message || 'Password changed successfully!' })
        // Clear form after successful change
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        })
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          setPasswordAlert({ 
            type: 'error', 
            message: 'Session expired or invalid credentials. Please log in again.' 
          })
          // Clear tokens
          localStorage.removeItem('token')
          sessionStorage.removeItem('token')
        } else if (response.status === 400) {
          setPasswordAlert({ 
            type: 'error', 
            message: data.message || 'Invalid request. Please check your input.' 
          })
        } else if (response.status === 403) {
          setPasswordAlert({ 
            type: 'error', 
            message: 'Current password is incorrect. Please try again.' 
          })
        } else {
          setPasswordAlert({ 
            type: 'error', 
            message: data.message || 'Failed to change password. Please try again.' 
          })
        }
      }
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordAlert({ 
        type: 'error', 
        message: 'Network error. Please check your connection and try again.' 
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  // Get alert icon based on type
  const getAlertIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <XCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return null
    }
  }

  // Show loading state briefly
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">Settings</h1>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Update your account password. Make sure to use a strong password for security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Alert Message */}
              {passwordAlert.message && (
                <Alert variant={passwordAlert.type === 'error' ? 'destructive' : 'default'}>
                  {getAlertIcon(passwordAlert.type)}
                  <AlertDescription>
                    {passwordAlert.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    placeholder="Enter your current password"
                    className="pr-10"
                    disabled={passwordLoading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('current')}
                    disabled={passwordLoading}
                    tabIndex={-1}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    placeholder="Enter your new password (min. 6 characters)"
                    className="pr-10"
                    disabled={passwordLoading}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('new')}
                    disabled={passwordLoading}
                    tabIndex={-1}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) => handlePasswordChange('confirmNewPassword', e.target.value)}
                    placeholder="Confirm your new password"
                    className="pr-10"
                    disabled={passwordLoading}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('confirm')}
                    disabled={passwordLoading}
                    tabIndex={-1}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-muted p-3 rounded-md text-sm">
                <h4 className="font-medium mb-2">Password Requirements:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${passwordForm.newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    At least 6 characters long
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${passwordForm.newPassword !== passwordForm.currentPassword && passwordForm.newPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Different from current password
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${passwordForm.newPassword === passwordForm.confirmNewPassword && passwordForm.newPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Passwords match
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={passwordLoading || !getToken()}
                  className="w-full sm:w-auto"
                >
                  {passwordLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}