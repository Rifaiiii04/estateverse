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

// Renders seller registration for the shared web and mobile backend account.
export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Creates the new account and logs the seller in.
  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Perhatian', 'Nama lengkap, email, dan kata sandi wajib diisi.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Kata Sandi Lemah', 'Kata sandi minimal 8 karakter.');
      return;
    }
    setSubmitting(true);
    const result = await register({ name, email, password });
    setSubmitting(false);

    if (result.success) {
      router.back();
    } else {
      Alert.alert('Pendaftaran Gagal', result.error ?? 'Terjadi kendala saat mendaftarkan akun.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Daftar Pemilik Baru" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerBlock}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add-outline" size={28} color={colors.sage[700]} />
            </View>
            <Text style={styles.title}>Daftar Akun Pemilik</Text>
            <Text style={styles.subtitle}>
              Mulai pasang iklan properti Anda dan jangkau ribuan calon pembeli potensial.
            </Text>
          </View>

          <View style={styles.form}>
            <FormInput
              label="Nama Lengkap"
              placeholder="Contoh: Rian Pratama"
              value={name}
              onChangeText={setName}
            />

            <FormInput
              label="Alamat Email"
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <FormInput
              label="Kata Sandi (Min. 6 Karakter)"
              placeholder="Buat kata sandi aman..."
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              disabled={submitting}
              onPress={handleRegister}
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Mendaftarkan...' : 'Daftar & Masuk'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Sudah memiliki akun?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={styles.loginLink}>Masuk di sini</Text>
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
  loginLink: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.sage[700] },
});
