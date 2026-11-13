import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  linkSlug?: string;
  linkTitle?: string;
}

interface AiMessageBubbleProps {
  message: ChatMessage;
  onSelectLink?: (slug: string) => void;
}

// Renders an individual chat bubble with assistant avatar and property links.
export function AiMessageBubble({ message, onSelectLink }: AiMessageBubbleProps) {
  const isUser = message.sender === 'user';

  return (
    <View style={[styles.wrap, isUser ? styles.userWrap : styles.assistantWrap]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={14} color="#ffffff" />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser && styles.userText]}>{message.content}</Text>
        {Boolean(message.linkSlug) && onSelectLink && (
          <TouchableOpacity
            onPress={() => onSelectLink(message.linkSlug!)}
            style={styles.linkCard}
          >
            <Ionicons name="home-outline" size={14} color={colors.sage[700]} />
            <Text numberOfLines={1} style={styles.linkText}>
              {message.linkTitle ?? 'Lihat Properti'} →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    maxWidth: '88%',
  },
  userWrap: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  assistantWrap: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.sage[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBubble: {
    backgroundColor: colors.ink,
  },
  text: {
    fontSize: typography.sizes.sm,
    color: colors.ink,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.sage[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  linkText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.sage[700],
    flex: 1,
  },
});
