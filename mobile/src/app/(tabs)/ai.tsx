import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AiMessageBubble, type ChatMessage } from '@/components/ai/AiMessageBubble';
import { AiSuggestionChips } from '@/components/ai/AiSuggestionChips';
import { Header } from '@/components/Header';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { AI_WELCOME_MESSAGE, generateAiAnswer, type AiAnswer } from '@/lib/ai/consultantAdvisor';

// Renders the AI property advisor chat screen with suggestions and property links.
export default function AiAdvisorScreen() {
  const router = useRouter();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      content: AI_WELCOME_MESSAGE,
    },
  ]);
  const [input, setInput] = useState('');

  // Appends a new user message and generates the AI advisor reply.
  const handleSend = (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: query,
    };

    const answer: AiAnswer = generateAiAnswer(query);
    const aiMsg: ChatMessage = {
      id: `ai_${Date.now()}`,
      sender: 'assistant',
      content: answer.text,
      linkSlug: answer.linkSlug,
      linkTitle: answer.linkTitle,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Tanya Asisten AI" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardContainer}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
        >
          <AiSuggestionChips onSelect={handleSend} />
          {messages.map((msg) => (
            <AiMessageBubble
              key={msg.id}
              message={msg}
              onSelectLink={(slug) => router.push(`/property/${slug}` as any)}
            />
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Tulis pertanyaan seputar rumah, cicilan..."
            placeholderTextColor={colors.muted}
            style={styles.textInput}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            disabled={!input.trim()}
            onPress={() => handleSend()}
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          >
            <Ionicons name="arrow-up" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatScroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.sand,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: typography.sizes.sm,
    color: colors.ink,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.sage[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.sand,
  },
});
