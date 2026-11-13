import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FormInput } from '@/components/dashboard/FormInput';
import { Header } from '@/components/Header';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// Renders the seller login screen for authentication.
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Authenticates the seller and navigates back to the dashboard.
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Perhatian', 'Silakan masukkan email dan kata sandi Anda.');
      return;
    }
    setSubmitting(true);
    const result = await login({ email, password });
    setSubmitting(false);

    if (result.success) {
      router.back();
    } else {
      Alert.alert('Gagal Masuk', result.error ?? 'Email atau kata sandi tidak sesuai.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Masuk Akun" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerBlock}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.sage[700]} />
            </View>
            <Text style={styles.title}>Masuk ke Akun Pemilik</Text>
            <Text style={styles.subtitle}>
              Kelola iklan rumah Anda dan tanggapi calon pembeli dengan mudah.
            </Text>
          </View>

          <View style={styles.form}>
            <FormInput
              label="Alamat Email"
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <FormInput
              label="Kata Sandi"
              placeholder="Masukkan kata sandi..."
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              disabled={submitting}
              onPress={handleLogin}
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Memproses...' : 'Masuk Sekarang'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Belum memiliki akun pemilik?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register' as any)}>
              <Text style={styles.registerLink}>Daftar di sini</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.xl, gap: spacing.xl, backgroundColor: colors.background, flexGrow: 1, justifyContent: 'center' },
  headerBlock: { alignItems: 'center', gap: spacing.xs },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.sage[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.ink },
  subtitle: { fontSize: typography.sizes.xs, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  form: { gap: spacing.md },
  submitBtn: {
    backgroundColor: colors.sage[600],
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#ffffff', fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  footerText: { fontSize: typography.sizes.xs, color: colors.muted },
  registerLink: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.sage[700] },
});
