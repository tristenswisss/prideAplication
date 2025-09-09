import React, { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Alert, TextInput, ScrollView } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../../Contexts/ThemeContext"
import { useAuth } from "../../Contexts/AuthContexts"
import { adminService } from "../../services/adminService"
import { notificationService } from "../../services/notificationService"

interface UserReport {
  id: string
  reporter_id: string
  reported_user_id: string
  reason: string
  details?: string
  status: 'pending' | 'reviewed' | 'resolved' | 'blocked'
  admin_notes?: string
  created_at: string
  reporter?: { name: string; email: string }
  reported_user?: { name: string; email: string }
}

type AdminItem = UserReport | PlaceSuggestion

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return { backgroundColor: '#FFA500' }
    case 'reviewed':
      return { backgroundColor: '#007BFF' }
    case 'resolved':
      return { backgroundColor: '#28A745' }
    case 'blocked':
      return { backgroundColor: '#DC3545' }
    default:
      return { backgroundColor: '#6C757D' }
  }
}

interface PlaceSuggestion {
  id: string
  name: string
  description: string
  category: string
  address: string
  city: string
  country: string
  phone?: string
  email?: string
  website?: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  created_at: string
  suggested_by_user?: { id: string; name: string; email: string }
}

export default function AdminReportsScreen({ navigation }: any) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'reports' | 'suggestions' | 'unblock_requests'>('reports')
  const [reports, setReports] = useState<UserReport[]>([])
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [unblockRequests, setUnblockRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlaceSuggestion | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [activeTab])

  const checkAdminAccess = async () => {
    const isAdmin = await adminService.isCurrentUserAdmin()
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
      return
    }
    loadReports()
  }

  const loadReports = async () => {
    try {
      setLoading(true)
      const result = await adminService.getAllReports()

      if (!result.success) {
        throw new Error(result.error)
      }

      setReports(result.data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
      Alert.alert('Error', 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const result = await adminService.getPlaceSuggestions('pending')

      if (!result.success) {
        throw new Error(result.error)
      }

      setSuggestions(result.data || [])
    } catch (error) {
      console.error('Error loading suggestions:', error)
      Alert.alert('Error', 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  const loadUnblockRequests = async () => {
    try {
      setLoading(true)
      const result = await adminService.getUnblockRequests()

      if (!result.success) {
        throw new Error(result.error)
      }

      setUnblockRequests(result.data || [])
    } catch (error) {
      console.error('Error loading unblock requests:', error)
      Alert.alert('Error', 'Failed to load unblock requests')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    if (activeTab === 'reports') {
      await loadReports()
    } else if (activeTab === 'suggestions') {
      await loadSuggestions()
    } else {
      await loadUnblockRequests()
    }
  }

  const updateReportStatus = async (reportId: string, status: 'pending' | 'reviewed' | 'resolved') => {
    try {
      const result = await adminService.updateReport(reportId, status, adminNotes)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Send notification to reporter with feedback
      if (selectedReport?.reporter_id && status === 'resolved') {
        const feedbackMessage = adminNotes 
          ? `Your report has been resolved. Admin notes: ${adminNotes}`
          : 'Your report has been resolved. Thank you for helping keep our community safe.'
        
        await notificationService.createNotification({
          user_id: selectedReport.reporter_id,
          title: 'Report Resolved ✅',
          message: feedbackMessage,
          type: 'admin_feedback',
          data: { 
            report_id: reportId, 
            action: 'resolved',
            admin_notes: adminNotes || null
          },
          read: false,
        } as any)
      } else if (selectedReport?.reporter_id && status === 'reviewed') {
        const feedbackMessage = adminNotes 
          ? `Your report is being reviewed. Admin notes: ${adminNotes}`
          : 'Your report is being reviewed by our team. We will take appropriate action.'
        
        await notificationService.createNotification({
          user_id: selectedReport.reporter_id,
          title: 'Report Under Review 👁️',
          message: feedbackMessage,
          type: 'admin_feedback',
          data: { 
            report_id: reportId, 
            action: 'reviewed',
            admin_notes: adminNotes || null
          },
          read: false,
        } as any)
      }

      if (status === 'resolved') {
        // Remove resolved report from the list to keep the page clean
        setReports(prev => prev.filter(report => report.id !== reportId))
      } else {
        // Update in place for other statuses
        setReports(prev => prev.map(report =>
          report.id === reportId
            ? { ...report, status, admin_notes: adminNotes }
            : report
        ))
      }

      Alert.alert('Success', `Report status updated to ${status}. Reporter has been notified.`)
      setShowDetails(false)
      setSelectedReport(null)
      setAdminNotes("")
    } catch (error) {
      console.error('Error updating report:', error)
      Alert.alert('Error', 'Failed to update report status')
    }
  }

  const blockUser = async (reportId: string, userId: string, reason: string) => {
    try {
      const result = await adminService.blockUser(userId, reportId, reason)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Update the local report status
      setReports(prev => prev.map(report =>
        report.id === reportId
          ? { ...report, status: 'blocked' as const }
          : report
      ))

      // Send notification to reporter with feedback about the action taken
      if (selectedReport?.reporter_id) {
        const feedbackMessage = adminNotes 
          ? `Action taken on your report: User has been blocked. Admin notes: ${adminNotes}`
          : 'Action taken on your report: User has been blocked for violating community guidelines.'
        
        await notificationService.createNotification({
          user_id: selectedReport.reporter_id,
          title: 'Report Action Taken 🚫',
          message: feedbackMessage,
          type: 'admin_feedback',
          data: { 
            report_id: reportId, 
            action: 'user_blocked',
            blocked_user_id: userId,
            reason: reason,
            admin_notes: adminNotes || null
          },
          read: false,
        } as any)
      }

      Alert.alert('Success', 'User has been blocked and reporter has been notified')
    } catch (error) {
      console.error('Error blocking user:', error)
      Alert.alert('Error', 'Failed to block user')
    }
  }

  const unblockUser = async (userId: string) => {
    try {
      const result = await adminService.unblockUser(userId)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Update the local report status back to 'reviewed'
      setReports(prev => prev.map(report =>
        report.reported_user_id === userId && report.status === 'blocked'
          ? { ...report, status: 'reviewed' as const }
          : report
      ))

      // Send notification to reporter about the unblock action
      if (selectedReport?.reporter_id) {
        const feedbackMessage = adminNotes 
          ? `Update on your report: User has been unblocked after review. Admin notes: ${adminNotes}`
          : 'Update on your report: User has been unblocked after further review.'
        
        await notificationService.createNotification({
          user_id: selectedReport.reporter_id,
          title: 'Report Update 🔄',
          message: feedbackMessage,
          type: 'admin_feedback',
          data: { 
            report_id: selectedReport.id, 
            action: 'user_unblocked',
            unblocked_user_id: userId,
            admin_notes: adminNotes || null
          },
          read: false,
        } as any)
      }

      Alert.alert('Success', 'User has been unblocked and reporter has been notified')
    } catch (error) {
      console.error('Error unblocking user:', error)
      Alert.alert('Error', 'Failed to unblock user')
    }
  }

  const approveSuggestion = async (suggestionId: string) => {
    try {
      const result = await adminService.approvePlaceSuggestion(suggestionId)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Send notification to suggester about approval
      if (selectedSuggestion?.suggested_by_user?.id) {
        await notificationService.createNotification({
          user_id: selectedSuggestion.suggested_by_user.id,
          title: 'Safe Space Approved! 🎉',
          message: `Your suggestion "${selectedSuggestion.name}" has been approved and added to our safe spaces directory. Thank you for helping grow our community!`,
          type: 'admin_feedback',
          data: { 
            suggestion_id: suggestionId, 
            action: 'approved',
            place_name: selectedSuggestion.name
          },
          read: false,
        } as any)
      }

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      Alert.alert('Success', 'Suggestion has been approved and suggester has been notified')
      setShowSuggestionDetails(false)
      setSelectedSuggestion(null)
    } catch (error) {
      console.error('Error approving suggestion:', error)
      Alert.alert('Error', 'Failed to approve suggestion')
    }
  }

  const rejectSuggestion = async (suggestionId: string) => {
    try {
      const result = await adminService.rejectPlaceSuggestion(suggestionId, rejectionReason)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Send notification to suggester about rejection with reason
      if (selectedSuggestion?.suggested_by_user?.id) {
        const feedbackMessage = rejectionReason 
          ? `Your suggestion "${selectedSuggestion.name}" was not approved. Reason: ${rejectionReason}. Thank you for your contribution to our community.`
          : `Your suggestion "${selectedSuggestion.name}" was not approved. Thank you for your contribution to our community.`
        
        await notificationService.createNotification({
          user_id: selectedSuggestion.suggested_by_user.id,
          title: 'Safe Space Suggestion Update',
          message: feedbackMessage,
          type: 'admin_feedback',
          data: { 
            suggestion_id: suggestionId, 
            action: 'rejected',
            place_name: selectedSuggestion.name,
            rejection_reason: rejectionReason || null
          },
          read: false,
        } as any)
      }

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      Alert.alert('Success', 'Suggestion has been rejected and suggester has been notified')
      setShowSuggestionDetails(false)
      setSelectedSuggestion(null)
      setRejectionReason("")
    } catch (error) {
      console.error('Error rejecting suggestion:', error)
      Alert.alert('Error', 'Failed to reject suggestion')
    }
  }

  const approveUnblockRequest = async (requestId: string) => {
    try {
      const result = await adminService.approveUnblockRequest(requestId)

      if (!result.success) {
        throw new Error(result.error)
      }

      setUnblockRequests(prev => prev.filter(r => r.id !== requestId))
      Alert.alert('Success', 'User has been unblocked')
    } catch (error) {
      console.error('Error approving unblock request:', error)
      Alert.alert('Error', 'Failed to approve unblock request')
    }
  }

  const denyUnblockRequest = async (requestId: string) => {
    try {
      const result = await adminService.denyUnblockRequest(requestId, adminNotes)

      if (!result.success) {
        throw new Error(result.error)
      }

      setUnblockRequests(prev => prev.filter(r => r.id !== requestId))
      Alert.alert('Success', 'Unblock request has been denied')
      setAdminNotes("")
    } catch (error) {
      console.error('Error denying unblock request:', error)
      Alert.alert('Error', 'Failed to deny unblock request')
    }
  }

  const renderReportItem = ({ item }: { item: UserReport }) => (
    <TouchableOpacity
      style={[styles.reportItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => {
        setSelectedReport(item)
        setAdminNotes(item.admin_notes || "")
        setShowDetails(true)
      }}
    >
      <View style={styles.reportHeader}>
        <Text style={[styles.reportReason, { color: theme.colors.text }]}>{item.reason}</Text>
        <View style={[styles.statusBadge, getStatusColor(item.status)]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={[styles.reportDetails, { color: theme.colors.textSecondary }]}>
        Reported: {item.reported_user?.name || 'Unknown User'}
      </Text>
      <Text style={[styles.reportDetails, { color: theme.colors.textSecondary }]}>
        By: {item.reporter?.name || 'Unknown User'}
      </Text>
      <Text style={[styles.reportDate, { color: theme.colors.textTertiary }]}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  )

  const renderSuggestionItem = ({ item }: { item: PlaceSuggestion }) => (
    <TouchableOpacity
      style={[styles.reportItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => {
        setSelectedSuggestion(item)
        setRejectionReason("")
        setShowSuggestionDetails(true)
      }}
    >
      <View style={styles.reportHeader}>
        <Text style={[styles.reportReason, { color: theme.colors.text }]}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#FFA500' }]}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>

      <Text style={[styles.reportDetails, { color: theme.colors.textSecondary }]}>
        Category: {item.category}
      </Text>
      <Text style={[styles.reportDetails, { color: theme.colors.textSecondary }]}>
        Location: {item.city}, {item.country}
      </Text>
      <Text style={[styles.reportDetails, { color: theme.colors.textSecondary }]}>
        Suggested by: {item.suggested_by_user?.name || 'Unknown User'}
      </Text>
      <Text style={[styles.reportDate, { color: theme.colors.textTertiary }]}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>

      {activeTab === 'reports' && 'reported_user_id' in item && (item as unknown as UserReport).status === 'blocked' && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#28A745', marginTop: 8 }]}
          onPress={() => unblockUser((item as unknown as UserReport).reported_user_id)}
        >
          <Text style={styles.actionButtonText}>Unblock User</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )

  const renderUnblockRequestItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.reportItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => {
        setSelectedReport(item)
        setAdminNotes("")
        setShowDetails(true)
      }}
    >
      <View style={styles.reportHeader}>
        <Text style={[styles.reportReason, { color: theme.colors.text }]}>Unblock Request</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#FFA500' }]}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>

      <Text style={[styles.reportDetails, { color: theme.colors.textSecondary }]}>
        User: {item.user?.name} ({item.user?.email})
      </Text>
      <Text style={[styles.reportDetails, { color: theme.colors.textSecondary }]}>
        Reason: {item.reason}
      </Text>
      <Text style={[styles.reportDate, { color: theme.colors.textTertiary }]}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#28A745' }]}
          onPress={() => approveUnblockRequest(item.id)}
        >
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#DC3545' }]}
          onPress={() => denyUnblockRequest(item.id)}
        >
          <Text style={styles.actionButtonText}>Deny</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  const renderItem = ({ item }: { item: AdminItem }) => {
    if (activeTab === 'reports') {
      return renderReportItem({ item: item as UserReport })
    } else if (activeTab === 'suggestions') {
      return renderSuggestionItem({ item: item as PlaceSuggestion })
    } else {
      return renderUnblockRequestItem({ item })
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.text }}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {activeTab === 'reports' ? 'User Reports' : activeTab === 'suggestions' ? 'Place Suggestions' : 'Unblock Requests'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('reports')}
        >
          <MaterialIcons name="report" size={20} color={activeTab === 'reports' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'reports' && [styles.activeTabText, { color: theme.colors.primary }]]}>
            Reports ({reports.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('suggestions')}
        >
          <MaterialIcons name="place" size={20} color={activeTab === 'suggestions' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'suggestions' && [styles.activeTabText, { color: theme.colors.primary }]]}>
            Suggestions ({suggestions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unblock_requests' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('unblock_requests')}
        >
          <MaterialIcons name="person" size={20} color={activeTab === 'unblock_requests' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'unblock_requests' && [styles.activeTabText, { color: theme.colors.primary }]]}>
            Unblock ({unblockRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={(activeTab === 'reports' ? reports : activeTab === 'suggestions' ? suggestions : unblockRequests) as any[]}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name={activeTab === 'reports' ? "report" : activeTab === 'suggestions' ? "place" : "person"}
              size={48}
              color={theme.colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {activeTab === 'reports' ? 'No reports found' : activeTab === 'suggestions' ? 'No pending suggestions' : 'No unblock requests'}
            </Text>
          </View>
        }
      />

      {showDetails && selectedReport && (
        <View style={[styles.detailsOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.detailsContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.detailsHeader}>
              <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>Report Details</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={true}>
              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Reason:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedReport.reason}</Text>

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Reported User:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                {selectedReport.reported_user?.name} ({selectedReport.reported_user?.email})
              </Text>

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Reporter:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                {selectedReport.reporter?.name} ({selectedReport.reporter?.email})
              </Text>

              {selectedReport.details && (
                <>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Details:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedReport.details}</Text>
                </>
              )}

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Admin Notes:</Text>
              <TextInput
                style={[styles.notesInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background }]}
                placeholder="Add admin notes..."
                placeholderTextColor={theme.colors.textTertiary}
                value={adminNotes}
                onChangeText={setAdminNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FFA500' }]}
                  onPress={() => updateReportStatus(selectedReport.id, 'pending')}
                >
                  <Text style={styles.actionButtonText}>Mark Pending</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#007BFF' }]}
                  onPress={() => updateReportStatus(selectedReport.id, 'reviewed')}
                >
                  <Text style={styles.actionButtonText}>Mark Reviewed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#28A745' }]}
                  onPress={() => updateReportStatus(selectedReport.id, 'resolved')}
                >
                  <Text style={styles.actionButtonText}>Mark Resolved</Text>
                </TouchableOpacity>
              </View>

              {selectedReport.status !== 'blocked' ? (
                <TouchableOpacity
                  style={[styles.blockButton, { borderColor: theme.colors.error, backgroundColor: 'transparent' }]}
                  onPress={() => {
                    Alert.alert(
                      'Block User',
                      `Are you sure you want to block ${selectedReport.reported_user?.name}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Block',
                          style: 'destructive',
                          onPress: () => blockUser(selectedReport.id, selectedReport.reported_user_id, selectedReport.reason)
                        }
                      ]
                    )
                  }}
                >
                  <MaterialIcons name="block" size={20} color={theme.colors.error} />
                  <Text style={[styles.blockButtonText, { color: theme.colors.error }]}>Block User</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.blockButton, { borderColor: '#28A745', backgroundColor: '#28A745' }]}
                  onPress={() => {
                    Alert.alert(
                      'Unblock User',
                      `Are you sure you want to unblock ${selectedReport.reported_user?.name}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Unblock',
                          style: 'default',
                          onPress: () => unblockUser(selectedReport.reported_user_id)
                        }
                      ]
                    )
                  }}
                >
                  <MaterialIcons name="check-circle" size={20} color="white" />
                  <Text style={[styles.blockButtonText, { color: 'white' }]}>Unblock User</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {showSuggestionDetails && selectedSuggestion && (
        <View style={[styles.detailsOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.detailsContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.detailsHeader}>
              <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>Place Suggestion</Text>
              <TouchableOpacity onPress={() => setShowSuggestionDetails(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsContent}>
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={true}>
                <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Name:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedSuggestion.name}</Text>

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Category:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedSuggestion.category}</Text>

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Location:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                {selectedSuggestion.address}, {selectedSuggestion.city}, {selectedSuggestion.country}
              </Text>

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Description:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedSuggestion.description}</Text>

              {selectedSuggestion.phone && (
                <>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Phone:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedSuggestion.phone}</Text>
                </>
              )}

              {selectedSuggestion.email && (
                <>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Email:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedSuggestion.email}</Text>
                </>
              )}

              {selectedSuggestion.website && (
                <>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Website:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedSuggestion.website}</Text>
                </>
              )}

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Suggested by:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                {selectedSuggestion.suggested_by_user?.name} ({selectedSuggestion.suggested_by_user?.email})
              </Text>

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Submitted:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                {new Date(selectedSuggestion.created_at).toLocaleDateString()}
              </Text>

              <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Rejection Reason (if rejecting):</Text>
              <TextInput
                style={[styles.notesInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background }]}
                placeholder="Optional reason for rejection..."
                placeholderTextColor={theme.colors.textTertiary}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={2}
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#28A745' }]}
                  onPress={() => approveSuggestion(selectedSuggestion.id)}
                >
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#DC3545' }]}
                  onPress={() => {
                    Alert.alert(
                      'Reject Suggestion',
                      'Are you sure you want to reject this suggestion?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reject',
                          style: 'destructive',
                          onPress: () => rejectSuggestion(selectedSuggestion.id)
                        }
                      ]
                    )
                  }}
                >
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
  },
  reportItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportReason: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  detailsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  detailsContainer: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailsContent: {
    padding: 20,
    maxHeight: 400,
  },
  actionScrollView: {
    maxHeight: 150,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 20,
    minHeight: 48,
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },
  activeTabText: {
    // color will be set inline
  },
})