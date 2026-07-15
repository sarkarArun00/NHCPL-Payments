import React, {
  useCallback,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';

import {
  Colors,
} from '../../constants/colors';

import {
  Spacing,
} from '../../constants/spacing';

import {
  useNotificationStore,
} from '../../store/notificationStore';

import {
  GeneralNotification,
} from '../../types/notification.types';
import {
    notificationApi,
} from '../../api/notification.api';


const formatNotificationDate = (
  value: string,
): string => {
  if (!value) {
    return 'Date not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date not available';
  }

  return date.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
};


const DELETE_ACTION_WIDTH = 96;

type NotificationItemProps = {
  notification: GeneralNotification;
  isDeleting: boolean;
  onDelete: (
    notification: GeneralNotification,
  ) => void;
};

function NotificationItem({
  notification,
  isDeleting,
  onDelete,
}: NotificationItemProps) {
  const isUnread =
    notification.isRead === false;

  const {width: screenWidth} =
    useWindowDimensions();

  const scrollRef =
    React.useRef<ScrollView | null>(
      null,
    );

  const cardWidth =
    screenWidth - Spacing.lg * 2;

  const closeRow = () => {
    scrollRef.current?.scrollTo({
      x: 0,
      animated: true,
    });
  };

  const openRow = () => {
    scrollRef.current?.scrollTo({
      x: DELETE_ACTION_WIDTH,
      animated: true,
    });
  };

  const handleScrollEnd = (
    offsetX: number,
  ) => {
    if (offsetX > 24) {
      openRow();
      return;
    }

    closeRow();
  };

  const handleDeletePress = () => {
    closeRow();

    setTimeout(() => {
      onDelete(notification);
    }, 120);
  };

  return (
    <View style={styles.swipeRow}>
      <ScrollView
        ref={scrollRef}
        horizontal
        bounces={false}
        overScrollMode="never"
        directionalLockEnabled
        showsHorizontalScrollIndicator={
          false
        }
        scrollEnabled={!isDeleting}
        snapToOffsets={[
          0,
          DELETE_ACTION_WIDTH,
        ]}
        decelerationRate="fast"
        onScrollEndDrag={event =>
          handleScrollEnd(
            event.nativeEvent
              .contentOffset.x,
          )
        }
        onMomentumScrollEnd={event =>
          handleScrollEnd(
            event.nativeEvent
              .contentOffset.x,
          )
        }
        style={[
          styles.swipeScroll,
          {
            width: cardWidth,
          },
        ]}
        contentContainerStyle={
          styles.swipeScrollContent
        }>
        <View
          style={[
            styles.notificationCard,
            {
              width: cardWidth,
            },
            isUnread &&
              styles.unreadNotificationCard,
            isDeleting &&
              styles.notificationDeleting,
          ]}>
          <View
            style={
              styles.notificationIcon
            }>
            <MaterialDesignIcons
              name="bell-outline"
              size={22}
              color={Colors.primary}
            />
          </View>

          <View
            style={
              styles.notificationContent
            }>
            <View
              style={
                styles.notificationTopRow
              }>
              <View
                style={
                  styles.notificationModuleRow
                }>
                <Text
                  style={[
                    styles.moduleText,
                    isUnread &&
                      styles.unreadModuleText,
                  ]}>
                  Accounts
                </Text>

                {isUnread ? (
                  <View
                    style={
                      styles.unreadDot
                    }
                  />
                ) : null}
              </View>

              <Text
                style={styles.dateText}>
                {formatNotificationDate(
                  notification.createdAt,
                )}
              </Text>
            </View>

            <Text
              style={[
                styles.messageText,
                isUnread &&
                  styles.unreadMessageText,
              ]}>
              {notification.message ||
                'Notification details are not available.'}
            </Text>

            {notification.srcModule ? (
              <Text
                style={styles.sourceText}>
                From:{' '}
                {notification.srcModule}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          disabled={isDeleting}
          onPress={handleDeletePress}
          style={({pressed}) => [
            styles.deleteAction,
            pressed && styles.pressed,
            isDeleting &&
              styles.deleteActionDisabled,
          ]}>
          {isDeleting ? (
            <ActivityIndicator
              size="small"
              color={Colors.white}
            />
          ) : (
            <>
              <MaterialDesignIcons
                name="trash-can-outline"
                size={24}
                color={Colors.white}
              />

              <Text
                style={
                  styles.deleteActionText
                }>
                Delete
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
export default function NotificationScreen() {
  const notifications =
    useNotificationStore(
      state => state.notifications,
    );

  const unreadCount =
    useNotificationStore(
      state => state.unreadCount,
    );

  const isLoading =
    useNotificationStore(
      state => state.isLoading,
    );

  const isRefreshing =
    useNotificationStore(
      state => state.isRefreshing,
    );

  const error =
    useNotificationStore(
      state => state.error,
    );

  const loadNotifications =
    useNotificationStore(
      state =>
        state.loadNotifications,
    );
  
  const deleteGeneralNotification =
  useNotificationStore(
    state =>
      state.deleteGeneralNotification,
  );

const [
  deletingNotificationId,
  setDeletingNotificationId,
] = React.useState<string | null>(
  null,
);

  const updateNotificationStatus =
  useNotificationStore(state => state.updateNotificationStatus);
  
useFocusEffect(
  useCallback(() => {
    let isActive = true;

    const syncNotifications =
      async () => {
        await loadNotifications(false);

        if (!isActive) {
          return;
        }

        const latestState =
          useNotificationStore
            .getState();

        /*
         * If Accounts notifications exist,
         * mark them as read and refresh
         * the general notification list.
         */
      const hasUnreadNotification =
        latestState.notifications.some(
          notification =>
            notification.isRead === false,
        );

      if (hasUnreadNotification) {
        const success =
          await updateNotificationStatus();

        if (success) {
          console.log(
            'notification read',
          );
        }
      }
      };

    void syncNotifications();

    return () => {
      isActive = false;
    };
  }, [
    loadNotifications,
    updateNotificationStatus,
  ]),
);

  const handleRefresh =
    useCallback(() => {
      void loadNotifications(true);
    }, [loadNotifications]);

  const handleRetry =
    useCallback(() => {
      void loadNotifications(false);
    }, [loadNotifications]);

  const handleDeleteNotification =
  useCallback(
    (
      notification: GeneralNotification,
    ) => {
      Alert.alert(
        'Delete notification',
        'Are you sure you want to delete this notification?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                setDeletingNotificationId(
                  notification.id,
                );

                await deleteGeneralNotification(
                  notification.id,
                );

                setDeletingNotificationId(
                  null,
                );
              })();
            },
          },
        ],
      );
    },
    [deleteGeneralNotification],
    );
  
  if (
    isLoading &&
    notifications.length === 0
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['bottom']}>
        <View
          style={styles.stateContainer}>
          <ActivityIndicator
            size="large"
            color={Colors.primary}
          />

          <Text
            style={styles.stateText}>
            Loading notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    error &&
    notifications.length === 0
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['bottom']}>
        <View
          style={styles.stateContainer}>
          <View
            style={styles.errorIcon}>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={30}
              color={Colors.danger}
            />
          </View>

          <Text
            style={styles.errorTitle}>
            Unable to load notifications
          </Text>

          <Text
            style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            onPress={handleRetry}
            style={({pressed}) => [
              styles.retryButton,
              pressed &&
                styles.pressed,
            ]}>
            <MaterialDesignIcons
              name="refresh"
              size={19}
              color={Colors.white}
            />

            <Text
              style={
                styles.retryButtonText
              }>
              Retry
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['bottom']}>
      <FlatList
        data={notifications}
        keyExtractor={item =>
          item.id
        }
      renderItem={({item}) => (
        <NotificationItem
          notification={item}
          isDeleting={
            deletingNotificationId ===
            item.id
          }
          onDelete={
            handleDeleteNotification
          }
        />
      )}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 &&
            styles.emptyListContent,
        ]}
        ListHeaderComponent={
          notifications.length > 0 ? (
            <View
              style={styles.summaryRow}>
              <View>
                <Text
                  style={
                    styles.summaryTitle
                  }>
                  General notifications
                </Text>

                <Text
                  style={
                    styles.summarySubtitle
                  }>
                  Accounts module updates
                </Text>
              </View>

            {unreadCount > 0 ? (
            <View
                style={
                styles.unreadCountBadge
                }>
                <Text
                style={
                    styles.unreadCountText
                }>
                {unreadCount > 99
                    ? '99+'
                    : String(unreadCount)}
                </Text>
            </View>
            ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View
            style={styles.emptyState}>
            <View
              style={styles.emptyIcon}>
              <MaterialDesignIcons
                name="bell-check-outline"
                size={34}
                color={Colors.primary}
              />
            </View>

            <Text
              style={styles.emptyTitle}>
              No notifications
            </Text>

            <Text
              style={styles.emptyText}>
              Accounts notifications will
              appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        Colors.background,
    },

    listContent: {
      padding: Spacing.lg,
      paddingBottom:
        Spacing.xxxl,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    summaryRow: {
      marginBottom:
        Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    summaryTitle: {
      color: Colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },

    summarySubtitle: {
      marginTop: Spacing.xs,
      color:
        Colors.textSecondary,
      fontSize: 13,
    },

    unreadCountBadge: {
      minWidth: 30,
      height: 30,
      paddingHorizontal:
        Spacing.sm,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        Colors.info,
    },

    unreadCountText: {
      color: Colors.white,
      fontSize: 12,
      fontWeight: '800',
    },

    notificationCard: {
      // marginBottom:
      // Spacing.md,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor:
        Colors.border,
      borderRadius: 18,
      flexDirection: 'row',
      alignItems:
        'flex-start',
      backgroundColor:
        Colors.surface,
    },

    unreadNotificationCard: {
      borderColor:
        Colors.info,
      backgroundColor:
        Colors.infoLight,
    },

    notificationIcon: {
      width: 42,
      height: 42,
      marginRight:
        Spacing.md,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        Colors.primaryLight,
    },

    notificationContent: {
      flex: 1,
    },

    notificationTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
    },

    notificationModuleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },

    moduleText: {
      color:
        Colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },

    unreadModuleText: {
      color: Colors.info,
      fontWeight: '800',
    },

    unreadDot: {
      width: 8,
      height: 8,
      marginLeft:
        Spacing.sm,
      borderRadius: 4,
      backgroundColor:
        Colors.info,
    },

    dateText: {
      marginLeft:
        Spacing.md,
      color: Colors.textMuted,
      fontSize: 10,
      textAlign: 'right',
    },

    messageText: {
      marginTop:
        Spacing.sm,
      color:
        Colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },

    unreadMessageText: {
      color:
        Colors.textPrimary,
      fontWeight: '600',
    },

    sourceText: {
      marginTop:
        Spacing.sm,
      color: Colors.textMuted,
      fontSize: 11,
      fontWeight: '500',
    },

    stateContainer: {
      flex: 1,
      padding:
        Spacing.xxl,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    stateText: {
      marginTop:
        Spacing.md,
      color:
        Colors.textSecondary,
      fontSize: 14,
    },

    errorIcon: {
      width: 62,
      height: 62,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        Colors.dangerLight,
    },

    errorTitle: {
      marginTop:
        Spacing.lg,
      color:
        Colors.textPrimary,
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
    },

    errorText: {
      marginTop:
        Spacing.sm,
      color:
        Colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },

    retryButton: {
      marginTop:
        Spacing.lg,
      paddingHorizontal:
        Spacing.lg,
      height: 44,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: Spacing.sm,
      backgroundColor:
        Colors.primary,
    },

    retryButtonText: {
      color: Colors.white,
      fontSize: 14,
      fontWeight: '700',
    },

    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      padding:
        Spacing.xxl,
    },

    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        Colors.primaryLight,
    },

    emptyTitle: {
      marginTop:
        Spacing.lg,
      color:
        Colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },

    emptyText: {
      marginTop:
        Spacing.sm,
      color:
        Colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
    },

    pressed: {
      opacity: 0.82,
    },


swipeContent: {
  backgroundColor:
    Colors.background,
},

deleteActionWrapper: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  width: DELETE_ACTION_WIDTH,
  zIndex: 0,
},

    swipeRow: {
  marginBottom: Spacing.md,
  overflow: 'hidden',
  borderRadius: 18,
},

swipeScroll: {
  overflow: 'hidden',
},

swipeScrollContent: {
  flexDirection: 'row',
},

deleteAction: {
  width: DELETE_ACTION_WIDTH,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.danger,
},

deleteActionDisabled: {
  opacity: 0.7,
},

deleteActionText: {
  marginTop: 4,
  color: Colors.white,
  fontSize: 12,
  fontWeight: '800',
},

notificationDeleting: {
  opacity: 0.55,
},

  });